'use client'

/**
 * 1:1 移植自 MAXCLASS_V1_HANDOFF_2026-06-14/src/views/TcfTestPage.vue
 *
 * TCF 模拟测试页（3 个阶段）：
 *   - pre：标题 + 描述 + 时长/题数/级别 + 练习模式 / 计时模式按钮
 *   - quiz：可选计时器（计时模式才显示）+ 进度条 + 题目 + 4 选项 + 上一题/下一题/完成
 *   - result：百分比 + 推荐级别 + 返回首页
 *
 * 计时模式：从 levelTestQuestions 随机抽 5 题，开启 setInterval 每秒 -1，归 0 自动完成。
 */

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { t } from '@/lib/maxclass/i18n'
import { usePageSeo } from '@/lib/parcours/usePageSeo'
import { Breadcrumb } from '../../parcours/components/Breadcrumb'
import { EmptyState } from '@/components/maxclass/ui'
import { getTcfTest, levelTestQuestions } from '@/data/maxclass/mock'

interface Question {
  id: number
  text: string
  options: string[]
  correct: number
  level: 'A1' | 'A2' | 'B1' | 'B2'
}

interface TcfTest {
  id: number
  slug: string
  title: string
  description: string
  duration: number
  questionCount: number
  level: string
  type: string
}

const QUESTION_COUNT = 5

function optionLetter(idx: number): string {
  return String.fromCharCode(65 + idx)
}

export function TcfTestPageClient({ slug }: { slug: string }) {
  const test = getTcfTest(slug) as TcfTest | undefined

  const [started, setStarted] = useState(false)
  const [finished, setFinished] = useState(false)
  const [timed, setTimed] = useState(false)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [questions, setQuestions] = useState<Question[]>([])
  const [remainingSeconds, setRemainingSeconds] = useState(0)

  usePageSeo({
    title: test ? test.title : t('common.notFound'),
    description: test?.description ?? '',
  })

  // 计时器副作用 — 仅在 timed + !finished 时运行
  useEffect(() => {
    if (!started || !timed || finished) return
    if (remainingSeconds <= 0) {
      setFinished(true)
      return
    }
    const id = setInterval(() => {
      setRemainingSeconds(s => s - 1)
    }, 1000)
    return () => clearInterval(id)
  }, [started, timed, finished, remainingSeconds])

  // 完成测试时检查时间是否归零（用于自动触发完成）
  useEffect(() => {
    if (started && timed && remainingSeconds === 0 && !finished) {
      setFinished(true)
    }
  }, [started, timed, remainingSeconds, finished])

  const currentQuestion = questions[currentIdx] ?? null
  const answeredCount = Object.keys(answers).length
  const correctCount = useMemo(
    () => questions.filter((q, i) => answers[i] === q.correct).length,
    [questions, answers],
  )
  const scorePercent = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0

  const recommendedLevel = useMemo(() => {
    if (scorePercent >= 80) return 'B2'
    if (scorePercent >= 60) return 'B1'
    if (scorePercent >= 40) return 'A2'
    return 'A1'
  }, [scorePercent])

  const formattedTime = useMemo(() => {
    const m = Math.floor(remainingSeconds / 60)
    const s = remainingSeconds % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }, [remainingSeconds])

  function startTest(isTimed: boolean) {
    if (!test) return
    setTimed(isTimed)
    const shuffled = [...levelTestQuestions].sort(() => Math.random() - 0.5)
    setQuestions((shuffled.slice(0, QUESTION_COUNT) as unknown as Question[]))
    setStarted(true)
    setFinished(false)
    setAnswers({})
    setCurrentIdx(0)
    if (isTimed) {
      setRemainingSeconds(test.duration * 60)
    }
  }

  function selectAnswer(optionIdx: number) {
    setAnswers(prev => ({ ...prev, [currentIdx]: optionIdx }))
  }

  function finishTest() {
    setFinished(true)
  }

  if (!test) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Breadcrumb
          items={[
            { label: t('nav.home'), to: '/videos' },
            { label: t('nav.tcf'), to: '/tcf' },
            { label: '' },
          ]}
        />
        <EmptyState
          title={t('common.notFound')}
          description={t('common.comingSoon')}
          icon={'📝'}
        />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Breadcrumb
        items={[
          { label: t('nav.home'), to: '/videos' },
          { label: t('nav.tcf'), to: '/tcf' },
          { label: test.title },
        ]}
      />

      {/* Pre-test view */}
      {!started ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">{test.title}</h1>
          <p className="text-gray-500 mb-4">{test.description}</p>
          <div className="flex items-center justify-center gap-6 text-sm text-gray-400 mb-8">
            <span>{t('common.duration', { min: test.duration })}</span>
            <span>
              {test.questionCount} {t('pages.tcf.questions')}
            </span>
            <span>
              {t('common.seeLevel').replace('：', '').replace(':', '')} : {test.level}
            </span>
          </div>
          <div className="flex items-center justify-center gap-4">
            <button type="button" onClick={() => startTest(false)} className="btn-primary">
              {t('pages.tcf.practice')}
            </button>
            <button type="button" onClick={() => startTest(true)} className="btn-cta">
              {t('pages.tcf.timed')}
            </button>
          </div>
        </div>
      ) : !finished ? (
        <>
          {/* Timer */}
          {timed ? (
            <div className="mb-4 text-right">
              <span
                className={`text-lg font-mono font-bold ${
                  remainingSeconds < 60 ? 'text-red-600' : 'text-gray-700'
                }`}
              >
                {formattedTime}
              </span>
            </div>
          ) : null}

          {/* Progress */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-500">
                {t('pages.levelTest.question', { n: currentIdx + 1, total: questions.length })}
              </span>
              <span className="text-sm font-medium text-primary-700">
                {answeredCount} / {questions.length}
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-600 rounded-full transition-all duration-300"
                style={{ width: `${(answeredCount / questions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Question card */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-lg font-medium text-gray-800 mb-6">{currentQuestion?.text}</p>
            <div className="space-y-3">
              {currentQuestion?.options.map((option, oi) => {
                const selected = answers[currentIdx] === oi
                return (
                  <button
                    key={oi}
                    type="button"
                    onClick={() => selectAnswer(oi)}
                    className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors ${
                      selected
                        ? 'border-primary-600 bg-primary-50 text-primary-800'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <span className="font-medium mr-2">{optionLetter(oi)}.</span>
                    {option}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            {currentIdx > 0 ? (
              <button
                type="button"
                onClick={() => setCurrentIdx(i => i - 1)}
                className="btn-secondary"
              >
                {t('common.previous')}
              </button>
            ) : (
              <div />
            )}

            {currentIdx < questions.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentIdx(i => i + 1)}
                className="btn-primary"
              >
                {t('common.next')}
              </button>
            ) : (
              <button type="button" onClick={finishTest} className="btn-cta">
                {t('common.finish')}
              </button>
            )}
          </div>
        </>
      ) : (
        /* Results view */
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">{t('pages.tcf.result')}</h2>
          <p
            className={`text-5xl font-bold mt-4 mb-2 ${
              scorePercent >= 70
                ? 'text-green-600'
                : scorePercent >= 40
                  ? 'text-orange-500'
                  : 'text-red-600'
            }`}
          >
            {scorePercent}%
          </p>
          <p className="text-gray-500 mb-6">
            {correctCount} / {questions.length}
          </p>

          <div className="bg-primary-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-primary-700 mb-1">{t('pages.tcf.recommendedLevel')}</p>
            <p className="text-2xl font-bold text-primary-800">{recommendedLevel}</p>
          </div>

          <Link href="/videos" className="btn-primary inline-block">
            {t('common.backToHome')}
          </Link>
        </div>
      )}
    </div>
  )
}
