import fs from 'node:fs'
import path from 'node:path'
import OSS from 'ali-oss'

const ROOT = process.cwd()
const AUDIT_PATH = path.join(ROOT, 'tmp-ui-review', 'maxclass-video-assets.json')
const MANIFEST_PATH = path.join(ROOT, 'tmp-ui-review', 'maxclass-video-oss-manifest.json')
const DEFAULT_OSS_PREFIX = 'maxclass/media/'

const args = new Set(process.argv.slice(2))
const DRY_RUN = args.has('--dry-run')
const APPLY = args.has('--apply')

function loadEnvLocal() {
  const envPath = path.join(ROOT, '.env.local')
  if (!fs.existsSync(envPath)) return

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex === -1) continue

    const key = trimmed.slice(0, separatorIndex).trim()
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '')
    if (key && !process.env[key]) {
      process.env[key] = value
    }
  }
}

function requiredEnv(name) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required env: ${name}`)
  }
  return value
}

function createClient() {
  loadEnvLocal()
  return new OSS({
    region: process.env.ALIYUN_OSS_REGION || 'oss-cn-hongkong',
    accessKeyId: requiredEnv('ALIYUN_OSS_ACCESS_KEY_ID'),
    accessKeySecret: requiredEnv('ALIYUN_OSS_ACCESS_KEY_SECRET'),
    bucket: requiredEnv('ALIYUN_OSS_BUCKET'),
  })
}

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.mp4') return 'video/mp4'
  if (ext === '.vtt') return 'text/vtt; charset=utf-8'
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.png') return 'image/png'
  if (ext === '.json') return 'application/json; charset=utf-8'
  return 'application/octet-stream'
}

function objectKeyFor(ref) {
  return `${DEFAULT_OSS_PREFIX}${ref.replace(/^\//, '')}`
}

function publicUrlFor(client, objectKey) {
  const region = client.options.region
  const bucket = client.options.bucket
  return `https://${bucket}.${region}.aliyuncs.com/${objectKey}`
}

function loadJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function saveJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

function loadUploadItems() {
  const audit = loadJson(AUDIT_PATH, null)
  if (!audit) {
    throw new Error('Audit report not found. Run: npm run maxclass:audit:videos')
  }

  return audit.summary.unresolved
    .filter(item => item.local_exists)
    .map(item => ({
      ref: item.ref,
      localPath: path.join(ROOT, item.local_path),
      objectKey: objectKeyFor(item.ref),
      contentType: contentTypeFor(item.ref),
    }))
}

async function uploadItem(client, item) {
  const result = await client.put(item.objectKey, item.localPath, {
    timeout: 300000,
    mime: item.contentType,
    headers: {
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })

  return result.url || publicUrlFor(client, item.objectKey)
}

function applyManifest(manifest) {
  const replacements = Object.fromEntries(
    Object.entries(manifest.assets)
      .filter(([, value]) => value?.url)
      .map(([ref, value]) => [ref, value.url])
  )

  const dataFiles = manifest.data_files || []
  for (const relativePath of dataFiles) {
    const filePath = path.join(ROOT, relativePath)
    let current = fs.readFileSync(filePath, 'utf8')
    for (const [ref, url] of Object.entries(replacements)) {
      current = current.replaceAll(ref, url)
    }
    fs.writeFileSync(filePath, current)
  }
}

async function main() {
  const audit = loadJson(AUDIT_PATH, null)
  const items = loadUploadItems()
  const manifest = loadJson(MANIFEST_PATH, {
    generated_at: null,
    oss_prefix: DEFAULT_OSS_PREFIX,
    data_files: audit?.data_files || [],
    assets: {},
  })

  console.log(JSON.stringify({
    dry_run: DRY_RUN,
    apply: APPLY,
    upload_candidates: items.length,
    manifest: path.relative(ROOT, MANIFEST_PATH).replace(/\\/g, '/'),
  }, null, 2))

  if (DRY_RUN) {
    const preview = items.slice(0, 10).map(item => ({
      ref: item.ref,
      local_path: path.relative(ROOT, item.localPath).replace(/\\/g, '/'),
      object_key: item.objectKey,
      content_type: item.contentType,
    }))
    console.log(JSON.stringify({ preview }, null, 2))
    return
  }

  const client = createClient()
  let uploaded = 0
  let skipped = 0

  for (const item of items) {
    if (manifest.assets[item.ref]?.url) {
      skipped += 1
      continue
    }

    await uploadItem(client, item)
    const url = publicUrlFor(client, item.objectKey)
    manifest.assets[item.ref] = {
      url,
      oss_path: item.objectKey,
      local_path: path.relative(ROOT, item.localPath).replace(/\\/g, '/'),
      content_type: item.contentType,
      uploaded_at: new Date().toISOString(),
    }
    uploaded += 1
    saveJson(MANIFEST_PATH, manifest)
    console.log(`uploaded ${uploaded}/${items.length}: ${item.ref}`)
  }

  manifest.generated_at = new Date().toISOString()
  saveJson(MANIFEST_PATH, manifest)

  if (APPLY) {
    applyManifest(manifest)
  }

  console.log(JSON.stringify({ uploaded, skipped, applied: APPLY }, null, 2))
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
