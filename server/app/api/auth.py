import datetime as dt, re, smtplib, ssl
from email.message import EmailMessage
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select, or_
from sqlalchemy.orm import Session
from ..db import get_db
from .. import models as m
from ..security import (hash_password, verify_password, make_token, current_user, rate_limit, new_reset_token, hash_reset)
from ..config import SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM, SITE_URL
from ..family import graph, card

r = APIRouter(prefix="/api/auth", tags=["auth"])

def norm_phone(p):
    if not p:
        return None
    d = re.sub(r"[^0-9+]", "", p)
    if d.startswith("0") and len(d) == 10:
        d = "+94" + d[1:]
    if d.startswith("94") and len(d) == 11:
        d = "+" + d
    return d or None

def user_out(u: m.User, db):
    g = graph(db)
    p = g["people"].get(u.person_id) if u.person_id else None
    return {"id": u.id, "name": u.name, "email": u.email, "phone": u.phone, "role": u.role, "status": u.status,
            "person": card(p, u, g) if p else None, "branch_person_id": u.branch_person_id, "lang": u.lang}

class RegisterIn(BaseModel):
    name: str
    email: str | None = None
    phone: str | None = None
    password: str
    person_id: int | None = None      # "this is me" claim on an existing tree entry
    note: str | None = None           # how they are related
    lang: str | None = "en"

@r.post("/register")
def register(body: RegisterIn, request: Request, db: Session = Depends(get_db)):
    rate_limit("reg:" + (request.client.host if request.client else "x"), 8, 3600)
    email = (body.email or "").strip().lower() or None
    phone = norm_phone(body.phone)
    if not email and not phone:
        raise HTTPException(400, "Add an email or a phone number")
    if email and not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        raise HTTPException(400, "That email doesn't look right")
    if len(body.password) < 8:
        raise HTTPException(400, "Use at least 8 characters for the password")
    if email and db.scalar(select(m.User).where(m.User.email == email)):
        raise HTTPException(409, "An account with this email already exists")
    if phone and db.scalar(select(m.User).where(m.User.phone == phone)):
        raise HTTPException(409, "An account with this phone already exists")
    first = db.scalar(select(m.User.id).limit(1)) is None
    u = m.User(name=body.name.strip()[:200], email=email, phone=phone, password_hash=hash_password(body.password),
               role="super_admin" if first else "member", status="approved" if first else "pending",
               join_note=(body.note or "")[:2000], lang=body.lang or "en")
    db.add(u); db.flush()
    if body.person_id and db.get(m.Person, body.person_id):
        db.add(m.Submission(user_id=u.id, kind="claim", target_id=body.person_id, payload={"person_id": body.person_id, "note": body.note}))
    db.add(m.Audit(user_id=u.id, action="register", target=f"user:{u.id}"))
    db.commit()
    return {"token": make_token(u), "user": user_out(u, db)}

class LoginIn(BaseModel):
    identifier: str
    password: str

@r.post("/login")
def login(body: LoginIn, request: Request, db: Session = Depends(get_db)):
    ident = body.identifier.strip().lower()
    rate_limit("login:" + ident, 10, 900)
    rate_limit("loginip:" + (request.client.host if request.client else "x"), 40, 900)
    u = db.scalar(select(m.User).where(or_(m.User.email == ident, m.User.phone == norm_phone(ident))))
    if not u or not verify_password(body.password, u.password_hash):
        raise HTTPException(401, "Wrong email/phone or password")
    if u.status in ("disabled", "rejected"):
        raise HTTPException(403, "This account is not active. Contact the foundation.")
    u.last_login_at = dt.datetime.now(dt.timezone.utc)
    db.commit()
    return {"token": make_token(u), "user": user_out(u, db)}

@r.get("/me")
def me(u=Depends(current_user), db: Session = Depends(get_db)):
    return user_out(u, db)

class PrefsIn(BaseModel):
    lang: str | None = None
    name: str | None = None

@r.post("/me")
def update_me(body: PrefsIn, u=Depends(current_user), db: Session = Depends(get_db)):
    if body.lang in ("en", "si"):
        u.lang = body.lang
    if body.name:
        u.name = body.name.strip()[:200]
    db.commit()
    return user_out(u, db)

class PwIn(BaseModel):
    current: str
    new: str

@r.post("/change-password")
def change_password(body: PwIn, u=Depends(current_user), db: Session = Depends(get_db)):
    if not verify_password(body.current, u.password_hash):
        raise HTTPException(400, "Current password is wrong")
    if len(body.new) < 8:
        raise HTTPException(400, "Use at least 8 characters")
    u.password_hash = hash_password(body.new); u.token_version += 1
    db.commit()
    return {"token": make_token(u)}

def send_mail(to, subject, text):
    if not SMTP_HOST:
        return False
    msg = EmailMessage(); msg["From"] = MAIL_FROM; msg["To"] = to; msg["Subject"] = subject; msg.set_content(text)
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as s:
        s.starttls(context=ssl.create_default_context())
        if SMTP_USER:
            s.login(SMTP_USER, SMTP_PASS or "")
        s.send_message(msg)
    return True

def create_reset(db, u, by=None, hours=24):
    tok, h = new_reset_token()
    db.add(m.PasswordReset(user_id=u.id, token_hash=h, created_by=by,
                           expires_at=dt.datetime.now(dt.timezone.utc) + dt.timedelta(hours=hours)))
    db.commit()
    return f"{SITE_URL}/reset?token={tok}"

class ForgotIn(BaseModel):
    identifier: str

@r.post("/forgot")
def forgot(body: ForgotIn, request: Request, db: Session = Depends(get_db)):
    ident = body.identifier.strip().lower()
    rate_limit("forgot:" + ident, 3, 3600)
    rate_limit("forgotip:" + (request.client.host if request.client else "x"), 10, 3600)
    u = db.scalar(select(m.User).where(or_(m.User.email == ident, m.User.phone == norm_phone(ident))))
    emailed = False
    if u:
        link = create_reset(db, u)
        if u.email:
            try:
                emailed = send_mail(u.email, "Reset your Iddawela Foundation password",
                                    f"Hello {u.name},\n\nUse this link within 24 hours to choose a new password:\n{link}\n\nIf you didn't ask, ignore this email.")
            except Exception:
                emailed = False
        db.add(m.Audit(user_id=u.id, action="password.forgot", detail={"emailed": emailed})); db.commit()
    # Same answer either way (no account enumeration).
    return {"ok": True, "email_enabled": bool(SMTP_HOST)}

class ResetIn(BaseModel):
    token: str
    password: str

@r.post("/reset")
def reset(body: ResetIn, db: Session = Depends(get_db)):
    pr = db.scalar(select(m.PasswordReset).where(m.PasswordReset.token_hash == hash_reset(body.token)))
    if not pr or pr.used_at or pr.expires_at < dt.datetime.now(dt.timezone.utc):
        raise HTTPException(400, "This reset link has expired. Ask for a new one.")
    if len(body.password) < 8:
        raise HTTPException(400, "Use at least 8 characters")
    u = db.get(m.User, pr.user_id)
    u.password_hash = hash_password(body.password); u.token_version += 1
    pr.used_at = dt.datetime.now(dt.timezone.utc)
    db.commit()
    return {"token": make_token(u), "user": user_out(u, db)}
