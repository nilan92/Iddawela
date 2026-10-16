import base64, hashlib, hmac, json, os, secrets, time
from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session
from .config import SECRET_KEY, TOKEN_DAYS
from .db import get_db
from . import models as m

def hash_password(pw: str) -> str:
    salt = os.urandom(16)
    dk = hashlib.scrypt(pw.encode(), salt=salt, n=2**14, r=8, p=1, dklen=32)
    return "scrypt$" + base64.b64encode(salt).decode() + "$" + base64.b64encode(dk).decode()

def verify_password(pw: str, stored: str) -> bool:
    try:
        _, s, d = stored.split("$")
        dk = hashlib.scrypt(pw.encode(), salt=base64.b64decode(s), n=2**14, r=8, p=1, dklen=32)
        return hmac.compare_digest(dk, base64.b64decode(d))
    except Exception:
        return False

def _b64(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).decode().rstrip("=")

def make_token(user: m.User) -> str:
    body = _b64(json.dumps({"u": user.id, "v": user.token_version, "e": int(time.time()) + TOKEN_DAYS * 86400}).encode())
    sig = _b64(hmac.new(SECRET_KEY.encode(), body.encode(), hashlib.sha256).digest())
    return body + "." + sig

def read_token(tok: str):
    try:
        body, sig = tok.split(".")
        good = _b64(hmac.new(SECRET_KEY.encode(), body.encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(good, sig):
            return None
        data = json.loads(base64.urlsafe_b64decode(body + "=" * (-len(body) % 4)))
        if data["e"] < time.time():
            return None
        return data
    except Exception:
        return None

def new_reset_token():
    t = secrets.token_urlsafe(32)
    return t, hashlib.sha256(t.encode()).hexdigest()

def hash_reset(t: str) -> str:
    return hashlib.sha256(t.encode()).hexdigest()

def current_user_optional(request: Request, db: Session = Depends(get_db)):
    auth = request.headers.get("authorization", "")
    tok = auth[7:] if auth.lower().startswith("bearer ") else request.cookies.get("idw_session")
    if not tok:
        return None
    data = read_token(tok)
    if not data:
        return None
    u = db.get(m.User, data["u"])
    if not u or u.token_version != data["v"] or u.status in ("disabled", "rejected"):
        return None
    return u

def current_user(u=Depends(current_user_optional)):
    if not u:
        raise HTTPException(401, "Please sign in")
    return u

def approved_member(u=Depends(current_user)):
    if u.status != "approved":
        raise HTTPException(403, "Your account is waiting for approval")
    return u

def is_admin(u) -> bool:
    return bool(u and u.status == "approved" and u.role in ("super_admin", "family_admin"))

def admin_user(u=Depends(approved_member)):
    if u.role not in ("super_admin", "family_admin"):
        raise HTTPException(403, "Admins only")
    return u

def super_admin(u=Depends(approved_member)):
    if u.role != "super_admin":
        raise HTTPException(403, "Super admin only")
    return u

# --- tiny in-memory rate limiter (single process) ---
_hits: dict = {}
def rate_limit(key: str, limit: int, per_seconds: int):
    now = time.time()
    arr = [t for t in _hits.get(key, []) if t > now - per_seconds]
    if len(arr) >= limit:
        raise HTTPException(429, "Too many attempts, please wait a little")
    arr.append(now)
    _hits[key] = arr
