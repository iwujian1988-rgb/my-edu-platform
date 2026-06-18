import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const HTML_ROOT = path.join(ROOT, 'kaoshi', 'podcastfrancais_download', 'site', 'www.podcastfrancaisfacile.com')
const PARSED_PATH = path.join(ROOT, 'kaoshi-parsed.json')
const MEDIA_MAP_PATH = path.join(ROOT, 'media-url-map.json')
const YOUTUBE_VIDEO_DIR = path.join(ROOT, 'kaoshi', 'podcastfrancais_download', 'youtube_videos')
const OUT_PATH = path.join(ROOT, 'tmp-ui-review', 'course-video-oss-coverage.json')
const DATA_OUT_PATH = path.join(ROOT, 'src', 'data', 'course-video-oss-map.json')
const MATCH_THRESHOLD = 0.72

function normalizeText(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&#0*39;/g, "'")
    .replace(/&[#a-z0-9]+;/gi, ' ')
    .replace(/[：:？?¿!！'’‘"“”«»()（）[\]{}.,，。;；/\\|_⧸-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function tokenSet(value) {
  return new Set(normalizeText(value).split(' ').filter(token => token.length > 1))
}

function jaccardScore(first, second) {
  const a = tokenSet(first)
  const b = tokenSet(second)
  if (a.size === 0 || b.size === 0) return 0
  const intersection = [...a].filter(token => b.has(token)).length
  const union = new Set([...a, ...b]).size
  return intersection / union
}

function compactScore(first, second) {
  const a = normalizeText(first).replace(/\s+/g, '')
  const b = normalizeText(second).replace(/\s+/g, '')
  if (!a || !b) return 0
  if (a === b) return 1
  if (a.includes(b) || b.includes(a)) {
    return Math.min(a.length, b.length) / Math.max(a.length, b.length)
  }
  return 0
}

function bestScore(first, second) {
  return Math.max(jaccardScore(first, second), compactScore(first, second))
}

function walkHtmlFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      walkHtmlFiles(fullPath, files)
    } else if (entry.name.endsWith('.html')) {
      files.push(fullPath)
    }
  }
  return files
}

function extractYoutubeTitlesFromHtml() {
  const byId = new Map()
  const files = walkHtmlFiles(HTML_ROOT)

  for (const file of files) {
    const html = fs.readFileSync(file, 'utf8')
    const relativeHtml = path.relative(HTML_ROOT, file).replace(/\\/g, '/')
    const wrapperRegex = /<div[^>]+class=["'][^"']*lyte-wrapper[^"']*["'][^>]*title=["']([^"']+)["'][\s\S]*?<div[^>]+id=["']WYL_([^"']+)["']/gi
    for (const match of html.matchAll(wrapperRegex)) {
      const title = match[1].trim()
      const youtubeId = match[2].trim()
      if (!byId.has(youtubeId)) {
        byId.set(youtubeId, {
          youtube_id: youtubeId,
          youtube_title: title,
          source_htmls: [],
        })
      }
      const item = byId.get(youtubeId)
      if (!item.source_htmls.includes(relativeHtml)) {
        item.source_htmls.push(relativeHtml)
      }
    }
  }

  return byId
}

function collectParsedReferences(parsed) {
  const references = new Map()

  function addReference(youtubeId, reference) {
    if (!references.has(youtubeId)) references.set(youtubeId, [])
    references.get(youtubeId).push(reference)
  }

  for (const unit of parsed.units || []) {
    for (const lesson of unit.lessons || []) {
      for (const youtubeId of lesson.youtube_ids || []) {
        addReference(youtubeId, {
          scope: 'lesson',
          unit_number: unit.unit_number,
          title: lesson.title,
          source_html: lesson.source_html,
        })
      }
    }
  }

  for (const item of parsed.supplementary || []) {
    for (const youtubeId of item.youtube_ids || []) {
      addReference(youtubeId, {
        scope: 'supplementary',
        title: item.title,
        category: item.category,
        source_html: item.source_html,
      })
    }
  }

  return references
}

function buildVideoCandidates(mediaMap) {
  const videoMap = mediaMap.video || {}
  const candidates = []
  const seenUrls = new Set()

  for (const [key, url] of Object.entries(videoMap)) {
    if (!key.startsWith('course-a1/video/')) continue
    if (seenUrls.has(url)) continue
    seenUrls.add(url)
    const filename = path.basename(key)
    candidates.push({
      filename,
      oss_path: key,
      oss_url: url,
      title_guess: filename.replace(/\.mp4$/i, ''),
    })
  }

  return candidates
}

function buildLocalVideoCandidates() {
  if (!fs.existsSync(YOUTUBE_VIDEO_DIR)) return []

  return fs.readdirSync(YOUTUBE_VIDEO_DIR)
    .filter(filename => filename.endsWith('.mp4'))
    .map(filename => ({
      filename,
      local_path: path.join(YOUTUBE_VIDEO_DIR, filename),
      title_guess: filename.replace(/\.mp4$/i, '').replace(/\.f\d+$/i, ''),
    }))
}

function findBestLocalVideo(title, localCandidates) {
  let best = null

  for (const candidate of localCandidates) {
    const score = bestScore(title, candidate.title_guess)
    if (!best || score > best.score) {
      best = { ...candidate, score }
    }
  }

  return best
}

function matchVideos(youtubeTitles, parsedReferences, candidates) {
  const rows = []

  for (const [youtubeId, refs] of parsedReferences.entries()) {
    const titleInfo = youtubeTitles.get(youtubeId)
    const title = titleInfo?.youtube_title || refs[0]?.title || youtubeId
    let best = null

    for (const candidate of candidates) {
      const score = bestScore(title, candidate.title_guess)
      if (!best || score > best.score) {
        best = { ...candidate, score }
      }
    }

    rows.push({
      youtube_id: youtubeId,
      youtube_title: title,
      source_htmls: titleInfo?.source_htmls || [...new Set(refs.map(ref => ref.source_html).filter(Boolean))],
      references: refs,
      matched: Boolean(best && best.score >= MATCH_THRESHOLD),
      match_score: best?.score || 0,
      oss_path: best && best.score >= MATCH_THRESHOLD ? best.oss_path : null,
      oss_url: best && best.score >= MATCH_THRESHOLD ? best.oss_url : null,
      oss_filename: best && best.score >= MATCH_THRESHOLD ? best.filename : null,
      best_guess: best,
    })
  }

  return rows.sort((first, second) => Number(first.matched) - Number(second.matched) || first.youtube_title.localeCompare(second.youtube_title))
}

function main() {
  const parsed = JSON.parse(fs.readFileSync(PARSED_PATH, 'utf8'))
  const mediaMap = JSON.parse(fs.readFileSync(MEDIA_MAP_PATH, 'utf8'))
  const youtubeTitles = extractYoutubeTitlesFromHtml()
  const references = collectParsedReferences(parsed)
  const candidates = buildVideoCandidates(mediaMap)
  const localCandidates = buildLocalVideoCandidates()
  const rows = matchVideos(youtubeTitles, references, candidates)
    .map(row => {
      const localGuess = findBestLocalVideo(row.youtube_title, localCandidates)
      return {
        ...row,
        local_file_found: Boolean(localGuess && localGuess.score >= MATCH_THRESHOLD),
        local_file_guess: localGuess && localGuess.score >= MATCH_THRESHOLD ? localGuess : null,
      }
    })
  const missing = rows.filter(row => !row.matched)
  const matched = rows.filter(row => row.matched)
  const dataMap = Object.fromEntries(matched.map(row => [
    row.youtube_id,
    {
      title: row.youtube_title,
      oss_url: row.oss_url,
      oss_path: row.oss_path,
      source_htmls: row.source_htmls,
    },
  ]))
  const report = {
    generated_at: new Date().toISOString(),
    threshold: MATCH_THRESHOLD,
    totals: {
      unique_youtube_ids: rows.length,
      oss_video_files: candidates.length,
      local_video_files: localCandidates.length,
      matched: matched.length,
      missing: missing.length,
    },
    missing,
    matched,
  }

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true })
  fs.mkdirSync(path.dirname(DATA_OUT_PATH), { recursive: true })
  fs.writeFileSync(OUT_PATH, `${JSON.stringify(report, null, 2)}\n`)
  fs.writeFileSync(DATA_OUT_PATH, `${JSON.stringify({
    generated_at: report.generated_at,
    videos: dataMap,
  }, null, 2)}\n`)

  console.log(JSON.stringify(report.totals, null, 2))
  if (missing.length > 0) {
    console.log('Missing:')
    for (const row of missing) {
      console.log(`- ${row.youtube_id} | ${row.youtube_title} | best=${row.best_guess?.filename || 'none'} score=${row.match_score.toFixed(2)}`)
    }
  }
}

main()
