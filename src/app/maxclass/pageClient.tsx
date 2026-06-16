'use client'

/**
 * 1:1 移植自 MAXCLASS_V1_HANDOFF_2026-06-14/src/views/HomePage.vue
 *
 * MAXCLASS 落地页（原 / 的角色）：
 *   - Hero（TV5MONDE bg 图 + 标题 + 副标题）
 *   - 3 张产品入口卡（MaxClass 跳 /parcours，MaxTube/MaxNote 跳外链）
 *   - Continue Learning banner（如果 localStorage 有进度）
 *   - Featured Course 区域（3 节首发课卡片）
 *
 * 挂在 /maxclass 而非 /，因为 / 已被项目 dashboard 占用。
 *
 * 与原版差异：
 *   - Vue useLessonProgress.getContinueLearning() → 直接调用 progress.ts 的 getContinueLearning()
 *   - Vue usePageReady() ready 状态 → React mounted state（避免 hydration mismatch）
 *   - Vue usePageSeo() → usePageSeo hook
 *   - Vue <router-link :to="{ path, query }"> → next/link <Link href={{ pathname, query }}>
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { t } from '@/lib/maxclass/i18n'
import { usePageSeo } from '@/lib/parcours/usePageSeo'
import { usePageReady } from '@/lib/parcours/usePageReady'
import {
  getCourse,
  getCourseModule,
  type Course,
  type Lesson,
  type Module,
} from '@/data/parcours-mock'
import { getManifestCourse } from '@/data/maxclass/contentManifest'
import { productLinks } from '@/data/maxclass/productLinks'
import {
  getContinueLearning,
  isCompleted,
  type ContinueLearning,
} from '@/lib/parcours/progress'
import { SkeletonLoader } from '@/components/maxclass/ui'

interface ContinueData extends ContinueLearning {
  isReview: boolean
}

function formatLessonTitle(index: number): string {
  return `Lesson ${String(index + 1).padStart(2, '0')}`
}

export function HomePageClient() {
  const ready = usePageReady()
  const seo = usePageSeo()
  const [continueData, setContinueData] = useState<ContinueData | null>(null)

  useEffect(() => {
    seo.setTitle(t('pages.home.heroTitle'))
    seo.setDescription(t('pages.home.heroSubtitle'))
  }, [seo])

  useEffect(() => {
    if (!ready) return
    const raw = getContinueLearning()
    if (!raw?.courseSlug) {
      setContinueData(null)
      return
    }
    const course = getCourse(raw.courseSlug)
    if (!course) {
      setContinueData(null)
      return
    }
    const mod = getCourseModule(raw.courseSlug, raw.moduleSlug)
    if (!mod) {
      setContinueData(null)
      return
    }
    const lesson = mod.lessons?.[raw.lessonIndex]
    const isReview = lesson ? isCompleted(lesson.id) : false
    setContinueData({ ...(raw as NonNullable<ContinueLearning>), isReview })
  }, [ready])

  const featuredCourse = getManifestCourse('a1-real-french') as unknown as Course | null
  const featuredModule: Module | undefined =
    featuredCourse?.modules?.[0] ?? undefined
  const featuredLessons: Lesson[] = featuredModule?.lessons ?? []
  const featuredCourseTitle =
    featuredCourse?.title ?? t('pages.home.launchCourseTitle')

  const continueRoute = continueData
    ? {
        pathname: `/parcours/${continueData.courseSlug}/module/${continueData.moduleSlug}`,
        query: continueData.lessonIndex !== undefined
          ? { lesson: String(continueData.lessonIndex) }
          : undefined,
        hash: continueData.blockId ? `#block-${continueData.blockId}` : '',
      }
    : null

  if (!ready) {
    return (
      <div>
        <div className="bg-gray-200 h-64 md:h-80" />
        <div className="max-w-7xl mx-auto px-4 py-12 space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[0, 1, 2].map(n => (
              <SkeletonLoader key={`hero-${n}`} type="card" />
            ))}
          </div>
          <SkeletonLoader type="card" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[0, 1, 2].map(n => (
              <SkeletonLoader key={`course-${n}`} type="card" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <section className="relative bg-gray-900 text-white overflow-hidden">
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://langue-francaise.tv5monde.com/sites/default/files/styles/max_2600x2600/public/2025-10/UNEgetty1920.jpg"
            alt={t('pages.home.heroTitle')}
            className="w-full h-full object-cover opacity-35"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-gray-950/85 via-gray-950/60 to-gray-900/30" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-24">
          <div className="max-w-3xl mb-10">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/70 mb-4">
              {t('nav.brand')}
            </p>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4">
              {t('pages.home.heroTitle')}
            </h1>
            <p className="text-lg md:text-xl text-white/80 leading-relaxed">
              {t('pages.home.heroSubtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 — MaxClass */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 hover:bg-white/15 transition-colors">
              <h2 className="text-xl font-bold mb-1">{t('pages.home.card1Title')}</h2>
              <p className="text-white/90 text-lg font-medium mb-3">{t('pages.home.card1Sub')}</p>
              <p className="text-white/70 text-sm mb-5">{t('pages.home.card1Desc')}</p>
              <Link
                href={productLinks.maxClass}
                className="inline-block bg-white text-gray-900 font-bold px-6 py-2.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {t('pages.home.card1Btn')}
              </Link>
            </div>

            {/* Card 2 — MaxTube (外链) */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 hover:bg-white/15 transition-colors">
              <h2 className="text-xl font-bold mb-1">{t('pages.home.card2Title')}</h2>
              <p className="text-white/90 text-lg font-medium mb-3">{t('pages.home.card2Sub')}</p>
              <p className="text-white/70 text-sm mb-5">{t('pages.home.card2Desc')}</p>
              <a
                href={productLinks.maxTube}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-white text-gray-900 font-bold px-6 py-2.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {t('pages.home.card2Btn')}
              </a>
            </div>

            {/* Card 3 — MaxNote (外链) */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 hover:bg-white/15 transition-colors">
              <h2 className="text-xl font-bold mb-1">{t('pages.home.card3Title')}</h2>
              <p className="text-white/90 text-lg font-medium mb-3">{t('pages.home.card3Sub')}</p>
              <p className="text-white/70 text-sm mb-5">{t('pages.home.card3Desc')}</p>
              <a
                href={productLinks.maxNote}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-white text-gray-900 font-bold px-6 py-2.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {t('pages.home.card3Btn')}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Continue Learning banner */}
      {continueData && continueRoute ? (
        <section className="bg-primary-50 border-b border-primary-100">
          <div className="max-w-7xl mx-auto px-4 py-5">
            <Link href={continueRoute} className="flex items-center gap-4 group">
              <div className="w-12 h-12 rounded-xl bg-primary-600 text-white flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-primary-500 font-medium mb-0.5">
                  {continueData.isReview
                    ? t('pages.home.reviewLesson')
                    : t('pages.home.continueLearning')}
                </p>
                <p className="text-sm font-bold text-gray-800 truncate group-hover:text-primary-700 transition-colors">
                  {((): string => {
                    const c = getCourse(continueData.courseSlug)
                    const m = c && getCourseModule(c.slug, continueData.moduleSlug)
                    const lesson = m?.lessons?.[continueData.lessonIndex ?? 0]
                    return lesson?.title ?? c?.title ?? ''
                  })()}
                </p>
              </div>
              <svg
                className="w-5 h-5 text-primary-400 group-hover:text-primary-600 shrink-0 transition-colors"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" />
              </svg>
            </Link>
          </div>
        </section>
      ) : null}

      {/* Featured course */}
      <section className="py-14 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-8">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-600 mb-2">
                {t('pages.home.launchBadge')}
              </p>
              <h2 className="text-3xl font-bold text-gray-800 mb-3">{featuredCourseTitle}</h2>
              <p className="text-gray-600 leading-relaxed">{t('pages.home.launchDesc')}</p>
            </div>
            <Link
              href={productLinks.maxClass}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors shrink-0"
            >
              {t('pages.home.launchBtn')}
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {featuredLessons.slice(0, 3).map((lesson, index) => {
              if (!featuredCourse || !featuredModule) return null
              return (
                <Link
                  key={lesson.id}
                  href={{
                    pathname: `/parcours/${featuredCourse.slug}/module/${featuredModule.slug}`,
                    query: { lesson: String(index) },
                  }}
                  className="block bg-white rounded-xl border border-gray-200 p-6 hover:border-primary-300 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-50 text-primary-700">
                      {formatLessonTitle(index)}
                    </span>
                    <span className="text-xs text-gray-400">
                      {lesson.estimatedMinutes ?? 0} min
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 group-hover:text-primary-700 transition-colors mb-2">
                    {lesson.title}
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed mb-4">
                    {lesson.description}
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>
                      {lesson.blocks?.length ?? 0} {t('pages.home.blocks')}
                    </span>
                    <span className="text-primary-600 font-medium">
                      {t('pages.home.openLesson')} →
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}
