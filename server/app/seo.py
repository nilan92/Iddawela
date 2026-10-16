"""Server-rendered SEO layer: every public URL returns real HTML (title, meta, hreflang, Open Graph, JSON-LD and the
page's actual text) inside the Expo web shell. Crawlers read it without JavaScript; browsers get the same page and
the app takes over the moment its bundle runs."""
import html, json, re, datetime as dt
from functools import lru_cache
from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse, PlainTextResponse, Response
from sqlalchemy import select
from sqlalchemy.orm import Session
from .config import WEB_DIR, SITE_URL, NOINDEX
from .db import get_db
from . import models as m
from .family import graph, deceased, show_details, media_url

r = APIRouter(include_in_schema=False)
E = html.escape
ORG_NAME = "Pilimathalawa Iddawela Foundation"
ORG_SI = "පිළිමතලාවේ ඉද්දවෙල පදනම"
DEFAULT_DESC = {
    "en": "The Iddawela family foundation of Pilimathalawa, Sri Lanka: the story of Mudalihami Iddawela (Korale, 1887), Ukkubanda and Lokumenike and their 13 children, an interactive family tree of 370+ relatives, reunions since 1995, causes and opportunities.",
    "si": "පිළිමතලාවේ ඉද්දවෙල පදනම: මුදලිහාමි ඉද්දවෙල (කෝරාළ, 1887), උක්කුබණ්ඩා සහ ලොකුමැණිකේ හා ඔවුන්ගේ දරුවන් 13 දෙනාගේ කතාව, ඥාතීන් 370කට අධික අන්තර්ක්‍රියාකාරී පවුල් ගස, 1995 සිට වාර්ෂික හමුව, සමාජ සේවා සහ අවස්ථා.",
}
PUBLIC_PREFIXES = ("", "story", "heritage", "tree", "people", "events", "causes", "memorial", "news", "gallery", "join", "ask", "opportunities", "login", "about")

@lru_cache(maxsize=1)
def _shell_cached(mtime):
    return (WEB_DIR / "index.html").read_text(encoding="utf-8")

def shell():
    p = WEB_DIR / "index.html"
    if not p.exists():
        return "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><title>Iddawela</title></head><body><div id=\"root\"></div></body></html>"
    return _shell_cached(p.stat().st_mtime)

def t(obj, field, lang):
    return (getattr(obj, f"{field}_{lang}", None) if lang == "si" else None) or getattr(obj, f"{field}_en", None) or ""

def paras(text, limit=None):
    text = (text or "").strip()
    if limit:
        text = text[:limit]
    return "".join(f"<p>{E(p_)}</p>" for p_ in re.split(r"\n+", text) if p_.strip())

def url_for(path, lang):
    return f"{SITE_URL}{path}" + ("?lang=si" if lang == "si" else "")

def nav(lang):
    items = [("/", "Home", "මුල් පිටුව"), ("/story", "Our story", "අපේ කතාව"), ("/tree", "Family tree", "පවුල් ගස"),
             ("/events", "Events", "උත්සව"), ("/causes", "Causes", "සමාජ සේවා"), ("/memorial", "In memory", "සිහිවටන"),
             ("/news", "News", "පුවත්"), ("/gallery", "Gallery", "ඡායාරූප"), ("/join", "Join", "එක්වන්න")]
    return "<nav aria-label=\"Main\"><ul>" + "".join(
        f"<li><a href=\"{h}{'?lang=si' if lang == 'si' else ''}\">{E(si if lang == 'si' else en)}</a></li>" for h, en, si in items) + "</ul></nav>"

def render(request: Request, path: str, title: str, desc: str, body: str, lang: str, jsonld=None, image=None, status=200, robots=None, otype="website"):
    canonical = url_for(path, lang)
    img = image or f"{SITE_URL}/og/default.jpg"
    if img.startswith("/"):
        img = SITE_URL + img
    full_title = title if ORG_NAME in title or title.startswith("Iddawela") else f"{title} · Iddawela Foundation"
    head = [
        f"<title>{E(full_title)}</title>",
        f"<meta name=\"description\" content=\"{E(desc[:300])}\">",
        f"<link rel=\"canonical\" href=\"{E(canonical)}\">",
        f"<link rel=\"alternate\" hreflang=\"en\" href=\"{E(url_for(path, 'en'))}\">",
        f"<link rel=\"alternate\" hreflang=\"si\" href=\"{E(url_for(path, 'si'))}\">",
        f"<link rel=\"alternate\" hreflang=\"x-default\" href=\"{E(url_for(path, 'en'))}\">",
        f"<meta property=\"og:type\" content=\"{otype}\">", f"<meta property=\"og:site_name\" content=\"{ORG_NAME}\">",
        f"<meta property=\"og:title\" content=\"{E(full_title)}\">", f"<meta property=\"og:description\" content=\"{E(desc[:300])}\">",
        f"<meta property=\"og:url\" content=\"{E(canonical)}\">", f"<meta property=\"og:image\" content=\"{E(img)}\">",
        f"<meta property=\"og:locale\" content=\"{'si_LK' if lang == 'si' else 'en_US'}\">",
        f"<meta property=\"og:locale:alternate\" content=\"{'en_US' if lang == 'si' else 'si_LK'}\">",
        "<meta name=\"twitter:card\" content=\"summary_large_image\">",
    ]
    if NOINDEX or robots:
        head.append(f"<meta name=\"robots\" content=\"{robots or 'noindex, nofollow'}\">")
    for j in (jsonld or []):
        head.append("<script type=\"application/ld+json\">" + json.dumps(j, ensure_ascii=False).replace("</", "<\\/") + "</script>")
    doc = shell()
    doc = re.sub(r"<title>.*?</title>", "", doc, flags=re.S)
    doc = re.sub(r"<meta name=\"description\"[^>]*>", "", doc)
    doc = doc.replace("</head>", "\n".join(head) + "\n</head>", 1)
    doc = re.sub(r"<html[^>]*>", f"<html lang=\"{'si' if lang == 'si' else 'en'}\">", doc, count=1)
    ssr = (f"<div class=\"ssr\"><header><a class=\"brand\" href=\"/\">Iddawela <span lang=\"si\">ඉද්දවෙල</span></a>{nav(lang)}</header>"
           f"<main>{body}</main><footer><p>© {dt.date.today().year} {ORG_NAME} · {ORG_SI} · Iddawela, Pilimathalawa, Sri Lanka</p></footer></div>")
    doc = re.sub(r"<div id=\"root\">\s*</div>", f"<div id=\"root\">{ssr}</div>", doc, count=1)
    headers = {"Cache-Control": "no-cache"}
    if NOINDEX:
        headers["X-Robots-Tag"] = "noindex, nofollow"
    return HTMLResponse(doc, status_code=status, headers=headers)

def org_ld():
    return {"@context": "https://schema.org", "@type": "NGO", "@id": f"{SITE_URL}/#org", "name": ORG_NAME, "alternateName": [ORG_SI, "Iddawela Foundation"],
            "url": SITE_URL + "/", "logo": f"{SITE_URL}/icons/icon-512.png", "foundingDate": "1995",
            "description": DEFAULT_DESC["en"],
            "address": {"@type": "PostalAddress", "addressLocality": "Pilimathalawa", "addressRegion": "Central Province", "addressCountry": "LK"},
            "areaServed": "LK", "knowsLanguage": ["si", "en"]}

def crumbs(items):
    return {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": n, "item": SITE_URL + u} for i, (n, u) in enumerate(items)]}

def person_ld(p, g):
    d = {"@context": "https://schema.org", "@type": "Person", "@id": f"{SITE_URL}/people/{p.slug}#person", "name": p.name_en,
         "url": f"{SITE_URL}/people/{p.slug}", "familyName": "Iddawela" if "Iddawela" in p.name_en else None}
    if p.name_si:
        d["alternateName"] = p.name_si
    if p.gender:
        d["gender"] = "Male" if p.gender == "M" else "Female"
    if deceased(p) or p.privacy == "public":
        if p.birth_year:
            d["birthDate"] = str(p.birth_year)
        if p.death_year:
            d["deathDate"] = str(p.death_year)
        if p.bio_en:
            d["description"] = p.bio_en[:300]
        if p.photo_id:
            d["image"] = f"{SITE_URL}{media_url(p.photo_id, 'm')}"
    people = g["people"]
    ref = lambda i: {"@type": "Person", "name": people[i].name_en, "url": f"{SITE_URL}/people/{people[i].slug}"}
    if g["parents"].get(p.id):
        d["parent"] = [ref(i) for i in g["parents"][p.id]]
    if g["children"].get(p.id):
        d["children"] = [ref(i) for i in g["children"][p.id]]
    if g["spouses"].get(p.id):
        d["spouse"] = [ref(i) for i, _ in g["spouses"][p.id]]
    d["memberOf"] = {"@id": f"{SITE_URL}/#org"}
    return {k: v for k, v in d.items() if v}

def page_for(request: Request, path: str, db: Session):
    lang = "si" if request.query_params.get("lang") == "si" else "en"
    parts = [x for x in path.strip("/").split("/") if x]
    head = parts[0] if parts else ""
    g = graph(db)
    S = lambda en, si: si if lang == "si" else en
    if head == "":
        sons = [p for p in g["people"].values() if p.generation == 2 and p.branch_no]
        sons.sort(key=lambda p: p.branch_no)
        body = (f"<h1>{S('Iddawela Foundation', 'ඉද්දවෙල පදනම')}</h1><p>{E(DEFAULT_DESC[lang])}</p>"
                f"<h2>{S('The 13 Iddawelas', 'ඉද්දවෙල දහතුන් දෙනා')}</h2><ol>" +
                "".join(f"<li><a href=\"/people/{p.slug}\">{E((p.name_si if lang == 'si' and p.name_si else p.name_en))}</a> {p.birth_year or ''}–{p.death_year or ''}</li>" for p in sons) + "</ol>")
        ld = [org_ld(), {"@context": "https://schema.org", "@type": "WebSite", "url": SITE_URL + "/", "name": ORG_NAME, "inLanguage": ["en", "si"],
                         "potentialAction": {"@type": "SearchAction", "target": f"{SITE_URL}/tree?q={{search_term_string}}", "query-input": "required name=search_term_string"}}]
        return render(request, "/", f"{ORG_NAME} · {ORG_SI}", DEFAULT_DESC[lang], body, lang, ld)
    if head == "story":
        pages = db.scalars(select(m.Page).where(m.Page.section == "heritage").order_by(m.Page.sort)).all()
        body = f"<h1>{S('Our story', 'අපේ කතාව')}</h1>" + "".join(
            f"<section><h2><a href=\"/heritage/{p.slug}\">{E(t(p, 'title', lang))}</a></h2>{paras(t(p, 'body', lang), 900)}</section>" for p in pages)
        return render(request, "/story", S("Our story: from the 1887 Korale to 13 Iddawelas", "අපේ කතාව"),
                      S("How the Iddawela family of Pilimathalawa began: Mudalihami Iddawela, Korale & Police Headman of Yatinuwara (1887), the Mahagedara, Ukkubanda and Lokumenike and their 13 children.", DEFAULT_DESC["si"]),
                      body, lang, [org_ld(), crumbs([("Home", "/"), ("Our story", "/story")])])
    if head == "heritage" and len(parts) > 1:
        p = db.scalar(select(m.Page).where(m.Page.slug == parts[1]))
        if p:
            body = f"<article><h1>{E(t(p, 'title', lang))}</h1>{paras(t(p, 'body', lang))}</article>"
            ld = [{"@context": "https://schema.org", "@type": "Article", "headline": p.title_en, "inLanguage": lang, "publisher": {"@id": f"{SITE_URL}/#org"},
                   "mainEntityOfPage": f"{SITE_URL}/heritage/{p.slug}"}, crumbs([("Home", "/"), ("Our story", "/story"), (p.title_en, f"/heritage/{p.slug}")])]
            return render(request, f"/heritage/{p.slug}", t(p, "title", lang), (t(p, "body", lang) or "")[:240], body, lang, ld,
                          image=media_url(p.cover_id, "m") if p.cover_id else None, otype="article")
    if head == "tree":
        roots = sorted([p for p in g["people"].values() if p.generation == 2 and p.branch_no], key=lambda p: p.branch_no)
        def branch(pid, depth=0):
            if depth > 4:
                return ""
            kids = g["children"].get(pid, [])
            if not kids:
                return ""
            return "<ul>" + "".join(f"<li><a href=\"/people/{g['people'][k].slug}\">{E(g['people'][k].name_en)}</a>{branch(k, depth + 1)}</li>" for k in kids) + "</ul>"
        body = (f"<h1>{S('The Iddawela family tree', 'ඉද්දවෙල පවුල් ගස')}</h1><p>{S('Six generations of the Iddawela family of Pilimathalawa, from Mudalihami Iddawela (Korale, 1887) through Ukkubanda and Lokumenike to their 13 children and their descendants.', 'පිළිමතලාවේ ඉද්දවෙල පවුලේ පරම්පරා හයක්.')}</p><ul>" +
                "".join(f"<li><a href=\"/people/{p.slug}\">{E(p.name_en)}</a>{branch(p.id)}</li>" for p in roots) + "</ul>")
        return render(request, "/tree", S("Interactive family tree", "අන්තර්ක්‍රියාකාරී පවුල් ගස"),
                      S(f"Explore the Iddawela family tree: {len(g['people'])} relatives across six generations, descendants of Ukkubanda Iddawela and Lokumenike of Pilimathalawa.", DEFAULT_DESC["si"]),
                      body, lang, [org_ld(), crumbs([("Home", "/"), ("Family tree", "/tree")])])
    if head == "people" and len(parts) > 1:
        p = db.scalar(select(m.Person).where(m.Person.slug == parts[1], m.Person.status == "approved"))
        if p:
            name = p.name_si if lang == "si" and p.name_si else p.name_en
            years = f"{p.birth_year or ''}–{p.death_year or ''}" if (deceased(p) or p.privacy == "public") and (p.birth_year or p.death_year) else ""
            det = deceased(p) or p.privacy == "public"
            people = g["people"]
            rel = lambda ids: ", ".join(f"<a href=\"/people/{people[i].slug}\">{E(people[i].name_en)}</a>" for i in ids if i in people)
            body = (f"<article><h1>{E(name)}</h1>" + (f"<p>{E(years)}</p>" if years else "") +
                    (paras(t(p, "bio", lang)) if det else f"<p>{S('This profile is visible to signed-in family members.', 'මෙම පැතිකඩ පවුලේ සාමාජිකයින්ට පමණි.')}</p>") +
                    (f"<p>{S('Parents', 'දෙමාපියන්')}: {rel(g['parents'].get(p.id, []))}</p>" if g["parents"].get(p.id) else "") +
                    (f"<p>{S('Spouse', 'කලත්‍රයා')}: {rel([s for s, _ in g['spouses'].get(p.id, [])])}</p>" if g["spouses"].get(p.id) else "") +
                    (f"<p>{S('Children', 'දරුවන්')}: {rel(g['children'].get(p.id, []))}</p>" if g["children"].get(p.id) else "") + "</article>")
            desc = ((p.bio_en or "")[:200] if det and p.bio_en else
                    f"{p.name_en}{(' (' + years + ')') if years else ''}, generation {p.generation} of the Iddawela family of Pilimathalawa, Sri Lanka.")
            return render(request, f"/people/{p.slug}", f"{name}{(' (' + years + ')') if years else ''}", desc, body, lang,
                          [person_ld(p, g), crumbs([("Home", "/"), ("Family tree", "/tree"), (p.name_en, f"/people/{p.slug}")])],
                          image=media_url(p.photo_id, "m") if det and p.photo_id else None, otype="profile")
    if head == "events":
        if len(parts) > 1:
            e = db.scalar(select(m.Event).where(m.Event.slug == parts[1]))
            if e:
                ld = {"@context": "https://schema.org", "@type": "Event", "name": e.title_en, "startDate": e.starts_on.isoformat() if e.starts_on else None,
                      "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
                      "eventStatus": "https://schema.org/EventScheduled", "organizer": {"@id": f"{SITE_URL}/#org", "name": ORG_NAME},
                      "location": {"@type": "Place", "name": e.venue or "Sri Lanka", "address": {"@type": "PostalAddress", "addressCountry": "LK", "streetAddress": e.venue or ""}},
                      "description": (e.body_en or e.title_en)[:300]}
                body = (f"<article><h1>{E(t(e, 'title', lang))}</h1><p>{E(str(e.starts_on or ''))} · {E(e.venue or '')}</p>" +
                        (f"<p>{S('Sponsor', 'අනුග්‍රාහක')}: {E(e.sponsor)}</p>" if e.sponsor else "") + paras(t(e, "body", lang)) + "</article>")
                return render(request, f"/events/{e.slug}", t(e, "title", lang), (e.body_en or f"{e.title_en} at {e.venue}")[:240], body, lang,
                              [{k: v for k, v in ld.items() if v}, crumbs([("Home", "/"), ("Events", "/events"), (e.title_en, f"/events/{e.slug}")])],
                              image=media_url(e.cover_id, "m") if e.cover_id else None)
        else:
            evs = db.scalars(select(m.Event).where(m.Event.status == "published").order_by(m.Event.starts_on.desc().nulls_last())).all()
            body = f"<h1>{S('Events & reunions', 'උත්සව සහ හමුවීම්')}</h1><ul>" + "".join(
                f"<li><a href=\"/events/{e.slug}\">{E(t(e, 'title', lang))}</a> · {E(str(e.starts_on or ''))} · {E(e.venue or '')}</li>" for e in evs) + "</ul>"
            return render(request, "/events", S("Events & annual reunions since 1995", "උත්සව සහ වාර්ෂික හමුව"),
                          S("Every annual Iddawela get-together (Iddawela Hamuwa) since 1995, the AGM, and upcoming family events.", DEFAULT_DESC["si"]), body, lang,
                          [org_ld(), crumbs([("Home", "/"), ("Events", "/events")])])
    if head == "causes":
        if len(parts) > 1:
            c = db.scalar(select(m.Cause).where(m.Cause.slug == parts[1]))
            if c:
                body = f"<article><h1>{E(t(c, 'title', lang))}</h1><p>{E(t(c, 'summary', lang))}</p>{paras(t(c, 'body', lang))}</article>"
                return render(request, f"/causes/{c.slug}", t(c, "title", lang), t(c, "summary", lang)[:240], body, lang,
                              [org_ld(), crumbs([("Home", "/"), ("Causes", "/causes"), (c.title_en, f"/causes/{c.slug}")])])
        else:
            cs = db.scalars(select(m.Cause).where(m.Cause.status != "draft").order_by(m.Cause.sort)).all()
            body = f"<h1>{S('Causes & CSR', 'සමාජ සේවා')}</h1><ul>" + "".join(f"<li><a href=\"/causes/{c.slug}\">{E(t(c, 'title', lang))}</a>: {E(t(c, 'summary', lang))}</li>" for c in cs) + "</ul>"
            return render(request, "/causes", S("Causes & community work", "සමාජ සේවා"), S("Scholarships, careers help, welfare and heritage projects of the Iddawela Foundation.", DEFAULT_DESC["si"]),
                          body, lang, [org_ld(), crumbs([("Home", "/"), ("Causes", "/causes")])])
    if head == "memorial":
        if len(parts) > 1:
            o = db.scalar(select(m.Obituary).where(m.Obituary.slug == parts[1], m.Obituary.status == "published"))
            if o:
                body = f"<article><h1>{E(t(o, 'title', lang))}</h1>{paras(t(o, 'body', lang))}</article>"
                return render(request, f"/memorial/{o.slug}", t(o, "title", lang), (o.body_en or o.title_en)[:240], body, lang,
                              [crumbs([("Home", "/"), ("In memory", "/memorial"), (o.title_en, f"/memorial/{o.slug}")])])
        else:
            obs = db.scalars(select(m.Obituary).where(m.Obituary.status == "published")).all()
            body = f"<h1>{S('In loving memory', 'සදා සිහිවටන')}</h1><ul>" + "".join(f"<li><a href=\"/memorial/{o.slug}\">{E(t(o, 'title', lang))}</a></li>" for o in obs) + "</ul>"
            return render(request, "/memorial", S("In loving memory", "සදා සිහිවටන"), S("Memorial pages and condolences for the Iddawela family.", DEFAULT_DESC["si"]), body, lang)
    if head == "news":
        if len(parts) > 1:
            p = db.scalar(select(m.Post).where(m.Post.slug == parts[1], m.Post.status == "published", m.Post.visibility == "public"))
            if p:
                ld = {"@context": "https://schema.org", "@type": "NewsArticle", "headline": p.title_en, "datePublished": p.published_on.isoformat() if p.published_on else None,
                      "publisher": {"@id": f"{SITE_URL}/#org"}}
                body = f"<article><h1>{E(t(p, 'title', lang))}</h1>{paras(t(p, 'body', lang))}</article>"
                return render(request, f"/news/{p.slug}", t(p, "title", lang), (p.body_en or "")[:240], body, lang, [{k: v for k, v in ld.items() if v}],
                              image=media_url(p.cover_id, "m") if p.cover_id else None, otype="article")
        else:
            ps = db.scalars(select(m.Post).where(m.Post.status == "published", m.Post.visibility == "public").order_by(m.Post.published_on.desc())).all()
            body = f"<h1>{S('News', 'පුවත්')}</h1><ul>" + "".join(f"<li><a href=\"/news/{p.slug}\">{E(t(p, 'title', lang))}</a></li>" for p in ps) + "</ul>"
            return render(request, "/news", S("News & announcements", "පුවත් සහ නිවේදන"), S("News from the Iddawela family and foundation.", DEFAULT_DESC["si"]), body, lang)
    if head == "gallery":
        albums = db.scalars(select(m.Album).where(m.Album.visibility == "public").order_by(m.Album.year.desc().nulls_last())).all()
        if len(parts) > 1:
            a = next((x for x in albums if x.slug == parts[1]), None)
            if a:
                return render(request, f"/gallery/{a.slug}", t(a, "title", lang), (a.description_en or a.title_en)[:240],
                              f"<h1>{E(t(a, 'title', lang))}</h1>{paras(t(a, 'description', lang))}", lang, image=media_url(a.cover_id, "m") if a.cover_id else None)
        body = f"<h1>{S('Gallery', 'ඡායාරූප')}</h1><ul>" + "".join(f"<li><a href=\"/gallery/{a.slug}\">{E(t(a, 'title', lang))}</a></li>" for a in albums) + "</ul>"
        return render(request, "/gallery", S("Photo gallery", "ඡායාරූප"), S("Family photographs: the Mahagedara, ancestors, reunions and weddings.", DEFAULT_DESC["si"]), body, lang)
    simple = {"join": ("Join the family network", "පවුලට එක්වන්න", "Create your account, find yourself on the tree and keep your branch up to date."),
              "ask": ("Ask the family archive", "ලේඛනාගාරයෙන් අසන්න", "Ask questions about the Iddawela family history and get answers from the archive."),
              "opportunities": ("Opportunities", "අවස්ථා", "Jobs, internships and mentorship shared within the family."),
              "login": ("Sign in", "ඇතුළු වන්න", "Sign in to the Iddawela family network."),
              "about": ("About the foundation", "පදනම ගැන", DEFAULT_DESC["en"])}
    if head in simple:
        en, si, desc = simple[head]
        robots = "noindex, follow" if head in ("login", "opportunities") else None
        return render(request, f"/{head}", S(en, si), desc, f"<h1>{E(S(en, si))}</h1><p>{E(desc)}</p>", lang, robots=robots)
    if head in ("me", "admin", "reset", "register", "play"):
        return render(request, path, "Iddawela Foundation", DEFAULT_DESC[lang], "", lang, robots="noindex, nofollow")
    return render(request, path, S("Page not found", "පිටුව හමු නොවීය"), DEFAULT_DESC[lang], f"<h1>{S('Page not found', 'පිටුව හමු නොවීය')}</h1>", lang, status=404, robots="noindex")

@r.get("/robots.txt")
def robots():
    if NOINDEX:
        return PlainTextResponse("User-agent: *\nDisallow: /\n")
    return PlainTextResponse(f"User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /me\nDisallow: /admin\nDisallow: /reset\n\nSitemap: {SITE_URL}/sitemap.xml\n")

@r.get("/sitemap.xml")
def sitemap(db: Session = Depends(get_db)):
    g = graph(db)
    urls = ["/", "/story", "/tree", "/events", "/causes", "/memorial", "/news", "/gallery", "/join", "/ask"]
    urls += [f"/heritage/{p.slug}" for p in db.scalars(select(m.Page))]
    urls += [f"/people/{p.slug}" for p in g["people"].values()]
    urls += [f"/events/{e.slug}" for e in db.scalars(select(m.Event).where(m.Event.status == "published"))]
    urls += [f"/causes/{c.slug}" for c in db.scalars(select(m.Cause).where(m.Cause.status != "draft"))]
    urls += [f"/memorial/{o.slug}" for o in db.scalars(select(m.Obituary).where(m.Obituary.status == "published"))]
    urls += [f"/news/{p.slug}" for p in db.scalars(select(m.Post).where(m.Post.status == "published", m.Post.visibility == "public"))]
    urls += [f"/gallery/{a.slug}" for a in db.scalars(select(m.Album).where(m.Album.visibility == "public"))]
    out = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">']
    for u in urls:
        en, si = SITE_URL + u, SITE_URL + u + "?lang=si"
        for loc in (en, si):
            out.append(f"<url><loc>{E(loc)}</loc><xhtml:link rel=\"alternate\" hreflang=\"en\" href=\"{E(en)}\"/><xhtml:link rel=\"alternate\" hreflang=\"si\" href=\"{E(si)}\"/></url>")
    out.append("</urlset>")
    return Response("\n".join(out), media_type="application/xml", headers={"Cache-Control": "public, max-age=3600"})
