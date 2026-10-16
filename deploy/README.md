# Deploying (Oracle VM, beside AutoPulse)

Everything is separate from AutoPulse: system user `iddawela`, `/opt/iddawela/{app,venv,web,data}`, Postgres role + database `iddawela`,
`iddawela.service` on 127.0.0.1:8820, and its own Caddy site block. Never edit the AutoPulse block; `caddy validate` then `systemctl reload caddy`
(never restart), then check `curl https://autopulse.flomonotio.com/api/health`.

Update the app:
1. `cd mobile && npx expo export --platform web && node scripts/postexport.mjs dist`
2. copy `server/` to `/opt/iddawela/app/server` and `mobile/dist/` to `/opt/iddawela/web` (owner iddawela)
3. `sudo systemctl restart iddawela` (only the Iddawela service)

Super admin (from the server shell only): `python -m app.create_admin --name ... --email ... [--phone ...] [--person slug]`
(password from IDDAWELA_ADMIN_PASSWORD or printed once). Self-registered accounts always start as pending members.

Caddy: the block in `Caddyfile.iddawela` is appended after the AutoPulse blocks. Create `/var/log/caddy/iddawela.log` owned by `caddy`
before reloading (a log file created by root makes the reload fail; the old config keeps serving).

Going live on iddawela.com: add `iddawela.com, www.iddawela.com` to the block's site line, set SITE_URL=https://iddawela.com and NOINDEX=0,
remove the `X-Robots-Tag` header line, reload Caddy, restart iddawela.
