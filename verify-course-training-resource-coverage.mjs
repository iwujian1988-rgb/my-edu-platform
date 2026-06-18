/**
 * Verify that linked lesson resources are represented by the training flow.
 *
 * This covers the class of regressions where source content is imported into
 * course_content_items, but /api/courses/[id]/train does not expose it to the
 * learner-facing lesson flow.
 */

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local', quiet: true })

const COURSE_TITLE = '法语A1入门训练'
const PDF_HREF_PATTERN = /href=["']([^"']+\.pdf(?:\?[^"']*)?)["']/gi
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
const pdfTextMap = JSON.parse(readFileSync('src/data/course-pdf-text-map.json', 'utf8')).documents

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

function getPdfKey(value) {
  try {
    const url = new URL(value)
    return decodeURIComponent(url.pathname.split('/').pop() || value)
  } catch {
    return value
  }
}

function extractPdfKeysFromHtml(contentHtml) {
  if (!contentHtml) return new Set()
  return new Set(
    [...contentHtml.matchAll(PDF_HREF_PATTERN)]
      .map(match => getPdfKey(match[1])),
  )
}

function getTrainingPdfKeysAfterMerge(steps, linkedPdfFiles) {
  const trainingPdfKeys = new Set()

  for (const step of steps || []) {
    if (step.type !== 'pdf_content') continue
    for (const key of extractPdfKeysFromHtml(step.content_html)) {
      trainingPdfKeys.add(key)
    }
  }

  for (const pdfFile of linkedPdfFiles) {
    trainingPdfKeys.add(getPdfKey(pdfFile))
  }

  return trainingPdfKeys
}

async function selectAll(table, columns, filter) {
  const pageSize = 1000
  const rows = []
  let from = 0

  while (true) {
    let query = supabase.from(table).select(columns).range(from, from + pageSize - 1)
    query = filter(query)
    const { data, error } = await query
    if (error) throw new Error(`${table} query failed: ${error.message}`)
    rows.push(...(data || []))
    if (!data || data.length < pageSize) break
    from += pageSize
  }

  return rows
}

async function main() {
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, title')
    .eq('title', COURSE_TITLE)
    .single()

  if (courseError || !course) {
    throw new Error(`course not found: ${COURSE_TITLE}`)
  }

  const units = await selectAll(
    'course_units',
    'id, unit_number',
    query => query.eq('course_id', course.id),
  )
  const unitIds = units.map(unit => unit.id)
  const lessons = unitIds.length > 0
    ? await selectAll(
      'course_lessons',
      'id, title, unit_id, lesson_number, steps',
      query => query.in('unit_id', unitIds),
    )
    : []
  const contentItems = await selectAll(
    'course_content_items',
    'id, title, lesson_id, pdf_files, youtube_ids, audio_files, h5p_files',
    query => query.eq('course_id', course.id),
  )

  const contentByLesson = new Map()
  for (const item of contentItems) {
    if (!item.lesson_id) continue
    if (!contentByLesson.has(item.lesson_id)) {
      contentByLesson.set(item.lesson_id, [])
    }
    contentByLesson.get(item.lesson_id).push(item)
  }

  const failures = []
  const rows = lessons.map(lesson => {
    const linkedItems = contentByLesson.get(lesson.id) || []
    const linkedPdfFiles = linkedItems.flatMap(item => item.pdf_files || [])
    const linkedPdfKeys = new Set(linkedPdfFiles.map(getPdfKey))
    const trainingPdfKeys = getTrainingPdfKeysAfterMerge(lesson.steps, linkedPdfFiles)
    const missingFromTraining = [...linkedPdfKeys].filter(key => !trainingPdfKeys.has(key))
    const missingText = [...linkedPdfKeys].filter(key => !pdfTextMap[key])

    if (missingFromTraining.length > 0 || missingText.length > 0) {
      failures.push({
        lesson_id: lesson.id,
        title: lesson.title,
        missing_from_training: missingFromTraining,
        missing_pdf_text: missingText,
      })
    }

    return {
      lesson_id: lesson.id,
      title: lesson.title,
      linked_pdf_count: linkedPdfKeys.size,
      training_pdf_count_after_merge: trainingPdfKeys.size,
      missing_from_training: missingFromTraining.length,
      missing_pdf_text: missingText.length,
    }
  }).sort((first, second) => first.title.localeCompare(second.title))

  const summary = {
    course_id: course.id,
    lesson_count: lessons.length,
    lessons_with_pdf: rows.filter(row => row.linked_pdf_count > 0).length,
    linked_pdf_total: rows.reduce((sum, row) => sum + row.linked_pdf_count, 0),
    failures: failures.length,
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
