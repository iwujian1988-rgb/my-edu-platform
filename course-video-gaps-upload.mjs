/**
 * Upload course A1 video files that exist locally but are missing from media-url-map.json.
 *
 * Source of truth:
 * - tmp-ui-review/course-video-oss-coverage.json lists YouTube ids without OSS matches.
 * - Each missing row must already have local_file_guess.local_path.
 */

import OSS from 'ali-oss'
import { existsSync, readFileSync, statSync, writeFileSync } from 'fs'
import { basename } from 'path'
import { config } from 'dotenv'

config({ path: '.env.local', quiet: true })

const REPORT_FILE = 'tmp-ui-review/course-video-oss-coverage.json'
const MAP_FILE = 'media-url-map.json'
const OSS_CATEGORY = 'video'
const OSS_PREFIX = 'course-a1/video'
const CONTENT_TYPE = 'video/mp4'
const MULTIPART_THRESHOLD_BYTES = 10 * 1024 * 1024
const MULTIPART_PART_SIZE_BYTES = 10 * 1024 * 1024

const ossConfig = {
  region: process.env.ALIYUN_OSS_REGION,
  accessKeyId: process.env.ALIYUN_OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.ALIYUN_OSS_ACCESS_KEY_SECRET,
  bucket: process.env.ALIYUN_OSS_BUCKET,
}

function requireEnv() {
  if (!ossConfig.region || !ossConfig.bucket || !ossConfig.accessKeyId || !ossConfig.accessKeySecret) {
    throw new Error('Missing Aliyun OSS env vars.')
  }
}

function loadJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'))
}

function saveJson(filePath, value) {
  writeFileSync(filePath, JSON.stringify(value, null, 2))
}

function getSafeName(filename) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_')
}

function getOssUrl(objectKey) {
  return `https://${ossConfig.bucket}.${ossConfig.region}.aliyuncs.com/${objectKey}`
}

async function uploadFile(client, localPath, objectKey) {
  const fileSize = statSync(localPath).size
  const headers = {
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Content-Type': CONTENT_TYPE,
  }

  if (fileSize > MULTIPART_THRESHOLD_BYTES) {
    await client.multipartUpload(objectKey, localPath, {
      headers,
      partSize: MULTIPART_PART_SIZE_BYTES,
      parallel: 1,
    })
    return
  }

  await client.put(objectKey, readFileSync(localPath), { headers })
}

function getMissingVideoItems(report) {
  if (!Array.isArray(report.missing)) {
    return []
  }

  return report.missing
    .filter(item => item.local_file_found && item.local_file_guess?.local_path)
    .map(item => {
      const localPath = item.local_file_guess.local_path
      const filename = basename(localPath)
      return {
        youtubeId: item.youtube_id,
        title: item.youtube_title,
        localPath,
        filename,
        originalRef: `${OSS_PREFIX}/${filename}`,
        objectKey: `${OSS_PREFIX}/${getSafeName(filename)}`,
      }
    })
}

async function main() {
  requireEnv()

  const report = loadJson(REPORT_FILE)
  const urlMap = loadJson(MAP_FILE)
  urlMap[OSS_CATEGORY] ??= {}

  const client = new OSS(ossConfig)
  const missingItems = getMissingVideoItems(report)
  let uploaded = 0
  let skipped = 0
  let failed = 0

  for (const item of missingItems) {
    if (urlMap[OSS_CATEGORY][item.originalRef]) {
      skipped += 1
      continue
    }

    if (!existsSync(item.localPath)) {
      failed += 1
      console.error(`Missing local file: ${item.localPath}`)
      continue
    }

    try {
      console.log(`Uploading ${item.youtubeId}: ${item.title}`)
      await uploadFile(client, item.localPath, item.objectKey)
      const ossUrl = getOssUrl(item.objectKey)
      urlMap[OSS_CATEGORY][item.originalRef] = ossUrl
      urlMap[OSS_CATEGORY][item.filename] ??= ossUrl
      uploaded += 1
    } catch (error) {
      failed += 1
      console.error(`Failed to upload ${item.youtubeId}: ${error.message}`)
    }
  }

  saveJson(MAP_FILE, urlMap)

  console.log(JSON.stringify({ uploaded, skipped, failed }, null, 2))

  if (failed > 0) {
    process.exitCode = 1
  }
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
