import datetime as dt
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from ..db import get_db
from .. import models as m
from ..config import MEDIA_DIR
from ..security import current_user_optional, approved_member, current_user, rate_limit, is_admin
from ..family import graph, card, deceased, media_url, show_details, level
from ..util import unique_slug, parse_date, to_int

r = APIRouter(tags=["content"])

def tr(obj, field, lang):
    v = getattr(obj, f"{field}_{lang}", None)
    return v or getattr(obj, f"{field}_en", None)

# ---------------- media ----------------
@r.get("/media/{mid}/{size}.webp")
def media_file(mid: int, size: str, user=Depends(current_user_optional), db: Session = Depends(get_db)):
    md = db.get(m.Media, mid)
    if not md:
        raise HTTPException(404)
    allowed = md.visibility == "public"
    if md.person_id:
        p = db.get(m.Person, md.person_id)
        allowed = bool(p and show_details(p, user))
    if not allowed and md.album_id:
        al = db.get(m.Album, md.album_id)
        allowed = bool(al and (al.visibility == "public" or level(user) != "public"))
    if not allowed and level(user) != "public":
        allowed = True
    if not allowed:
        raise HTTPException(404)
    path = MEDIA_DIR / (md.thumb if size == "t" and md.thumb else md.file)
    if not path.exists():
        raise HTTPException(404)
    cache = "public, max-age=2592000, immutable" if md.visibility == "public" or not md.person_id else "private, max-age=86400"
    return FileResponse(path, media_type="image/webp", headers={"Cache-Control": cache})

@r.get("/api/albums")
def albums(user=Depends(current_user_optional), db: Session = Depends(get_db)):
    lv = level(user)
    q = select(m.Album).order_by(m.Album.year.desc().nulls_last(), m.Album.id.desc())
    out = []
    counts = dict(db.execute(select(m.Media.album_id, func.count()).group_by(m.Media.album_id)).all())
    for a in db.scalars(q):
        if a.visibility != "public" and lv == "public":
            continue
        out.append(dict(id=a.id, slug=a.slug, title_en=a.title_en, title_si=a.title_si, kind=a.kind, year=a.year,
                        cover=media_url(a.cover_id, "t"), count=counts.get(a.id, 0)))
    return out

@r.get("/api/albums/{slug}")
def album(slug: str, user=Depends(current_user_optional), db: Session = Depends(get_db)):
    a = db.scalar(select(m.Album).where(m.Album.slug == slug))
    if not a or (a.visibility != "public" and level(user) == "public"):
        raise HTTPException(404)
    photos = db.scalars(select(m.Media).where(m.Media.album_id == a.id).order_by(m.Media.id))
    return dict(id=a.id, slug=a.slug, title_en=a.title_en, title_si=a.title_si, kind=a.kind, year=a.year,
                description_en=a.description_en, description_si=a.description_si,
                photos=[dict(id=x.id, thumb=media_url(x.id, "t"), src=media_url(x.id, "m"), caption=x.caption_en, w=x.width, h=x.height) for x in photos])

# ---------------- pages ----------------
@r.get("/api/pages")
def pages(db: Session = Depends(get_db)):
    return [dict(slug=p.slug, title_en=p.title_en, title_si=p.title_si, section=p.section) for p in db.scalars(select(m.Page).order_by(m.Page.sort))]

@r.get("/api/pages/{slug}")
def page(slug: str, db: Session = Depends(get_db)):
    p = db.scalar(select(m.Page).where(m.Page.slug == slug))
    if not p:
        raise HTTPException(404)
    return dict(slug=p.slug, title_en=p.title_en, title_si=p.title_si, body_en=p.body_en, body_si=p.body_si,
                body_si_machine=p.body_si_machine, section=p.section, cover=media_url(p.cover_id, "m"))

# ---------------- events ----------------
def event_out(e, db, user=None, detail=False):
    d = dict(id=e.id, slug=e.slug, kind=e.kind, title_en=e.title_en, title_si=e.title_si, edition=e.edition,
             starts_on=e.starts_on.isoformat() if e.starts_on else None, start_time=e.start_time, venue=e.venue, venue_si=e.venue_si,
             sponsor=e.sponsor, attendance=e.attendance, rsvp_open=e.rsvp_open, cover=media_url(e.cover_id, "m"), map_url=e.map_url,
             upcoming=bool(e.starts_on and e.starts_on >= dt.date.today()))
    if detail:
        d.update(body_en=e.body_en, body_si=e.body_si, body_si_machine=e.body_si_machine)
        if e.album_id:
            a = db.get(m.Album, e.album_id)
            if a and (a.visibility == "public" or level(user) != "public"):
                d["album"] = album(a.slug, user, db)
        rows = db.execute(select(func.coalesce(func.sum(m.Rsvp.adults), 0), func.coalesce(func.sum(m.Rsvp.children), 0)).where(m.Rsvp.event_id == e.id, m.Rsvp.response == "yes")).one()
        d["rsvp_totals"] = {"adults": int(rows[0]), "children": int(rows[1])}
        if user:
            mine = db.scalar(select(m.Rsvp).where(m.Rsvp.event_id == e.id, m.Rsvp.user_id == user.id))
            d["my_rsvp"] = dict(adults=mine.adults, children=mine.children, response=mine.response, note=mine.note) if mine else None
    return d

@r.get("/api/events")
def events(user=Depends(current_user_optional), db: Session = Depends(get_db)):
    rows = db.scalars(select(m.Event).where(m.Event.status == "published").order_by(m.Event.starts_on.desc().nulls_last()))
    return [event_out(e, db) for e in rows]

@r.get("/api/events/{slug}")
def event(slug: str, user=Depends(current_user_optional), db: Session = Depends(get_db)):
    e = db.scalar(select(m.Event).where(m.Event.slug == slug))
    if not e:
        raise HTTPException(404)
    return event_out(e, db, user, True)

class RsvpIn(BaseModel):
    adults: int = 1
    children: int = 0
    response: str = "yes"
    note: str | None = None

@r.post("/api/events/{slug}/rsvp")
def rsvp(slug: str, body: RsvpIn, user=Depends(approved_member), db: Session = Depends(get_db)):
    e = db.scalar(select(m.Event).where(m.Event.slug == slug))
    if not e or not e.rsvp_open:
        raise HTTPException(400, "RSVP is not open for this event")
    row = db.scalar(select(m.Rsvp).where(m.Rsvp.event_id == e.id, m.Rsvp.user_id == user.id)) or m.Rsvp(event_id=e.id, user_id=user.id)
    row.adults = max(0, min(body.adults, 30)); row.children = max(0, min(body.children, 30))
    row.response = body.response if body.response in ("yes", "maybe", "no") else "yes"; row.note = (body.note or "")[:1000]
    db.add(row); db.commit()
    return event_out(e, db, user, True)

# ---------------- obituaries ----------------
def make_obituary(db, pl, user_id):
    p = db.get(m.Person, to_int(pl.get("person_id"))) if pl.get("person_id") else None
    title = pl.get("title_en") or (p and f"In loving memory of {p.name_en}") or "In loving memory"
    ob = m.Obituary(slug=unique_slug(db, m.Obituary, (p.name_en if p else title)), person_id=p.id if p else None, title_en=title,
                    title_si=pl.get("title_si"), body_en=pl.get("body_en"), body_si=pl.get("body_si"), funeral_details=pl.get("funeral_details"),
                    published_on=parse_date(pl.get("published_on")) or dt.date.today(), created_by=user_id)
    if p:
        if pl.get("death_date"):
            p.death_date = parse_date(pl["death_date"]); p.death_year = p.death_date.year if p.death_date else p.death_year
        elif pl.get("death_year"):
            p.death_year = to_int(pl["death_year"])
        p.is_living = False
    db.add(ob); db.flush()
    return ob.id

def obit_out(o, db, user, detail=False):
    g = graph(db)
    p = g["people"].get(o.person_id) if o.person_id else None
    d = dict(id=o.id, slug=o.slug, title_en=o.title_en, title_si=o.title_si, published_on=o.published_on.isoformat() if o.published_on else None,
             person=card(p, user, g) if p else None, lamps=db.scalar(select(func.count()).where(m.Condolence.obituary_id == o.id, m.Condolence.lit_lamp.is_(True))) or 0)
    if p:
        d["photo"] = media_url(p.photo_id, "m") if p.photo_id else None
    if detail:
        d.update(body_en=o.body_en, body_si=o.body_si, funeral_details=o.funeral_details if level(user) != "public" else None)
        d["condolences"] = [dict(id=c.id, name=c.name, message=c.message, lit_lamp=c.lit_lamp, created_at=c.created_at.isoformat())
                            for c in db.scalars(select(m.Condolence).where(m.Condolence.obituary_id == o.id, m.Condolence.status == "approved").order_by(m.Condolence.id.desc()))]
    return d

@r.get("/api/obituaries")
def obituaries(user=Depends(current_user_optional), db: Session = Depends(get_db)):
    return [obit_out(o, db, user) for o in db.scalars(select(m.Obituary).where(m.Obituary.status == "published").order_by(m.Obituary.published_on.desc().nulls_last()))]

@r.get("/api/obituaries/{slug}")
def obituary(slug: str, user=Depends(current_user_optional), db: Session = Depends(get_db)):
    o = db.scalar(select(m.Obituary).where(m.Obituary.slug == slug))
    if not o or o.status != "published":
        raise HTTPException(404)
    return obit_out(o, db, user, True)

class CondIn(BaseModel):
    name: str | None = None
    message: str
    lit_lamp: bool = True

@r.post("/api/obituaries/{slug}/condolences")
def condole(slug: str, body: CondIn, request: Request, user=Depends(current_user_optional), db: Session = Depends(get_db)):
    rate_limit("cond:" + (request.client.host if request.client else "x"), 6, 3600)
    o = db.scalar(select(m.Obituary).where(m.Obituary.slug == slug))
    if not o:
        raise HTTPException(404)
    name = (user.name if user else (body.name or "").strip())[:200]
    if not name or not body.message.strip():
        raise HTTPException(400, "Add your name and a few words")
    trusted = bool(user and user.status == "approved")
    db.add(m.Condolence(obituary_id=o.id, user_id=user.id if user else None, name=name, message=body.message.strip()[:3000],
                        lit_lamp=body.lit_lamp, status="approved" if trusted else "pending"))
    db.commit()
    return {"ok": True, "status": "approved" if trusted else "pending"}

# ---------------- causes ----------------
def cause_out(c, db, detail=False):
    d = dict(id=c.id, slug=c.slug, title_en=c.title_en, title_si=c.title_si, summary_en=c.summary_en, summary_si=c.summary_si,
             category=c.category, status=c.status, goal_amount=c.goal_amount, raised_amount=c.raised_amount, currency=c.currency,
             impact_number=c.impact_number, impact_label_en=c.impact_label_en, impact_label_si=c.impact_label_si, cover=media_url(c.cover_id, "m"))
    if detail:
        d.update(body_en=c.body_en, body_si=c.body_si, how_to_help_en=c.how_to_help_en, how_to_help_si=c.how_to_help_si,
                 updates=[dict(id=u.id, body_en=u.body_en, body_si=u.body_si, created_at=u.created_at.isoformat())
                          for u in db.scalars(select(m.CauseUpdate).where(m.CauseUpdate.cause_id == c.id).order_by(m.CauseUpdate.id.desc()))])
    return d

@r.get("/api/causes")
def causes(db: Session = Depends(get_db)):
    return [cause_out(c, db) for c in db.scalars(select(m.Cause).where(m.Cause.status != "draft").order_by(m.Cause.sort, m.Cause.id))]

@r.get("/api/causes/{slug}")
def cause(slug: str, db: Session = Depends(get_db)):
    c = db.scalar(select(m.Cause).where(m.Cause.slug == slug))
    if not c or c.status == "draft":
        raise HTTPException(404)
    return cause_out(c, db, True)

# ---------------- news ----------------
def post_out(p, detail=False):
    d = dict(id=p.id, slug=p.slug, kind=p.kind, title_en=p.title_en, title_si=p.title_si, cover=media_url(p.cover_id, "m"),
             published_on=p.published_on.isoformat() if p.published_on else None,
             excerpt_en=(p.body_en or "")[:220], excerpt_si=(p.body_si or "")[:220])
    if detail:
        d.update(body_en=p.body_en, body_si=p.body_si, body_si_machine=p.body_si_machine)
    return d

@r.get("/api/posts")
def posts(user=Depends(current_user_optional), db: Session = Depends(get_db)):
    q = select(m.Post).where(m.Post.status == "published").order_by(m.Post.published_on.desc().nulls_last(), m.Post.id.desc())
    return [post_out(p) for p in db.scalars(q) if p.visibility == "public" or level(user) != "public"]

@r.get("/api/posts/{slug}")
def post(slug: str, user=Depends(current_user_optional), db: Session = Depends(get_db)):
    p = db.scalar(select(m.Post).where(m.Post.slug == slug))
    if not p or p.status != "published" or (p.visibility != "public" and level(user) == "public"):
        raise HTTPException(404)
    return post_out(p, True)

# ---------------- opportunities (members) ----------------
class OppIn(BaseModel):
    kind: str = "job"
    title: str
    organization: str | None = None
    location: str | None = None
    description: str | None = None
    contact: str | None = None
    link: str | None = None
    expires_on: str | None = None

def opp_out(o, db):
    u = db.get(m.User, o.posted_by) if o.posted_by else None
    return dict(id=o.id, kind=o.kind, title=o.title, organization=o.organization, location=o.location, description=o.description,
                contact=o.contact, link=o.link, expires_on=o.expires_on.isoformat() if o.expires_on else None, status=o.status,
                posted_by=u.name if u else None, created_at=o.created_at.isoformat())

@r.get("/api/opportunities")
def opps(user=Depends(approved_member), db: Session = Depends(get_db)):
    q = select(m.Opportunity).order_by(m.Opportunity.id.desc())
    out = []
    for o in db.scalars(q):
        if o.status == "open" or o.posted_by == user.id or is_admin(user):
            if o.status == "open" and o.expires_on and o.expires_on < dt.date.today():
                continue
            out.append(opp_out(o, db))
    return out

@r.get("/api/opportunities/count")
def opp_count(db: Session = Depends(get_db)):
    return {"open": db.scalar(select(func.count()).where(m.Opportunity.status == "open")) or 0}

@r.post("/api/opportunities")
def post_opp(body: OppIn, user=Depends(approved_member), db: Session = Depends(get_db)):
    o = m.Opportunity(kind=body.kind if body.kind in ("job", "internship", "mentorship", "scholarship", "help") else "job",
                      title=body.title.strip()[:255], organization=body.organization, location=body.location,
                      description=(body.description or "")[:6000], contact=body.contact, link=body.link,
                      expires_on=parse_date(body.expires_on), posted_by=user.id, status="open" if is_admin(user) else "pending")
    db.add(o); db.commit()
    return opp_out(o, db)

@r.post("/api/opportunities/{oid}/close")
def close_opp(oid: int, user=Depends(approved_member), db: Session = Depends(get_db)):
    o = db.get(m.Opportunity, oid)
    if not o or (o.posted_by != user.id and not is_admin(user)):
        raise HTTPException(404)
    o.status = "closed"; db.commit()
    return opp_out(o, db)

# ---------------- home helpers ----------------
@r.get("/api/stats")
def stats(db: Session = Depends(get_db)):
    g = graph(db)
    ppl = g["people"].values()
    gens = {p.generation for p in ppl if p.generation is not None}
    return dict(people=len(g["people"]), descendants=sum(1 for p in ppl if p.is_descendant),
                generations=(max(gens) - min(gens) + 1) if gens else 0,
                reunions=db.scalar(select(func.count()).where(m.Event.kind == "reunion")) or 0,
                photos=db.scalar(select(func.count(m.Media.id))) or 0,
                since=1887, members=db.scalar(select(func.count()).where(m.User.status == "approved")) or 0)

@r.get("/api/onthisday")
def on_this_day(user=Depends(current_user_optional), db: Session = Depends(get_db)):
    """Exact-date birthdays & anniversaries (members see the living), plus milestone years for everyone."""
    g = graph(db)
    today = dt.date.today()
    lv = level(user)
    out = {"today": [], "this_year": []}
    for p in g["people"].values():
        dec = deceased(p)
        if p.birth_date and p.birth_date.month == today.month and p.birth_date.day == today.day and (dec or lv != "public"):
            out["today"].append(dict(kind="born", years=today.year - p.birth_date.year, person=card(p, user, g)))
        if p.death_date and p.death_date.month == today.month and p.death_date.day == today.day:
            out["today"].append(dict(kind="remembered", years=today.year - p.death_date.year, person=card(p, user, g)))
        if dec and p.birth_year and (today.year - p.birth_year) % 25 == 0 and today.year - p.birth_year >= 50:
            out["this_year"].append(dict(kind="birth_milestone", years=today.year - p.birth_year, person=card(p, user, g)))
        if p.death_year and (today.year - p.death_year) in (10, 25, 50, 75, 100):
            out["this_year"].append(dict(kind="death_milestone", years=today.year - p.death_year, person=card(p, user, g)))
    for sid_list in []:
        pass
    seen = set()
    for a, lst in g["spouses"].items():
        for b, mr in lst:
            if mr.id in seen or not mr.married_on:
                continue
            seen.add(mr.id)
            if mr.married_on.month == today.month and mr.married_on.day == today.day and lv != "public":
                out["today"].append(dict(kind="anniversary", years=today.year - mr.married_on.year,
                                         person=card(g["people"][a], user, g), other=card(g["people"][b], user, g)))
    out["this_year"].sort(key=lambda x: -x["years"])
    return out


@r.get("/api/home")
def home(user=Depends(current_user_optional), db: Session = Depends(get_db)):
    g = graph(db)
    ppl = g["people"]
    thirteen = []
    for p in sorted([p for p in ppl.values() if p.generation == 2 and p.branch_no and p.is_descendant], key=lambda x: x.branch_no):
        c = card(p, user, g)
        c["spouse"] = [card(ppl[s], user, g) for s, _ in g["spouses"].get(p.id, [])][:1]
        c["hometown"] = p.hometown
        c["descendants"] = sum(1 for q in ppl.values() if q.branch_no == p.branch_no and q.is_descendant) - 1
        thirteen.append(c)
    founders = [card(p, user, g) for p in ppl.values() if p.slug in ("ukkubanda", "lokumenike", "mudalihami")]
    upcoming = db.scalars(select(m.Event).where(m.Event.status == "published", m.Event.starts_on >= dt.date.today()).order_by(m.Event.starts_on).limit(2)).all()
    last = db.scalars(select(m.Event).where(m.Event.status == "published", m.Event.starts_on < dt.date.today()).order_by(m.Event.starts_on.desc()).limit(3)).all()
    heritage = db.scalar(select(m.Album).where(m.Album.slug == "heritage"))
    hphotos = [dict(id=x.id, src=media_url(x.id, "m"), thumb=media_url(x.id, "t"), caption=x.caption_en, w=x.width, h=x.height)
               for x in db.scalars(select(m.Media).where(m.Media.album_id == heritage.id))] if heritage else []
    return dict(stats=stats(db), thirteen=thirteen, founders=founders, upcoming=[event_out(e, db) for e in upcoming],
                recent_events=[event_out(e, db) for e in last], onthisday=on_this_day(user, db), causes=causes(db)[:4],
                posts=posts(user, db)[:3], heritage_photos=hphotos)


@r.get("/api/memorial-wall")
def memorial_wall(user=Depends(current_user_optional), db: Session = Depends(get_db)):
    g = graph(db)
    out = [card(p, user, g) for p in g["people"].values() if deceased(p)]
    out.sort(key=lambda c: (c["generation"] if c["generation"] is not None else 9, -(c["death_year"] or 0)))
    return out
