"""One-time import of the old iddawela.com (WordPress) archive into the new database.
Usage: python -m app.seed <seed_dir> <seed_media_dir>   (idempotent: does nothing if people already exist)"""
import datetime as dt, json, os, shutil, sys, pathlib
from sqlalchemy import select, func
from .db import SessionLocal
from . import models as m
from .config import MEDIA_DIR
from .util import slugify

def load(p, default=None):
    p = pathlib.Path(p)
    return json.loads(p.read_text()) if p.exists() else default

def run(seed_dir, media_dir):
    seed_dir, media_dir = pathlib.Path(seed_dir), pathlib.Path(media_dir)
    fam = load(seed_dir / "family.json"); content = load(seed_dir / "content.json")
    tr = seed_dir / "translate"
    names = (load(tr / "out_names_pages.json", {}) or {}).get("names", {})
    bios_si = {**load(tr / "out_bios_1.json", {}), **load(tr / "out_bios_2.json", {})}
    facts = load(tr / "out_extract.json", {}) or {}
    sizes = load(media_dir / "sizes.json", {}) or {}
    db = SessionLocal()
    if db.scalar(select(func.count(m.Person.id))):
        print("people already present; skipping seed"); return
    (MEDIA_DIR / "legacy").mkdir(parents=True, exist_ok=True)
    media_rows = {}
    def media(mid, **kw):
        mid = str(mid)
        if mid in media_rows:
            r = media_rows[mid]
            for k, v in kw.items():
                if v is not None and getattr(r, k, None) in (None, "members") and k != "visibility":
                    setattr(r, k, v)
            return r
        if not sizes.get(mid) or not (media_dir / f"{mid}.webp").exists():
            return None
        shutil.copyfile(media_dir / f"{mid}.webp", MEDIA_DIR / "legacy" / f"{mid}.webp")
        shutil.copyfile(media_dir / f"{mid}_t.webp", MEDIA_DIR / "legacy" / f"{mid}_t.webp")
        info = content["media"].get(mid, {})
        cap = info.get("caption") or None
        r = m.Media(file=f"legacy/{mid}.webp", thumb=f"legacy/{mid}_t.webp", width=sizes[mid][0], height=sizes[mid][1], legacy_id=int(mid),
                    caption_en=cap, **kw)
        db.add(r); db.flush(); media_rows[mid] = r
        return r

    people = fam["people"]; key2id = {}
    order_in_parent = {}
    for parent, child in fam["parent_child"]:
        order_in_parent.setdefault(parent, []).append(child)
    sib_order = {c: i + 1 for lst in order_in_parent.values() for i, c in enumerate(lst)}
    for k, d in people.items():
        f = facts.get(k) or {}
        nm = names.get(k) or {}
        death = d.get("death") or f.get("death_year")
        gen = d.get("gen")
        living = False if (death or (gen is not None and gen <= 1)) else None
        p = m.Person(slug=slugify(k), name_en=d["name"], name_si=nm.get("si"), name_si_machine=bool(nm.get("si")),
                     gender=d.get("gender") or nm.get("gender") or f.get("gender"), birth_year=d.get("birth") or f.get("birth_year"),
                     death_year=death, is_living=living, generation=gen, branch_no=None, sibling_order=sib_order.get(k),
                     is_descendant=not d.get("spouse_of") and k not in ("lokumenike", "pinchimenike", "ub-weerakoon", "dingiri-amma", "ub-beddewela"), known_as=f.get("known_as"), hometown=f.get("hometown"),
                     profession=f.get("profession"), skills=f.get("skills"), bio_en=d.get("bio_en"), bio_si=bios_si.get(k),
                     bio_si_machine=bool(bios_si.get(k)), legacy_pages=d.get("pages") or None,
                     privacy="public" if living is False else "members", status="approved")
        if d.get("title"):
            p.profession = d["title"]
        db.add(p); db.flush(); key2id[k] = p.id
        for e in f.get("education") or []:
            if e.get("institution"):
                db.add(m.Education(person_id=p.id, institution=e["institution"][:255], qualification=(e.get("qualification") or None),
                                   field=e.get("field"), level=e.get("level"), year_from=e.get("year_from"), year_to=e.get("year_to")))
        for c in f.get("careers") or []:
            if c.get("title") or c.get("organization"):
                db.add(m.Career(person_id=p.id, title=(c.get("title") or c.get("organization"))[:255], organization=c.get("organization"),
                                year_from=c.get("year_from"), year_to=c.get("year_to"), current=bool(c.get("current"))))
        for i, mid in enumerate(d.get("photos") or []):
            r = media(mid, person_id=p.id, visibility="public" if living is False else "members")
            if r and i == 0:
                p.photo_id = r.id
    # branch numbers: the 13 children of Ukkubanda
    branch_of = {}
    for k, d in people.items():
        if d.get("branch_no"):
            branch_of[k] = d["branch_no"]
    for k, d in people.items():
        b = d.get("branch")
        if b and b in branch_of:
            db.get(m.Person, key2id[k]).branch_no = branch_of[b]
    for parent, child in fam["parent_child"]:
        db.add(m.ParentChild(parent_id=key2id[parent], child_id=key2id[child]))
    # spouses inherit the descendant's branch; married-in spouse is also the co-parent of the children
    for a, b, year in fam["marriages"]:
        f = (facts.get(a) or {}).get("marriage") or {}
        db.add(m.Marriage(a_id=key2id[a], b_id=key2id[b], married_year=year or f.get("year"), place=f.get("place")))
        pa, pb = db.get(m.Person, key2id[a]), db.get(m.Person, key2id[b])
        if pb.branch_no is None:
            pb.branch_no = pa.branch_no
        if pb.gender is None and pa.gender:
            pb.gender = "F" if pa.gender == "M" else "M"
        if not people[b].get("spouse_of"):
            continue
        for child in order_in_parent.get(a, []):
            db.add(m.ParentChild(parent_id=key2id[b], child_id=key2id[child]))
    db.flush()
    # albums & pages & events
    album_ids = {}
    for a in content["albums"]:
        al = m.Album(slug=a["slug"], title_en=a["title_en"], title_si=a.get("title_si"), kind=a["kind"], year=a.get("year"),
                     visibility=a["visibility"], description_en=a.get("body_en"), description_si=a.get("body_si"))
        db.add(al); db.flush(); album_ids[a["slug"]] = al.id
        for mid in a["media"]:
            r = media(mid)
            if r and r.album_id is None and r.person_id is None:
                r.album_id = al.id; r.visibility = a["visibility"]
                al.cover_id = al.cover_id or r.id
    for h in content["heritage"]:
        cover = None
        db.add(m.Page(slug=h["slug"], title_en=h["title_en"], title_si=h.get("title_si"), body_en=h["body_en"], body_si=h.get("body_si"),
                      body_si_machine=bool(h.get("machine")), section=h["section"], sort=h["sort"], legacy_page=h.get("legacy")))
    for rr in content["reunions"]:
        y = rr["year"]
        venue = rr["venue"]
        if venue and "Upcoming" in venue:
            venue = "To be announced (the old site's records end in January 2020)"
        al = album_ids.get(f"hamuwa-{y}")
        e = m.Event(slug=f"iddawela-hamuwa-{y}", kind="reunion", title_en=f"Iddawela Hamuwa {y}" + (f" · {rr['edition']}th reunion" if rr.get("edition") else ""),
                    title_si=f"ඉද්දවෙල හමුව {y}", edition=rr.get("edition"), starts_on=dt.date.fromisoformat(rr["date"]) if rr.get("date") else None,
                    venue=venue, sponsor=rr.get("sponsor"), attendance=rr.get("attendance"), body_en=rr.get("body_en"), body_si=rr.get("body_si"),
                    body_si_machine=bool(rr.get("body_si")), album_id=al)
        if al:
            e.cover_id = db.get(m.Album, al).cover_id
        db.add(e)
    # the next Hamuwa, by the family's own rule (last Saturday of the year) — venue for the committee to set
    today = dt.date.today(); d = dt.date(today.year, 12, 31)
    while d.weekday() != 5:
        d -= dt.timedelta(days=1)
    db.add(m.Event(slug=f"iddawela-hamuwa-{today.year}", kind="reunion", title_en=f"Iddawela Hamuwa {today.year}", title_si=f"ඉද්දවෙල හමුව {today.year}",
                   starts_on=d, venue="Venue to be announced", rsvp_open=True,
                   body_en="The annual get-together of the descendants of the 13 Iddawelas and the Foundation AGM, held by tradition on the last Saturday of the year. Venue, sponsor and programme will be announced here. RSVP so the hosts can plan.",
                   body_si="ඉද්දවෙල දහතුන් දෙනාගේ පරම්පරාවේ වාර්ෂික හමුව සහ පදනමේ වාර්ෂික මහා සභා රැස්වීම, සම්ප්‍රදායට අනුව වසරේ අවසන් සෙනසුරාදා පැවැත්වේ. ස්ථානය, අනුග්‍රාහකයා සහ වැඩසටහන මෙහි දැනුම් දෙනු ඇත.",
                   body_si_machine=True))
    causes = [
        ("careers-and-mentorship", "Careers & mentorship network", "වෘත්තීය සහ උපදේශන ජාලය", "careers",
         "Family members helping family members into jobs, internships and businesses: post an opening, offer an hour of mentoring, or ask for a hand.",
         "රැකියා, පුහුණු අවස්ථා සහ ව්‍යාපාර සඳහා පවුලේ අය එකිනෙකාට උදව් කිරීම.", "active"),
        ("education-support", "Education support", "අධ්‍යාපන සහාය", "education",
         "Recognising achievement and helping the next generation with exams, university choices and scholarships, the way Ranjith once mentored Rohana into engineering.",
         "විභාග, විශ්වවිද්‍යාල තේරීම් සහ ශිෂ්‍යත්ව සඳහා නව පරම්පරාවට සහාය වීම.", "planned"),
        ("elder-care-and-welfare", "Elder care & family welfare", "වැඩිහිටි රැකවරණය සහ සුබසාධනය", "welfare",
         "Keeping in touch with elders, helping families through illness and loss, and making sure no one in the family is left alone.",
         "වැඩිහිටියන් සමඟ සම්බන්ධව සිටීම සහ අසනීප හා වියෝ අවස්ථාවලදී පවුල්වලට සහාය වීම.", "planned"),
        ("heritage-and-archive", "Heritage & the family archive", "උරුමය සහ පවුලේ ලේඛනාගාරය", "heritage",
         "Preserving the story of the Mahagedara, the 1887 appointment letter, old photographs and the memories of our elders for the generations to come.",
         "මහගෙදර, 1887 පත්වීම් ලිපිය, පැරණි ඡායාරූප සහ වැඩිහිටියන්ගේ මතකයන් අනාගත පරම්පරා සඳහා සුරැකීම.", "active"),
    ]
    for i, (slug, en, si, cat, sen, ssi, st) in enumerate(causes):
        db.add(m.Cause(slug=slug, title_en=en, title_si=si, category=cat, summary_en=sen, summary_si=ssi, status=st, sort=i,
                       body_en=sen + "\n\nThe committee will publish goals, progress and how to help here.",
                       how_to_help_en="Sign in and post on the Opportunities board, or contact the committee at the next Hamuwa."))
    db.add(m.Post(slug="welcome-to-the-new-iddawela-com", kind="announcement", title_en="Welcome to the new iddawela.com",
                  title_si="නව iddawela.com වෙත සාදරයෙන් පිළිගනිමු", published_on=dt.date.today(),
                  body_en=("Since 2008 iddawela.com has kept the story of the Iddawela family of Pilimathalawa. The new site keeps every page, photograph "
                           "and name from the old one, and adds what the family asked for over the years: a living family tree you can explore, "
                           "accounts so each family can keep its own branch up to date, events with RSVP, memorial pages, causes, and a board for jobs "
                           "and mentorship. Find yourself on the tree, sign up, and help us keep the story going."),
                  body_si=("2008 සිට iddawela.com පිළිමතලාවේ ඉද්දවෙල පවුලේ කතාව සුරැකීය. නව වෙබ් අඩවිය පැරණි අඩවියේ සෑම පිටුවක්ම, ඡායාරූපයක්ම සහ නමක්ම රඳවා ගනිමින්, "
                           "ගවේෂණය කළ හැකි සජීවී පවුල් ගසක්, සෑම පවුලකටම තම ශාඛාව යාවත්කාලීන කළ හැකි ගිණුම්, උත්සව, සිහිවටන පිටු, සමාජ සේවා සහ රැකියා හා උපදේශන පුවරුවක් එක් කරයි."),
                  body_si_machine=True))
    db.commit()
    print("seeded", len(key2id), "people,", len(media_rows), "photos")

if __name__ == "__main__":
    run(sys.argv[1], sys.argv[2])
