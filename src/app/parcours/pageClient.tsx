'use client'

import Link from 'next/link'
import { useMemo, useRef, useSyncExternalStore } from 'react'
import type { Course, Lesson, Module } from '@/data/parcours-mock'
import { Breadcrumb } from './components/Breadcrumb'
import {
  completedCount,
  getContinueLearning,
  type ContinueLearning,
} from '@/lib/parcours/progress'

interface ContinueCardData {
  courseTitle: string
  moduleTitle: string
  lessonLabel: string
  to: string
}

function formatLessonTitle(index: number, title = ''): string {
  const prefix = `Lesson ${String(index + 1).padStart(2, '0')}`
  return title ? `${prefix} · ${title}` : prefix
}

function countLessons(course: Course): number {
  return (course.modules || []).reduce(
    (sum, module) => sum + (module.lessons?.length || 0),
    0,
  )
}

function countVideoBlocks(course: Course): number {
  return (course.modules || []).reduce(
    (courseTotal, module) => courseTotal + (module.lessons || []).reduce(
      (moduleTotal, lesson) => moduleTotal
        + (lesson.blocks || []).filter(block => block.type === 'video').length,
      0,
    ),
    0,
  )
}

// React 19 idiom for reading client-only external state (localStorage).
// subscribe 返回空 unsubscribe，因为本场景不需要响应跨 tab 变化；
// getServerSnapshot 返回 null 保证 SSR/CSR 一致。
function subscribeNoop() {
  return () => {}
}

export function ParcoursHubClient({
  courses,
}: {
  courses: Course[]
}) {
  const featuredCourse = courses[0]
  const featuredModule: Module | undefined = featuredCourse.modules?.[0]
  const featuredLessons: Lesson[] = useMemo(
    () => featuredModule?.lessons || [],
    [featuredModule],
  )
  const totalLessonCount = courses.reduce((sum, course) => sum + countLessons(course), 0)

  // useSyncExternalStore 要求 getSnapshot 返回稳定引用，否则 React 会陷入
  // 无限循环警告（每次调用都新建对象 → 判定为 snapshot 变化 → re-render → 再调用）。
  // 用 useRef 缓存：以 localStorage 原始字符串为 key，字符串未变就直接返回缓存对象。
  const continueCardCacheRef = useRef<{
    raw: string | null | undefined
    value: ContinueCardData | null
  }>({ raw: undefined, value: null })

  const continueCard = useSyncExternalStore<ContinueCardData | null>(
    subscribeNoop,
    () => {
      if (typeof window === 'undefined') return null

      // 与 progress.ts 的 CONTINUE_KEY 保持一致；直接读 raw 字符串作为缓存 key
      let raw: string | null = null
      try {
        raw = window.localStorage.getItem('parcours:continue_learning')
      } catch {
        raw = null
      }

      if (raw === continueCardCacheRef.current.raw) {
        return continueCardCacheRef.current.value
      }

      const data: ContinueLearning = getContinueLearning()
      if (!data?.courseSlug) {
        continueCardCacheRef.current = { raw, value: null }
        return null
      }
      const c = courses.find(course => course.slug === data.courseSlug) || null
      const mod = c?.modules.find(module => module.slug === data.moduleSlug)
      if (!c || !mod) {
        continueCardCacheRef.current = { raw, value: null }
        return null
      }
      const lesson = mod.lessons?.[data.lessonIndex ?? 0]
      const basePath = `/parcours/${c.slug}/module/${mod.slug}`
      const query = data.lessonIndex != null ? `?lesson=${data.lessonIndex}` : ''
      const hash = data.blockId ? `#block-${data.blockId}` : ''
      const value: ContinueCardData = {
        courseTitle: c.title,
        moduleTitle: mod.title,
        lessonLabel: lesson
          ? formatLessonTitle(data.lessonIndex ?? 0, lesson.title)
          : '',
        to: `${basePath}${query}${hash}`,
      }
      continueCardCacheRef.current = { raw, value }
      return value
    },
    () => null,
  )

  const doneCount = useSyncExternalStore<number>(
    subscribeNoop,
    () => completedCount(featuredLessons.map((l) => ({ id: l.id }))),
    () => 0,
  )

  const featuredProgressPercent =
    featuredLessons.length > 0
      ? Math.round((doneCount / featuredLessons.length) * 100)
      : 0

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Breadcrumb
        items={[{ label: '首页', to: '/videos' }, { label: '系统课程' }]}
      />

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-indigo-900 to-blue-900 text-white rounded-2xl p-8 md:p-10 mb-8">
        <div className="max-w-3xl">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-blue-100 mb-4">
            MaxClass
          </span>
          <h1 className="text-3xl md:text-4xl font-bold leading-tight">
            MaxClass 系统课程
          </h1>
          <p className="text-blue-100 text-base md:text-lg leading-relaxed mt-3">
            按顺序学习，有进度、有练习，从真实内容中建立语言能力。
          </p>
        </div>
      </section>

      {/* Continue Learning */}
      {continueCard && (
        <section className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-800 rounded-xl p-5 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500 mb-2">
                继续学习
              </p>
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                {continueCard.courseTitle}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {continueCard.moduleTitle}
                {continueCard.lessonLabel && ` · ${continueCard.lessonLabel}`}
              </p>
            </div>
            <Link
              href={continueCard.to}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors"
            >
              继续上次学习
              <svg
                className="w-4 h-4"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden
              >
                <path
                  fillRule="evenodd"
                  d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </Link>
          </div>
        </section>
      )}

      {/* Featured title section */}
      <section className="mb-6">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-600 mb-2">
            首发课程
          </p>
          <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-3">
            {featuredCourse.title}
          </h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            从真实法语片段出发，学习高频表达、基础描述和旅行场景表达。
          </p>
        </div>
      </section>

      {/* Featured Course Card */}
      <section className="mb-8">
        <div className="bg-white dark:bg-gray-950 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 md:p-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-200">
                  {featuredCourse.level}
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                  {featuredLessons.length} 节首发课
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                  Quiz
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                  学习进度
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-3">
                  <p className="text-xs text-gray-400 mb-1">模块</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {featuredCourse.modules?.length || 0}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-3">
                  <p className="text-xs text-gray-400 mb-1">课程</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {featuredLessons.length}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-3">
                  <p className="text-xs text-gray-400 mb-1">进度</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {featuredProgressPercent}%
                  </p>
                </div>
              </div>

              <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-5">
                <div
                  className="h-full bg-primary-600 rounded-full transition-all"
                  style={{ width: `${featuredProgressPercent}%` }}
                />
              </div>
            </div>

            <Link
              href={`/parcours/${featuredCourse.slug}`}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors shrink-0"
            >
              开始学习
              <svg
                className="w-4 h-4"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden
              >
                <path
                  fillRule="evenodd"
                  d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* All courses */}
      <section className="mb-8">
        <div className="flex items-end justify-between gap-4 mb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-600 mb-2">
              All courses
            </p>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
              MaxClass course library
            </h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {courses.length} courses / {totalLessonCount} lessons
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {courses.map((course) => {
            const lessonCount = countLessons(course)
            const videoCount = countVideoBlocks(course)
            const firstModule = course.modules?.[0]

            return (
              <Link
                key={course.slug}
                href={`/parcours/${course.slug}`}
                className="block bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 p-6 hover:border-primary-300 dark:hover:border-primary-500 hover:shadow-md transition-all group"
              >
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-200">
                    {course.level}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                    {course.modules?.length || 0} modules
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                    {lessonCount} lessons
                  </span>
                  {videoCount > 0 && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
                      {videoCount} videos
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 group-hover:text-primary-700 dark:group-hover:text-primary-300 transition-colors mb-2">
                  {course.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-5 line-clamp-3">
                  {course.description}
                </p>
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-gray-500 dark:text-gray-400">
                    {firstModule?.title || 'MaxClass'}
                  </span>
                  <span className="text-primary-600 dark:text-primary-300 font-medium shrink-0">
                    Open course
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {/* 3 lesson cards */}
      <section className="mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {featuredLessons.map((lesson, index) => (
            <Link
              key={lesson.id}
              href={{
                pathname: `/parcours/${featuredCourse.slug}/module/${featuredModule?.slug}`,
                query: { lesson: String(index) },
              }}
              className="block bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 p-6 hover:border-primary-300 dark:hover:border-primary-500 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between gap-3 mb-3">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-200">
                  {formatLessonTitle(index)}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {lesson.estimatedMinutes || 0} min
                </span>
              </div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 group-hover:text-primary-700 dark:group-hover:text-primary-300 transition-colors mb-2">
                {lesson.title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
                {lesson.description}
              </p>
              <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
                <span>
                  {lesson.blocks?.length || 0} 个学习单元
                </span>
                <span className="text-primary-600 dark:text-primary-300 font-medium">
                  进入本课 →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Coming soon */}
      {courses.length < 2 && (
      <section className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-5">
        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
          更多课程正在准备中。
        </p>
        <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
          后续会逐步补充更多系统课程，但当前首发阶段先聚焦这门可完整学习的课程。
        </p>
      </section>
      )}
    </div>
  )
}
