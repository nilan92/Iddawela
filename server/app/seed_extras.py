"""Extra archive items found after the WordPress import (public Facebook albums by Rohana Iddawela, long-time webmaster).
Usage: python -m app.seed_extras <seed_dir>   (idempotent)"""
import datetime as dt, json, pathlib, sys
from sqlalchemy import select
from .db import SessionLocal
from . import models as m
from .media import process_image

CREDIT = "Photos: Rohana Iddawela"

def run(seed_dir):
    d = pathlib.Path(seed_dir) / "fb"
    if not d.exists():
        print("no fb dir"); return
    db = SessionLocal()
    # Rohana Iddawela (b. 1955, Nilan's father) is living and has been the webmaster of iddawela.com since 2008.
    # Do not confuse him with Rohan Iddawela (Cyril's son, d. 2022).
    ro = db.scalar(select(m.Person).where(m.Person.slug == "rohana-iddawela"))
    if ro:
        ro.is_living = True; ro.death_year = None; ro.death_date = None
        note = "Webmaster of iddawela.com since 2008"
        if not ro.skills or note not in ro.skills:
            ro.skills = (note + (", " + ro.skills if ro.skills else ""))
    photos = json.loads((d / "fb_photos.json").read_text())
    # 1) committee meeting, 11 Oct 2015 (new to the archive)
    meet = db.scalar(select(m.Event).where(m.Event.slug == "committee-meeting-2015"))
    if not meet:
        meet = m.Event(slug="committee-meeting-2015", kind="agm", title_en="Iddawela committee meeting · planning the 2015 Hamuwa",
                       title_si="ඉද්දවෙල කමිටු රැස්වීම · 2015 හමුව සැලසුම් කිරීම", starts_on=dt.date(2015, 10, 11),
                       venue="Water's Edge, Battaramulla, Colombo", sponsor="Asela Iddawela (host)",
                       body_en=("The committee met at Water's Edge, Colombo on 11 October 2015 to prepare the 26 December gathering at Katuwellegama. "
                                "Asela Iddawela hosted the meeting at this grand location.\n\n" + CREDIT + " (shared on Facebook)."),
                       body_si=("2015 දෙසැම්බර් 26 කටුවැල්ලේගම හමුව සූදානම් කිරීම සඳහා කමිටුව 2015 ඔක්තෝබර් 11 කොළඹ වෝටර්ස් එජ් හිදී රැස් විය. "
                                "අසේල ඉද්දවෙල මෙම රැස්වීමට සත්කාරකත්වය දැක්වීය.\n\nඡායාරූප: රෝහණ ඉද්දවෙල."), body_si_machine=True)
        db.add(meet); db.flush()
    hamuwa = db.scalar(select(m.Event).where(m.Event.slug == "iddawela-hamuwa-2014"))
    if hamuwa and not hamuwa.body_en:
        hamuwa.body_en = ("Iddawela Foundation get together was held on 11th April 2015 at Peradeniya University Upper Hanthana Conference Hall. "
                          "80 odd relatives attended despite the day being so close to the new year festival day and difficulty in traffic.\n\n" + CREDIT + ".")
    targets = {"2015-04": hamuwa, "2015-10": meet}
    for ev in targets.values():
        if ev and not ev.album_id:
            al = m.Album(slug=f"{ev.slug}-photos", title_en=ev.title_en, title_si=ev.title_si, kind="reunion" if ev.kind == "reunion" else "general",
                         year=ev.starts_on.year if ev.starts_on else None, visibility="public", description_en=CREDIT)
            db.add(al); db.flush(); ev.album_id = al.id
    for ph in photos:
        fn = pathlib.Path(ph["local"]).name
        if not (d / fn).exists() or db.scalar(select(m.Media.id).where(m.Media.caption_en.like(f"%[fb:{ph['id']}]%"))):
            continue
        try:
            when = dt.datetime.strptime(ph.get("date", ""), "%B %d, %Y").strftime("%Y-%m")
        except ValueError:
            when = "2015-04" if "10154045" in fn else "2015-10"
        ev = targets.get(when)
        if not ev:
            continue
        f, t, w, h = process_image((d / fn).read_bytes())
        cap = (ph.get("caption") or "").strip(" ·")
        md = m.Media(file=f, thumb=t, width=w, height=h, album_id=ev.album_id, visibility="public", taken_year=2015,
                     caption_en=(cap + " · " if cap else "") + CREDIT + f" [fb:{ph['id']}]")
        db.add(md); db.flush()
        if not ev.cover_id:
            ev.cover_id = md.id
            db.get(m.Album, ev.album_id).cover_id = md.id
    # Memorial pages for the founders and the 13 Iddawelas who have passed (condolences open; bios are public for the deceased)
    gen = list(db.scalars(select(m.Person).where(m.Person.generation.in_([1, 2]), m.Person.is_descendant.is_(True)))) + list(db.scalars(select(m.Person).where(m.Person.generation == 1, m.Person.is_descendant.is_(False))))
    for p in gen:
        if not (p.death_year or p.death_date) or db.scalar(select(m.Obituary.id).where(m.Obituary.person_id == p.id)):
            continue
        paras = [x.strip() for x in (p.bio_en or "").split("\n") if len(x.strip()) > 40][:3]
        paras_si = [x.strip() for x in (p.bio_si or "").split("\n") if len(x.strip()) > 20][:3]
        yrs = f"{p.birth_year or ''}–{p.death_year or ''}".strip("–")
        db.add(m.Obituary(slug=f"in-memory-of-{p.slug}", person_id=p.id, title_en=f"In loving memory of {p.known_as or p.name_en}",
                          title_si=(f"{p.name_si} සදා සිහිවටන" if p.name_si else None) , body_en="\n\n".join(paras) or None,
                          body_si="\n\n".join(paras_si) or None, published_on=dt.date(p.death_year, 12, 31) if p.death_year else None, status="published"))
    db.commit()
    print("extras ok")

if __name__ == "__main__":
    run(sys.argv[1])
