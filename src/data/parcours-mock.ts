/**
 * /parcours 路由 mock 数据。
 * 内容来源：MAXCLASS_V1_HANDOFF_2026-06-14/src/data/course_a1_real_french.json
 * 数据模型：Course → Module → Lesson → Block（5 步课程结构）
 *
 * Phase 1：纯前端 mock，无 Supabase。
 * Phase 2：替换为 src/lib/parcours/adapter.ts，签名不变。
 *
 * 实现说明：JSON 内容里大量使用 HTML，包含中文弯引号等字符，直接拼成
 * TS 字符串字面量会因为 ASCII 双引号未转义而无法解析。所以直接通过
 * resolveJsonModule 导入 JSON，再断言为我们定义的类型。
 */

import a1RealFrenchJson from './parcours-a1-real-french.json'

// ---------- 类型定义 ----------

export type BlockType = 'text' | 'video' | 'exercise' | 'quiz' | 'maxtube_link' | 'audio' | 'image'

export type QuestionType = 'single-choice' | 'multiple-choice' | 'fill-blank'

export interface Question {
  id?: string
  type: QuestionType
  question: string
  options?: string[]
  answer: string | string[]
  explanation?: string
  placeholder?: string
}

export interface Block {
  type: BlockType
  id: string
  title?: string
  description?: string
  content?: string
  videoUrl?: string
  poster?: string
  asset?: {
    channel?: string
    segmentId?: string
    videoUrl?: string
    subtitleUrl?: string
    materialUrl?: string
  }
  exerciseIds?: number[]
  url?: string
  questions?: Question[]
  quiz?: Question
}

export interface Lesson {
  id: string
  slug: string
  title: string
  description?: string
  estimatedMinutes?: number
  blocks: Block[]
}

export interface ModuleStep {
  id: string
  slug: string
  title?: string
  thumbnail?: string
  exerciseCount?: number
  exerciseIds?: number[]
}

export interface Module {
  id: string
  slug: string
  title: string
  description?: string
  objectives?: string[]
  lessons: Lesson[]
  /** 5-step 阶段型模块（与 lessons 互斥，二选一） */
  steps?: ModuleStep[]
  /** exerciseIds 关联练习（fallback 用） */
  exerciseIds?: number[]
}

export interface Course {
  id: string
  slug: string
  title: string
  level: string
  courseType?: 'structured' | 'free'
  description: string
  audience?: string
  goals?: string[]
  /** 课程总练习数（部分老数据用 exerciseCount 替代 modules[].lessons） */
  exerciseCount?: number
  tip?: string
  modules: Module[]
}

// ---------- 课程数据 ----------

const a1RealFrenchCourse = a1RealFrenchJson as unknown as Course

export const parcoursCourses: Course[] = [a1RealFrenchCourse]

// ---------- 助手函数 ----------

export function getCourse(slug: string): Course | undefined {
  return parcoursCourses.find((c) => c.slug === slug)
}

export function getCourseModule(
  courseSlug: string,
  moduleSlug: string,
): Module | undefined {
  const course = getCourse(courseSlug)
  if (!course) return undefined
  return course.modules.find((m) => m.slug === moduleSlug)
}

export function getManifestCourse(slug: string): Course | undefined {
  return getCourse(slug)
}
