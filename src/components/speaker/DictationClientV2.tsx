/**
 * Step 2 听写训练 - 主客户端组件
 *
 * 严格按照三个文档实现：
 * - shangwenjie.md 第 2.4 节（产品需求）
 * - TECHNICAL_MODIFICATION_PLAN.md（技术方案）
 * - AI_DEVELOPMENT_GUIDE.md（开发指南）
 *
 * 核心功能：
 * 1. 左右分栏布局（PC端 40%:60%，移动端上下）
 * 2. 左栏：原文遮罩 + 播放控制
 * 3. 右栏：下划线输入流
 * 4. 双栏同步滚动
 * 5. 提交判分
 * 6. 草稿自动保存
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, AlertCircle, History, Save, Check, ArrowRight } from 'lucide-react'
import type { SpeakerArticle } from '@/types/speaker'
import { useSpeakerDictationV2 } from '@/hooks/useSpeakerDictationV2'
import { DictationLeftPanel } from '@/components/speaker/DictationLeftPanel'
import { DictationRightPanel } from '@/components/speaker/DictationRightPanel'
import { DictationLeftPanelMobile } from '@/components/speaker/DictationLeftPanelMobile'
import { DictationRightPanelMobile } from '@/components/speaker/DictationRightPanelMobile'
import { DictationResultModal } from '@/components/speaker/DictationResultModal'
import { parseSentenceTokens } from '@/lib/speaker-utils'

interface DictationClientProps {
  article: SpeakerArticle
  userId: string
}

export function DictationClientV2({ article, userId }: DictationClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const targetSentenceIndex = searchParams.get('sentenceIndex')  // 从 URL 获取目标句子索引

  // 使用听写训练 Hook
  const [state, actions] = useSpeakerDictationV2(
    article.sentences || [],
    article.audio_url,
    userId,
    article.id
  )

  // ========================================
  // PC端双向滚动同步：处理右侧滚动时更新左侧高亮
  // ========================================
  const scrollUpdateTimerRef = useRef<NodeJS.Timeout | null>(null)

  const handleRightPanelScroll = useCallback((sentenceIndex: number) => {
    // 使用防抖来避免频繁更新（避免循环滚动）
    if (scrollUpdateTimerRef.current) {
      clearTimeout(scrollUpdateTimerRef.current)
    }

    scrollUpdateTimerRef.current = setTimeout(() => {
      // 只在索引真正变化时才更新（避免不必要的重新渲染）
      if (sentenceIndex !== state.activeSentenceIndex) {
        actions.setActiveSentence(sentenceIndex)
      }
    }, 50) // 50ms 防抖（更快响应）
  }, [state.activeSentenceIndex, actions])

  // 判分结果状态
  interface GradingResult {
    totalSentences: number
    totalWords: number
    correctCount: number
    wrongCount: number
    skippedCount: number
    accuracyRate: number
    wrongWords: Array<{
      sentenceIndex: number
      wordIndex: number
      userInput: string | null
      correctWord: string
      errorType: 'wrong' | 'skipped'
    }>
  }
  const [gradingResult, setGradingResult] = useState<GradingResult | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [sessionStartTime] = useState(Date.now())  // 记录会话开始时间
  const [showResultModal, setShowResultModal] = useState(true)  // 控制结果显示

  // 保存状态
  const [isSaving, setIsSaving] = useState(false)
  const [showSaveSuccess, setShowSaveSuccess] = useState(false)

  // 未完成确认弹窗
  const [showIncompleteConfirm, setShowIncompleteConfirm] = useState(false)
  const [incompleteCount, setIncompleteCount] = useState(0)

  // 断点恢复逻辑（检查是否有草稿）
  const [showDraftPrompt, setShowDraftPrompt] = useState(false)

  // 自动定位到指定句子（从生词本跳转过来时）
  useEffect(() => {
    if (targetSentenceIndex !== null) {
      const index = parseInt(targetSentenceIndex, 10)
      if (!isNaN(index) && index >= 0 && index < (article.sentences?.length || 0)) {
        console.log('[Dictation Client] 自动定位到句子:', index)
        actions.setActiveSentence(index)
      }
    }
  }, [targetSentenceIndex, article.sentences?.length, actions])

  // 检查草稿
  useEffect(() => {
    let isMounted = true

    const checkDraft = async () => {
      try {
        const response = await fetch(`/api/speaker/draft?articleId=${article.id}&userId=${userId}`)
        const data = await response.json()

        if (!isMounted) return

        if (data.success && data.draft) {
          setShowDraftPrompt(true)
        }
      } catch (error) {
        if (isMounted) console.error('[Dictation] 检查草稿失败:', error)
      }
    }

    checkDraft()

    return () => {
      isMounted = false
    }
  }, [article.id, userId])

  // 监听回车跳转到下一句的事件
  useEffect(() => {
    const handleGoToNextSentence = (event: Event) => {
      const customEvent = event as CustomEvent<number>
      const nextSentenceIndex = customEvent.detail
      actions.setActiveSentence(nextSentenceIndex)
    }

    window.addEventListener('goToNextSentence', handleGoToNextSentence)
    return () => {
      window.removeEventListener('goToNextSentence', handleGoToNextSentence)
    }
  }, [actions])

  // 恢复草稿
  const resumeDraft = async () => {
    console.log('[Dictation Client] 开始恢复草稿')

    try {
      // 获取草稿数据
      const response = await fetch(`/api/speaker/draft?articleId=${article.id}&userId=${userId}`)
      const data = await response.json()

      if (data.success && data.draft) {
        console.log('[Dictation Client] 草稿数据:', data.draft)

        // 调用 hook 的恢复方法
        await actions.restoreDraft(data.draft)

        console.log('[Dictation Client] ✅ 草稿恢复成功')
      } else {
        console.warn('[Dictation Client] 草稿数据为空')
      }
    } catch (error) {
      console.error('[Dictation Client] ❌ 恢复草稿失败:', error)
    } finally {
      setShowDraftPrompt(false)
    }
  }

  // 丢弃草稿
  const discardDraft = async () => {
    console.log('[Dictation Client] 开始丢弃草稿')

    try {
      // 调用 DELETE API 删除服务端草稿
      const response = await fetch(`/api/speaker/draft?articleId=${article.id}&userId=${userId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        console.log('[Dictation Client] ✅ 草稿删除成功')
      } else {
        console.warn('[Dictation Client] ⚠️ 草稿删除失败，但继续关闭弹窗')
      }
    } catch (error) {
      console.error('[Dictation Client] ❌ 删除草稿失败:', error)
    } finally {
      // 无论如何都关闭弹窗
      setShowDraftPrompt(false)
    }
  }

  // 提交听写
  const handleSubmit = async () => {
    // 检查未输入的单词数量（不包括"还未掌握"的单词）
    let emptyCount = 0
    state.wordInputs.forEach(sentence => {
      sentence.forEach(word => {
        if (!word.isSkipped && !word.value.trim()) {
          emptyCount++
        }
      })
    })

    // 如果有未输入的单词，显示确认对话框
    if (emptyCount > 0) {
      setIncompleteCount(emptyCount)
      setShowIncompleteConfirm(true)
      return
    }

    // 没有未输入的单词，直接提交
    await doSubmit()
  }

  // 确认后继续提交
  const handleConfirmSubmit = async () => {
    setShowIncompleteConfirm(false)
    await doSubmit()
  }

  // 实际提交逻辑
  const doSubmit = async () => {
    setSubmitError(null)
    setIsSubmitting(true)

    try {
      // 准备提交数据
      const answers = (article.sentences || []).map((sentence, sentenceIndex) => {
        // 使用 parseSentenceTokens 解析句子，排除标点和缩写词
        const tokens = parseSentenceTokens(sentence.text_en)
        const correctWords = tokens
          .filter(t => t.type === 'word' && !t.skipInput)
          .map(t => t.text)

        const userWords = state.wordInputs[sentenceIndex].map(input => {
          if (input.isSkipped) return null
          return input.value || null
        })

        return {
          sentenceIndex,
          userWords,
          correctWords
        }
      })

      const response = await fetch('/api/speaker/dictation/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId: article.id,
          userId,
          answers,
          timeSpentSeconds: Math.floor((Date.now() - sessionStartTime) / 1000)  // 计算实际用时（秒）
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`)
      }

      if (data.success) {
        setGradingResult(data.result)
        setShowResultModal(true)  // 显示结果弹窗
      } else {
        setSubmitError(data.message || '提交失败，请重试')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      setSubmitError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  // 关闭结果弹窗
  const handleCloseResultModal = () => {
    setShowResultModal(false)
    setGradingResult(null)
  }

  // 手动保存草稿
  const handleSaveDraft = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/speaker/draft', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId: article.id,
          userId,
          draft: {
            wordInputs: state.wordInputs,
            activeSentenceIndex: state.activeSentenceIndex,
            skippedWords: state.wordInputs.flat().map((w, i) => w.isSkipped ? i : -1).filter(i => i >= 0),
            savedAt: new Date().toISOString()
          }
        })
      })

      if (response.ok) {
        setShowSaveSuccess(true)
        setTimeout(() => setShowSaveSuccess(false), 2000)
      } else {
        console.error('[Dictation] 保存草稿失败')
      }
    } catch (error) {
      console.error('[Dictation] 保存草稿异常:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-white transition-colors duration-300 flex flex-col" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      {/* 顶部导航栏 - Neo-Brutalism */}
      <div className="bg-white dark:bg-gray-800 border-b-[3px] border-black dark:border-gray-600 transition-colors duration-300">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* 返回按钮 + 标题 + 语速 */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push(`/speaker/timeline?id=${article.id}`)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-600 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666] hover:shadow-[2px_2px_0px_0px_#000] dark:hover:shadow-[2px_2px_0px_0px_#666] hover:-translate-y-0.5 text-sm font-black tracking-tight transition-all duration-150 text-black dark:text-white"
              >
                <ArrowLeft className="w-4 h-4" strokeWidth={2.5} />
                <span>返回</span>
              </button>

              <div>
                <h1 className="text-2xl md:text-3xl font-black tracking-tighter italic text-black dark:text-white transition-colors duration-300">
                  听写训练
                </h1>
                <p className="text-sm font-mono font-bold text-gray-600 dark:text-gray-400 mt-1 transition-colors duration-300 hidden sm:block">
                  {article.title}
                </p>
              </div>
            </div>

            {/* 语速调节 - PC端 */}
            <div className="hidden md:flex items-center gap-2">
              <span className="text-xs font-mono font-black text-gray-700 dark:text-gray-300">语速</span>
              <div className="flex gap-1">
                {[0.5, 0.8, 1.0, 1.2, 1.5].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => actions.setPlaybackRate(rate)}
                    className={`
                      px-3 py-1.5 text-xs font-mono font-black tracking-tight border-2 transition-all duration-150
                      ${actions.playbackRate === rate
                        ? 'bg-[#B4F416] text-black border-[#B4F416] shadow-[0_0_15px_rgba(180,244,22,0.4)]'
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-black dark:border-gray-600 hover:border-[#B4F416]'
                      }
                    `}
                  >
                    {rate}x
                  </button>
                ))}
              </div>

              {/* 历史记录按钮 - 右上角 */}
              <button
                onClick={() => router.push(`/speaker/dictation-history?id=${article.id}`)}
                className="ml-4 inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border-2 border-black dark:border-gray-600 shadow-[2px_2px_0px_0px_#000] dark:shadow-[2px_2px_0px_0px_#666] hover:shadow-[1px_1px_0px_0px_#000] dark:hover:shadow-[1px_1px_0px_0px_#666] hover:-translate-y-0.5 text-black dark:text-white text-sm font-black transition-all duration-150"
                title="查看历史记录"
              >
                <History className="w-4 h-4" strokeWidth={2.5} />
                <span>历史记录</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 主内容区：左右分栏布局 - 为底部固定栏留出空间 */}
      <div className="flex-1 max-w-[1800px] mx-auto w-full pb-24 px-4 sm:px-6 lg:px-8">
        {/* PC端：左右分栏（40%:60%） */}
        <div className="hidden md:flex md:h-[calc(100vh-220px)]">
          {/* 左栏：原文遮罩（40%） - 加粗黑框 */}
          <div className="w-2/5 border-r-[3px] border-black dark:border-gray-600 bg-white dark:bg-gray-800 transition-colors duration-300">
            <DictationLeftPanel
              sentences={article.sentences || []}
              sentenceMasks={state.sentenceMasks}
              globalMaskEnabled={state.globalMaskEnabled}
              activeSentenceIndex={state.activeSentenceIndex}
              isPlaying={state.isPlaying}
              currentPlayingSentence={state.currentPlayingSentence}
              onToggleGlobalMask={() => actions.setGlobalMaskEnabled(!state.globalMaskEnabled)}
              onPlaySentence={actions.playSentence}
              onPlayFromStart={actions.playSentenceFromStart}
              onSelectSentence={actions.setActiveSentence}
              onScrollToSentence={handleRightPanelScroll}
            />
          </div>

          {/* 右栏：输入流（60%） - 加粗黑框 */}
          <div className="w-3/5 border-l-[3px] border-black dark:border-gray-600 bg-white dark:bg-gray-800 transition-colors duration-300">
            <DictationRightPanel
              sentences={article.sentences || []}
              wordInputs={state.wordInputs}
              activeSentenceIndex={state.activeSentenceIndex}
              isPlaying={state.isPlaying}
              currentPlayingSentence={state.currentPlayingSentence}
              onUpdateWordInput={actions.updateWordInput}
              onMoveToNextWord={actions.moveToNextWord}
              onSkipWord={actions.skipWord}
              onUnskipWord={actions.unskipWord}
              onPlaySentence={actions.playSentence}
              onPlayFromStart={actions.playSentenceFromStart}
              onScrollToSentence={handleRightPanelScroll}
              onSentenceFocus={actions.setActiveSentence}  // 聚焦输入框时激活句子
              onClearSentence={actions.clearSentence}  // 新增：一键清除句子
              onCheckSentence={actions.checkSentence}  // 新增：检查句子对错
            />
          </div>
        </div>

        {/* 移动端：上下分栏（横向滚动） */}
        <div className="md:hidden flex flex-col h-[calc(100vh-200px)]">
          {/* 上半部分：原文遮罩（横向滚动卡片） */}
          <DictationLeftPanelMobile
            sentences={article.sentences || []}
            sentenceMasks={state.sentenceMasks}
            globalMaskEnabled={state.globalMaskEnabled}
            activeSentenceIndex={state.activeSentenceIndex}
            isPlaying={state.isPlaying}
            currentPlayingSentence={state.currentPlayingSentence}
            onToggleGlobalMask={() => actions.setGlobalMaskEnabled(!state.globalMaskEnabled)}
            onPlaySentence={actions.playSentence}
            onSelectSentence={actions.setActiveSentence}
            onScrollToSentence={handleRightPanelScroll}
          />

          {/* 下半部分：输入流（横向滚动） */}
          <DictationRightPanelMobile
            sentences={article.sentences || []}
            wordInputs={state.wordInputs}
            activeSentenceIndex={state.activeSentenceIndex}
            isPlaying={state.isPlaying}
            currentPlayingSentence={state.currentPlayingSentence}
            onUpdateWordInput={actions.updateWordInput}
            onMoveToNextWord={actions.moveToNextWord}
            onSkipWord={actions.skipWord}
            onUnskipWord={actions.unskipWord}
            onPlaySentence={actions.playSentence}
            onScrollToSentence={handleRightPanelScroll}
            onSentenceFocus={actions.setActiveSentence}  // 聚焦输入框时激活句子
          />
        </div>
      </div>

      {/* 草稿恢复提示弹窗 - Neo-Brutalism */}
      {showDraftPrompt && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-600 shadow-[8px_8px_0px_0px_#000] dark:shadow-[8px_8px_0px_0px_#666] p-8 max-w-md w-full transition-colors duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-[#B4F416] border-[3px] border-black flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-black" strokeWidth={2.5} />
              </div>
              <h3 className="text-xl font-black tracking-tight uppercase text-black dark:text-white transition-colors duration-300">
                发现有未完成的听写
              </h3>
            </div>

            <p className="text-sm font-sans font-bold text-gray-700 dark:text-gray-300 mb-8 transition-colors duration-300">
              检测到您之前有未提交的听写进度，是否继续？
            </p>

            <div className="flex gap-3">
              <button
                onClick={discardDraft}
                className="flex-1 px-6 py-3 bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-600 text-black dark:text-white font-black text-sm uppercase tracking-wider hover:shadow-[4px_4px_0px_0px_#000] dark:hover:shadow-[4px_4px_0px_0px_#666] hover:-translate-y-0.5 transition-all duration-150"
              >
                从头开始
              </button>
              <button
                onClick={resumeDraft}
                className="flex-1 px-6 py-3 bg-[#B4F416] border-[3px] border-black text-black font-black text-sm uppercase tracking-wider hover:shadow-[0_0_20px_#B4F416] transition-all duration-150"
              >
                继续听写
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 未完成确认弹窗 - Neo-Brutalism */}
      {showIncompleteConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-600 shadow-[8px_8px_0px_0px_#000] dark:shadow-[8px_8px_0px_0px_#666] p-8 max-w-md w-full transition-colors duration-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-amber-400 border-[3px] border-black flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-black" strokeWidth={2.5} />
              </div>
              <h3 className="text-xl font-black tracking-tight uppercase text-black dark:text-white transition-colors duration-300">
                检测到您还有 {incompleteCount} 个未听写的单词
              </h3>
            </div>

            <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              是否继续？
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-8">
              若继续，未听写的单词将加入生词本
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowIncompleteConfirm(false)}
                className="flex-1 px-6 py-3 bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-600 text-black dark:text-white font-black text-sm uppercase tracking-wider hover:shadow-[4px_4px_0px_0px_#000] dark:hover:shadow-[4px_4px_0px_0px_#666] hover:-translate-y-0.5 transition-all duration-150"
              >
                返回修改
              </button>
              <button
                onClick={handleConfirmSubmit}
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 bg-[#B4F416] border-[3px] border-black text-black font-black text-sm uppercase tracking-wider hover:shadow-[0_0_20px_#B4F416] transition-all duration-150 disabled:opacity-50"
              >
                {isSubmitting ? '提交中...' : '继续提交'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 底部固定栏 - 进度 + 保存 + 提交按钮 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t-[3px] border-black dark:border-gray-600 shadow-[0_-4px_0px_0px_rgba(0,0,0,0.1)] z-40">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* 进度指示器 */}
            <div className="flex items-center gap-2 px-3 py-2 bg-black dark:bg-gray-700 border-2 border-black dark:border-gray-600 shadow-[2px_2px_0px_0px_#000] dark:shadow-[2px_2px_0px_0px_#666]">
              <span className="text-[10px] font-mono font-black text-gray-400 hidden xs:inline">PROGRESS</span>
              <div className="text-base font-mono font-black text-[#B4F416]">
                {String(state.activeSentenceIndex + 1).padStart(2, '0')} / {String(article.sentences?.length || 0).padStart(2, '0')}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* 保存按钮 */}
              <button
                onClick={handleSaveDraft}
                disabled={isSaving}
                className={`
                  inline-flex flex-col items-center justify-center px-4 py-2.5 border-2 font-black text-sm tracking-wider uppercase transition-all duration-150 min-w-[100px]
                  ${showSaveSuccess
                    ? 'bg-green-500 text-white border-green-500'
                    : 'bg-white dark:bg-gray-800 text-black dark:text-white border-black dark:border-gray-600 hover:bg-[#B4F416] hover:text-black hover:border-[#B4F416] shadow-[2px_2px_0px_0px_#000] dark:shadow-[2px_2px_0px_0px_#666] hover:shadow-[1px_1px_0px_0px_#000]'
                  }
                  ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                {showSaveSuccess ? (
                  <>
                    <span className="flex items-center gap-1">
                      <Check className="w-4 h-4" strokeWidth={2.5} />
                      已保存
                    </span>
                    <span className="text-[10px] font-normal normal-case">下次继续</span>
                  </>
                ) : (
                  <>
                    <span className="flex items-center gap-1">
                      <Save className="w-4 h-4" strokeWidth={2.5} />
                      {isSaving ? '保存中...' : '临时保存'}
                    </span>
                    <span className="text-[10px] font-normal normal-case">下次继续</span>
                  </>
                )}
              </button>

              {/* 提交按钮 - 下一步 */}
              <button
                onClick={handleSubmit}
                disabled={state.isSubmitted || isSubmitting}
                className={`
                  inline-flex flex-col items-center justify-center px-6 py-2.5 border-2 font-black text-sm tracking-wider uppercase transition-all duration-150 min-w-[140px]
                  ${state.isSubmitted || isSubmitting
                    ? 'bg-gray-400 text-gray-600 border-gray-400 cursor-not-allowed'
                    : 'bg-black dark:bg-gray-800 text-white border-black dark:border-gray-600 hover:bg-[#B4F416] hover:text-black hover:border-[#B4F416] shadow-[2px_2px_0px_0px_#000] dark:shadow-[2px_2px_0px_0px_#666] hover:shadow-[4px_4px_0px_0px_#B4F416]'
                  }
                `}
              >
                <span className="flex items-center gap-1">
                  {isSubmitting ? '提交中...' : state.isSubmitted ? '✓ 已完成' : '下一步'}
                  {!state.isSubmitted && !isSubmitting && <ArrowRight className="w-4 h-4" strokeWidth={2.5} />}
                </span>
                <span className="text-[10px] font-normal normal-case">全文查错词</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 错误提示 - 工业风警告栏 */}
      {submitError && (
        <div className="fixed bottom-24 left-4 right-4 md:left-auto md:right-4 md:w-auto bg-red-500 border-[3px] border-black shadow-[4px_4px_0px_0px_#000] px-6 py-3 z-50">
          <p className="text-white font-black text-sm">
            ⚠️ {submitError}
          </p>
        </div>
      )}

      {/* 判分结果模态框 */}
      {gradingResult && showResultModal && (
        <DictationResultModal
          totalSentences={gradingResult.totalSentences}
          totalWords={gradingResult.totalWords}
          correctCount={gradingResult.correctCount}
          wrongCount={gradingResult.wrongCount}
          skippedCount={gradingResult.skippedCount}
          accuracyRate={gradingResult.accuracyRate}
          wrongWords={gradingResult.wrongWords}
          articleId={article.id}
          articleTitle={article.title}
          articleContent={article.sentences?.map(s => s.text_en).join('\n\n') || ''}
          userId={userId}
          onClose={handleCloseResultModal}
        />
      )}
    </div>
  )
}
