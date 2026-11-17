import importlib.util
import io
import json
from contextlib import redirect_stdout
from pathlib import Path
import shutil
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('release', Path(__file__).with_name('server-release.py'))
release = importlib.util.module_from_spec(spec)
spec.loader.exec_module(release)


class ReleaseFailureTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        root = Path(self.temp.name)
        release.APP = root / 'app'
        release.WORK = root / 'builds'
        for path in ['src', 'node_modules', '.next/static']:
            (release.APP / path).mkdir(parents=True, exist_ok=True)
        (release.APP / 'src/page.tsx').write_text('source')
        (release.APP / 'package.json').write_text('{}')
        (release.APP / '.next/BUILD_ID').write_text('old-build')
        (release.APP / '.next/static/old.js').write_text('old asset')
        self.restarts = 0

    def fake_run(self, args, **kwargs):
        if args[:2] == ['cp', '-al']:
            shutil.copytree(args[2], args[3])
        elif args[:2] == ['pm2', 'restart']:
            self.restarts += 1
            if self.restarts == 1:
                raise RuntimeError('simulated restart failure')
        else:
            raise AssertionError('Unexpected command: ' + str(args))

    def fake_build(self, code):
        def start(args, cwd, **kwargs):
            if code == 0:
                built = Path(cwd) / '.next'
                (built / 'static').mkdir(parents=True)
                (built / 'BUILD_ID').write_text('new-build')
                (built / 'static/new.js').write_text('new asset')
            return SimpleNamespace(returncode=code, poll=lambda: code, pid=999999)
        return start

    def assert_live_old_and_stage_removed(self):
        self.assertEqual((release.APP / '.next/BUILD_ID').read_text(), 'old-build')
        self.assertEqual(list(release.WORK.glob('stage-*')), [])
        report = json.loads(next(release.WORK.glob('*.json')).read_text())
        self.assertFalse(report['deployed'])
        return report

    def test_failed_build_does_not_replace_live_release(self):
        with patch('sys.argv', ['server-release.py', '--deploy']), \
             patch.object(release, 'run', self.fake_run), \
             patch.object(release.subprocess, 'Popen', self.fake_build(137)), \
             redirect_stdout(io.StringIO()), self.assertRaises(RuntimeError):
            release.main()
        self.assertEqual(self.assert_live_old_and_stage_removed()['exit_code'], 137)
        self.assertEqual(self.restarts, 0)

    def test_failed_activation_restores_previous_release(self):
        with patch('sys.argv', ['server-release.py', '--deploy']), \
             patch.object(release, 'run', self.fake_run), \
             patch.object(release.subprocess, 'Popen', self.fake_build(0)), \
             redirect_stdout(io.StringIO()), self.assertRaises(RuntimeError):
            release.main()
        self.assert_live_old_and_stage_removed()
        self.assertEqual(self.restarts, 2)
        candidate = next(release.WORK.glob('artifact-*'))
        self.assertEqual((candidate / '.next/BUILD_ID').read_text(), 'new-build')
        self.assertEqual(json.loads((candidate / '.next/static-file-list.json').read_text()), ['new.js'])
        self.assertTrue((candidate / '.next/static/old.js').exists())


if __name__ == '__main__':
    unittest.main()
