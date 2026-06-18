/**
 * Verify the MAXCLASS parcours course imported into Supabase.
 *
 * Usage:
 *   npm run maxclass:parcours:verify
 */

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local', quiet: true })

const SOURCE_FILES = [
  'src/data/course-30days-listening.json',
  'src/data/parcours-a1-real-french.json',
]
const PARCOURS_STEP_TYPE = 'parcours_lesson'
const REQUIRED_MIGRATION = '2026061701_add_parcours_slugs.sql'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

function readCourse(sourceFile) {
  return JSON.parse(readFileSync(sourceFile, 'utf8').replace(/^\uFEFF/, ''))
}

function fail(message) {
  console.error(`FAIL: ${message}`)
  process.exitCode = 1
}

function pass(message) {
  console.log(`OK: ${message}`)
}

function expectedLessonCount(course) {
  return (course.modules || []).reduce(
    (sum, mod) => sum + (mod.lessons?.length || 0),
    0,
  )
}

async function main() {
  const expectedCourses = SOURCE_FILES.map(readCourse)

  for (const expectedCourse of expectedCourses) {
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, slug, title, status, language, level')
    .eq('slug', expectedCourse.slug)
    .single()

  if (courseError) {
    fail(`course query failed. Did you run ${REQUIRED_MIGRATION}? ${courseError.message}`)
    return
  }

  if (!course) {
    fail(`course not found by slug: ${expectedCourse.slug}`)
    return
  }

  if (course.status === 'published') pass(`${expectedCourse.slug}: course is published`)
  else fail(`course status is ${course.status}`)

  if (course.language === 'fr') pass(`${expectedCourse.slug}: course language is fr`)
  else fail(`course language is ${course.language}`)

  const { data: units, error: unitsError } = await supabase
    .from('course_units')
    .select('id, slug, title, sort_order')
    .eq('course_id', course.id)
    .order('sort_order', { ascending: true })

  if (unitsError) {
    fail(`unit query failed. Did you run ${REQUIRED_MIGRATION}? ${unitsError.message}`)
    return
  }

  const expectedModules = expectedCourse.modules?.length || 0
  if ((units || []).length === expectedModules) pass(`${expectedCourse.slug}: module count is ${expectedModules}`)
  else fail(`module count expected ${expectedModules}, got ${(units || []).length}`)

  const unitIds = (units || []).map(unit => unit.id)
  const { data: lessons, error: lessonsError } = unitIds.length > 0
    ? await supabase
        .from('course_lessons')
        .select('id, unit_id, slug, title, steps')
        .in('unit_id', unitIds)
    : { data: [], error: null }

  if (lessonsError) {
    fail(`lesson query failed. Did you run ${REQUIRED_MIGRATION}? ${lessonsError.message}`)
    return
  }

  const expectedLessons = expectedLessonCount(expectedCourse)
  if ((lessons || []).length === expectedLessons) pass(`${expectedCourse.slug}: lesson count is ${expectedLessons}`)
  else fail(`lesson count expected ${expectedLessons}, got ${(lessons || []).length}`)

  const badLessons = (lessons || []).filter(lesson => {
    const payload = Array.isArray(lesson.steps)
      ? lesson.steps.find(step => step?.type === PARCOURS_STEP_TYPE)
      : null
    return !payload || !Array.isArray(payload.blocks) || payload.blocks.length === 0
  })

  if (badLessons.length === 0) pass(`${expectedCourse.slug}: all lessons contain MAXCLASS block payloads`)
  else fail(`lessons missing block payloads: ${badLessons.map(lesson => lesson.slug).join(', ')}`)
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
