# Seed data (not in git)

The import data from the old iddawela.com lives next to this file on the build machine and is copied to the server
with rsync (it contains living family members' biographies, which the new site only shows to signed-in members):

- `family.json` — 371 people parsed from the old Family Tree page + bio pages (keys = slugs), parent/child edges, marriages
- `content.json` — heritage pages, reunions 1995–2020, albums, media captions
- `translate/` — Sinhala names/bios/pages (machine translation, flagged for review) and facts extracted from bios
- `enrichment.json` — research findings with source URLs (loaded into the admin "Suggested updates" queue, never auto-published)
- processed photos: `seed_media/<wp-media-id>.webp` + `_t.webp`

Import: `python -m app.seed <seed_dir> <seed_media_dir>` then `python -m app.import_suggestions <seed_dir>/enrichment.json`.
