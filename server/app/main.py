import os
from fastapi import FastAPI, Depends, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.gzip import GZipMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session
from .config import WEB_DIR
from .db import get_db, engine
from .api import auth, people, content, admin, ask
from . import seo

VERSION = os.environ.get("APP_VERSION", "dev")
app = FastAPI(title="Iddawela Foundation API", version="1.0", docs_url="/api/docs", openapi_url="/api/openapi.json", redoc_url=None)
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
