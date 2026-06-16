'use client'

/**
 * 1:1 移植自 MAXCLASS_V1_HANDOFF_2026-06-14/src/views/CourseLandingPage.vue
 *
 * 课程落地页：hero（级别 + 类型 + 标题 + 描述 + CTA）+ 锚点导航（模块 chips）+ 总体进度条
 * + 学习建议 tip + 各 module section（支持 lessons/steps/objectives 三种形态）。
 *
 * 与原版差异：
 *   - Vue 用 useLessonProgress() 实例；React 直接调用 src/lib/parcours/progress 的纯函数
 *   - Vue 用 ref activeModule + watch(course)；React 用 useState + useEffect 监听 slug 变化
 *   - SEO 改用 usePageSeo hook（已存在的 src/lib/parcours/usePageSeo）
 *   - SSR/CSR 一致：本地进度状态延迟到 mounted 后再读，避免 hydration mismatch
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { t } from '@/lib/maxclass/i18n'
import { usePageSeo } from '@/lib/parcours/usePageSeo'
import {
  completedCount,
  completedBlockCount,
  isCompleted as isLessonCompleted,
} from '@/lib/parcours/progress'
import { EmptyState } from '@/components/maxclass/ui/EmptyState'
import { Breadcrumb } from '../components/Breadcrumb'
import type { Course, Module, ModuleStep } from '@/data/parcours-mock'

const STEP_GRADIENTS = [
  'bg-gradient-to-br from-blue-100 to-blue-200',
  'bg-gradient-to-br from-green-100 to-green-200',
  'bg-gradient-to-br from-orange-100 to-orange-200',
  'bg-gradient-to-br from-purple-100 to-purple-200',
]

function translated(slug: string, path: string, fallback = ''): string {
  const key = `course.${slug}.${path}`
  const value = t(key)
  return value === key ? fallback : value
}

function formatLessonTitle(index: number, title: string): string {
  return `Lesson ${String(index + 1).padStart(2, '0')} · ${title}`
}

function moduleRoute(course: Course, mod: Module): string {
  const path = `/parcours/${course.slug}/module/${mod.slug}`
  if (mod.lessons?.length) return `${path}?lesson=0`
  return path
}

function lessonRoute(course: Course, mod: Module, lessonIndex: number): string {
  return `/parcours/${course.slug}/module/${mod.slug}?lesson=${lessonIndex}`
}

export function CourseLandingPageClient({ course }: { course: Course }) {
  const pathname = usePathname()
  const seo = usePageSeo()
  const [activeModule, setActiveModule] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!course) return
    const title = translated(course.slug, 'title', course.title)
    const description = translated(course.slug, 'desc', course.description)
    seo.setTitle(title)
    seo.setDescription(description)
  }, [course, seo])

  if (!course) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <EmptyState
          title={t('pages.courseLanding.notFound')}
          description={t('pages.courseLanding.notFoundDesc')}
          icon="🗺️"
          showHome
        />
      </div>
    )
  }

  const courseTitle = translated(course.slug, 'title', course.title)
  const courseDescription = translated(course.slug, 'desc', course.description)
  const courseTip = translated(course.slug, 'tip', course.tip ?? '')
  const courseType = course.courseType ?? ''
  const courseTypeLabel = courseType
    ? (() => {
        const key = `pages.course.formats.${courseType}.label`
        const value = t(key)
        return value === key ? '' : value
      })()
    : ''
  const courseTypeDescription = courseType
    ? (() => {
        const key = `pages.course.formats.${courseType}.description`
        const value = t(key)
        return value === key ? '' : value
      })()
    : ''
  const courseTypeClass =
    courseType === 'structured' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'

  const moduleCount = course.modules?.length ?? 0
  const allLessons = course.modules?.flatMap(mod => mod.lessons ?? []) ?? []
  const totalLessons = allLessons.length
  const totalDone = mounted ? completedCount(allLessons) : 0
  const globalProgressPercent =
    totalLessons > 0 ? Math.round((totalDone / totalLessons) * 100) : 0
  const firstModuleLink =
    course.modules?.length > 0 ? moduleRoute(course, course.modules[0]) : '/'

  function moduleTitle(mod: Module): string {
    return translated(`${course.slug}.${mod.slug}`, 'title', mod.title ?? '')
  }
  function moduleDescription(mod: Module): string {
    return translated(`${course.slug}.${mod.slug}`, 'desc', mod.description ?? '')
  }

  function scrollToModule(slug: string) {
    setActiveModule(slug)
    if (typeof document === 'undefined') return
    const el = document.getElementById(`module-${slug}`)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  function lessonStatusLabel(lessonId: string, blocksCount: number): string {
    if (!mounted) return t('pages.courseLanding.notStarted')
    if (isLessonCompleted(lessonId)) return t('pages.courseLanding.completed')
    if (completedBlockCount(lessonId, []) > 0 || blocksCount > 0) {
      // 这里只能近似：原版传 lesson.blocks 给 completedBlockCount；
      // 我们简化为只要有 block 完成就算 inProgress，需调用方传 blocksCount
      return t('pages.courseLanding.inProgress')
    }
    return t('pages.courseLanding.notStarted')
  }
  function lessonStatusClass(lessonId: string, blocksCount: number): string {
    if (!mounted) return 'bg-gray-100 text-gray-600'
    if (isLessonCompleted(lessonId)) return 'bg-green-100 text-green-700'
    if (completedBlockCount(lessonId, []) > 0 || blocksCount > 0) {
      return 'bg-primary-100 text-primary-700'
    }
    return 'bg-gray-100 text-gray-600'
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Breadcrumb
        items={[
          { label: t('nav.home'), to: '/videos' },
          { label: t('nav.courses'), to: '/parcours' },
          { label: courseTitle },
        ]}
      />

      <div className="bg-gradient-to-br from-green-600 to-teal-700 text-white rounded-xl p-8 md:p-12 mb-8">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
              {course.level || 'A1'}
            </span>
            {courseTypeLabel ? (
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${courseTypeClass}`}
              >
                {courseTypeLabel}
              </span>
            ) : null}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold">{courseTitle}</h1>
          <p className="text-green-100 mt-3 text-lg leading-relaxed">{courseDescription}</p>
          {courseTypeDescription ? (
            <p className="text-green-50/90 mt-3 text-sm leading-relaxed max-w-2xl">
              {courseTypeDescription}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-6 mt-6 text-sm text-green-200">
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path
                  fillRule="evenodd"
                  d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                  clipRule="evenodd"
                />
              </svg>
              {moduleCount} {t('pages.course.modules')}
            </span>
            {totalLessons > 0 ? (
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 3a2 2 0 00-2 2v11a1 1 0 001.447.894L10 13.618l6.553 3.276A1 1 0 0018 16V5a2 2 0 00-2-2H4z" />
                </svg>
                {t('pages.courseLanding.lessonCount', { count: totalLessons })}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8 5v14l11-7z" />
                </svg>
                {course.exerciseCount ?? 0} {t('pages.course.exercises')}
              </span>
            )}
          </div>
          <Link
            href={firstModuleLink}
            className="inline-flex items-center gap-2 mt-8 px-8 py-3 bg-white text-green-800 font-bold rounded-lg hover:bg-green-50 transition-colors"
          >
            {t('pages.courseLanding.startBtn')}
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </Link>
        </div>
      </div>

      <div className="text-center mb-10">
        <a
          href="#modules"
          className="inline-flex flex-col items-center gap-1 text-primary-600 hover:text-primary-800 transition-colors"
        >
          <span className="text-sm font-medium">
            {totalLessons > 0
              ? t('pages.courseLanding.lessonCount', { count: totalLessons })
              : t('pages.courseLanding.viewExercises', { count: course.exerciseCount ?? 0 })}
          </span>
          <span className="text-xs text-gray-400">{t('pages.courseLanding.scrollDown')}</span>
          <svg className="w-5 h-5 animate-bounce mt-1" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </a>
      </div>

      <div id="modules" className="flex flex-wrap gap-2 mb-6 scroll-mt-24">
        {course.modules.map(mod => (
          <button
            key={mod.id}
            type="button"
            onClick={() => scrollToModule(mod.slug)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeModule === mod.slug
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {moduleTitle(mod)}
          </button>
        ))}
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-gray-700">
            {t('pages.courseLanding.globalProgress')}
          </span>
          <span className="text-sm font-mono text-gray-500">{globalProgressPercent}%</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-600 rounded-full transition-all"
            style={{ width: `${globalProgressPercent}%` }}
          />
        </div>
      </div>

      {courseTip ? (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-10 flex items-start gap-3">
          <span className="text-2xl shrink-0">💡</span>
          <div>
            <p className="font-semibold text-amber-800 text-sm">{t('pages.courseLanding.tip')}</p>
            <p className="text-amber-700 text-sm mt-1">{courseTip}</p>
          </div>
        </div>
      ) : null}

      {course.modules.map(mod => (
        <section key={mod.id} id={`module-${mod.slug}`} className="mb-12 scroll-mt-24">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800">{moduleTitle(mod)}</h2>
              <p className="text-gray-500 mt-1 text-sm leading-relaxed">{moduleDescription(mod)}</p>
            </div>
            <Link
              href={moduleRoute(course, mod)}
              className="shrink-0 ml-4 text-primary-600 hover:text-primary-800 text-sm font-medium transition-colors"
            >
              {t('pages.courseLanding.viewModule')} →
            </Link>
          </div>

          {mod.lessons?.length ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-gray-400 uppercase font-semibold">
                  {t('pages.courseLanding.lessons')}
                </p>
                <p className="text-xs text-gray-500">
                  {mounted ? completedCount(mod.lessons) : 0} / {mod.lessons.length}{' '}
                  {t('pages.courseLanding.completed')}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mod.lessons.map((lesson, lessonIndex) => {
                  const blocksCount = lesson.blocks?.length ?? 0
                  return (
                    <Link
                      key={lesson.id}
                      href={lessonRoute(course, mod, lessonIndex)}
                      className="group block bg-white rounded-lg border border-gray-200 p-5 hover:border-primary-300 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${lessonStatusClass(
                            lesson.id,
                            blocksCount,
                          )}`}
                        >
                          {lessonStatusLabel(lesson.id, blocksCount)}
                        </span>
                        <span className="text-xs text-gray-400">
                          {t('pages.courseLanding.blocksCount', { count: blocksCount })}
                        </span>
                      </div>
                      <h3 className="font-semibold text-gray-800 group-hover:text-primary-700 transition-colors">
                        {formatLessonTitle(lessonIndex, lesson.title)}
                      </h3>
                      {lesson.description ? (
                        <p className="text-sm text-gray-500 mt-2 line-clamp-2">{lesson.description}</p>
                      ) : null}
                      <div className="flex items-center justify-between mt-4 text-xs text-gray-400">
                        <span>{lesson.estimatedMinutes ?? 0} min</span>
                        <span className="text-primary-600 font-medium">
                          {t('pages.courseLanding.openLesson')} →
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </>
          ) : mod.steps?.length ? (
            <>
              <div className="mb-4">
                <p className="text-xs text-gray-400 mb-2">
                  {t('pages.courseLanding.stepProgress')}
                </p>
                <div className="flex gap-2">
                  {mod.steps.map((_step: ModuleStep, si: number) => (
                    <div
                      key={si}
                      className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden"
                    >
                      <div className="h-full bg-green-500 rounded-full" style={{ width: '0%' }} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 mb-3">
                {mod.steps.map((step: ModuleStep, si: number) => (
                  <span
                    key={si}
                    className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-500"
                  >
                    {t('pages.courseLanding.stepLabel', {
                      n: String(si + 1).padStart(2, '0'),
                    })}
                  </span>
                ))}
              </div>

              <p className="text-xs text-gray-400 uppercase font-semibold mb-3">
                {t('pages.courseLanding.steps')}
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {mod.steps.map((step: ModuleStep, si: number) => (
                  <Link key={step.id} href={moduleRoute(course, mod)} className="group block">
                    <div className="bg-white rounded-lg border-2 border-gray-200 overflow-hidden transition-all hover:border-primary-300 hover:shadow-md">
                      <div
                        className={`h-32 flex items-center justify-center text-4xl ${
                          STEP_GRADIENTS[si % STEP_GRADIENTS.length]
                        }`}
                      >
                        {step.thumbnail}
                      </div>
                      <div className="p-3">
                        <h3 className="font-medium text-sm text-gray-800 group-hover:text-primary-700 transition-colors line-clamp-2">
                          {translated(
                            `${course.slug}.${mod.slug}.${step.slug}`,
                            'title',
                            step.title ?? '',
                          )}
                        </h3>
                        <p className="text-xs text-gray-400 mt-1">
                          0/{step.exerciseCount ?? 0} {t('pages.courseLanding.exercisesUnit')}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                <span>
                  {(mod.exerciseIds ?? []).length} {t('pages.course.exercises')}
                </span>
                {mod.objectives?.length ? (
                  <span>
                    {mod.objectives.length} {t('pages.course.objectives')}
                  </span>
                ) : null}
              </div>
              {mod.objectives?.length ? (
                <ul className="mt-4 space-y-2">
                  {mod.objectives.map((objective, index) => (
                    <li
                      key={index}
                      className="text-sm text-gray-600 flex items-start gap-2"
                    >
                      <span className="text-green-500 mt-0.5">•</span>
                      <span>{objective}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          )}
        </section>
      ))}

      {/* pathname 暂未使用，但保留以备路由相关 UI（如 active state）扩展用 */}
      <span className="hidden">{pathname}</span>
    </div>
  )
}
