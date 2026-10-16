"""'Ask the archive': retrieval over the foundation's own content, with an optional LLM on top.
The LLM key (ANTHROPIC_API_KEY or OPENAI_API_KEY) lives only in the server env file; without one, the
assistant still answers with the best passages from the archive."""
import math, re
from collections import Counter
import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session
from ..db import get_db
from .. import models as m
from ..config import ANTHROPIC_API_KEY, OPENAI_API_KEY, AI_MODEL
from ..security import current_user_optional, rate_limit
from ..family import graph, show_details

r = APIRouter(prefix="/api", tags=["ask"])
WORD = re.compile(r"[\w\u0D80-\u0DFF]+", re.UNICODE)
STOP = set("the a an of and or to in on at for is was were be by with as from that this who what when where which how did does do his her their its it he she they them i me my you your".split())

def toks(s):
    return [w for w in (x.lower() for x in WORD.findall(s or "")) if w not in STOP and len(w) > 1]

def docs(db, user):
    g = graph(db)
    out = []
    for p in db.scalars(select(m.Page)):
        for i, chunk in enumerate(re.split(r"\n\s*\n", p.body_en or "")):
            if chunk.strip():
                out.append(dict(title=p.title_en, url=f"/heritage/{p.slug}", text=chunk.strip()[:1600]))
    for p in g["people"].values():
        if not show_details(p, user):
            continue
        years = f" ({p.birth_year or '?'}–{p.death_year or ''})" if (p.birth_year or p.death_year) else ""
        head = f"{p.name_en}{years}, generation {p.generation}."
        out.append(dict(title=p.name_en, url=f"/people/{p.slug}", text=(head + " " + (p.bio_en or ""))[:1800]))
    for e in db.scalars(select(m.Event)):
        out.append(dict(title=e.title_en, url=f"/events/{e.slug}", text=f"{e.title_en}. {e.starts_on or ''} at {e.venue or ''}. Sponsor: {e.sponsor or '-'}. Attendance: {e.attendance or '-'}. {(e.body_en or '')[:1200]}"))
    return out

def search(db, user, q, k=6):
    D = docs(db, user)
    qt = toks(q)
    if not qt:
        return []
    df = Counter()
    tok_docs = []
    for d in D:
        t = toks(d["title"] + " " + d["text"]); tok_docs.append(t); df.update(set(t))
    N = len(D); avg = sum(len(t) for t in tok_docs) / max(N, 1)
    scored = []
    for d, t in zip(D, tok_docs):
        tf = Counter(t); s = 0.0
        for w in qt:
            if w in tf:
                idf = math.log(1 + (N - df[w] + 0.5) / (df[w] + 0.5))
                s += idf * tf[w] * 2.2 / (tf[w] + 1.2 * (0.25 + 0.75 * len(t) / avg))
        if any(w in toks(d["title"]) for w in qt):
            s *= 1.6
        if s > 0:
            scored.append((s, d))
    scored.sort(key=lambda x: -x[0])
    return [d for _, d in scored[:k]]

class AskIn(BaseModel):
    question: str
    lang: str = "en"

SYSTEM = ("You are the archivist of the Pilimathalawa Iddawela Foundation, a Sri Lankan family foundation of the descendants of "
          "Ukkubanda Iddawela (1880-1932) and Lokumenike. Answer warmly and briefly using ONLY the archive passages given. "
          "If the passages don't contain the answer, say so and suggest asking an elder or adding the detail on the site. "
          "Never invent dates, names or relationships. Answer in {lang}.")

@r.post("/ask")
def ask(body: AskIn, request: Request, user=Depends(current_user_optional), db: Session = Depends(get_db)):
    rate_limit("ask:" + (request.client.host if request.client else "x"), 20, 600)
    q = body.question.strip()[:500]
    if not q:
        raise HTTPException(400, "Ask a question")
    hits = search(db, user, q)
    sources = [dict(title=h["title"], url=h["url"]) for h in hits]
    lang = "Sinhala" if body.lang == "si" else "English"
    ctx = "\n\n".join(f"[{i+1}] {h['title']} ({h['url']}):\n{h['text']}" for i, h in enumerate(hits))
    answer, mode = None, "archive"
    try:
        if ANTHROPIC_API_KEY and hits:
            res = httpx.post("https://api.anthropic.com/v1/messages", timeout=40, headers={
                "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json"},
                json={"model": AI_MODEL or "claude-haiku-4-5", "max_tokens": 600, "system": SYSTEM.format(lang=lang),
                      "messages": [{"role": "user", "content": f"Archive passages:\n{ctx}\n\nQuestion: {q}"}]})
            res.raise_for_status(); answer = res.json()["content"][0]["text"]; mode = "ai"
        elif OPENAI_API_KEY and hits:
            res = httpx.post("https://api.openai.com/v1/chat/completions", timeout=40, headers={"authorization": f"Bearer {OPENAI_API_KEY}"},
                             json={"model": AI_MODEL or "gpt-4o-mini", "max_tokens": 600, "messages": [
                                 {"role": "system", "content": SYSTEM.format(lang=lang)},
                                 {"role": "user", "content": f"Archive passages:\n{ctx}\n\nQuestion: {q}"}]})
            res.raise_for_status(); answer = res.json()["choices"][0]["message"]["content"]; mode = "ai"
    except Exception:
        answer = None
    if not answer:
        if not hits:
            answer = ("I couldn't find that in the archive yet. If you know the story, sign in and add it, so the next generation can find it."
                      if body.lang != "si" else "එය තවම ලේඛනාගාරයේ නැත. ඔබ දන්නේ නම්, ඇතුළු වී එය එක් කරන්න.")
        else:
            best = hits[0]
            sents = re.split(r"(?<=[.!?])\s+", best["text"])
            qt = set(toks(q))
            ranked = sorted(sents, key=lambda s: -len(qt & set(toks(s))))[:3]
            answer = " ".join(s for s in sents if s in ranked)[:900]
    return {"answer": answer, "sources": sources, "mode": mode}
