'use client'

/**
 * 1:1 移植自 MAXCLASS_V1_HANDOFF_2026-06-14/src/views/ExercisePage.vue
 *
 * 单个练习页：
 *   - 简易 breadcrumb（首页 / 当前级别 / 练习标题）
 *   - level-badge + 标题 + theme/collection/description
 *   - VideoPlayer（自托管视频 + cuechange 字幕）
 *   - 步骤进度条（green/primary-600/gray-200，可点击回退到已完成步骤）
 *   - 当前步骤组件（FillBlank/MultipleChoice/TrueFalse/Reorder/MatchPairs）
 *   - 上一步/下一步/完成按钮
 *   - 完成后显示得分总结
 *
 * 与原版差异：
 *   - Vue defineProps({ id })；React function 参数
 *   - Vue <router-link to={name:'level',params:{level}} → React <Link href={/exercices/{slug}}>
 *   - breadcrumb 首页指 /videos
 *   - step 类型用 union + 字面量 type 字段做 discriminated narrowing
 */

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { t } from '@/lib/maxclass/i18n'
import { usePageSeo } from '@/lib/parcours/usePageSeo'
import { VideoPlayer } from '@/components/maxclass/exercises'
import { FillBlank } from '@/components/maxclass/exercises/FillBlank'
import { MultipleChoice } from '@/components/maxclass/exercises/MultipleChoice'
import { TrueFalse } from '@/components/maxclass/exercises/TrueFalse'
import { Reorder } from '@/components/maxclass/exercises/Reorder'
import { MatchPairs } from '@/components/maxclass/exercises/MatchPairs'
import type { ExerciseStep } from '@/components/maxclass/exercises/types'
import { getExercise, getLevelByCode } from '@/data/maxclass/mock'

const STEP_TYPE_LABELS: Record<ExerciseStep['type'], string> = {
  fill_blank: 'exercise.fillBlank',
  multiple_choice: 'exercise.multipleChoice',
  true_false: 'exercise.trueFalse',
  reorder: 'exercise.reorder',
  match_pairs: 'exercise.matchPairs',
}

interface RawExercise {
  id: number
  title: string
  level: string
  theme: string
  collection: string
  description: string
  duration: number
  video: { url?: string; subtitles?: string | null; duration?: number }
  steps: ExerciseStep[]
}

export function ExercisePageClient({ id }: { id: string }) {
  const exercise = getExercise(id) as RawExercise | undefined

  usePageSeo({
    title: exercise ? exercise.title : t('exercise.notFound'),
    description: exercise ? exercise.description : '',
  })

  const levelSlug = useMemo(() => {
    if (!exercise) return ''
    const lv = getLevelByCode(exercise.level)
    return lv?.slug ?? ''
  }, [exercise])

  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [results, setResults] = useState<boolean[]>([])
  const [showSummary, setShowSummary] = useState(false)

  if (!exercise) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center py-20 text-gray-400">
          <p>{t('exercise.notFound')}</p>
          <Link href="/videos" className="btn-primary inline-block mt-4">
            {t('common.back')}
          </Link>
        </div>
      </div>
    )
  }

  const steps = exercise.steps
  const currentStep = steps[currentStepIndex]
  const score = results.filter(Boolean).length
  const stepTypeLabel = currentStep ? t(STEP_TYPE_LABELS[currentStep.type]) : ''

  function goToStep(i: number) {
    if (i > currentStepIndex) return
    setCurrentStepIndex(i)
    setSubmitted(results[i] !== undefined)
    setShowSummary(false)
  }

  function onSubmit(correct: boolean) {
    setSubmitted(true)
    setResults(prev => {
      const next = [...prev]
      next[currentStepIndex] = correct
      return next
    })
  }

  function nextStep() {
    if (currentStepIndex >= steps.length - 1) return
    const next = currentStepIndex + 1
    setCurrentStepIndex(next)
    setSubmitted(results[next] !== undefined)
  }

  function prevStep() {
    if (currentStepIndex <= 0) return
    const prev = currentStepIndex - 1
    setCurrentStepIndex(prev)
    setSubmitted(results[prev] !== undefined)
  }

  function finish() {
    setShowSummary(true)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-6">
        <Link href="/videos" className="hover:text-primary-700">
          {t('nav.home')}
        </Link>
        <span className="mx-2">/</span>
        {levelSlug ? (
          <>
            <Link href={`/exercices/${levelSlug}`} className="hover:text-primary-700">
              {exercise.level}
            </Link>
            <span className="mx-2">/</span>
          </>
        ) : null}
        <span className="text-gray-800">{exercise.title}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <span className={`level-badge text-sm level-${exercise.level}`}>{exercise.level}</span>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{exercise.title}</h1>
          <p className="text-gray-500 mt-1">
            {exercise.theme} · {exercise.collection} · {exercise.description}
          </p>
        </div>
      </div>

      {/* Video Player */}
      <VideoPlayer video={exercise.video} />

      {/* Step progress */}
      <div className="mt-6 mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600">
            {t('exercise.stepOf', { current: currentStepIndex + 1, total: steps.length })}
          </span>
          <span className="text-sm text-gray-400">{stepTypeLabel}</span>
        </div>
        <div className="flex gap-2">
          {steps.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goToStep(i)}
              className={`flex-1 h-2 rounded-full transition-colors ${
                i < currentStepIndex
                  ? 'bg-green-500'
                  : i === currentStepIndex
                    ? 'bg-primary-600'
                    : 'bg-gray-200'
              }`}
              aria-label={`Step ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Current exercise — 强制重新挂载以重置子组件状态 */}
      {!showSummary && currentStep ? (
        <div key={currentStepIndex} className="bg-white rounded-lg shadow-sm p-6">
          {currentStep.type === 'fill_blank' ? (
            <FillBlank step={currentStep} onSubmit={onSubmit} />
          ) : currentStep.type === 'multiple_choice' ? (
            <MultipleChoice step={currentStep} onSubmit={onSubmit} />
          ) : currentStep.type === 'true_false' ? (
            <TrueFalse step={currentStep} onSubmit={onSubmit} />
          ) : currentStep.type === 'reorder' ? (
            <Reorder step={currentStep} onSubmit={onSubmit} />
          ) : currentStep.type === 'match_pairs' ? (
            <MatchPairs step={currentStep} onSubmit={onSubmit} />
          ) : null}
        </div>
      ) : null}

      {/* Navigation */}
      {!showSummary ? (
        <div className="flex items-center justify-between mt-6">
          {currentStepIndex > 0 ? (
            <button type="button" onClick={prevStep} className="btn-secondary">
              ← {t('common.previous')}
            </button>
          ) : (
            <div />
          )}

          {currentStepIndex < steps.length - 1 && submitted ? (
            <button type="button" onClick={nextStep} className="btn-primary">
              {t('common.next')} →
            </button>
          ) : currentStepIndex === steps.length - 1 && submitted ? (
            <button type="button" onClick={finish} className="btn-cta">
              {t('common.finish')} ✓
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Score summary */}
      {showSummary ? (
        <div className="mt-10 bg-green-50 border border-green-200 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-green-800 mb-2">{t('exercise.allCorrect')}</h2>
          <p className="text-green-700">
            {t('exercise.completed')} « {exercise.title} ».
          </p>
          <p className="text-4xl font-bold text-green-600 mt-4">
            {score} / {steps.length}
          </p>
          <p className="text-green-600 mt-1">{t('exercise.stepsSucceeded')}</p>
          <Link href="/exercices" className="btn-primary inline-block mt-6">
            {t('common.backToExercises')}
          </Link>
        </div>
      ) : null}
    </div>
  )
}
