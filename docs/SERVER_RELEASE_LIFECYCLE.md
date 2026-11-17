# Server build and release lifecycle

Implemented and deployed 2026-11-17, without a hardware upgrade.

## Entrypoints

- `deploy.bat`: run from the local master branch. It fetches GitHub, fast-forwards when possible, pushes committed changes, then calls `python3 scripts/server-release.py --pull --deploy` on the server. Uncommitted local edits stay local. A future divergence stops with an error instead of overwriting either side. Double-click it for deployment; `deploy.bat --non-interactive` runs the same flow without pausing.
- On the server, `python3 scripts/server-release.py --deploy` builds the reviewed source already present on the server. Add `--pull` only for a clean Git deployment.
- `scripts/deploy.sh` forwards to the same managed release command.
- `npm run build` uses `scripts/build-locked.mjs`; on Linux all checkouts share `/var/lock/maxnote-build.lock`. Do not bypass this with direct `next build`.

## Lifecycle and limits

The release command takes `/var/lock/maxnote-deploy.lock`, snapshots source into `/root/maxnote-managed-builds/stage-*`, shares dependencies by hardlink, and excludes prior generated builds and backup directories. It uses a systemd scope with 2700 MiB physical memory, at most 1 GiB swap and 150% CPU; the Node JS heap is limited to 2048 MiB. It records process-tree RSS and cgroup peaks. A build is stopped if it exceeds 20 minutes.

Source/build identity is checked before activation. A failed build leaves the live `.next` in place. A failed restart or health check restores the previous build. Stage directories are removed on completion/failure. Keep two managed rollback builds and at most two unactivated build artifacts. Small logs and JSON resource reports remain under `/root/maxnote-managed-builds/`.

The server swap policy was changed from `vm.swappiness=0` to `30`; the original value/config is backed up in `/root/backups/resource-fix-20261117/`. Swap capacity remains 1 GiB.

## Verified release

- Run: `20261117-214317`, full build 139.5 seconds, exit code 0.
- Previous build: `vEYvWLTIxPu22yMU-wvhk`.
- Active build: `IRtPcBPI7cSzapOqErIkx`.
- Process-tree peak RSS: 2691.2 MiB; cgroup physical-memory peak: 2700 MiB; memory plus swap peak: 3002.7 MiB.
- Verified login page HTTP 200; French site HTTP 200; unauthenticated French state API HTTP 401. No real authenticated account-write test was performed.

## Retired staging copies

The five audited `maxtube-*stage*` directories from November 17 were retired after their non-generated source/data were archived and file hashes checked. Source archives and their SHA-256 manifest are under `/root/backups/resource-fix-20261117/`. This includes the unshipped third-lesson style change. Dependencies and old generated `.next*` directories were excluded from source archives. Stop and verify preview ownership before retiring any new stage.

## French static site

The installed `/usr/local/lib/maxnote/prune-fr-releases.py` keeps the active release and two previous complete releases. It preserves future/incomplete candidates and skips symlink targets. `scripts/deploy-fr-host.mjs --run` wraps French deployments in `/var/lock/fr-release.lock` and runs retention only after a successful deployment. `/etc/cron.daily/maxnote-fr-retention` provides a daily fallback for older/manual deployment paths. Deletion manifests are recorded in `/var/log/fr-release-retention.jsonl`.
