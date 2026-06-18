/**
 * Import the MAXCLASS parcours JSON into the existing Supabase course tables.
 *
 * Usage:
 *   npm run maxclass:parcours:import:dry-run
 *   npm run maxclass:parcours:import
 *   npm run maxclass:parcours:import:reset
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
const DRY_RUN = process.argv.includes('--dry-run')
const RESET_COURSE = process.argv.includes('--reset-course')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

if (!DRY_RUN && (!SUPABASE_URL || !SUPABASE_SERVICE_KEY)) {
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}

const supabase = DRY_RUN ? null : createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

function readCourse(sourceFile) {
  return JSON.parse(readFileSync(sourceFile, 'utf8').replace(/^\uFEFF/, ''))
}

function readCourses() {
  return SOURCE_FILES.map((sourceFile, index) => ({
    sourceFile,
    sortOrder: (index + 1) * 10,
    course: readCourse(sourceFile),
  }))
}

function lessonPayload(lesson) {
  return [{
    type: PARCOURS_STEP_TYPE,
    slug: lesson.slug,
    description: lesson.description || null,
    estimatedMinutes: lesson.estimatedMinutes || null,
    blocks: lesson.blocks || [],
  }]
}

async function requireNoError(result, context) {
  if (result.error) {
    throw new Error(`${context}: ${result.error.message}`)
  }
  return result.data
}

async function getExistingCourse(slug) {
  const result = await supabase
    .from('courses')
    .select('id, slug')
    .eq('slug', slug)
    .maybeSingle()

  if (result.error) {
    throw new Error(`Failed to query existing course. Did you run ${REQUIRED_MIGRATION}? ${result.error.message}`)
  }

  return result.data
}

async function resetCourse(courseId) {
  await requireNoError(
    await supabase.from('course_units').delete().eq('course_id', courseId),
    'Failed to clear course_units',
  )
}

async function upsertCourse(course, sortOrder) {
  const existing = await getExistingCourse(course.slug)
  if (existing) {
    await resetCourse(existing.id)
  }

  const payload = {
    slug: course.slug,
    title: course.title,
    description: course.description || null,
    level: course.level || 'A1',
    language: 'fr',
    status: 'published',
    sort_order: sortOrder,
    package_ids: [],
  }

  if (existing) {
    return requireNoError(
      await supabase.from('courses').update(payload).eq('id', existing.id).select('id').single(),
      'Failed to update MAXCLASS parcours course',
    )
  }

  return requireNoError(
    await supabase.from('courses').insert(payload).select('id').single(),
    'Failed to insert MAXCLASS parcours course',
  )
}

async function importModules(courseId, course) {
  for (const [moduleIndex, mod] of (course.modules || []).entries()) {
    const unit = await requireNoError(
      await supabase
        .from('course_units')
        .insert({
          course_id: courseId,
          slug: mod.slug,
          title: mod.title,
          description: mod.description || null,
          unit_number: moduleIndex + 1,
          sort_order: moduleIndex,
        })
        .select('id')
        .single(),
      `Failed to insert module ${mod.slug}`,
    )

    for (const [lessonIndex, lesson] of (mod.lessons || []).entries()) {
      await requireNoError(
        await supabase
          .from('course_lessons')
          .insert({
            unit_id: unit.id,
            slug: lesson.slug,
            title: lesson.title,
            lesson_number: lessonIndex + 1,
            sort_order: lessonIndex,
            steps: lessonPayload(lesson),
          })
          .select('id')
          .single(),
        `Failed to insert lesson ${lesson.slug}`,
      )
    }
  }
}

async function main() {
  const sources = readCourses().map(({ sourceFile, sortOrder, course }) => {
    const moduleCount = course.modules?.length || 0
    const lessonCount = (course.modules || []).reduce(
      (sum, mod) => sum + (mod.lessons?.length || 0),
      0,
    )

    return { sourceFile, sortOrder, course, moduleCount, lessonCount }
  })

  if (DRY_RUN) {
    console.log(JSON.stringify({
      sources: sources.map(({ sourceFile, sortOrder, course, moduleCount, lessonCount }) => ({
        source: sourceFile,
        slug: course.slug,
        title: course.title,
        sort_order: sortOrder,
        modules: moduleCount,
        lessons: lessonCount,
      })),
      totals: {
        courses: sources.length,
        modules: sources.reduce((sum, source) => sum + source.moduleCount, 0),
        lessons: sources.reduce((sum, source) => sum + source.lessonCount, 0),
      },
      reset: RESET_COURSE,
    }, null, 2))
    return
  }

  const imported = []
  for (const source of sources) {
    const dbCourse = await upsertCourse(source.course, source.sortOrder)
    await importModules(dbCourse.id, source.course)
    imported.push({
      course_id: dbCourse.id,
      slug: source.course.slug,
      modules: source.moduleCount,
      lessons: source.lessonCount,
    })
  }

  console.log(JSON.stringify({
    imported: true,
    courses: imported,
    totals: {
      courses: imported.length,
      modules: sources.reduce((sum, source) => sum + source.moduleCount, 0),
      lessons: sources.reduce((sum, source) => sum + source.lessonCount, 0),
    },
  }, null, 2))
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
