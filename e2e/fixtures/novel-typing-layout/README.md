# Novel typing layout regression

Run from the repository root with installed development dependencies:

```sh
node e2e/fixtures/novel-typing-layout/verify.mjs
```

Uses the real reader and CSS in an isolated Vite browser fixture. API calls and reading-progress writes are stubbed; no login or production data is required. Checks adjacent input alignment with errors and all hint modes, placeholder visibility at 15/22px, light/dark themes, 320/390/1280px widths, answer submission, focus, overflow and reading-position preservation. Screenshots are generated beside the fixture and ignored by Git.
