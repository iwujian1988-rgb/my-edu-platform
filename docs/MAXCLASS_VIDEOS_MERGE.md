# MAXCLASS + Videos Merge

## Current Contract

- `/videos` is the real tube surface.
- `/maxtube` is a legacy compatibility route and redirects to `/videos?language=fr`.
- `/parcours` is the MAXCLASS learning surface.
- `/parcours` exposes the courses registered from the MAXCLASS handoff:
  - `30days-listening` from `src/data/course-30days-listening.json`
  - `a1-real-french` from `src/data/parcours-a1-real-french.json`
- MAXCLASS access inherits French videos access:
  - `feature_permissions` contains `video`
  - `language_packages` contains `fr` or `*`
  - permission is not expired
  - fallback allows users whose package IDs overlap published French videos.
- Videos inherit the global MAXCLASS skin through `data-video-surface="true"`.

## Local Verification

```bash
npm run maxclass:audit:videos
npm run maxclass:parcours:import:dry-run
npm run maxclass:smoke
npm run build
```

`maxclass:smoke` verifies:

- `/videos` has the MAXCLASS entry.
- The entry is visible for all videos and French-filtered videos.
- `/maxtube` redirects to `/videos?language=fr`.
- `/parcours/a1-real-french` redirects unauthenticated users to login.
- `/parcours/30days-listening` redirects unauthenticated users to login.
- MAXCLASS media references are OSS/public URLs.
- `30days-listening` exposes OSS-backed video blocks.
- Videos no longer force light mode.
- Videos expose the MAXCLASS skin surface.
- MAXCLASS parcours routes reject users without French videos access.
- Access checks require active video permission plus French language access, with
  a package-overlap fallback for published French videos.

## Supabase Deployment

Required `.env.local` values:

```bash
SUPABASE_DB_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...
```

Then run:

```bash
npm run maxclass:parcours:deploy
```

This command applies `supabase/migrations/2026061701_add_parcours_slugs.sql`,
imports both MAXCLASS parcours JSON files, and verifies the imported course,
module, lesson, and block payloads.

If `SUPABASE_DB_URL` or `DATABASE_URL` is missing, deployment stops before any
remote changes are attempted.

If the database URL is unavailable, run
`supabase/migrations/2026061701_add_parcours_slugs.sql` in the Supabase SQL
Editor, then run:

```bash
npm run maxclass:parcours:import
npm run maxclass:parcours:verify
```
