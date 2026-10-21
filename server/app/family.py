"""In-memory view of the family graph + privacy-aware serializers."""
import re
import threading
from sqlalchemy import select
from sqlalchemy.orm import Session
from . import models as m
from .security import is_admin

_lock = threading.Lock()
_cache = {"ver": -1}
_version = [0]

def bump():
    _version[0] += 1

def graph(db: Session):
    with _lock:
        if _cache.get("ver") == _version[0]:
            return _cache
        people = {p.id: p for p in db.scalars(select(m.Person).where(m.Person.status == "approved"))}
        parents, children, spouses = {}, {}, {}
        for pc in db.scalars(select(m.ParentChild)):
            if pc.parent_id in people and pc.child_id in people:
                parents.setdefault(pc.child_id, []).append(pc.parent_id)
                children.setdefault(pc.parent_id, []).append(pc.child_id)
        marriages = list(db.scalars(select(m.Marriage)))
        for mr in marriages:
            if mr.a_id in people and mr.b_id in people:
                spouses.setdefault(mr.a_id, []).append((mr.b_id, mr))
                spouses.setdefault(mr.b_id, []).append((mr.a_id, mr))
        def order(pid):
            p = people[pid]
            return (p.sibling_order if p.sibling_order is not None else 999, p.birth_year or 9999, p.id)
        for k in children:
            children[k].sort(key=order)
        for p in people.values():
            db.expunge(p)
        _cache.clear()
        _cache.update(ver=_version[0], people=people, parents=parents, children=children, spouses=spouses)
        return _cache

def descendants(g, pid):
    out, stack = set(), [pid]
    while stack:
        x = stack.pop()
        for c in g["children"].get(x, []):
            if c not in out:
                out.add(c); stack.append(c)
    return out

def can_manage(g, user, pid) -> bool:
    """super admin: everyone. family admin: their branch person, descendants and their spouses. member: self, spouse, own children."""
    if not user or user.status != "approved":
        return False
    if user.role == "super_admin":
        return True
    scope = set()
    if user.role == "family_admin" and user.branch_person_id:
        root = user.branch_person_id
        scope = {root} | descendants(g, root)
        scope |= {s for x in list(scope) for s, _ in g["spouses"].get(x, [])}
        return pid in scope
    return False

def is_own(user, pid) -> bool:
    return bool(user and user.person_id == pid)

def deceased(p) -> bool:
    return bool(p.death_year or p.death_date or p.is_living is False)

def level(user):
    if is_admin(user):
        return "admin"
    if user and user.status == "approved":
        return "member"
    return "public"

def media_url(mid, size="m"):
    return f"/media/{mid}/{size}.webp" if mid else None

def hidden(p, user) -> bool:
    """Living people are never identifiable to the public (signed-out or not yet approved): no name, photo, slug or dates."""
    return level(user) == "public" and not deceased(p)

def show_details(p, user, g=None) -> bool:
    lv = level(user)
    if lv == "public":
        return deceased(p)
    if deceased(p) or p.privacy == "public":
        return True
    if lv == "admin" or is_own(user, p.id):
        return True
    return lv == "member" and p.privacy != "private"

def show_contacts(p, user, g=None) -> bool:
    lv = level(user)
    if lv == "admin" or is_own(user, p.id):
        return True
    return lv == "member" and p.privacy != "private" and not deceased(p)

ANON_EN, ANON_SI = "Family member", "පවුලේ සාමාජිකයෙක්"

def anon_card(p):
    """What the public sees of a living person: a place in the tree's shape and nothing that names them."""
    return {"id": p.id, "slug": None, "name_en": ANON_EN, "name_si": ANON_SI, "known_as": None, "gender": None,
            "generation": p.generation, "branch_no": p.branch_no, "is_descendant": p.is_descendant, "deceased": False,
            "birth_year": None, "death_year": None, "photo": None, "restricted": True, "anonymous": True}

def card(p, user, g=None):
    if hidden(p, user):
        return anon_card(p)
    det = show_details(p, user, g)
    d = {
        "id": p.id, "slug": p.slug, "name_en": p.name_en, "name_si": p.name_si, "known_as": p.known_as,
        "gender": p.gender, "generation": p.generation, "branch_no": p.branch_no, "is_descendant": p.is_descendant,
        "deceased": deceased(p), "birth_year": p.birth_year if det else None, "death_year": p.death_year,
        "photo": media_url(p.photo_id, "t") if det and p.photo_id else None, "restricted": not det,
    }
    return d

def full(p, user, g, db):
    d = card(p, user, g)
    det = not d["restricted"]
    d.update({
        "bio_en": p.bio_en if det else None, "bio_si": p.bio_si if det else None, "bio_si_machine": p.bio_si_machine,
        "photo_large": media_url(p.photo_id, "m") if det and p.photo_id else None,
        "profession": p.profession if det else None, "hometown": p.hometown if det else None,
        "birthplace": p.birthplace if det else None, "privacy": p.privacy, "skills": p.skills if det else None,
        "death_date": p.death_date.isoformat() if p.death_date else None,
        "can_edit": can_manage(g, user, p.id) or is_own(user, p.id),
    })
    if show_contacts(p, user, g):
        d.update({"birth_date": p.birth_date.isoformat() if p.birth_date else None, "email": p.email, "phone": p.phone,
                  "address": p.address, "residence": p.residence, "links": p.links})
    people = g["people"]
    def mini(pid):
        q = people.get(pid)
        return card(q, user, g) if q else None
    d["parents"] = [mini(x) for x in g["parents"].get(p.id, [])]
    d["children"] = [mini(x) for x in g["children"].get(p.id, [])]
    sibs = set()
    for par in g["parents"].get(p.id, []):
        sibs |= set(g["children"].get(par, []))
    sibs.discard(p.id)
    d["siblings"] = [mini(x) for x in sorted(sibs, key=lambda x: (people[x].sibling_order or 999, people[x].birth_year or 9999))]
    d["spouses"] = [dict(person=mini(sid), year=mr.married_year, date=mr.married_on.isoformat() if mr.married_on else None,
                         place=mr.place, status=mr.status, marriage_id=mr.id) for sid, mr in g["spouses"].get(p.id, [])]
    if det:
        d["education"] = [dict(id=e.id, institution=e.institution, qualification=e.qualification, field=e.field, level=e.level,
                               year_from=e.year_from, year_to=e.year_to, honours=e.honours)
                          for e in db.scalars(select(m.Education).where(m.Education.person_id == p.id).order_by(m.Education.year_from))]
        d["careers"] = [dict(id=c.id, title=c.title, organization=c.organization, industry=c.industry, location=c.location,
                             year_from=c.year_from, year_to=c.year_to, current=c.current, open_to_mentor=c.open_to_mentor)
                        for c in db.scalars(select(m.Career).where(m.Career.person_id == p.id).order_by(m.Career.year_from))]
        photos = db.scalars(select(m.Media).where(m.Media.person_id == p.id).order_by(m.Media.id)).all()
        d["photos"] = [dict(id=x.id, thumb=media_url(x.id, "t"), src=media_url(x.id, "m"), caption=(x.caption_en or "").split(" [fb:")[0] or None, w=x.width, h=x.height) for x in photos]
    else:
        d["education"], d["careers"], d["photos"] = [], [], []
    ob = db.scalar(select(m.Obituary).where(m.Obituary.person_id == p.id, m.Obituary.status == "published"))
    d["obituary_slug"] = ob.slug if ob else None
    # lineage up to Ukkubanda/the founders (first parent chain, descendants preferred)
    chain, cur, seen = [], p.id, set()
    while cur and cur not in seen:
        seen.add(cur)
        ps = g["parents"].get(cur, [])
        if not ps:
            break
        ps = sorted(ps, key=lambda x: (not people[x].is_descendant, people[x].gender != "M"))
        cur = ps[0]
        chain.append(mini(cur))
    d["lineage"] = chain
    return d


# ---------- public redaction of free text (story pages, events, captions, memorial pages, bios) ----------
PLACEHOLDER_EN, PLACEHOLDER_SI = "[family member]", "[පවුලේ සාමාජිකයෙක්]"
SI = "\u0D80-\u0DFF\u200c\u200d"
_red = {"ver": -1, "rx": None}
_SI_SUFFIX = "(?:ගේ|ට|ගෙන්|ගෙ|යි|ව|ද|වන්)?"
_NOT_NAME_AFTER = r"(?!\s+(?:College|Vidyalaya|Vidyalayaya|Balika|Maha|Road|Mawatha|Hospital|Hall|Temple|Vihara))"

def _tokens(s):
    return [x for x in (y.strip("(),.\"'") for y in re.split(r"\s+", (s or "").strip())) if x]

def _redactor(g):
    """One regex over every living person's names: full names (EN/SI/known as), and first names that no deceased
    person shares, carrying any following surname tokens and a bare birth year with them."""
    with _lock:
        if _red["ver"] == _version[0] and _red.get("gid") == id(g):
            return _red["rx"]
    people = g["people"].values()
    dead_tok, later_tok, full, firsts, surn = set(), set(), set(), set(), set()
    for p in people:
        for f in ("name_en", "name_si", "known_as"):
            tt = _tokens(getattr(p, f, None))
            if deceased(p):
                dead_tok |= set(tt)
            later_tok |= set(tt[1:])
    dead_full = {(getattr(p, f, None) or "").strip() for p in people if deceased(p) for f in ("name_en", "name_si", "known_as")}
    for p in people:
        if deceased(p):
            continue
        for f in ("name_en", "name_si", "known_as"):
            v = (getattr(p, f, None) or "").strip()
            tt = _tokens(v)
            if len(v) >= 4 and v not in dead_full and (len(tt) > 1 or v not in dead_tok):
                full.add(v)
            if tt:
                first = tt[0].strip("(),.\"'")
                if len(first) >= 3 and first not in dead_tok and first not in later_tok and not re.fullmatch(r"[A-Z]{1,3}\.?", first):
                    firsts.add(first)
                surn |= {x.strip("(),.\"'") for x in tt[1:] if len(x.strip("(),.\"'")) >= 3}
    alt = lambda xs: "|".join(re.escape(x) for x in sorted(xs, key=len, reverse=True) if x)
    b0, b1 = rf"(?<![\w{SI}])", rf"(?![\w{SI}])"
    sur = rf"(?:\s+(?:{alt(surn)}){b1})*" if surn else ""
    year = r"(?:\s*\((?:b\.\s*)?\d{4}(?:\s*[-–]\s*)?\))?"
    parts = []
    if full:
        parts.append(rf"{b0}(?:{alt(full)}){sur}{_SI_SUFFIX}{b1}{year}")
    if firsts:
        parts.append(rf"{b0}(?:{alt(firsts)}){_NOT_NAME_AFTER}{sur}{_SI_SUFFIX}{b1}{year}")
    rx = re.compile("|".join(parts)) if parts else None
    with _lock:
        _red.update(ver=_version[0], gid=id(g), rx=rx)
    return rx

def _ph(mt):
    return PLACEHOLDER_SI if re.search(f"[{SI}]", mt.group(0)) else PLACEHOLDER_EN

def redact_text(s, g):
    if not s or not isinstance(s, str):
        return s
    rx = _redactor(g)
    return rx.sub(_ph, s) if rx else s

def scrub(obj, g):
    """Redact living people's names from every string in a JSON-able value (used for signed-out responses)."""
    if isinstance(obj, str):
        return redact_text(obj, g)
    if isinstance(obj, list):
        return [scrub(x, g) for x in obj]
    if isinstance(obj, dict):
        return {k: (v if k in ("slug", "src", "thumb", "photo", "photo_large", "cover", "url", "map_url", "link", "hometown", "birthplace") else scrub(v, g)) for k, v in obj.items()}
    return obj
