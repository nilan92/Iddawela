"""Create or reset the super admin from the server shell (never from the web).
Usage: python -m app.create_admin --name "Nilan Iddawela" --email you@example.com [--phone +9477...] [--person nilan-iddawela]
The password is read from the IDDAWELA_ADMIN_PASSWORD env var, or generated and printed once."""
import argparse, os, secrets, string
from sqlalchemy import select
from .db import SessionLocal
from . import models as m
from .security import hash_password

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--name", required=True); ap.add_argument("--email", required=True)
    ap.add_argument("--phone"); ap.add_argument("--person")
    a = ap.parse_args()
    pw = os.environ.get("IDDAWELA_ADMIN_PASSWORD") or "".join(secrets.choice(string.ascii_letters + string.digits) for _ in range(20))
    db = SessionLocal()
    email = a.email.strip().lower()
    u = db.scalar(select(m.User).where(m.User.email == email))
    if not u:
        u = m.User(name=a.name, email=email); db.add(u)
    u.name = a.name; u.phone = a.phone or u.phone; u.role = "super_admin"; u.status = "approved"
    u.password_hash = hash_password(pw); u.token_version = (u.token_version or 0) + 1
    if a.person:
        p = db.scalar(select(m.Person).where(m.Person.slug == a.person))
        if p:
            u.person_id = p.id
    db.add(m.Audit(action="admin.create_cli", target=f"user:{email}"))
    db.commit()
    print(f"super admin ready: {email}")
    if not os.environ.get("IDDAWELA_ADMIN_PASSWORD"):
        print(f"password: {pw}")

if __name__ == "__main__":
    main()
