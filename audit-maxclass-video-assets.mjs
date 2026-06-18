import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const DATA_FILES = [
  'src/data/parcours-a1-real-french.json',
  'src/data/course-30days-listening.json',
  'src/data/course-import.json',
  'src/data/sef-import.json',
]
const LOCAL_ROOTS = [
  '',
  'public',
  'MAXCLASS_V1_HANDOFF_2026-06-14/public',
]
const OUT_PATH = path.join(ROOT, 'tmp-ui-review', 'maxclass-video-assets.json')

const LOCAL_MEDIA_PATTERN = /^\/(?:videos|content\/(?:videos|subtitles|materials))\//
const OSS_MEDIA_PATTERN = /^https?:\/\/.+\.(?:mp4|vtt|jpg|jpeg|png|json)(?:\?.*)?$/i

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8').replace(/^\uFEFF/, ''))
}

function walkValue(value, visitor, trail = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkValue(item, visitor, [...trail, String(index)]))
    return
  }

  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, child]) => {
      visitor(key, child, [...trail, key])
      walkValue(child, visitor, [...trail, key])
    })
  }
}

function resolveLocalCandidates(ref) {
  const relativeRef = ref.replace(/^\//, '')
  return LOCAL_ROOTS.map(root => path.join(ROOT, root, relativeRef))
}

function findExistingLocalPath(ref) {
  return resolveLocalCandidates(ref).find(candidate => fs.existsSync(candidate)) || null
}

function collectRefs(relativePath) {
  const json = readJson(relativePath)
  const refs = []

  walkValue(json, (key, value, trail) => {
    if (typeof value !== 'string') return
    if (!LOCAL_MEDIA_PATTERN.test(value) && !OSS_MEDIA_PATTERN.test(value)) return

    const existingLocalPath = LOCAL_MEDIA_PATTERN.test(value)
      ? findExistingLocalPath(value)
      : null

    refs.push({
      file: relativePath,
      key,
      json_path: trail.join('.'),
      ref: value,
      kind: path.extname(value.split('?')[0]).replace('.', '').toLowerCase() || 'unknown',
      is_oss_url: OSS_MEDIA_PATTERN.test(value),
      local_exists: Boolean(existingLocalPath),
      local_path: existingLocalPath
        ? path.relative(ROOT, existingLocalPath).replace(/\\/g, '/')
        : null,
    })
  })

  return refs
}

function summarize(refs) {
  const uniqueRefs = new Map()
  refs.forEach(ref => {
    if (!uniqueRefs.has(ref.ref)) {
      uniqueRefs.set(ref.ref, {
        ref: ref.ref,
        kind: ref.kind,
        is_oss_url: ref.is_oss_url,
        local_exists: ref.local_exists,
        local_path: ref.local_path,
        occurrences: 0,
        files: new Set(),
      })
    }
    const item = uniqueRefs.get(ref.ref)
    item.occurrences += 1
    item.files.add(ref.file)
  })

  const unique = [...uniqueRefs.values()].map(item => ({
    ...item,
    files: [...item.files],
  }))

  return {
    total_occurrences: refs.length,
    unique_refs: unique.length,
    oss_refs: unique.filter(item => item.is_oss_url).length,
    local_refs: unique.filter(item => !item.is_oss_url).length,
    local_missing_files: unique.filter(item => !item.is_oss_url && !item.local_exists).length,
    local_refs_needing_oss: unique.filter(item => !item.is_oss_url && item.local_exists).length,
    by_kind: unique.reduce((acc, item) => {
      acc[item.kind] = (acc[item.kind] || 0) + 1
      return acc
    }, {}),
    unresolved: unique
      .filter(item => !item.is_oss_url)
      .sort((first, second) => first.ref.localeCompare(second.ref)),
  }
}

function main() {
  const refs = DATA_FILES
    .filter(relativePath => fs.existsSync(path.join(ROOT, relativePath)))
    .flatMap(collectRefs)

  const report = {
    generated_at: new Date().toISOString(),
    data_files: DATA_FILES,
    summary: summarize(refs),
    refs,
  }

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true })
  fs.writeFileSync(OUT_PATH, `${JSON.stringify(report, null, 2)}\n`)

  console.log(JSON.stringify({
    output: path.relative(ROOT, OUT_PATH).replace(/\\/g, '/'),
    ...report.summary,
    unresolved: undefined,
  }, null, 2))
}

main()
