'use client'

/**
 * 1:1 移植自 MAXCLASS_V1_HANDOFF_2026-06-14/src/views/LevelTestPage.vue
 *
 * 级别测试页：3 个阶段
 *   - intro：说明 + 「开始测试」按钮
 *   - quiz：进度条 + 当前题 + 4 选项 + 上一题/下一题/查看结果
 *   - result：推荐级别 + 4 个级别的得分进度条 + 跳转到推荐级别练习
 *
 * 评分逻辑（1:1 还原 Vue）：
 *   - B2>=60% → B2
 *   - B1>=50% → B1
 *   - A2>=50% → A2
 *   - 否则 A1
 */

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { t } from '@/lib/maxclass/i18n'
import { usePageSeo } from '@/lib/parcours/usePageSeo'
import { Breadcrumb } from '../parcours/components/Breadcrumb'
import { levelTestQuestions } from '@/data/maxclass/mock'

interface LevelTestQuestion {
  id: number
  text: string
  options: string[]
  correct: number
  level: 'A1' | 'A2' | 'B1' | 'B2'
}

type LevelCode = 'A1' | 'A2' | 'B1' | 'B2'

const LEVEL_SLUG_MAP: Record<LevelCode, string> = {
  A1: 'a1-debutant',
  A2: 'a2-elementaire',
  B1: 'b1-intermediaire',
  B2: 'b2-avance',
}

const LEVEL_BAR_COLOR: Record<LevelCode, string> = {
  A1: 'bg-green-500',
  A2: 'bg-blue-500',
  B1: 'bg-orange-500',
  B2: 'bg-purple-500',
}

const ALL_LEVELS: LevelCode[] = ['A1', 'A2', 'B1', 'B2']

function optionLetter(idx: number): string {
  // A=65, B=66, ...
  return String.fromCharCode(65 + idx)
}

export function LevelTestPageClient() {
  usePageSeo({
    title: t('pages.levelTest.title'),
    description: t('pages.levelTest.intro'),
  })

  const [started, setStarted] = useState(false)
  const [finished, setFinished] = useState(false)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [questions] = useState<LevelTestQuestion[]>(() => [...levelTestQuestions] as LevelTestQuestion[])

  const currentQuestion = questions[currentIdx] ?? null

  const levelScores = useMemo(() => {
    const result = {} as Record<LevelCode, { total: number; correct: number; percent: number }>
    for (const lvl of ALL_LEVELS) {
      const qs = questions.filter(q => q.level === lvl)
      const correct = qs.filter(q => answers[q.id] === q.correct).length
      result[lvl] = {
        total: qs.length,
        correct,
        percent: qs.length > 0 ? Math.round((correct / qs.length) * 100) : 0,
      }
    }
    return result
  }, [questions, answers])

  const recommendedLevel = useMemo<LevelCode>(() => {
    if (levelScores.B2.percent >= 60) return 'B2'
    if (levelScores.B1.percent >= 50) return 'B1'
    if (levelScores.A2.percent >= 50) return 'A2'
    return 'A1'
  }, [levelScores])

  function startTest() {
    setStarted(true)
    setFinished(false)
    setCurrentIdx(0)
    setAnswers({})
  }

  function selectAnswer(optionIdx: number) {
    if (!currentQuestion) return
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: optionIdx }))
  }

  function finishTest() {
    setFinished(true)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Breadcrumb
        items={[
          { label: t('nav.home'), to: '/videos' },
          { label: t('pages.levelTest.title') },
        ]}
      />

      {/* Intro */}
      {!started ? (
        <>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">{t('pages.levelTest.title')}</h1>
          <div className="bg-primary-50 rounded-lg p-6 mb-8">
            <p className="text-primary-700 text-sm leading-relaxed">{t('pages.levelTest.intro')}</p>
          </div>
          <button type="button" onClick={startTest} className="btn-cta">
            {t('pages.tcf.start')}
          </button>
        </>
      ) : !finished ? (
        <>
          {/* Progress bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-500">
                {t('pages.levelTest.question', {
                  n: currentIdx + 1,
                  total: questions.length,
                })}
              </span>
              <span className="text-xs text-gray-400">{currentQuestion?.level}</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-600 rounded-full transition-all duration-300"
                style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Question */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-lg font-medium text-gray-800 mb-6">{currentQuestion?.text}</p>
            <div className="space-y-3">
              {currentQuestion?.options.map((option, oi) => {
                const selected = answers[currentQuestion.id] === oi
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
                {t('pages.levelTest.result')}
              </button>
            )}
          </div>
        </>
      ) : (
        /* Results */
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">{t('pages.levelTest.result')}</h2>
          <p className="text-6xl font-bold text-primary-700 mb-4">{recommendedLevel}</p>

          <div className="max-w-sm mx-auto text-left mt-6 space-y-3">
            {ALL_LEVELS.map(lvl => {
              const s = levelScores[lvl]
              return (
                <div key={lvl} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">{lvl}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                      {s.correct}/{s.total}
                    </span>
                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${LEVEL_BAR_COLOR[lvl]}`}
                        style={{ width: `${s.percent}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-8">
            <Link
              href={`/exercices/${LEVEL_SLUG_MAP[recommendedLevel]}`}
              className="btn-primary inline-block"
            >
              {t('pages.levelTest.tryLevel', { level: recommendedLevel })}
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
