# MAXCLASS + Videos Acceptance Checklist

## Before Testing

Run the local app:

```bash
npm run dev
```

Use:

```text
http://localhost:3001
```

Use a user that has French videos access:

- `feature_permissions` includes `video`
- `language_packages` includes `fr` or `*`
- permission is not expired

## Acceptance Flow

### 1. Videos Home Entry

Open:

```text
http://localhost:3001/videos
```

Verify:

- The MAXCLASS / system course entry appears on page 1.
- The entry links to `/parcours/a1-real-french`.
- Switching videos language filter to French still shows the MAXCLASS entry.
- From `/parcours`, both `30days-listening` and `a1-real-french` are visible in the course library.

### 2. Legacy MAXTUBE Route

Open:

```text
http://localhost:3001/maxtube
```

Verify:

- It redirects to `/videos?language=fr`.
- No "coming soon" MAXTUBE placeholder page appears.

### 3. Permission Gate

Open while logged out:

```text
http://localhost:3001/parcours/a1-real-french
http://localhost:3001/parcours/30days-listening
```

Verify:

- It redirects to login.

Open while logged in with no French videos access:

```text
http://localhost:3001/parcours/a1-real-french
```

Verify:

- It redirects to `/videos?language=fr`.

Open while logged in with French videos access:

```text
http://localhost:3001/parcours/30days-listening
http://localhost:3001/parcours/a1-real-french
```

Verify:

- The 30 days listening course loads.
- The 30 days listening course shows 3 modules and 10 lessons.
- The A1 real French course loads.
- The course shows 1 module and 3 lessons.

### 4. Course Playback / Media

Open the first module from the course page.

Verify:

- Text/video/exercise blocks render normally.
- `30days-listening` has 2 video blocks.
- Any class video or subtitle media loads from OSS URLs.
- No `/videos/...`, `/content/videos/...`, `/content/subtitles/...`, or local media path appears in the browser network panel for MAXCLASS course media.

### 5. Style And Dark Mode

Open:

```text
http://localhost:3001/videos
http://localhost:3001/parcours/30days-listening
http://localhost:3001/parcours/a1-real-french
```

Verify in light and dark mode:

- Videos pages use the MAXCLASS softer visual skin.
- Videos pages do not force light mode.
- Navigation, cards, and course pages remain readable in dark mode.

## Automated Checks Already Available

```bash
npm run maxclass:smoke
npm run maxclass:audit:videos
npm run maxclass:parcours:verify
npm run build
```
