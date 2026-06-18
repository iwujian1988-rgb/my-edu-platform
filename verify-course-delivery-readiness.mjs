/**
 * Course A1 delivery gate.
 *
 * This script checks the learner-facing data chain instead of relying on
 * manual spot checks: source parse -> Supabase import -> OSS media -> UI
 * renderer coverage -> no visible source-site leaks or empty placeholders.
 */

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local', quiet: true })

const COURSE_TITLE_CANDIDATES = [
  '法语A1入门训练',
  '法语A1课程训练',
  '娉曡A1鍏ラ棬璁粌',
]
const PARSED_FILE = 'kaoshi-parsed.json'
const PDF_TEXT_MAP_FILE = 'src/data/course-pdf-text-map.json'
const PAGE_SIZE = 1000
const SOURCE_LEAK_PATTERNS = [
  /https?:\/\/(?:www\.)?podcastfrancaisfacile\.com/i,
  /https?:\/\/(?:www\.)?youtube\.com/i,
  /https?:\/\/youtu\.be/i,
  /\b(?:alt|title)=["'][^"']*podcastfrancaisfacile\.com/i,
  /\bhref=["'](?:\.\.\/[^"']+\.html|[^"':]+\.html)/i,
]
const RELATIVE_MEDIA_PATTERNS = [
  /^course-a1\//,
  /^\.\.\/wp-content\//,
  /(?:src|href)=["'](?:course-a1\/(?:audio|video|pdf|images)|\.\.\/wp-content\/uploads)\//i,
]
const PDF_HREF_PATTERN = /href=["']([^"']+\.pdf(?:\?[^"']*)?)["']/gi
const ABSOLUTE_MEDIA_URL_PATTERN = /^https?:\/\//i
const OSS_OBJECT_KEY_PATTERN = /^course-a1\/(?:audio|video|pdf|images)\//
const SUPPORTED_STEP_TYPES = new Set([
  'warm_up',
  'listen',
  'read',
  'vocabulary',
  'grammar',
  'pdf_content',
  'exercise',
  'challenge',
  'complete',
])
const SUPPORTED_EXERCISE_TYPES = new Set([
  'blanks',
  'multichoice',
  'dragtext',
  'singlechoice',
  'markwords',
  'speak',
  'presentation',
])
const SUPPORTED_NESTED_LIBRARIES_BY_EXERCISE_TYPE = {
  multichoice: ['H5P.MultiChoice', 'H5P.Blanks', 'H5P.DragQuestion', 'H5P.AdvancedText', 'H5P.Image'],
  presentation: ['H5P.MultiChoice', 'H5P.Blanks', 'H5P.Audio'],
  speak: ['H5P.SpeakTheWords'],
}
const H5P_MEDIA_PREFIXES = ['audios/', 'images/']
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
const OSS_BUCKET = process.env.ALIYUN_OSS_BUCKET
const OSS_REGION = process.env.ALIYUN_OSS_REGION
const OSS_BASE_URL = OSS_BUCKET && OSS_REGION
  ? `https://${OSS_BUCKET}.${OSS_REGION}.aliyuncs.com`
  : null

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
const sourceData = JSON.parse(readFileSync(PARSED_FILE, 'utf8'))
const pdfTextMap = JSON.parse(readFileSync(PDF_TEXT_MAP_FILE, 'utf8')).documents || {}

function expectedGuidedLessons() {
  return sourceData.units.flatMap(unit => unit.lessons)
}

function expectedContentItems() {
  return [
    ...expectedGuidedLessons().map(lesson => ({ ...lesson, category: 'debutant' })),
    ...(sourceData.supplementary || []),
  ]
}

function expectedMediaAssets() {
  const manifest = sourceData.media_manifest || {}
  const allAssets = [
    ...(manifest.audio || []),
    ...(manifest.video || []),
    ...(manifest.pdf || []),
    ...(manifest.images || []),
  ]
  const byOssPath = new Map()
  for (const asset of allAssets) {
    if (asset.oss_path && !byOssPath.has(asset.oss_path)) {
      byOssPath.set(asset.oss_path, asset)
    }
  }
  return [...byOssPath.values()]
}

function addFailure(failures, category, message, details = {}) {
  failures.push({ category, message, details })
}

function getPdfKey(value) {
  try {
    const url = new URL(value)
    return decodeURIComponent(url.pathname.split('/').pop() || value)
  } catch {
    return value
  }
}

function getH5PContentId(sourceH5pFile) {
  const match = sourceH5pFile?.match(/-(\d+)\.h5p$/)
  return match?.[1] || null
}

function getH5PMediaCategory(path) {
  if (path.startsWith('audios/')) return 'audio'
  if (path.startsWith('images/')) return 'images'
  return null
}

function getH5PMediaObjectKey(contentId, path) {
  const category = getH5PMediaCategory(path)
  const filename = path.split('/').pop()
  if (!category || !filename) return null
  return `course-a1/${category}/h5p/${contentId}/${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`
}

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

function collectH5PMediaPaths(value, paths = new Set()) {
  if (Array.isArray(value)) {
    value.forEach(item => collectH5PMediaPaths(item, paths))
    return paths
  }

  if (value && typeof value === 'object') {
    if (typeof value.path === 'string' && H5P_MEDIA_PREFIXES.some(prefix => value.path.startsWith(prefix))) {
      paths.add(value.path)
    }
    Object.values(value).forEach(item => collectH5PMediaPaths(item, paths))
  }

  return paths
}

function collectStrings(value, strings = []) {
  if (typeof value === 'string') {
    strings.push(value)
    return strings
  }

  if (Array.isArray(value)) {
    value.forEach(item => collectStrings(item, strings))
    return strings
  }

  if (value && typeof value === 'object') {
    Object.values(value).forEach(item => collectStrings(item, strings))
  }

  return strings
}

function extractPdfKeysFromHtml(contentHtml) {
  if (!contentHtml) return new Set()
  return new Set([...contentHtml.matchAll(PDF_HREF_PATTERN)].map(match => getPdfKey(match[1])))
}

function findSourceLeaks(value) {
  return collectStrings(value)
    .filter(text => SOURCE_LEAK_PATTERNS.some(pattern => pattern.test(text)))
    .slice(0, 10)
}

function findRelativeMediaRefs(value) {
  return collectStrings(value)
    .filter(text => RELATIVE_MEDIA_PATTERNS.some(pattern => pattern.test(text)))
    .slice(0, 10)
}

function isRenderableNestedLibrary(exerciseType, library) {
  const supportedLibraries = SUPPORTED_NESTED_LIBRARIES_BY_EXERCISE_TYPE[exerciseType]
  if (!supportedLibraries) return true
  return supportedLibraries.some(supported => library.includes(supported))
}

function validateMediaUrl(url) {
  return typeof url === 'string' && ABSOLUTE_MEDIA_URL_PATTERN.test(url)
}

function validateStep(step, context, exerciseIds, failures) {
  if (!step || typeof step !== 'object') {
    addFailure(failures, 'steps', 'Step is not an object.', context)
    return
  }

  if (!SUPPORTED_STEP_TYPES.has(step.type)) {
    addFailure(failures, 'steps', 'Unsupported learner step type.', { ...context, type: step.type })
    return
  }

  if (step.type === 'warm_up' && !validateMediaUrl(step.audio_url)) {
    addFailure(failures, 'steps', 'Warm-up step has no playable audio URL.', context)
  }

  if (step.type === 'listen') {
    const sentences = Array.isArray(step.sentences) ? step.sentences : []
    if (sentences.length === 0) {
      addFailure(failures, 'steps', 'Listen step has no sentences.', context)
    }
    sentences.forEach((sentence, index) => {
      if (!sentence.fr || !validateMediaUrl(sentence.audio_url)) {
        addFailure(failures, 'steps', 'Listen sentence is missing text or audio.', { ...context, sentence_index: index })
      }
    })
  }

  if (step.type === 'read') {
    const sentences = Array.isArray(step.sentences) ? step.sentences : []
    if (sentences.length === 0) {
      addFailure(failures, 'steps', 'Read step has no sentences.', context)
    }
    sentences.forEach((sentence, index) => {
      if (!sentence.fr || !validateMediaUrl(sentence.audio_url)) {
        addFailure(failures, 'steps', 'Read sentence is missing text or audio.', { ...context, sentence_index: index })
      }
    })
  }

  if (step.type === 'vocabulary') {
    const cards = Array.isArray(step.cards) ? step.cards : []
    if (cards.length === 0) {
      addFailure(failures, 'steps', 'Vocabulary step has no cards.', context)
    }
  }

  if ((step.type === 'grammar' || step.type === 'pdf_content') && !String(step.content_html || '').trim()) {
    addFailure(failures, 'steps', `${step.type} step has empty content.`, context)
  }

  if (step.type === 'exercise') {
    const stepExerciseIds = Array.isArray(step.exercise_ids) ? step.exercise_ids : []
    if (stepExerciseIds.length === 0) {
      addFailure(failures, 'steps', 'Exercise step has no exercise ids.', context)
    }
    stepExerciseIds.forEach(exerciseId => {
      if (!exerciseIds.has(exerciseId)) {
        addFailure(failures, 'steps', 'Exercise step references a missing exercise.', { ...context, exercise_id: exerciseId })
      }
    })
  }

  if (step.type === 'challenge' && (!validateMediaUrl(step.audio_url) || !step.answer)) {
    addFailure(failures, 'steps', 'Challenge step is missing audio or answer.', context)
  }
}

async function selectAll(table, columns, filter) {
  const rows = []
  let from = 0

  while (true) {
    let query = supabase.from(table).select(columns).range(from, from + PAGE_SIZE - 1)
    query = filter(query)
    const { data, error } = await query
    if (error) throw new Error(`${table} query failed: ${error.message}`)
    rows.push(...(data || []))
    if (!data || data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return rows
}

async function findCourse() {
  if (process.env.COURSE_A1_ID) {
    const { data, error } = await supabase
      .from('courses')
      .select('id, title, status, level, language')
      .eq('id', process.env.COURSE_A1_ID)
      .single()
    if (error) throw new Error(`course lookup by COURSE_A1_ID failed: ${error.message}`)
    return data
  }

  for (const title of COURSE_TITLE_CANDIDATES) {
    const { data } = await supabase
      .from('courses')
      .select('id, title, status, level, language')
      .eq('title', title)
      .maybeSingle()
    if (data) return data
  }

  const { data, error } = await supabase
    .from('courses')
    .select('id, title, status, level, language')
    .eq('level', 'A1')
    .eq('language', 'fr')
    .order('sort_order', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(`course fallback lookup failed: ${error.message}`)
  return data
}

async function headOk(url) {
  const response = await fetch(url, { method: 'HEAD' })
  return response.ok
}

async function main() {
  const failures = []
  const warnings = []
  const course = await findCourse()

  if (!course) {
    addFailure(failures, 'course', 'French A1 course row was not found.')
    console.log(JSON.stringify({ summary: { failures: failures.length }, failures, warnings }, null, 2))
    process.exit(1)
  }

  if (course.status !== 'published') {
    addFailure(failures, 'course', 'Course is not published.', { course_id: course.id, status: course.status })
  }

  const units = await selectAll(
    'course_units',
    'id, title, unit_number, sort_order',
    query => query.eq('course_id', course.id),
  )
  const unitIds = units.map(unit => unit.id)
  const lessons = unitIds.length > 0
    ? await selectAll(
      'course_lessons',
      'id, title, unit_id, lesson_number, sort_order, steps',
      query => query.in('unit_id', unitIds),
    )
    : []
  const contentItems = await selectAll(
    'course_content_items',
    'id, title, lesson_id, unit_id, source_kind, source_html, raw_steps, mapped_steps, audio_files, pdf_files, h5p_files, youtube_ids, exercise_ids',
    query => query.eq('course_id', course.id),
  )
  const exercises = await selectAll(
    'course_exercises',
    'id, title, lesson_id, exercise_type, main_library, source_h5p_file, content',
    query => query.eq('course_id', course.id),
  )
  const mediaAssets = await selectAll(
    'course_media_assets',
    'id, asset_type, local_path, oss_path, public_url',
    query => query.eq('course_id', course.id),
  )

  const expectedLessons = expectedGuidedLessons()
  const expectedContent = expectedContentItems()
  const expectedMedia = expectedMediaAssets()
  const exerciseIds = new Set(exercises.map(exercise => exercise.id))

  if (units.length !== sourceData.units.length) {
    addFailure(failures, 'counts', 'Unit count does not match parsed source.', { expected: sourceData.units.length, actual: units.length })
  }
  if (lessons.length !== expectedLessons.length) {
    addFailure(failures, 'counts', 'Lesson count does not match parsed source.', { expected: expectedLessons.length, actual: lessons.length })
  }
  if (contentItems.length !== expectedContent.length) {
    addFailure(failures, 'counts', 'Content item count does not match parsed source.', { expected: expectedContent.length, actual: contentItems.length })
  }
  if (exercises.length !== sourceData.exercises.length) {
    addFailure(failures, 'counts', 'Exercise count does not match parsed source.', { expected: sourceData.exercises.length, actual: exercises.length })
  }
  if (mediaAssets.length !== expectedMedia.length) {
    addFailure(failures, 'counts', 'Media asset count does not match parsed source manifest.', { expected: expectedMedia.length, actual: mediaAssets.length })
  }

  const actualContentSourceHtml = new Set(contentItems.map(item => item.source_html).filter(Boolean))
  const missingContentSourceHtml = expectedContent
    .map(item => item.source_html)
    .filter(Boolean)
    .filter(sourceHtml => !actualContentSourceHtml.has(sourceHtml))
  if (missingContentSourceHtml.length > 0) {
    addFailure(failures, 'source-parity', 'Some source HTML files are not imported.', { sample: missingContentSourceHtml.slice(0, 10), count: missingContentSourceHtml.length })
  }

  const actualH5PFiles = new Set(exercises.map(exercise => exercise.source_h5p_file).filter(Boolean))
  const missingH5PFiles = sourceData.exercises
    .map(exercise => exercise.h5p_file)
    .filter(Boolean)
    .filter(h5pFile => !actualH5PFiles.has(h5pFile))
  if (missingH5PFiles.length > 0) {
    addFailure(failures, 'source-parity', 'Some H5P files are not imported as exercises.', { sample: missingH5PFiles.slice(0, 10), count: missingH5PFiles.length })
  }

  const actualOssPaths = new Set(mediaAssets.map(asset => asset.oss_path).filter(Boolean))
  const missingOssPaths = expectedMedia
    .map(asset => asset.oss_path)
    .filter(Boolean)
    .filter(ossPath => !actualOssPaths.has(ossPath))
  if (missingOssPaths.length > 0) {
    addFailure(failures, 'source-parity', 'Some parsed media files are not imported as media assets.', { sample: missingOssPaths.slice(0, 10), count: missingOssPaths.length })
  }

  const missingPublicUrls = mediaAssets.filter(asset => !asset.public_url || !OSS_OBJECT_KEY_PATTERN.test(asset.oss_path || ''))
  if (missingPublicUrls.length > 0) {
    addFailure(failures, 'media', 'Some course media assets do not have public OSS URLs.', {
      count: missingPublicUrls.length,
      sample: missingPublicUrls.slice(0, 10).map(asset => ({ id: asset.id, oss_path: asset.oss_path })),
    })
  }

  const unresolvedRefs = findRelativeMediaRefs({ lessons, contentItems, exercises })
  if (unresolvedRefs.length > 0) {
    addFailure(failures, 'media', 'Learner-facing data still contains unresolved relative media references.', { sample: unresolvedRefs })
  }

  for (const lesson of lessons) {
    const steps = Array.isArray(lesson.steps) ? lesson.steps : []
    if (steps.length === 0) {
      addFailure(failures, 'steps', 'Lesson has no training steps.', { lesson_id: lesson.id, title: lesson.title })
    }
    steps.forEach((step, index) => {
      validateStep(step, { lesson_id: lesson.id, title: lesson.title, step_index: index }, exerciseIds, failures)
    })
    const leaks = findSourceLeaks(steps)
    if (leaks.length > 0) {
      addFailure(failures, 'source-leak', 'Training steps expose original source-site links.', { lesson_id: lesson.id, title: lesson.title, sample: leaks })
    }
  }

  for (const item of contentItems) {
    const mappedSteps = Array.isArray(item.mapped_steps) ? item.mapped_steps : []
    const rawSteps = Array.isArray(item.raw_steps) ? item.raw_steps : []
    if (mappedSteps.length === 0 && rawSteps.length === 0) {
      const hasImportedMaterial = (item.audio_files || []).length > 0
        || (item.pdf_files || []).length > 0
        || (item.h5p_files || []).length > 0
        || (item.exercise_ids || []).length > 0
      if (hasImportedMaterial) {
        addFailure(failures, 'content', 'Content item has imported material but no learner-facing steps.', { content_id: item.id, title: item.title })
      } else {
        warnings.push({
          category: 'content',
          message: 'Source item has no learner-facing material and should stay hidden from course content lists.',
          details: { content_id: item.id, title: item.title, source_html: item.source_html },
        })
      }
    }
    if (mappedSteps.length === 0 && rawSteps.length > 0) {
      warnings.push({
        category: 'content',
        message: 'Content item would fall back to raw source steps if opened directly.',
        details: { content_id: item.id, title: item.title, source_html: item.source_html },
      })
    }
    mappedSteps.forEach((step, index) => {
      validateStep(step, { content_id: item.id, title: item.title, step_index: index }, exerciseIds, failures)
    })
    const visibleValue = mappedSteps.length > 0 ? mappedSteps : rawSteps
    const leaks = findSourceLeaks(visibleValue)
    if (leaks.length > 0) {
      addFailure(failures, 'source-leak', 'Content page data exposes original source-site links.', { content_id: item.id, title: item.title, sample: leaks })
    }
  }

  for (const exercise of exercises) {
    if (!SUPPORTED_EXERCISE_TYPES.has(exercise.exercise_type)) {
      addFailure(failures, 'h5p-renderer', 'Exercise type has no learner renderer.', {
        exercise_id: exercise.id,
        title: exercise.title,
        exercise_type: exercise.exercise_type,
      })
    }

    const unsupportedLibraries = [...collectLibraries(exercise.content)]
      .filter(library => !isRenderableNestedLibrary(exercise.exercise_type, library))
    if (unsupportedLibraries.length > 0) {
      addFailure(failures, 'h5p-renderer', 'Exercise contains nested H5P libraries that the UI cannot render.', {
        exercise_id: exercise.id,
        title: exercise.title,
        exercise_type: exercise.exercise_type,
        unsupported_libraries: unsupportedLibraries,
      })
    }
  }

  const h5pMediaItems = new Map()
  for (const exercise of exercises) {
    const contentId = getH5PContentId(exercise.source_h5p_file)
    if (!contentId) continue
    for (const path of collectH5PMediaPaths(exercise.content)) {
      const objectKey = getH5PMediaObjectKey(contentId, path)
      if (objectKey && OSS_BASE_URL) {
        h5pMediaItems.set(objectKey, {
          exercise_id: exercise.id,
          title: exercise.title,
          object_key: objectKey,
          public_url: `${OSS_BASE_URL}/${objectKey}`,
        })
      }
    }
  }

  if (!OSS_BASE_URL && h5pMediaItems.size > 0) {
    addFailure(failures, 'h5p-media', 'Cannot verify H5P media because ALIYUN_OSS_BUCKET or ALIYUN_OSS_REGION is missing.')
  }

  for (const item of h5pMediaItems.values()) {
    if (!(await headOk(item.public_url))) {
      addFailure(failures, 'h5p-media', 'H5P nested media is missing on OSS.', item)
    }
  }

  const contentByLesson = new Map()
  for (const item of contentItems) {
    if (!item.lesson_id) continue
    if (!contentByLesson.has(item.lesson_id)) contentByLesson.set(item.lesson_id, [])
    contentByLesson.get(item.lesson_id).push(item)
  }

  for (const lesson of lessons) {
    const linkedItems = (contentByLesson.get(lesson.id) || [])
      .filter(item => item.source_kind === 'main_lesson')
    const linkedPdfKeys = new Set(linkedItems.flatMap(item => item.pdf_files || []).map(getPdfKey))
    const stepPdfKeys = new Set()
    for (const step of lesson.steps || []) {
      if (step.type !== 'pdf_content') continue
      for (const pdfKey of extractPdfKeysFromHtml(step.content_html)) {
        stepPdfKeys.add(pdfKey)
      }
    }
    for (const pdfFile of linkedPdfKeys) {
      if (!pdfTextMap[pdfFile]) {
        addFailure(failures, 'pdf-text', 'Linked PDF has no extracted webpage text.', { lesson_id: lesson.id, title: lesson.title, pdf_file: pdfFile })
      }
      if (!stepPdfKeys.has(pdfFile)) {
        addFailure(failures, 'pdf-text', 'Linked PDF text is not represented in the lesson flow.', { lesson_id: lesson.id, title: lesson.title, pdf_file: pdfFile })
      }
    }
  }

  const summary = {
    course_id: course.id,
    course_title: course.title,
    units: units.length,
    lessons: lessons.length,
    content_items: contentItems.length,
    exercises: exercises.length,
    media_assets: mediaAssets.length,
    h5p_nested_media: h5pMediaItems.size,
    failures: failures.length,
    warnings: warnings.length,
  }

  console.log(JSON.stringify({ summary, failures, warnings }, null, 2))

  if (failures.length > 0) {
    process.exitCode = 1
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
