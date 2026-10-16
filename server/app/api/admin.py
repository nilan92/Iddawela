import datetime as dt
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, func, or_
from sqlalchemy.orm import Session
from ..db import get_db
from .. import models as m
from ..security import admin_user, super_admin
from ..family import graph, card, can_manage, bump
from ..util import unique_slug, parse_date, to_int
from .people import apply_submission
from .auth import create_reset

r = APIRouter(prefix="/api/admin", tags=["admin"])

def sub_out(s, db, g):
    u = db.get(m.User, s.user_id)
    tgt = g["people"].get(s.target_id) if s.kind not in ("education.delete", "career.delete", "marriage.update") and s.target_id else None
    return dict(id=s.id, kind=s.kind, status=s.status, payload=s.payload, target=card(tgt, u, g) if tgt else None, target_id=s.target_id,
                user=dict(id=u.id, name=u.name, email=u.email, phone=u.phone, join_note=u.join_note, status=u.status) if u else None,
                created_at=s.created_at.isoformat(), review_note=s.review_note)

def in_scope(g, admin, s: m.Submission):
    if admin.role == "super_admin":
        return True
    pl = s.payload or {}
    pid = s.target_id
    if s.kind == "person.create":
        pid = to_int((pl.get("relation") or {}).get("of"))
    elif s.kind == "marriage.add":
        pid = to_int(pl.get("a_id"))
    elif s.kind == "obituary.create":
        pid = to_int(pl.get("person_id"))
    return bool(pid and can_manage(g, admin, pid))

@r.get("/summary")
def summary(admin=Depends(admin_user), db: Session = Depends(get_db)):
    return dict(pending_changes=db.scalar(select(func.count()).where(m.Submission.status == "pending")) or 0,
                pending_users=db.scalar(select(func.count()).where(m.User.status == "pending")) or 0,
                pending_opps=db.scalar(select(func.count()).where(m.Opportunity.status == "pending")) or 0,
                pending_condolences=db.scalar(select(func.count()).where(m.Condolence.status == "pending")) or 0,
                machine_translations=db.scalar(select(func.count()).where(m.Person.bio_si_machine.is_(True))) or 0,
                suggestions=db.scalar(select(func.count()).where(m.Suggestion.status == "pending")) or 0)

@r.get("/changes")
def changes(status: str = "pending", admin=Depends(admin_user), db: Session = Depends(get_db)):
    g = graph(db)
    rows = db.scalars(select(m.Submission).where(m.Submission.status == status).order_by(m.Submission.id.desc()).limit(200))
    return [sub_out(s, db, g) for s in rows if in_scope(g, admin, s)]

class ReviewIn(BaseModel):
    note: str | None = None

@r.post("/changes/{sid}/approve")
def approve(sid: int, body: ReviewIn, admin=Depends(admin_user), db: Session = Depends(get_db)):
    s = db.get(m.Submission, sid)
    if not s or s.status != "pending":
        raise HTTPException(404, "Already handled")
    if not in_scope(graph(db), admin, s):
        raise HTTPException(403, "Outside your branch")
    apply_submission(db, s, reviewer_id=admin.id)
    s.review_note = body.note
    db.commit()
    return {"ok": True, "result_id": s.result_id}

@r.post("/changes/{sid}/reject")
def reject(sid: int, body: ReviewIn, admin=Depends(admin_user), db: Session = Depends(get_db)):
    s = db.get(m.Submission, sid)
    if not s or s.status != "pending":
        raise HTTPException(404)
    if not in_scope(graph(db), admin, s):
        raise HTTPException(403, "Outside your branch")
    s.status = "rejected"; s.review_note = body.note; s.reviewer_id = admin.id; s.reviewed_at = dt.datetime.now(dt.timezone.utc)
    db.add(m.Audit(user_id=admin.id, action="submission.reject", target=f"submission:{s.id}"))
    db.commit()
    return {"ok": True}

@r.get("/users")
def users(status: str | None = None, admin=Depends(admin_user), db: Session = Depends(get_db)):
    q = select(m.User).order_by(m.User.id.desc())
    if status:
        q = q.where(m.User.status == status)
    g = graph(db)
    out = []
    for u in db.scalars(q):
        claim = db.scalar(select(m.Submission).where(m.Submission.user_id == u.id, m.Submission.kind == "claim").order_by(m.Submission.id.desc()))
        cp = g["people"].get(claim.target_id) if claim else None
        out.append(dict(id=u.id, name=u.name, email=u.email, phone=u.phone, role=u.role, status=u.status, join_note=u.join_note,
                        person_id=u.person_id, branch_person_id=u.branch_person_id, created_at=u.created_at.isoformat(),
                        last_login_at=u.last_login_at.isoformat() if u.last_login_at else None,
                        claim=card(cp, admin, g) if cp else None, claim_id=claim.id if claim and claim.status == "pending" else None))
    return out

class UserIn(BaseModel):
    status: str | None = None
    role: str | None = None
    person_id: int | None = None
    branch_person_id: int | None = None

@r.post("/users/{uid}")
def update_user(uid: int, body: UserIn, admin=Depends(admin_user), db: Session = Depends(get_db)):
    u = db.get(m.User, uid)
    if not u:
        raise HTTPException(404)
    if body.role and admin.role != "super_admin":
        raise HTTPException(403, "Only the super admin changes roles")
    if u.role == "super_admin" and admin.id != u.id and admin.role != "super_admin":
        raise HTTPException(403)
    if body.status in ("approved", "rejected", "disabled", "pending"):
        u.status = body.status
        if body.status in ("rejected", "disabled"):
            u.token_version += 1
    if body.role in ("member", "family_admin", "super_admin"):
        u.role = body.role
    if body.person_id is not None:
        u.person_id = body.person_id or None
    if body.branch_person_id is not None:
        u.branch_person_id = body.branch_person_id or None
    db.add(m.Audit(user_id=admin.id, action="user.update", target=f"user:{uid}", detail=body.model_dump()))
    db.commit()
    return {"ok": True}

@r.post("/users/{uid}/reset-link")
def reset_link(uid: int, admin=Depends(admin_user), db: Session = Depends(get_db)):
    u = db.get(m.User, uid)
    if not u:
        raise HTTPException(404)
    link = create_reset(db, u, by=admin.id, hours=72)
    db.add(m.Audit(user_id=admin.id, action="user.reset_link", target=f"user:{uid}")); db.commit()
    return {"link": link, "note": "Share this privately (WhatsApp/SMS). It works once, for 72 hours."}

# ---------------- generic content CRUD ----------------
MODELS = {
    "events": (m.Event, ["kind", "title_en", "title_si", "edition", "starts_on", "start_time", "venue", "venue_si", "map_url", "sponsor", "attendance", "body_en", "body_si", "album_id", "cover_id", "rsvp_open", "status"]),
    "causes": (m.Cause, ["title_en", "title_si", "summary_en", "summary_si", "body_en", "body_si", "category", "status", "goal_amount", "raised_amount", "currency", "impact_number", "impact_label_en", "impact_label_si", "how_to_help_en", "how_to_help_si", "cover_id", "sort"]),
    "posts": (m.Post, ["kind", "title_en", "title_si", "body_en", "body_si", "cover_id", "published_on", "status", "visibility"]),
    "obituaries": (m.Obituary, ["person_id", "title_en", "title_si", "body_en", "body_si", "funeral_details", "published_on", "status"]),
    "albums": (m.Album, ["title_en", "title_si", "kind", "year", "description_en", "description_si", "cover_id", "visibility"]),
    "pages": (m.Page, ["title_en", "title_si", "body_en", "body_si", "section", "sort", "cover_id"]),
}

def coerce(model, k, v):
    col = model.__table__.columns.get(k)
    if col is None:
        return v
    t = str(col.type)
    if t == "DATE":
        return parse_date(v)
    if t == "INTEGER":
        return to_int(v)
    if t == "BOOLEAN":
        return bool(v)
    if t == "FLOAT":
        try:
            return float(v) if v not in (None, "") else None
        except (TypeError, ValueError):
            return None
    return v if v != "" else None

def row_out(obj):
    return {c.name: (getattr(obj, c.name).isoformat() if isinstance(getattr(obj, c.name), (dt.date, dt.datetime)) else getattr(obj, c.name))
            for c in obj.__table__.columns}

@r.get("/content/{kind}")
def list_content(kind: str, admin=Depends(admin_user), db: Session = Depends(get_db)):
    if kind not in MODELS:
        raise HTTPException(404)
    model, _ = MODELS[kind]
    return [row_out(x) for x in db.scalars(select(model).order_by(model.id.desc()).limit(500))]

@r.post("/content/{kind}")
def create_content(kind: str, body: dict, admin=Depends(admin_user), db: Session = Depends(get_db)):
    if kind not in MODELS:
        raise HTTPException(404)
    model, fields = MODELS[kind]
    obj = model(**{k: coerce(model, k, v) for k, v in body.items() if k in fields})
    if hasattr(model, "slug"):
        obj.slug = unique_slug(db, model, body.get("slug") or body.get("title_en") or kind)
    if kind == "obituaries" and obj.person_id:
        p = db.get(m.Person, obj.person_id)
        if p:
            p.is_living = False; bump()
    db.add(obj); db.flush()
    db.add(m.Audit(user_id=admin.id, action=f"{kind}.create", target=f"{kind}:{obj.id}")); db.commit()
    return row_out(obj)

@r.put("/content/{kind}/{oid}")
def update_content(kind: str, oid: int, body: dict, admin=Depends(admin_user), db: Session = Depends(get_db)):
    if kind not in MODELS:
        raise HTTPException(404)
    model, fields = MODELS[kind]
    obj = db.get(model, oid)
    if not obj:
        raise HTTPException(404)
    for k, v in body.items():
        if k in fields:
            setattr(obj, k, coerce(model, k, v))
    if hasattr(obj, "body_si_machine") and "body_si" in body:
        obj.body_si_machine = False
    db.add(m.Audit(user_id=admin.id, action=f"{kind}.update", target=f"{kind}:{oid}")); db.commit()
    return row_out(obj)

@r.delete("/content/{kind}/{oid}")
def delete_content(kind: str, oid: int, admin=Depends(super_admin), db: Session = Depends(get_db)):
    if kind not in MODELS:
        raise HTTPException(404)
    model, _ = MODELS[kind]
    obj = db.get(model, oid)
    if obj:
        db.delete(obj); db.add(m.Audit(user_id=admin.id, action=f"{kind}.delete", target=f"{kind}:{oid}")); db.commit()
    return {"ok": True}

@r.post("/causes/{cid}/updates")
def cause_update(cid: int, body: dict, admin=Depends(admin_user), db: Session = Depends(get_db)):
    db.add(m.CauseUpdate(cause_id=cid, body_en=body.get("body_en") or "", body_si=body.get("body_si"))); db.commit()
    return {"ok": True}

@r.get("/opportunities")
def pending_opps(admin=Depends(admin_user), db: Session = Depends(get_db)):
    from .content import opp_out
    return [opp_out(o, db) for o in db.scalars(select(m.Opportunity).where(m.Opportunity.status == "pending"))]

@r.post("/opportunities/{oid}/{action}")
def moderate_opp(oid: int, action: str, admin=Depends(admin_user), db: Session = Depends(get_db)):
    o = db.get(m.Opportunity, oid)
    if not o:
        raise HTTPException(404)
    o.status = {"approve": "open", "reject": "rejected", "close": "closed"}.get(action, o.status); db.commit()
    return {"ok": True, "status": o.status}

@r.get("/condolences")
def pending_condolences(admin=Depends(admin_user), db: Session = Depends(get_db)):
    return [dict(id=c.id, name=c.name, message=c.message, obituary_id=c.obituary_id, created_at=c.created_at.isoformat())
            for c in db.scalars(select(m.Condolence).where(m.Condolence.status == "pending"))]

@r.post("/condolences/{cid}/{action}")
def moderate_condolence(cid: int, action: str, admin=Depends(admin_user), db: Session = Depends(get_db)):
    c = db.get(m.Condolence, cid)
    if not c:
        raise HTTPException(404)
    if action == "approve":
        c.status = "approved"
    else:
        db.delete(c)
    db.commit()
    return {"ok": True}

@r.get("/translations")
def machine_translations(admin=Depends(admin_user), db: Session = Depends(get_db)):
    """Sinhala text produced by machine translation, waiting for a human check."""
    out = [dict(type="person", id=p.id, slug=p.slug, title=p.name_en, title_si=p.name_si, en=p.bio_en, si=p.bio_si)
           for p in db.scalars(select(m.Person).where(m.Person.bio_si_machine.is_(True)).order_by(m.Person.generation, m.Person.id))]
    out += [dict(type="page", id=p.id, slug=p.slug, title=p.title_en, title_si=p.title_si, en=p.body_en, si=p.body_si)
            for p in db.scalars(select(m.Page).where(m.Page.body_si_machine.is_(True)))]
    out += [dict(type="event", id=e.id, slug=e.slug, title=e.title_en, title_si=e.title_si, en=e.body_en, si=e.body_si)
            for e in db.scalars(select(m.Event).where(m.Event.body_si_machine.is_(True)))]
    return out

class TrIn(BaseModel):
    type: str
    id: int
    si: str
    title_si: str | None = None

@r.post("/translations")
def approve_translation(body: TrIn, admin=Depends(admin_user), db: Session = Depends(get_db)):
    model = {"person": m.Person, "page": m.Page, "event": m.Event}.get(body.type)
    obj = db.get(model, body.id) if model else None
    if not obj:
        raise HTTPException(404)
    if body.type == "person":
        obj.bio_si = body.si; obj.bio_si_machine = False
        if body.title_si:
            obj.name_si = body.title_si; obj.name_si_machine = False
        bump()
    else:
        obj.body_si = body.si; obj.body_si_machine = False
        if body.title_si:
            obj.title_si = body.title_si
    db.commit()
    return {"ok": True}

@r.get("/rsvps/{event_id}")
def rsvps(event_id: int, admin=Depends(admin_user), db: Session = Depends(get_db)):
    rows = db.execute(select(m.Rsvp, m.User).join(m.User, m.User.id == m.Rsvp.user_id).where(m.Rsvp.event_id == event_id)).all()
    return [dict(name=u.name, phone=u.phone, email=u.email, adults=r_.adults, children=r_.children, response=r_.response, note=r_.note) for r_, u in rows]

@r.get("/audit")
def audit(admin=Depends(super_admin), db: Session = Depends(get_db)):
    return [dict(id=a.id, user_id=a.user_id, action=a.action, target=a.target, detail=a.detail, at=a.at.isoformat())
            for a in db.scalars(select(m.Audit).order_by(m.Audit.id.desc()).limit(300))]


# ---------------- research suggestions (review queue, never auto-published) ----------------
@r.get("/suggestions")
def suggestions(status: str = "pending", admin=Depends(admin_user), db: Session = Depends(get_db)):
    g = graph(db)
    rows = db.scalars(select(m.Suggestion).where(m.Suggestion.status == status).order_by(m.Suggestion.person_id, m.Suggestion.id).limit(500))
    out = []
    for s in rows:
        if s.person_id and not can_manage(g, admin, s.person_id):
            continue
        p = g["people"].get(s.person_id)
        out.append(dict(id=s.id, person=card(p, admin, g) if p else None, person_hint=s.person_hint, field=s.field, value=s.value,
                        summary=s.summary, source_url=s.source_url, source_title=s.source_title, confidence=s.confidence, status=s.status))
    return out

@r.post("/suggestions/{sid}/{action}")
def review_suggestion(sid: int, action: str, admin=Depends(admin_user), db: Session = Depends(get_db)):
    s = db.get(m.Suggestion, sid)
    if not s or s.status != "pending":
        raise HTTPException(404, "Already handled")
    if s.person_id and not can_manage(graph(db), admin, s.person_id):
        raise HTTPException(403, "Outside your branch")
    if action == "approve" and s.person_id:
        p = db.get(m.Person, s.person_id)
        v = s.value if isinstance(s.value, dict) else {"text": s.value}
        if s.field == "education":
            db.add(m.Education(person_id=p.id, institution=v.get("institution") or v.get("text") or "?", qualification=v.get("qualification"),
                               field=v.get("field"), level=v.get("level"), year_from=to_int(v.get("year_from")), year_to=to_int(v.get("year_to"))))
        elif s.field in ("career", "job"):
            db.add(m.Career(person_id=p.id, title=v.get("title") or v.get("text") or "?", organization=v.get("organization"),
                            location=v.get("location"), year_from=to_int(v.get("year_from")), year_to=to_int(v.get("year_to")), current=bool(v.get("current"))))
        elif s.field in ("profession", "hometown", "skills", "known_as", "residence"):
            setattr(p, s.field, v.get("text") or v.get(s.field) or s.summary)
        elif s.field == "link":
            links = dict(p.links or {}); links[v.get("label") or "web"] = v.get("url") or s.source_url; p.links = links
        elif s.field in ("bio_note", "bio"):
            p.bio_en = ((p.bio_en or "") + "\n\n" + (v.get("text") or s.summary or "")).strip()
        bump()
    s.status = "approved" if action == "approve" else "rejected"
    s.reviewer_id = admin.id; s.reviewed_at = dt.datetime.now(dt.timezone.utc)
    db.add(m.Audit(user_id=admin.id, action=f"suggestion.{s.status}", target=f"suggestion:{s.id}"))
    db.commit()
    return {"ok": True}
