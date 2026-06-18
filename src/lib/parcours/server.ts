import { createClient } from '@/lib/supabase/server'
import {
  getCourse as getMockCourse,
  getCourseModule as getMockCourseModule,
  parcoursCourses as mockParcoursCourses,
} from '@/data/parcours-mock'
import type { Block, Course, Module, Lesson } from '@/data/parcours-mock'

const PUBLISHED_STATUS = 'published'
const PARCOURS_STEP_TYPE = 'parcours_lesson'
const DEFAULT_COURSE_TYPE = 'structured'

interface DbCourseRow {
  id: string
  slug: string | null
  title: string
  description: string | null
  level: string | null
  language: string | null
  status: string | null
  sort_order: number | null
}

interface DbUnitRow {
  id: string
  course_id: string
  slug: string | null
  title: string
  description: string | null
  unit_number: number | null
  sort_order: number | null
}

interface DbLessonRow {
  id: string
  unit_id: string
  slug: string | null
  title: string
  lesson_number: number | null
  sort_order: number | null
  steps: unknown
}

interface ParcoursLessonPayload {
  type: typeof PARCOURS_STEP_TYPE
  slug?: string
  description?: string | null
  estimatedMinutes?: number | null
  blocks?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function fallbackSlug(prefix: string, order: number | null | undefined, id: string): string {
  if (order && order > 0) return `${prefix}-${order}`
  return `${prefix}-${id}`
}

function isParcoursPayload(value: unknown): value is ParcoursLessonPayload {
  return isRecord(value) && value.type === PARCOURS_STEP_TYPE
}

function toBlocks(value: unknown): Block[] {
  if (!Array.isArray(value)) return []
  return value
    .filter(isRecord)
    .map(item => item as unknown as Block)
}

function legacyStepsToBlocks(steps: unknown, lessonId: string): Block[] {
  if (!Array.isArray(steps)) return []

  return steps
    .filter(isRecord)
    .map((step, index): Block => {
      const title = optionalString(step.title)
      if (step.type === 'grammar' || step.type === 'pdf_content') {
        return {
          type: 'text',
          id: `${lessonId}-step-${index}`,
          title: title || (step.type === 'pdf_content' ? 'Lesson material' : 'Lesson notes'),
          content: optionalString(step.content_html) || '',
        }
      }

      if (step.type === 'warm_up') {
        const audioUrl = optionalString(step.audio_url)
        return {
          type: 'text',
          id: `${lessonId}-step-${index}`,
          title: title || 'Warm up',
          content: audioUrl
            ? `<p>${optionalString(step.prompt) || ''}</p><p><a href="${audioUrl}" target="_blank" rel="noreferrer">Open audio</a></p>`
            : `<p>${optionalString(step.prompt) || ''}</p>`,
        }
      }

      return {
        type: 'text',
        id: `${lessonId}-step-${index}`,
        title: title || 'Learning step',
        content: `<pre>${JSON.stringify(step, null, 2)}</pre>`,
      }
    })
}

function mapLesson(row: DbLessonRow): Lesson {
  const steps = Array.isArray(row.steps) ? row.steps : []
  const payload = steps.find(isParcoursPayload)
  const slug = payload?.slug || row.slug || fallbackSlug('lesson', row.lesson_number, row.id)

  return {
    id: row.id,
    slug,
    title: row.title,
    description: payload?.description || undefined,
    estimatedMinutes: payload?.estimatedMinutes || undefined,
    blocks: payload ? toBlocks(payload.blocks) : legacyStepsToBlocks(row.steps, row.id),
  }
}

function mapCourse(row: DbCourseRow, units: DbUnitRow[], lessons: DbLessonRow[]): Course {
  const lessonsByUnitId = new Map<string, DbLessonRow[]>()
  for (const lesson of lessons) {
    const existing = lessonsByUnitId.get(lesson.unit_id) || []
    existing.push(lesson)
    lessonsByUnitId.set(lesson.unit_id, existing)
  }

  const modules: Module[] = units
    .sort((first, second) => (first.sort_order || 0) - (second.sort_order || 0))
    .map(unit => ({
      id: unit.id,
      slug: unit.slug || fallbackSlug('module', unit.unit_number, unit.id),
      title: unit.title,
      description: unit.description || undefined,
      lessons: (lessonsByUnitId.get(unit.id) || [])
        .sort((first, second) => (first.sort_order || 0) - (second.sort_order || 0))
        .map(mapLesson),
    }))

  return {
    id: row.id,
    slug: row.slug || row.id,
    title: row.title,
    level: row.level || 'A1',
    courseType: DEFAULT_COURSE_TYPE,
    description: row.description || '',
    modules,
  }
}

async function fetchCourseFromSupabase(slug: string): Promise<Course | undefined> {
  const supabase = await createClient()
  const courseResult = await supabase
    .from('courses')
    .select('id, slug, title, description, level, language, status, sort_order')
    .eq('slug', slug)
    .eq('status', PUBLISHED_STATUS)
    .maybeSingle() as { data: DbCourseRow | null; error: unknown }

  if (courseResult.error || !courseResult.data) {
    return undefined
  }

  const courseId = courseResult.data.id
  const unitsResult = await supabase
    .from('course_units')
    .select('id, course_id, slug, title, description, unit_number, sort_order')
    .eq('course_id', courseId)
    .order('sort_order', { ascending: true }) as { data: DbUnitRow[] | null; error: unknown }

  if (unitsResult.error) {
    return undefined
  }

  const units = unitsResult.data || []
  const unitIds = units.map(unit => unit.id)
  const lessonsResult = unitIds.length > 0
    ? await supabase
        .from('course_lessons')
        .select('id, unit_id, slug, title, lesson_number, sort_order, steps')
        .in('unit_id', unitIds)
        .order('sort_order', { ascending: true }) as { data: DbLessonRow[] | null; error: unknown }
    : { data: [] as DbLessonRow[], error: null }

  if (lessonsResult.error) {
    return undefined
  }

  return mapCourse(courseResult.data, units, lessonsResult.data || [])
}

export async function getParcoursCourse(slug: string): Promise<Course | undefined> {
  const supabaseCourse = await fetchCourseFromSupabase(slug)
  return supabaseCourse || getMockCourse(slug)
}

export async function getParcoursCourseModule(
  courseSlug: string,
  moduleSlug: string,
): Promise<Module | undefined> {
  const course = await getParcoursCourse(courseSlug)
  return course?.modules.find(module => module.slug === moduleSlug)
    || getMockCourseModule(courseSlug, moduleSlug)
}

export async function getParcoursCourses(): Promise<Course[]> {
  const courses = await Promise.all(
    mockParcoursCourses.map(course => getParcoursCourse(course.slug)),
  )

  return courses.filter((course): course is Course => Boolean(course))
}
