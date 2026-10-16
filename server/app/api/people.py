import datetime as dt
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy import select, or_, func
from sqlalchemy.orm import Session
from ..db import get_db
from .. import models as m
from ..security import current_user_optional, approved_member, current_user, admin_user
from ..family import graph, card, full, can_manage, is_own, bump, deceased, media_url, show_details
from ..util import unique_slug, parse_date, to_int
from ..media import process_image

r = APIRouter(prefix="/api", tags=["people"])

def get_person(db, key):
    p = db.get(m.Person, int(key)) if str(key).isdigit() else db.scalar(select(m.Person).where(m.Person.slug == key))
    if not p or p.status != "approved":
        raise HTTPException(404, "Not found")
    return p

@r.get("/tree")
def tree(user=Depends(current_user_optional), db: Session = Depends(get_db)):
    g = graph(db)
    nodes = []
    for p in g["people"].values():
        c = card(p, user, g)
        c["spouse_ids"] = [s for s, _ in g["spouses"].get(p.id, [])]
        c["parent_ids"] = g["parents"].get(p.id, [])
        c["sibling_order"] = p.sibling_order
        nodes.append(c)
    return {"nodes": nodes, "root_ids": [p.id for p in g["people"].values() if p.slug in ("ukkubanda", "lokumenike")]}

@r.get("/people")
def people(q: str = "", branch: int | None = None, limit: int = 40, user=Depends(current_user_optional), db: Session = Depends(get_db)):
    g = graph(db)
    ql = q.strip().lower()
    out = []
    for p in g["people"].values():
        if branch and p.branch_no != branch:
            continue
        if ql and ql not in (p.name_en or "").lower() and ql not in (p.name_si or "") and ql not in (p.known_as or "").lower():
            continue
        out.append(card(p, user, g))
    out.sort(key=lambda c: (not (c["name_en"] or "").lower().startswith(ql), c["generation"] or 9, c["name_en"]))
    return out[: max(1, min(limit, 500))]

@r.get("/people/{key}")
def person(key: str, user=Depends(current_user_optional), db: Session = Depends(get_db)):
    p = get_person(db, key)
    return full(p, user, graph(db), db)

@r.get("/directory")
def directory(q: str = "", user=Depends(approved_member), db: Session = Depends(get_db)):
    """Members-only skills & careers directory (who can help with what)."""
    ql = q.strip().lower()
    g = graph(db)
    rows = db.execute(select(m.Career, m.Person).join(m.Person, m.Person.id == m.Career.person_id)).all()
    edu = db.execute(select(m.Education, m.Person).join(m.Person, m.Person.id == m.Education.person_id)).all()
    by = {}
    for c, p in rows:
        if deceased(p) or p.privacy == "private":
            continue
        by.setdefault(p.id, {"person": card(p, user, g), "profession": p.profession, "skills": p.skills, "careers": [], "education": []})
        by[p.id]["careers"].append({"title": c.title, "organization": c.organization, "industry": c.industry, "current": c.current, "open_to_mentor": c.open_to_mentor})
    for e, p in edu:
        if p.id in by:
            by[p.id]["education"].append({"institution": e.institution, "qualification": e.qualification, "field": e.field})
    for p in g["people"].values():
        if p.profession and p.id not in by and not deceased(p) and p.privacy != "private":
            by[p.id] = {"person": card(p, user, g), "profession": p.profession, "skills": p.skills, "careers": [], "education": []}
    out = list(by.values())
    if ql:
        out = [x for x in out if ql in str(x).lower()]
    return out

# ---------- edits: direct for admins in scope, queued for everyone else ----------
PERSON_FIELDS = {"name_en", "name_si", "known_as", "gender", "birth_date", "birth_year", "death_date", "death_year", "is_living",
                 "birthplace", "hometown", "residence", "profession", "skills", "bio_en", "bio_si", "privacy", "email", "phone",
                 "address", "links", "photo_id"}
SELF_DIRECT = {"privacy", "email", "phone", "address", "residence", "links", "skills", "profession"}

def clean_person_fields(d):
    out = {}
    for k, v in (d or {}).items():
        if k not in PERSON_FIELDS:
            continue
        if k in ("birth_date", "death_date"):
            v = parse_date(v)
        elif k in ("birth_year", "death_year", "photo_id"):
            v = to_int(v)
        elif k == "privacy" and v not in ("public", "members", "private"):
            continue
        elif k == "gender" and v not in ("M", "F", None):
            continue
        elif isinstance(v, str):
            v = v.strip()[:20000] or None
        out[k] = v
    if out.get("birth_date") and not out.get("birth_year"):
        out["birth_year"] = out["birth_date"].year
    if out.get("death_date") and not out.get("death_year"):
        out["death_year"] = out["death_date"].year
    if out.get("death_year") or out.get("death_date"):
        out["is_living"] = False
    if "bio_si" in out:
        out["bio_si_machine"] = False
    if "name_si" in out:
        out["name_si_machine"] = False
    return out

def jsonable(d):
    return {k: (v.isoformat() if isinstance(v, (dt.date, dt.datetime)) else v) for k, v in d.items()}

def apply_submission(db, sub: m.Submission, reviewer_id=None):
    k, pl = sub.kind, sub.payload or {}
    result = None
    if k == "person.update":
        p = db.get(m.Person, sub.target_id)
        for f, v in clean_person_fields(pl.get("fields")).items():
            setattr(p, f, v)
        result = p.id
    elif k == "person.create":
        f = clean_person_fields(pl.get("fields"))
        rel = pl.get("relation") or {}
        anchor = db.get(m.Person, to_int(rel.get("of"))) if rel.get("of") else None
        p = m.Person(slug=unique_slug(db, m.Person, f.get("name_en") or "member"), name_en=f.pop("name_en", None) or "Unnamed", created_by=sub.user_id, **f)
        if p.is_living is None and not (p.death_year or p.death_date):
            p.is_living = True
        if anchor:
            p.branch_no = anchor.branch_no
            if rel.get("type") == "child":
                p.generation = (anchor.generation or 0) + 1; p.is_descendant = anchor.is_descendant
            elif rel.get("type") == "spouse":
                p.generation = anchor.generation; p.is_descendant = False
            elif rel.get("type") == "parent":
                p.generation = (anchor.generation or 1) - 1; p.is_descendant = False
        db.add(p); db.flush()
        if anchor:
            t = rel.get("type")
            if t == "child":
                db.add(m.ParentChild(parent_id=anchor.id, child_id=p.id))
                if rel.get("other_parent_id"):
                    db.add(m.ParentChild(parent_id=int(rel["other_parent_id"]), child_id=p.id))
            elif t == "parent":
                db.add(m.ParentChild(parent_id=p.id, child_id=anchor.id))
            elif t == "spouse":
                db.add(m.Marriage(a_id=anchor.id, b_id=p.id, married_year=to_int(rel.get("year")), married_on=parse_date(rel.get("date")), place=rel.get("place")))
        result = p.id
    elif k == "education.add":
        e = m.Education(person_id=sub.target_id, **{x: pl.get(x) for x in ("institution", "qualification", "field", "level", "honours")},
                        year_from=to_int(pl.get("year_from")), year_to=to_int(pl.get("year_to")))
        db.add(e); db.flush(); result = e.id
    elif k == "career.add":
        c = m.Career(person_id=sub.target_id, **{x: pl.get(x) for x in ("title", "organization", "industry", "location")},
                     year_from=to_int(pl.get("year_from")), year_to=to_int(pl.get("year_to")), current=bool(pl.get("current")), open_to_mentor=bool(pl.get("open_to_mentor")))
        db.add(c); db.flush(); result = c.id
    elif k == "education.delete":
        e = db.get(m.Education, sub.target_id); e and db.delete(e)
    elif k == "career.delete":
        c = db.get(m.Career, sub.target_id); c and db.delete(c)
    elif k == "marriage.add":
        mr = m.Marriage(a_id=to_int(pl.get("a_id")), b_id=to_int(pl.get("b_id")), married_year=to_int(pl.get("year")),
                        married_on=parse_date(pl.get("date")), place=pl.get("place"), status=pl.get("status") or "married")
        db.add(mr); db.flush(); result = mr.id
    elif k == "marriage.update":
        mr = db.get(m.Marriage, sub.target_id)
        if mr:
            mr.married_year = to_int(pl.get("year")) or mr.married_year; mr.married_on = parse_date(pl.get("date")) or mr.married_on
            mr.place = pl.get("place") or mr.place; mr.status = pl.get("status") or mr.status
    elif k == "photo.add":
        md = db.get(m.Media, to_int(pl.get("media_id")))
        if md:
            md.person_id = sub.target_id
            if pl.get("set_profile"):
                db.get(m.Person, sub.target_id).photo_id = md.id
        result = md.id if md else None
    elif k == "claim":
        u = db.get(m.User, sub.user_id)
        u.person_id = sub.target_id
        if u.status == "pending":
            u.status = "approved"
    elif k == "obituary.create":
        from .content import make_obituary
        result = make_obituary(db, pl, sub.user_id)
    else:
        raise HTTPException(400, "Unknown change type")
    sub.status = "approved"; sub.result_id = result; sub.reviewer_id = reviewer_id
    sub.reviewed_at = dt.datetime.now(dt.timezone.utc)
    db.add(m.Audit(user_id=reviewer_id, action="submission.apply", target=f"submission:{sub.id}", detail={"kind": k}))
    bump()
    return result

class ChangeIn(BaseModel):
    kind: str
    target_id: int | None = None
    payload: dict = {}

@r.post("/changes")
def propose(body: ChangeIn, user=Depends(approved_member), db: Session = Depends(get_db)):
    g = graph(db)
    kinds = {"person.update", "person.create", "education.add", "career.add", "education.delete", "career.delete", "marriage.add", "marriage.update", "photo.add", "obituary.create"}
    if body.kind not in kinds:
        raise HTTPException(400, "Unknown change type")
    target = body.target_id
    if body.kind in ("education.delete", "career.delete"):
        row = db.get(m.Education if body.kind.startswith("education") else m.Career, target or 0)
        if not row:
            raise HTTPException(404, "Not found")
        scope_pid = row.person_id
    elif body.kind == "person.create":
        scope_pid = to_int((body.payload.get("relation") or {}).get("of"))
    elif body.kind == "marriage.add":
        scope_pid = to_int(body.payload.get("a_id"))
    elif body.kind == "obituary.create":
        scope_pid = to_int(body.payload.get("person_id"))
    else:
        scope_pid = target
    if body.kind in ("person.update", "education.add", "career.add", "photo.add") and not db.get(m.Person, target or 0):
        raise HTTPException(404, "Person not found")
    sub = m.Submission(user_id=user.id, kind=body.kind, target_id=target, payload=jsonable(body.payload))
    db.add(sub); db.flush()
    direct = scope_pid and can_manage(g, user, scope_pid)
    # people may change their own privacy & contact details straight away
    if not direct and body.kind == "person.update" and is_own(user, target):
        fields = body.payload.get("fields") or {}
        if set(fields) <= SELF_DIRECT:
            direct = True
    if direct:
        apply_submission(db, sub, reviewer_id=user.id)
    db.commit()
    return {"id": sub.id, "status": sub.status, "result_id": sub.result_id}

@r.get("/changes/mine")
def my_changes(user=Depends(current_user), db: Session = Depends(get_db)):
    rows = db.scalars(select(m.Submission).where(m.Submission.user_id == user.id).order_by(m.Submission.id.desc()).limit(100))
    return [dict(id=s.id, kind=s.kind, target_id=s.target_id, payload=s.payload, status=s.status, review_note=s.review_note,
                 created_at=s.created_at.isoformat()) for s in rows]

@r.post("/media")
async def upload(file: UploadFile = File(...), caption: str = Form(""), person_id: int | None = Form(None), set_profile: bool = Form(False),
                 album_id: int | None = Form(None), user=Depends(approved_member), db: Session = Depends(get_db)):
    data = await file.read()
    if len(data) > 15 * 1024 * 1024:
        raise HTTPException(413, "Max 15 MB per photo")
    try:
        f, t, w_, h_ = process_image(data)
    except Exception:
        raise HTTPException(400, "That file isn't a photo we can read")
    md = m.Media(file=f, thumb=t, width=w_, height=h_, caption_en=caption[:500] or None, uploaded_by=user.id,
                 album_id=album_id if (album_id and user.role in ("super_admin", "family_admin")) else None,
                 visibility="public" if (album_id and user.role in ("super_admin", "family_admin")) else "members")
    db.add(md); db.flush()
    status = "uploaded"
    if person_id:
        sub = m.Submission(user_id=user.id, kind="photo.add", target_id=person_id, payload={"media_id": md.id, "set_profile": set_profile})
        db.add(sub); db.flush()
        if can_manage(graph(db), user, person_id) or is_own(user, person_id):
            apply_submission(db, sub, reviewer_id=user.id)
        status = sub.status
    db.commit()
    return {"id": md.id, "thumb": media_url(md.id, "t"), "src": media_url(md.id, "m"), "status": status}

@r.get("/relation")
def relation_path(a: int, b: int, user=Depends(current_user_optional), db: Session = Depends(get_db)):
    """Shortest path through parent/child/spouse links (for the 'how are we related' highlight)."""
    g = graph(db)
    if a not in g["people"] or b not in g["people"]:
        raise HTTPException(404, "Not found")
    from collections import deque
    prev = {a: None}; dq = deque([a])
    while dq:
        x = dq.popleft()
        if x == b:
            break
        nbrs = [(p, "parent") for p in g["parents"].get(x, [])] + [(c, "child") for c in g["children"].get(x, [])] + [(s, "spouse") for s, _ in g["spouses"].get(x, [])]
        for y, how in nbrs:
            if y not in prev:
                prev[y] = (x, how); dq.append(y)
    if b not in prev:
        return {"path": []}
    path, cur = [], b
    while prev[cur]:
        x, how = prev[cur]; path.append({"from": x, "to": cur, "step": how}); cur = x
    path.reverse()
    return {"path": path, "people": [card(g["people"][i], user, g) for i in [a] + [s["to"] for s in path]]}
