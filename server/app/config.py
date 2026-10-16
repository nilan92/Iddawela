import os, secrets, pathlib

def _env(name, default=None):
    v = os.environ.get(name)
    return v if v not in (None, "") else default

DATABASE_URL = _env("DATABASE_URL", "postgresql+psycopg://postgres@127.0.0.1:5544/iddawela")
SECRET_KEY = _env("SECRET_KEY") or secrets.token_hex(32)  # set in /etc/iddawela/server.env in production
DATA_DIR = pathlib.Path(_env("IDDAWELA_DATA_DIR", str(pathlib.Path(__file__).resolve().parents[2] / ".data")))
WEB_DIR = pathlib.Path(_env("IDDAWELA_WEB_DIR", str(pathlib.Path(__file__).resolve().parents[2] / "mobile" / "dist")))
SITE_URL = _env("SITE_URL", "https://iddawela.com").rstrip("/")
NOINDEX = _env("NOINDEX", "0") == "1"      # preview hosts must not be indexed
TOKEN_DAYS = int(_env("TOKEN_DAYS", "30"))
# Optional integrations — all keys live in the server env file, never in the repo or the app bundle.
ANTHROPIC_API_KEY = _env("ANTHROPIC_API_KEY")
OPENAI_API_KEY = _env("OPENAI_API_KEY")
AI_MODEL = _env("AI_MODEL")
SMTP_HOST = _env("SMTP_HOST"); SMTP_PORT = int(_env("SMTP_PORT", "587")); SMTP_USER = _env("SMTP_USER"); SMTP_PASS = _env("SMTP_PASS")
MAIL_FROM = _env("MAIL_FROM", "Iddawela Foundation <no-reply@iddawela.com>")
MEDIA_DIR = DATA_DIR / "media"
MEDIA_DIR.mkdir(parents=True, exist_ok=True)
