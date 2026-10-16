"""Load research findings (enrichment.json) into the admin "Suggested updates" queue. Nothing is published until an admin approves.
Usage: python -m app.import_suggestions <enrichment.json> [batch-name]"""
import json, sys
from sqlalchemy import select
from .db import SessionLocal
from . import models as m

FIELD = {"profession": "profession", "profession_later": "career", "career": "career", "education": "education", "qualification": "education",
         "social_profile": "link", "academic_profile": "link"}

def run(path, batch="research-2026-10"):
    data = json.load(open(path))
    db = SessionLocal()
    if db.scalar(select(m.Suggestion.id).where(m.Suggestion.batch == batch).limit(1)):
        print("batch already imported"); return
    n = 0
    for entry in data:
        slug = entry.get("person_id_if_known")
        p = db.scalar(select(m.Person).where(m.Person.slug == slug)) if slug else None
        for f in entry.get("facts", []):
            raw_field = f.get("field") or "note"
            field = FIELD.get(raw_field, "bio_note")
            val = f.get("value")
            text = val if isinstance(val, str) else json.dumps(val, ensure_ascii=False)
            if field == "education":
                value = {"institution": text}
            elif field == "career":
                value = {"title": text}
            elif field == "link":
                value = {"label": raw_field.replace("_", " "), "url": f.get("source_url"), "text": text}
            else:
                value = {"text": text}
            conf = f.get("confidence")
            if p and p.slug in ("neil-p-iddawela", "neil-iddawela"):
                conf = "confirmed"   # Nilan confirmed Neil P. Iddawela = Justice W.M.N.P. Iddawela (16 Oct 2026)
            db.add(m.Suggestion(person_id=p.id if p else None, person_hint=entry.get("person_name"), field=field, value=value,
                                summary=f"[{raw_field}] {text}", source_url=f.get("source_url"), source_title=f.get("source_title"),
                                confidence=conf, batch=batch))
            n += 1
    db.commit()
    print("imported", n, "suggestions")

if __name__ == "__main__":
    run(sys.argv[1], *(sys.argv[2:3]))
