# French Word Atlas account sync

French Word Atlas uses the existing MaxNote Supabase account. Access is controlled by the `french_atlas` value in `users.feature_permissions`, and the existing account expiry and ban fields are enforced on every progress request. Do not grant this permission automatically to existing accounts.

Learning state is stored in `public.french_word_atlas_user_state`, keyed by the authenticated Supabase user ID. The JSON snapshot includes FSRS cards, bookmarks, daily activity, typing rounds, mistakes, an active session, and settings. Row-level security restricts access to `auth.uid() = user_id`.

The production API process is `scripts/french-atlas-api.mjs`, managed by PM2 as `french-atlas-api` on `127.0.0.1:3302`. Nginx routes `/api/french-atlas/state` to this process and routes the existing `/api/auth/check-permissions` request through it so entitled users also see the French Atlas entry. `/french-atlas-entry` returns users to `https://fr.maxnote.top/` after MaxNote login. The service reads the existing MaxNote `.env.local`; it does not keep a second account or secret store.

The database change is in `supabase/migrations/20261117_create_french_word_atlas_user_state.sql`. It is additive and idempotent. The frontend keeps a local cache, uploads pre-existing anonymous progress only after the user chooses to import it, and offers merge or backup when both local and account records exist.

To grant access, add `french_atlas` to the intended user's `users.feature_permissions`. A French Atlas permission does not grant other MaxNote products. The admin permission option is included in `UserDetail.tsx` and `PackageListClient.tsx` for the next MaxNote application build.

## Production status (2026-11-17)

- French static release `20261117-v119` is live at `https://fr.maxnote.top/`.
- PM2 process `french-atlas-api` serves the account API on `127.0.0.1:3302`; Nginx routes the French state endpoint and MaxNote permission check through it.
- The state table and its three owner-only RLS policies are applied to the existing MaxNote Supabase project.
- The MaxNote admin user/package permission controls are now in the live Next.js build `IRtPcBPI7cSzapOqErIkx`, deployed on November 17 after the controlled server build succeeded. Both emitted admin bundles contain the French Atlas permission option. No account was automatically granted access, and authenticated progress writes have not yet been exercised with a real entitled account.
- Existing anonymous browser progress is uploaded only after the user chooses the import/merge option on first account login.
