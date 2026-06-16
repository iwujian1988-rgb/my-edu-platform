'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Block, BlockType, Course, Module } from '@/data/parcours-mock'
import { Breadcrumb } from '../../../components/Breadcrumb'
import { LessonSidebar } from '../../../components/LessonSidebar'
import { BlockRenderer } from '../../../components/blocks/BlockRenderer'
import {
  blockProgressPercent,
  completedBlockCount,
  completedCount,
  getBlockId,
  isBlockDone as isBlockDoneStorage,
  isCompleted as isCompletedStorage,
  isLessonAllDone,
  markBlockDone,
  markBlockUndone,
  markComplete,
  markIncomplete,
  migrateBlockProgress,
  setContinueLearning,
  toggleBlock,
} from '@/lib/parcours/progress'

const TYPE_LABELS: Record<BlockType, string> = {
  text: '文字讲解',
  video: '视频',
  exercise: '练习',
  quiz: '小测验',
  maxtube_link: 'Maxtube',
  audio: '音频',
  image: '图片',
}

function formatLessonTitle(index: number, title: string): string {
  return `Lesson ${String(index + 1).padStart(2, '0')} · ${title}`
}

export function CourseModuleClient({
  course,
  module,
}: {
  course: Course
  module: Module
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const lessons = module.lessons || []
  const lessonParam = searchParams.get('lesson')
  const initialIndex = Number(lessonParam)
  const [activeLesson, setActiveLesson] = useState<number>(
    Number.isInteger(initialIndex) && initialIndex >= 0 && initialIndex < lessons.length
      ? initialIndex
      : 0,
  )

  const [activeBlockIndex, setActiveBlockIndex] = useState(0)
  const [blockDoneTick, setBlockDoneTick] = useState(0) // 强制 re-render（localStorage 改变）
  const [lessonDoneTick, setLessonDoneTick] = useState(0)
  // mounted: SSR 与首次 CSR 都按未挂载渲染（localStorage 视为空），
  // 等 useEffect 触发后再读真实进度，避免 React Hydration Mismatch
  // （Server 无 localStorage → 返回 0；Client 首次渲染也按 0，挂载后才读真实值）
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  const blockRefs = useRef<Record<number, HTMLDivElement | null>>({})
  const observerRef = useRef<IntersectionObserver | null>(null)

  const currentLesson = lessons[activeLesson] || {
    id: '',
    title: '',
    description: '',
    blocks: [] as Block[],
    slug: '',
  }

  const learningBlocks = useMemo(
    () =>
      (currentLesson.blocks || []).filter((b) => b.type !== 'maxtube_link'),
    [currentLesson.blocks],
  )
  const extensionBlocks = useMemo(
    () => (currentLesson.blocks || []).filter((b) => b.type === 'maxtube_link'),
    [currentLesson.blocks],
  )

  const currentBlockIds = useMemo(
    () => learningBlocks.map((b, i) => getBlockId(b, i)),
    [learningBlocks],
  )

  // -------- IntersectionObserver 严格复刻 MAXCLASS rootMargin --------
  const setupObserver = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect()
      observerRef.current = null
    }
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined')
      return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idxStr = Object.keys(blockRefs.current).find(
              (k) => blockRefs.current[Number(k)] === entry.target,
            )
            if (idxStr !== undefined) setActiveBlockIndex(Number(idxStr))
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 },
    )
    observerRef.current = observer

    Object.values(blockRefs.current).forEach((el) => {
      if (el) observer.observe(el)
    })
  }, [])

  const scrollToBlock = useCallback((index: number) => {
    const el = blockRefs.current[index]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  // 监听 lesson 切换：清空 refs、迁移进度、重新挂 observer
  useEffect(() => {
    setActiveBlockIndex(0)
    blockRefs.current = {}
    if (currentLesson.id && currentLesson.blocks?.length) {
      migrateBlockProgress(currentLesson.id, currentLesson.blocks)
    }
    // nextTick 等价：用 setTimeout(0)
    const id = window.setTimeout(() => {
      setupObserver()
      updateContinueLearning()
    }, 0)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLesson, currentLesson.id])

  // 监听 URL ?lesson=
  useEffect(() => {
    const raw = lessonParam
    const index = Number(raw)
    if (
      Number.isInteger(index) &&
      index >= 0 &&
      index < lessons.length &&
      index !== activeLesson
    ) {
      setActiveLesson(index)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonParam])

  // 初始化挂载 observer
  useEffect(() => {
    setupObserver()
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
      }
    }
  }, [setupObserver])

  function updateContinueLearning() {
    if (!currentLesson.id) return
    setContinueLearning({
      courseSlug: course.slug,
      moduleSlug: module.slug,
      lessonIndex: activeLesson,
      lessonTitle: currentLesson.title,
      blockId: currentBlockIds[activeBlockIndex] || currentBlockIds[0],
    })
  }

  useEffect(() => {
    updateContinueLearning()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLesson, activeBlockIndex])

  // -------- 进度 helpers（包装 state 触发更新） --------
  // mounted=false 时返回 false，与 SSR 一致；挂载后才读 localStorage 真实值
  function checkBlockDone(lessonId: string, blockId: string): boolean {
    // blockDoneTick 作为依赖让 React 重读
    void blockDoneTick
    if (!mounted) return false
    return isBlockDoneStorage(lessonId, blockId)
  }
  function checkLessonDone(lessonId: string): boolean {
    void lessonDoneTick
    if (!mounted) return false
    return isCompletedStorage(lessonId)
  }

  // mounted=false 时强制返回 0，与 SSR 一致；挂载后才读 localStorage 真实值
  const lessonCompletedCount = mounted
    ? completedCount(lessons.map((l) => ({ id: l.id })))
    : 0
  const lessonProgressPercent =
    lessons.length > 0 ? Math.round((lessonCompletedCount / lessons.length) * 100) : 0

  const blockDoneCount = (() => {
    void blockDoneTick
    return mounted ? completedBlockCount(currentLesson.id, learningBlocks) : 0
  })()
  const blockPct = mounted
    ? blockProgressPercent(currentLesson.id, learningBlocks)
    : 0

  function handleToggleBlockDone(blockIndex: number) {
    const lessonId = currentLesson.id
    if (!lessonId) return
    toggleBlock(lessonId, currentBlockIds[blockIndex])
    setBlockDoneTick((n) => n + 1)
    if (isLessonAllDone(lessonId, learningBlocks)) {
      markComplete(lessonId)
      setLessonDoneTick((n) => n + 1)
    }
  }

  function handleBlockCompleted(blockIndex: number) {
    const lessonId = currentLesson.id
    const blockId = currentBlockIds[blockIndex]
    if (!lessonId || !blockId) return
    if (!isBlockDoneStorage(lessonId, blockId)) {
      markBlockDone(lessonId, blockId)
      setBlockDoneTick((n) => n + 1)
    }
    if (isLessonAllDone(lessonId, learningBlocks)) {
      markComplete(lessonId)
      setLessonDoneTick((n) => n + 1)
    }
  }

  function handleMarkBlockUndone(blockIndex: number) {
    const lessonId = currentLesson.id
    if (!lessonId) return
    markBlockUndone(lessonId, currentBlockIds[blockIndex])
    setBlockDoneTick((n) => n + 1)
  }

  function toggleLessonComplete() {
    const lessonId = currentLesson.id
    if (!lessonId) return
    if (isCompletedStorage(lessonId)) {
      markIncomplete(lessonId)
    } else {
      markComplete(lessonId)
    }
    setLessonDoneTick((n) => n + 1)
  }

  function changeLesson(index: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('lesson', String(index))
    router.replace(`/parcours/${course.slug}/module/${module.slug}?${params.toString()}`)
  }

  // -------- 模块导航 --------
  const currentIndex = course.modules.findIndex((m) => m.slug === module.slug)
  const prevModule = currentIndex > 0 ? course.modules[currentIndex - 1] : null
  const nextModule =
    currentIndex >= 0 && currentIndex < course.modules.length - 1
      ? course.modules[currentIndex + 1]
      : null

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Breadcrumb
        items={[
          { label: '首页', to: '/videos' },
          { label: '系统课程', to: '/parcours' },
          { label: course.title, to: `/parcours/${course.slug}` },
          { label: module.title },
        ]}
      />

      {/* Module header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              course.courseType === 'structured'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            {course.courseType === 'structured' ? '系统课' : '自由课'}
          </span>
          <span className="text-sm text-gray-500">
            {course.level} · {course.audience || ''}
          </span>
        </div>
        <h1 className="text-2xl font-bold text-gray-800">{module.title}</h1>
        <p className="text-gray-500 mt-2 leading-relaxed">
          {module.description}
        </p>
      </div>

      {/* Lesson progress summary */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-300"
            style={{ width: `${lessonProgressPercent}%` }}
          />
        </div>
        <span className="text-sm text-gray-500 whitespace-nowrap">
          已完成 {lessonCompletedCount} / {lessons.length} 节课
        </span>
      </div>

      {/* Lesson navigation pills */}
      <div className="mb-6">
        <div className="flex gap-2 flex-wrap">
          {lessons.map((lesson, li) => {
            const isActive = li === activeLesson
            const isDone = checkLessonDone(lesson.id)
            const cls = isActive
              ? 'bg-primary-600 text-white shadow-sm'
              : isDone
                ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            return (
              <button
                key={lesson.id}
                onClick={() => changeLesson(li)}
                className={`flex-1 min-w-[140px] px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left flex items-center gap-2 ${cls}`}
              >
                {isActive ? (
                  <svg
                    className="w-3.5 h-3.5 shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden
                  >
                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                  </svg>
                ) : isDone ? (
                  <svg
                    className="w-3.5 h-3.5 shrink-0 text-green-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-3.5 h-3.5 shrink-0 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                )}
                <span className="truncate">
                  {formatLessonTitle(li, lesson.title)}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Active lesson content */}
      <div className="mb-8">
        {/* Lesson header with block-level progress */}
        <div className="mb-4">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <h2 className="text-lg font-bold text-gray-800">
                {formatLessonTitle(activeLesson, currentLesson.title)}
              </h2>
              {currentLesson.description && (
                <p className="text-sm text-gray-500 mt-1">
                  {currentLesson.description}
                </p>
              )}
            </div>
            <button
              onClick={toggleLessonComplete}
              className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                checkLessonDone(currentLesson.id)
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {checkLessonDone(currentLesson.id) ? '✓ 已完成' : '标记本课已完成'}
            </button>
          </div>

          {/* Block progress bar */}
          {learningBlocks.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 rounded-full transition-all duration-300"
                  style={{ width: `${blockPct}%` }}
                />
              </div>
              <span className="text-xs text-gray-400 whitespace-nowrap">
                {blockDoneCount} / {learningBlocks.length} 个步骤
              </span>
            </div>
          )}
        </div>

        {/* Objectives */}
        {module.objectives && module.objectives.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
            <h3 className="font-semibold text-gray-700 mb-3">学习目标</h3>
            <ul className="space-y-2">
              {module.objectives.map((obj, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 text-sm text-gray-600"
                >
                  <svg
                    className="w-5 h-5 text-green-500 shrink-0 mt-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {obj}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Two-column: sidebar + blocks */}
        {(learningBlocks.length > 0 || extensionBlocks.length > 0) && (
          <div className="flex gap-6">
            {/* Sidebar (desktop) */}
            {learningBlocks.length > 0 && (
              <aside className="hidden lg:block w-56 shrink-0">
                <div className="sticky top-24">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    课程步骤
                  </h4>
                  <LessonSidebar
                    blocks={learningBlocks}
                    blockIds={currentBlockIds}
                    activeIndex={activeBlockIndex}
                    lessonId={currentLesson.id}
                    isBlockDone={checkBlockDone}
                    onSelect={scrollToBlock}
                  />
                </div>
              </aside>
            )}

            {/* Block content */}
            <div className="flex-1 min-w-0">
              {/* Mobile block nav strip */}
              {learningBlocks.length > 0 && (
                <div className="lg:hidden mb-4 -mx-4 px-4 overflow-x-auto">
                  <div className="flex gap-2 pb-2">
                    {learningBlocks.map((block, bi) => {
                      const cls =
                        bi === activeBlockIndex
                          ? 'bg-primary-600 text-white'
                          : checkBlockDone(currentLesson.id, currentBlockIds[bi])
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                      return (
                        <button
                          key={bi}
                          onClick={() => scrollToBlock(bi)}
                          className={`shrink-0 px-3 py-2 rounded-full text-xs font-medium transition-colors max-w-[140px] ${cls}`}
                        >
                          <span className="block truncate">
                            {block.title || TYPE_LABELS[block.type]}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Blocks with Mark Complete */}
              {learningBlocks.map((block, bi) => {
                const done = checkBlockDone(currentLesson.id, currentBlockIds[bi])
                return (
                  <div
                    key={currentBlockIds[bi]}
                    id={`block-${currentBlockIds[bi]}`}
                    ref={(el) => {
                      blockRefs.current[bi] = el
                    }}
                    className="relative mb-4 scroll-mt-24"
                  >
                    <BlockRenderer
                      block={block}
                      onCompleted={() => handleBlockCompleted(bi)}
                    />
                    <div className="mt-2 flex items-center justify-end gap-2">
                      <button
                        onClick={() =>
                          done
                            ? handleMarkBlockUndone(bi)
                            : handleToggleBlockDone(bi)
                        }
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                          done
                            ? 'text-green-600 hover:bg-green-50'
                            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {done ? (
                          <svg
                            className="w-3.5 h-3.5"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                            aria-hidden
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            viewBox="0 0 24 24"
                            aria-hidden
                          >
                            <circle cx="12" cy="12" r="10" />
                          </svg>
                        )}
                        {done ? '已完成' : '标记完成'}
                      </button>
                    </div>
                  </div>
                )
              })}

              {/* Extension blocks */}
              {extensionBlocks.length > 0 && (
                <div className="mt-8 border-t border-gray-200 pt-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    延伸学习
                  </h3>
                  <div className="space-y-4">
                    {extensionBlocks.map((block, bi) => (
                      <BlockRenderer
                        key={block.id || `extension-${bi}`}
                        block={block}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Lesson prev/next */}
              <div className="flex items-center justify-between border-t border-gray-200 pt-6 mt-8">
                {activeLesson > 0 ? (
                  <button
                    onClick={() => changeLesson(activeLesson - 1)}
                    className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-800 font-medium transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      aria-hidden
                    >
                      <path d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" />
                    </svg>
                    {formatLessonTitle(activeLesson - 1, lessons[activeLesson - 1].title)}
                  </button>
                ) : (
                  <div />
                )}

                {activeLesson < lessons.length - 1 ? (
                  <button
                    onClick={() => changeLesson(activeLesson + 1)}
                    className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-800 font-medium transition-colors"
                  >
                    {formatLessonTitle(activeLesson + 1, lessons[activeLesson + 1].title)}
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      aria-hidden
                    >
                      <path d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" />
                    </svg>
                  </button>
                ) : (
                  <div />
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation between modules */}
      <div className="flex items-center justify-between border-t border-gray-200 pt-6 mb-12">
        {prevModule ? (
          <Link
            href={`/parcours/${course.slug}/module/${prevModule.slug}`}
            className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-800 font-medium transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden
            >
              <path d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" />
            </svg>
            {prevModule.title}
          </Link>
        ) : (
          <div />
        )}
        {nextModule ? (
          <Link
            href={`/parcours/${course.slug}/module/${nextModule.slug}`}
            className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-800 font-medium transition-colors"
          >
            {nextModule.title}
            <svg
              className="w-4 h-4"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden
            >
              <path d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" />
            </svg>
          </Link>
        ) : (
          <div />
        )}
      </div>
    </div>
  )
}
