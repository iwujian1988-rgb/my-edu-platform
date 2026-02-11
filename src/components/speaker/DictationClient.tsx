/**
 * Step 2 听写训练 - 客户端组件
 *
 * 核心功能：
 * 1. 逐句听写练习
 * 2. 单词填空（30%-50% 掩码）
 * 3. 实时反馈和准确率计算
 * 4. 句子导航和进度追踪
 *
 * 参考：
 * - shangwenjie.md 第 2.4 节（听写训练逻辑）
 * - AI_DEVELOPMENT_GUIDE.md（5步实现法）
 */

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import type { SpeakerArticle, SpeakerSentence } from '@/types/speaker'
import { useSpeakerDictation } from '@/hooks/useSpeakerDictation'
import { SentenceMaskDisplay } from '@/components/speaker/SentenceMaskDisplay'
import { DictationControlPanel } from '@/components/speaker/DictationControlPanel'

interface DictationClientProps {
  article: SpeakerArticle
  sentences: SpeakerSentence[]
}

export function DictationClient({ article, sentences }: DictationClientProps) {
  const router = useRouter()

  // 使用听写训练 Hook
  const [state, actions] = useSpeakerDictation(
    sentences,
    article.level as 2 | 3,
    article.audio_url
  )

  // 返回时间轴
  const goToTimeline = () => {
    router.push(`/speaker/timeline?id=${article.id}`)
  }

  // 保存进度到服务器
  useEffect(() => {
    if (state.isCompleted) {
      saveProgress()
    }
  }, [state.isCompleted, state.currentSentenceIndex])

  const saveProgress = async () => {
    try {
      await fetch('/api/speaker/progress', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId: article.id,
          step2_last_sentence_index: state.currentSentenceIndex,
          step2_completed: state.currentSentenceIndex === sentences.length - 1
        })
      })
      console.log('[Step 2] 已保存进度')
    } catch (error) {
      console.error('[Step 2] 保存进度失败:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* 页面头部 */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* 返回按钮 */}
          <button
            onClick={goToTimeline}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>返回时间轴</span>
          </button>

          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
            听写训练
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {article.title}
          </p>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-8">
          {/* 说明卡片 */}
          <div className="p-6 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
              📝 听写训练说明
            </h2>
            <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
              <li>• 点击"播放句子"听取完整句子</li>
              <li>• 在填空处输入你听到的单词</li>
              <li>• 按 Enter 键或点击其他位置提交答案</li>
              <li>• 完成所有填空后，点击"下一句"继续</li>
              <li>• 遇到困难可点击眼睛图标查看提示</li>
            </ul>
          </div>

          {/* 当前句子编号 */}
          <div className="text-center">
            <span className="inline-block px-4 py-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium">
              句子 {state.currentSentenceIndex + 1} / {sentences.length}
            </span>
          </div>

          {/* 句子掩码显示 */}
          <SentenceMaskDisplay
            words={state.currentWords}
            isPlaying={state.isPlaying}
            isCompleted={state.isCompleted}
            onPlay={actions.playCurrentSentence}
            onWordFill={actions.handleWordFill}
            onReveal={actions.revealWord}
          />

          {/* 控制面板 */}
          <DictationControlPanel
            currentIndex={state.currentSentenceIndex}
            totalSentences={sentences.length}
            accuracy={state.accuracy}
            encouragement={state.encouragement}
            isCompleted={state.isCompleted}
            canGoNext={state.currentSentenceIndex < sentences.length - 1}
            canGoPrevious={state.currentSentenceIndex > 0}
            onNext={actions.nextSentence}
            onPrevious={actions.previousSentence}
            onReset={actions.resetCurrentSentence}
          />
        </div>
      </div>
    </div>
  )
}
