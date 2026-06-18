/**
 * Verify that H5P nested audio/images imported in course_exercises exist on OSS.
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local', quiet: true })

const PAGE_SIZE = 1000
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
const OSS_BASE_URL = `https://${process.env.ALIYUN_OSS_BUCKET}.${process.env.ALIYUN_OSS_REGION}.aliyuncs.com`

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}

if (!process.env.ALIYUN_OSS_BUCKET || !process.env.ALIYUN_OSS_REGION) {
  console.error('Missing ALIYUN_OSS_BUCKET or ALIYUN_OSS_REGION.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

function getH5PContentId(sourceH5pFile) {
  const match = sourceH5pFile?.match(/-(\d+)\.h5p$/)
  return match?.[1] ?? null
}

function getCategory(path) {
  if (path.startsWith('audios/')) return 'audio'
  if (path.startsWith('images/')) return 'images'
  return null
}

function getObjectKey(contentId, path) {
  const category = getCategory(path)
  const filename = path.split('/').pop()
  if (!category || !filename) return null
  return `course-a1/${category}/h5p/${contentId}/${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`
}

function collectH5PMediaPaths(value, paths = new Set()) {
  if (Array.isArray(value)) {
    value.forEach(item => collectH5PMediaPaths(item, paths))
    return paths
  }

  if (value && typeof value === 'object') {
    if (typeof value.path === 'string' && (value.path.startsWith('audios/') || value.path.startsWith('images/'))) {
      paths.add(value.path)
    }
    Object.values(value).forEach(item => collectH5PMediaPaths(item, paths))
  }

  return paths
}

async function selectAllExercises() {
  const rows = []
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from('course_exercises')
      .select('id, title, source_h5p_file, content')
      .range(from, from + PAGE_SIZE - 1)

    if (error) {
      throw new Error(`course_exercises query failed: ${error.message}`)
    }

    rows.push(...(data || []))
    if (!data || data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return rows
}

async function headOk(url) {
  const response = await fetch(url, { method: 'HEAD' })
  return response.ok
}

async function main() {
  const exercises = await selectAllExercises()
  const itemsByKey = new Map()

  for (const exercise of exercises) {
    const contentId = getH5PContentId(exercise.source_h5p_file)
    if (!contentId) continue

    for (const path of collectH5PMediaPaths(exercise.content)) {
      const objectKey = getObjectKey(contentId, path)
      if (!objectKey) continue
      itemsByKey.set(objectKey, {
        exercise_id: exercise.id,
        exercise_title: exercise.title,
        object_key: objectKey,
        public_url: `${OSS_BASE_URL}/${objectKey}`,
      })
    }
  }

  const items = [...itemsByKey.values()].sort((first, second) => first.object_key.localeCompare(second.object_key))
  const failures = []

  for (const item of items) {
    if (!(await headOk(item.public_url))) {
      failures.push(item)
    }
  }

  const summary = {
    total_h5p_media: items.length,
    failures: failures.length,
  }

  console.log(JSON.stringify({ summary, failures }, null, 2))

  if (failures.length > 0) {
    process.exitCode = 1
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
