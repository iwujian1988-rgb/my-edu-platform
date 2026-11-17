#!/usr/bin/env python3
"""Build an isolated source copy under resource limits, optionally activate it."""
import argparse
import fcntl
import hashlib
import json
import os
from pathlib import Path
import shutil
import signal
import subprocess
import time

APP = Path('/root/my-edu-platform')
WORK = Path('/root/maxnote-managed-builds')
EXCLUDE = {'node_modules', '.git', '.tmp', 'backups', '.deploy-backups', 'logs', 'output'}


def run(args, **kwargs):
    return subprocess.run(args, check=True, **kwargs)


def source_hash():
    sha = hashlib.sha256()
    files = list((APP / 'src').rglob('*'))
    files += [APP / n for n in ('package.json', 'package-lock.json', 'next.config.ts',
                               'tsconfig.json', 'tailwind.config.ts', '.env.local', '.env.production')]
    for p in sorted(files):
        if p.is_file():
            sha.update(str(p.relative_to(APP)).encode())
            with p.open('rb') as stream:
                for chunk in iter(lambda: stream.read(1024 * 1024), b''):
                    sha.update(chunk)
    return sha.hexdigest()


def remove_owned(path, parent):
    if path.is_symlink() or path.parent != parent or path.resolve().parent != parent.resolve():
        raise RuntimeError('Unexpected managed path: ' + str(path))
    shutil.rmtree(str(path))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--pull', action='store_true')
    parser.add_argument('--deploy', action='store_true')
    args = parser.parse_args()
    WORK.mkdir(mode=0o700, exist_ok=True)
    with open('/var/lock/maxnote-deploy.lock', 'a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        if args.pull:
            for command in (['git', 'diff', '--quiet'], ['git', 'diff', '--cached', '--quiet'],
                            ['git', 'pull', '--ff-only', 'origin', 'master']):
                run(command, cwd=str(APP))
        ident = time.strftime('%Y%m%d-%H%M%S')
        stage = WORK / ('stage-' + ident)
        artifact = WORK / ('artifact-' + ident)
        previous = WORK / ('rollback-' + ident)
        log_path = WORK / (ident + '.log')
        report_path = WORK / (ident + '.json')
        fingerprint = source_hash()
        old_build = (APP / '.next/BUILD_ID').read_text().strip()
        report = {'id': ident, 'source_sha256': fingerprint, 'previous_build': old_build,
                  'log': str(log_path), 'deployed': False, 'peak_rss_mib': 0,
                  'peak_cgroup_mib': 0, 'peak_memory_and_swap_mib': 0}
        stage.mkdir(mode=0o700)
        child = None
        try:
            for p in APP.iterdir():
                if p.name in EXCLUDE or p.name.startswith('.next'):
                    continue
                target = stage / p.name
                if p.is_symlink():
                    target.symlink_to(os.readlink(str(p)))
                elif p.is_dir():
                    shutil.copytree(str(p), str(target), symlinks=True)
                else:
                    shutil.copy2(str(p), str(target))
            # Dependencies are immutable during builds; hardlinks avoid another 1.2 GiB copy.
            run(['cp', '-al', str(APP / 'node_modules'), str(stage / 'node_modules')])
            if source_hash() != fingerprint:
                raise RuntimeError('Source changed while preparing the isolated build')
            unit = 'maxnote-build-' + ident
            cmd = ['systemd-run', '--scope', '--quiet', '--unit', unit,
                   '-p', 'MemoryMax=2700M', '-p', 'MemorySwapMax=1G', '-p', 'CPUQuota=150%',
                   'env', 'NODE_OPTIONS=--max-old-space-size=2048', 'npm', 'run', 'build']
            started = time.monotonic()
            print('Building ' + ident + '; log: ' + str(log_path), flush=True)
            with log_path.open('w') as output:
                child = subprocess.Popen(cmd, cwd=str(stage), stdout=output,
                                         stderr=subprocess.STDOUT, start_new_session=True)
                while child.poll() is None:
                    if time.monotonic() - started > 1200:
                        raise RuntimeError('Build exceeded its 20 minute resource window')
                    rows = subprocess.check_output(['ps', '-eo', 'pid=,ppid=,rss='], universal_newlines=True)
                    tasks = [tuple(map(int, row.split())) for row in rows.splitlines()]
                    descendants = {child.pid}
                    for _ in range(20):
                        added = {pid for pid, parent, rss in tasks if parent in descendants} - descendants
                        if not added:
                            break
                        descendants.update(added)
                    rss = sum(rss for pid, parent, rss in tasks if pid in descendants) / 1024
                    report['peak_rss_mib'] = max(report['peak_rss_mib'], round(rss, 1))
                    cg = Path('/sys/fs/cgroup/memory/system.slice') / (unit + '.scope')
                    for filename, key in [('memory.max_usage_in_bytes', 'peak_cgroup_mib'),
                                          ('memory.memsw.max_usage_in_bytes', 'peak_memory_and_swap_mib')]:
                        p = cg / filename
                        try:
                            value = int(p.read_text()) / 1024**2
                        except FileNotFoundError:
                            continue
                        report[key] = max(report[key], round(value, 1))
                    time.sleep(1)
            report['seconds'] = round(time.monotonic() - started, 1)
            report['exit_code'] = child.returncode
            if child.returncode != 0:
                raise RuntimeError('Build failed; see ' + str(log_path))
            if source_hash() != fingerprint or (APP / '.next/BUILD_ID').read_text().strip() != old_build:
                raise RuntimeError('Production/source changed during build; activation aborted')
            report['build_id'] = (stage / '.next/BUILD_ID').read_text().strip()
            artifact.mkdir()
            shutil.move(str(stage / '.next'), str(artifact / '.next'))
            static_root = artifact / '.next/static'
            own_assets = sorted(str(p.relative_to(static_root)) for p in static_root.rglob('*') if p.is_file())
            (artifact / '.next/static-file-list.json').write_text(json.dumps(own_assets) + '\n')
            if args.deploy:
                # Keep one previous generation for open tabs, without copying inherited assets forever.
                previous_list = APP / '.next/static-file-list.json'
                previous_assets = json.loads(previous_list.read_text()) if previous_list.exists() else [
                    str(p.relative_to(APP / '.next/static'))
                    for p in (APP / '.next/static').rglob('*') if p.is_file()]
                for name in previous_assets:
                    relative = Path(name)
                    if relative.is_absolute() or '..' in relative.parts:
                        raise RuntimeError('Unexpected static asset path')
                    target = static_root / relative
                    source = APP / '.next/static' / relative
                    if not target.exists() and source.is_file():
                        target.parent.mkdir(parents=True, exist_ok=True)
                        shutil.copy2(str(source), str(target))
                previous.mkdir()
                shutil.move(str(APP / '.next'), str(previous / '.next'))
                shutil.move(str(artifact / '.next'), str(APP / '.next'))
                try:
                    run(['pm2', 'restart', 'my-edu-platform'], stdout=subprocess.DEVNULL)
                    healthy = False
                    for _ in range(20):
                        result = subprocess.run(['curl', '--noproxy', '*', '--silent', '--show-error',
                                                 '--fail', '--max-time', '10', '-o', '/dev/null',
                                                 'http://127.0.0.1:3000/login'], stdout=subprocess.DEVNULL,
                                                stderr=subprocess.DEVNULL)
                        if result.returncode == 0:
                            healthy = True
                            break
                        time.sleep(1)
                    if not healthy:
                        raise RuntimeError('New release did not become healthy')
                except Exception:
                    shutil.move(str(APP / '.next'), str(artifact / '.next'))
                    shutil.move(str(previous / '.next'), str(APP / '.next'))
                    run(['pm2', 'restart', 'my-edu-platform'], stdout=subprocess.DEVNULL)
                    raise
                report['deployed'] = True
                artifact.rmdir()
                for old in sorted(WORK.glob('rollback-*'), reverse=True)[2:]:
                    if (old / '.next/BUILD_ID').is_file():
                        remove_owned(old, WORK)
            else:
                report['artifact'] = str(artifact)
            for old in sorted(WORK.glob('artifact-*'), reverse=True)[2:]:
                if (old / '.next/BUILD_ID').is_file():
                    remove_owned(old, WORK)
        except Exception as error:
            report['error'] = str(error)
            raise
        finally:
            if child is not None and child.poll() is None:
                os.killpg(child.pid, signal.SIGTERM)
                try:
                    child.wait(timeout=15)
                except subprocess.TimeoutExpired:
                    os.killpg(child.pid, signal.SIGKILL)
                    child.wait()
            report_path.write_text(json.dumps(report, indent=2) + '\n')
            if stage.exists():
                remove_owned(stage, WORK)
            print(json.dumps(report), flush=True)


if __name__ == '__main__':
    main()
