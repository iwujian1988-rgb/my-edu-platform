/**
 * Verify that imported H5P exercise libraries are renderable by the course UI.
 *
 * This catches regressions where a CoursePresentation imports valid H5P content
 * but the learner sees a fallback placeholder because a nested library is not
 * handled by PresentationExercise.
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local', quiet: true })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
const PAGE_SIZE = 1000
const SUPPORTED_EXERCISE_TYPES = new Set([
  'blanks',
  'multichoice',
  'dragtext',
  'singlechoice',
  'markwords',
  'speak',
  'presentation',
])
const SUPPORTED_PRESENTATION_LIBRARIES = [
  'H5P.MultiChoice',
  'H5P.Blanks',
  'H5P.Audio',
]
const SUPPORTED_NESTED_LIBRARIES_BY_EXERCISE_TYPE = {
  multichoice: ['H5P.MultiChoice', 'H5P.Blanks', 'H5P.DragQuestion', 'H5P.AdvancedText', 'H5P.Image'],
  presentation: SUPPORTED_PRESENTATION_LIBRARIES,
  speak: ['H5P.SpeakTheWords'],
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

function collectLibraries(value, libraries = new Set()) {
  if (Array.isArray(value)) {
    value.forEach(item => collectLibraries(item, libraries))
    return libraries
  }

  if (value && typeof value === 'object') {
    if (typeof value.library === 'string') {
      libraries.add(value.library)
    }
    Object.values(value).forEach(item => collectLibraries(item, libraries))
  }

  return libraries
}

function isSupportedPresentationLibrary(library) {
  return SUPPORTED_PRESENTATION_LIBRARIES.some(supported => library.includes(supported))
}

function isSupportedNestedLibrary(exerciseType, library) {
  const supportedLibraries = SUPPORTED_NESTED_LIBRARIES_BY_EXERCISE_TYPE[exerciseType]
  if (!supportedLibraries) return true
  return supportedLibraries.some(supported => library.includes(supported))
}

async function selectAllExercises() {
  const rows = []
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from('course_exercises')
      .select('id, title, exercise_type, main_library, source_h5p_file, content')
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

async function main() {
  const exercises = await selectAllExercises()
  const failures = []
  const rows = exercises.map(exercise => {
    const libraries = [...collectLibraries(exercise.content)].sort()
    const unsupportedLibraries = libraries.filter(library => !isSupportedNestedLibrary(exercise.exercise_type, library))

    if (!SUPPORTED_EXERCISE_TYPES.has(exercise.exercise_type) || unsupportedLibraries.length > 0) {
      failures.push({
        id: exercise.id,
        title: exercise.title,
        exercise_type: exercise.exercise_type,
        main_library: exercise.main_library,
        source_h5p_file: exercise.source_h5p_file,
        unsupported_libraries: unsupportedLibraries,
      })
    }

    return {
      id: exercise.id,
      title: exercise.title,
      exercise_type: exercise.exercise_type,
      main_library: exercise.main_library,
      nested_libraries: libraries,
      unsupported_libraries: unsupportedLibraries,
      renderability_status: unsupportedLibraries.length === 0 && SUPPORTED_EXERCISE_TYPES.has(exercise.exercise_type)
        ? 'supported'
        : 'needs_renderer',
    }
  })

  const summary = {
    exercise_count: exercises.length,
    presentation_count: rows.filter(row => row.exercise_type === 'presentation').length,
    failures: failures.length,
    supported_presentation_libraries: SUPPORTED_PRESENTATION_LIBRARIES,
  }

  console.log(JSON.stringify({ summary, rows, failures }, null, 2))

  if (failures.length > 0) {
    process.exitCode = 1
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
