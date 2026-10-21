import json, os
from fastapi import FastAPI, Depends, Request
from fastapi.responses import FileResponse, JSONResponse, Response
from starlette.concurrency import run_in_threadpool
from fastapi.middleware.gzip import GZipMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session
from .config import WEB_DIR
from .db import get_db, engine, SessionLocal
from .api import auth, people, content, admin, ask
from . import seo
from . import models as m
from .security import read_token
from .family import graph, scrub

VERSION = os.environ.get("APP_VERSION", "dev")
app = FastAPI(title="Iddawela Foundation API", version="1.0", docs_url="/api/docs", openapi_url="/api/openapi.json", redoc_url=None)

# Second privacy layer: the endpoints already anonymise living people for signed-out visitors; this pass also takes
# living relatives' names out of every free-text field (story pages, events, captions, memorial pages, bios) before
# a JSON response leaves the server. Signed-in, approved members get responses untouched.
SCRUB_SKIP = ("/api/auth/", "/api/admin/", "/api/health", "/api/openapi.json", "/api/docs")

def _viewer_is_public(request: Request) -> bool:
    auth_h = request.headers.get("authorization", "")
    tok = auth_h[7:] if auth_h.lower().startswith("bearer ") else None
    data = read_token(tok) if tok else None
    if not data:
        return True
    with SessionLocal() as db:
        u = db.get(m.User, data["u"])
        return not (u and u.token_version == data["v"] and u.status == "approved")

def _scrub_body(body: bytes) -> bytes:
    with SessionLocal() as db:
        return json.dumps(scrub(json.loads(body), graph(db)), ensure_ascii=False).encode()

@app.middleware("http")
async def public_scrub(request: Request, call_next):
    resp = await call_next(request)
    path = request.url.path
    if (not path.startswith("/api/") or path.startswith(SCRUB_SKIP)
            or "application/json" not in resp.headers.get("content-type", "")):
        return resp
    if not await run_in_threadpool(_viewer_is_public, request):
        return resp
    body = b"".join([chunk async for chunk in resp.body_iterator])
    try:
        new = await run_in_threadpool(_scrub_body, body)
    except ValueError:
        return Response(body, status_code=resp.status_code, headers=dict(resp.headers))
    headers = {k: v for k, v in resp.headers.items() if k.lower() not in ("content-length", "content-type")}
    return Response(new, status_code=resp.status_code, headers=headers, media_type="application/json")

app.add_middleware(GZipMiddleware, minimum_size=800)

@app.middleware("http")
async def security_headers(request: Request, call_next):
    resp = await call_next(request)
    resp.headers.setdefault("X-Content-Type-Options", "nosniff")
    resp.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    resp.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
    if request.url.path.startswith("/api/"):
        resp.headers.setdefault("Cache-Control", "no-store")
    return resp

@app.get("/api/health")
def health(db: Session = Depends(get_db)):
    db.execute(text("select 1"))
    return {"ok": True, "app": "Iddawela Foundation", "version": VERSION}

for router in (auth.r, people.r, content.r, admin.r, ask.r, seo.r):
    app.include_router(router)

STATIC_TOP = {"favicon.ico", "manifest.json", "sw.js", "apple-touch-icon.png"}

@app.api_route("/{path:path}", methods=["GET", "HEAD"], include_in_schema=False)
def spa(path: str, request: Request, db: Session = Depends(get_db)):
    if path.startswith("api/"):
        return JSONResponse({"detail": "Not found"}, status_code=404)
    f = (WEB_DIR / path).resolve()
    if path and str(f).startswith(str(WEB_DIR.resolve())) and f.is_file():
        cache = "public, max-age=31536000, immutable" if path.startswith(("_expo/", "assets/")) else "public, max-age=86400"
        if path in ("sw.js", "manifest.json"):
            cache = "no-cache"
        return FileResponse(f, headers={"Cache-Control": cache})
    return seo.page_for(request, "/" + path, db)
