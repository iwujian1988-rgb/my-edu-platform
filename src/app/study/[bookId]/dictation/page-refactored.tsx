// src/app/study/[bookId]/dictation/page-refactored.tsx
// 对应方案：Section 7.2 - 听写主页面重构（带并发控制）

'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Volume2, SkipBack, Pause, Play, Settings, X } from 'lucide-react'
import Link from 'next/link'
import { speak as speakText, pauseSpeaking, resumeSpeaking } from '@/lib/speech'
import { PermissionGate } from '@/components/PermissionDisplay'
import { FEATURE_PERMISSIONS } from '@/lib/permission-constants'

// 对应方案：Section 7.2 - 使用新的Hooks和组件
import { useDictationStats } from '@/hooks/useDictationStats'
import { useDictationProgress } from '@/hooks/useDictationProgress'
import { useDictationWords } from '@/hooks/useDictationWords'
import { useDictationPageState } from '@/hooks/useDictationPageState'
import { DictationScopeDialog } from '@/components/DictationScopeDialog'
import { DictationStatsBar } from '@/components/DictationStatsBar'
import { DictationCompleteDialog } from '@/components/DictationCompleteDialog'
import { DictationScopeType, DICTATION_SCOPE_LABELS } from '@/types/dictation'

type Word = {
  id: string
  word: string
  phonetic: string
  uk_phonetic?: string
  us_phonetic?: string
  definition: string
  definition_en: string
  collocation: string
  collocation_en: string
  example_sentence: string
  example_sentence_en: string
  part_of_speech: string
}

/**
 * 听写主页面（重构版）
 * 对应方案：Section 7.2 - 使用新架构的听写主页面
 */
export default function DictationPageRefactored() {
  const params = useParams()
  const router = useRouter()
  const bookId = params.bookId as string

  // 对应方案：Section 7.2 - 使用新的Custom Hooks
  const { stats, loading: statsLoading, getScopeOptions } = useDictationStats(bookId)
  const [scopeType, setScopeType] = useState<DictationScopeType>('all')
  const { words, loading: wordsLoading } = useDictationWords(bookId, scopeType, true)
  const { progress, saveProgress } = useDictationProgress(bookId, scopeType, words.length)
  const { pageState, canOperate, executeOperation } = useDictationPageState()

  // 对应方案：Section 7.2 - UI状态
  const [showScopeDialog, setShowScopeDialog] = useState(false)
  const [showCompleteDialog, setShowCompleteDialog] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userInput, setUserInput] = useState('')
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showDefinition, setShowDefinition] = useState(true)

  // 对应方案：Section 7.2 - 初始化进度
  useEffect(() => {
    if (progress && progress.currentIndex > 0 && progress.currentIndex < words.length) {
      setCurrentIndex(progress.currentIndex)
    }
  }, [progress, words.length])

  // 对应方案：Section 7.2 - 自动显示范围选择对话框
  useEffect(() => {
    if (!statsLoading && stats && stats.all > 0) {
      setShowScopeDialog(true)
    }
  }, [statsLoading, stats])

  const currentWord = words[currentIndex]

  // 对应方案：Section 7.2 - 播放单词发音
  const playWordAudio = async () => {
    if (!currentWord) return

    setIsPlaying(true)
    try {
      await speakText(currentWord.word)
    } catch (error) {
      console.error('播放发音失败:', error)
    } finally {
      setIsPlaying(false)
    }
  }

  // 对应方案：Section 7.2 - 提交答案
  const handleSubmit = async () => {
    if (!currentWord) return

    const isCorrect = userInput.trim().toLowerCase() === currentWord.word.toLowerCase()

    if (isCorrect) {
      setFeedback('correct')

      // 对应方案：Section 7.2 - 延迟后进入下一个单词
      setTimeout(async () => {
        await handleNext()
      }, 1000)
    } else {
      setFeedback('wrong')
      setShowCorrectAnswer(true)
    }
  }

  // 对应方案：Section 7.2 - 切换到下一个单词（带并发控制）
  const handleNext = async () => {
    if (!canOperate) {
      console.warn('⚠️ 无法切题：正在保存中或切换中')
      return
    }

    await executeOperation(
      '切题',
      'saving',
      async () => {
        // 对应方案：Section 7.2 - 1. 保存进度
        await saveProgress(currentIndex)

        // 对应方案：Section 7.2 - 2. 重置状态
        setFeedback(null)
        setShowCorrectAnswer(false)
        setUserInput('')

        // 对应方案：Section 7.2 - 3. 检查是否完成
        if (currentIndex >= words.length - 1) {
          setShowCompleteDialog(true)
          return
        }

        // 对应方案：Section 7.2 - 4. 切换到下一个单词
        const nextIndex = currentIndex + 1
        setCurrentIndex(nextIndex)
      }
    )
  }

  // 对应方案：Section 7.2 - 切换范围（带并发控制）
  const handleScopeChange = async (newScope: DictationScopeType) => {
    if (!canOperate) {
      console.warn('⚠️ 无法切换范围：正在保存中')
      return
    }

    await executeOperation(
      '切换范围',
      'switching',
      async () => {
        // 对应方案：Section 7.2 - 1. 保存当前进度
        await saveProgress(currentIndex)

        // 对应方案：Section 7.2 - 2. 切换范围
        setScopeType(newScope)
        setCurrentIndex(0)
        setShowScopeDialog(false)
      }
    )
  }

  // 对应方案：Section 7.2 - 重新开始
  const handleRestart = () => {
    setShowCompleteDialog(false)
    setCurrentIndex(0)
    setUserInput('')
    setFeedback(null)
    setShowCorrectAnswer(false)
  }

  // 对应方案：Section 7.2 - 返回词书详情
  const handleBack = () => {
    router.push(`/library/${bookId}`)
  }

  // 对应方案：Section 7.2 - 返回首页
  const handleHome = () => {
    router.push('/')
  }

  // 对应方案：防御性编程 - 加载状态
  if (statsLoading || wordsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 对应方案：Section 7.2 - 顶部导航 */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link
                href={`/library/${bookId}`}
                className="inline-flex items-center text-gray-600 hover:text-gray-900 mr-4"
              >
                <ArrowLeft className="w-5 h-5 mr-1" />
                返回
              </Link>
              <h1 className="text-xl font-bold text-gray-900">
                听写模式 - {stats && DICTATION_SCOPE_LABELS[scopeType]}
              </h1>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 对应方案：Section 7.2 - 统计信息 */}
        <div className="mb-6">
          <DictationStatsBar
            stats={stats}
            currentScope={scopeType}
            onScopeClick={(scope) => handleScopeChange(scope)}
          />
        </div>

        {/* 对应方案：Section 7.2 - 切换范围按钮 */}
        <div className="mb-6">
          <button
            onClick={() => setShowScopeDialog(true)}
            disabled={!canOperate}
            className={`px-4 py-2 rounded-lg font-medium ${
              canOperate
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            切换学习范围
          </button>
        </div>

        {/* 对应方案：Section 7.2 - 当前单词卡片 */}
        {currentWord && (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
            {/* 单词信息 */}
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold mb-4">{currentWord.word}</h2>
              {currentWord.phonetic && (
                <p className="text-gray-600 text-lg mb-4">{currentWord.phonetic}</p>
              )}

              {/* 播放发音按钮 */}
              <button
                onClick={playWordAudio}
                disabled={isPlaying}
                className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg font-medium ${
                  isPlaying
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-5 h-5" />
                    播放中...
                  </>
                ) : (
                  <>
                    <Volume2 className="w-5 h-5" />
                    播放发音
                  </>
                )}
              </button>
            </div>

            {/* 释义显示 */}
            {showDefinition && (
              <div className="text-center mb-8">
                <p className="text-xl text-gray-700">{currentWord.definition}</p>
                {currentWord.example_sentence && (
                  <p className="text-sm text-gray-500 mt-2">{currentWord.example_sentence}</p>
                )}
              </div>
            )}

            {/* 进度显示 */}
            <div className="text-center mb-8">
              <p className="text-gray-600">
                进度：{currentIndex + 1} / {words.length}
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${((currentIndex + 1) / words.length) * 100}%` }}
                />
              </div>
            </div>

            {/* 答案输入 */}
            <div className="max-w-md mx-auto">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="输入你听到的单词..."
                disabled={feedback !== null}
                className={`w-full px-6 py-4 text-lg border-2 rounded-lg text-center ${
                  feedback === 'correct'
                    ? 'border-green-500 bg-green-50'
                    : feedback === 'wrong'
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-300 focus:border-blue-500'
                } focus:outline-none`}
                autoFocus
              />

              {/* 反馈信息 */}
              {feedback === 'correct' && (
                <div className="mt-4 text-center text-green-600 font-medium">
                  ✓ 正确！
                </div>
              )}

              {feedback === 'wrong' && showCorrectAnswer && (
                <div className="mt-4 text-center">
                  <p className="text-red-600 font-medium mb-2">✗ 错误</p>
                  <p className="text-gray-700">
                    正确答案：<span className="font-bold">{currentWord.word}</span>
                  </p>
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex justify-center gap-4 mt-6">
                <button
                  onClick={handleSubmit}
                  disabled={userInput.trim() === '' || feedback !== null}
                  className={`px-8 py-3 rounded-lg font-bold ${
                    userInput.trim() === '' || feedback !== null
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  提交答案
                </button>

                <button
                  onClick={handleNext}
                  disabled={!canOperate}
                  className={`px-8 py-3 rounded-lg font-bold ${
                    canOperate
                      ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {pageState === 'saving' ? '保存中...' : '跳过'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 对应方案：Section 7.2 - 范围选择对话框 */}
      <DictationScopeDialog
        isOpen={showScopeDialog}
        onClose={() => setShowScopeDialog(false)}
        onSelectScope={handleScopeChange}
        scopeOptions={getScopeOptions()}
        loading={statsLoading}
      />

      {/* 对应方案：Section 7.2 - 完成对话框 */}
      <DictationCompleteDialog
        isOpen={showCompleteDialog}
        scopeType={scopeType}
        scopeLabel={DICTATION_SCOPE_LABELS[scopeType]}
        completedCount={currentIndex + 1}
        totalCount={words.length}
        onRestart={handleRestart}
        onBack={handleBack}
        onHome={handleHome}
      />

      {/* 对应方案：Section 7.2 - 页面状态指示 */}
      {!canOperate && (
        <div className="fixed bottom-4 right-4 bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg shadow-lg">
          正在{pageState === 'saving' ? '保存' : '切换'}...
        </div>
      )}
    </div>
  )
}
