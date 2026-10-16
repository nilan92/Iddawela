import re, datetime as dt, unicodedata

def slugify(s: str) -> str:
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode()
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s).strip("-").lower()
    return s or "item"

def unique_slug(db, model, base):
    from sqlalchemy import select
    slug, n = slugify(base), 2
    root = slug
    while db.scalar(select(model.id).where(model.slug == slug)):
        slug = f"{root}-{n}"; n += 1
    return slug

def parse_date(v):
    if not v:
        return None
    if isinstance(v, dt.date):
        return v
    try:
        return dt.date.fromisoformat(str(v)[:10])
    except ValueError:
        return None

def to_int(v):
    try:
        return int(v) if v not in (None, "") else None
    except (TypeError, ValueError):
        return None
