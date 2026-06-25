/**
 * 生词上下文查看 - 客户端组件
 */

'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Volume2, Play, Pause } from 'lucide-react'
import type { SpeakerGhostWord, SpeakerArticle, SpeakerSentence } from '@/types/speaker'
import { toast } from 'sonner'

interface WordContextClientProps {
  ghostWord: SpeakerGhostWord
  article: SpeakerArticle
  fromPage?: string  // 来源页面：'ghost-words' | 'step2' | 其他
}

export function WordContextClient({ ghostWord, article, fromPage = 'ghost-words' }: WordContextClientProps) {
  const router = useRouter()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  // 获取句子列表
  const sentences = article.json_data?.sentences || []

  // 验证句子数据（兼容 text 和 text_en 字段）
  const targetSentence = sentences[ghostWord.sentence_id]
  const hasValidSentence = targetSentence?.text_en || targetSentence?.text

  // 获取句子文本（优先使用 text_en，回退到 text）
  const getSentenceText = (sentence?: SpeakerSentence) => sentence?.text_en || sentence?.text || ''

  // 播放/暂停句子音频
  const togglePlayPause = async () => {
    // 如果已经有音频在播放，则暂停/继续
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      } else {
        await audioRef.current.play()
        setIsPlaying(true)
      }
      return
    }

    if (!article.audio_url) {
      console.error('[Word Context] 文章没有音频URL')
      toast.warning('该文章暂无音频')
      return
    }

    const startTime = ghostWord.start_time ?? 0

    try {
      setIsPlaying(true)

      const audio = new Audio(article.audio_url)
      audioRef.current = audio

      audio.addEventListener('error', (e) => {
        console.error('[Word Context] 音频加载失败:', e)
        toast.error('音频暂时播放不了，请稍后再试')
        setIsPlaying(false)
      })

      // 设置播放位置
      audio.currentTime = startTime

      audio.onended = () => {
        setIsPlaying(false)
      }

      // 开始播放
      await audio.play()
    } catch (error) {
      console.error('[Word Context] 播放失败:', error)
      toast.error(`播放失败: ${error instanceof Error ? error.message : '未知错误'}`)
      setIsPlaying(false)
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* 顶部导航 - Neo-Brutalism 风格 */}
      <div className="border-b-4 border-black dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-6 sm:px-6 lg:px-8 py-8">
          {/* 返回按钮 - 根据 fromPage 参数决定返回位置 */}
          <button
            onClick={() => {
              if (fromPage === 'step2') {
                router.push(`/speaker/steps/step2?id=${article.id}`)
              } else {
                router.push(`/speaker/ghost-words?articleId=${article.id}`)
              }
            }}
            className="w-12 h-12 flex items-center justify-center bg-white dark:bg-gray-800 border-3 border-black dark:border-gray-700 hover:bg-black dark:hover:bg-gray-700 hover:text-white transition-all mb-6"
          >
            <ArrowLeft className="w-6 h-6 text-current" strokeWidth={3} />
          </button>

          <h1 className="text-5xl font-black text-gray-900 dark:text-white mb-2">
            生词上下文
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            查看“{ghostWord.word}”在文章中的上下文
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* 单词信息卡片 */}
        <div className="p-4 sm:p-6 md:p-8 rounded-none bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-700 shadow-[4px_4px_0px_0px_#000] sm:shadow-[8px_8px_0px_0px_#666]">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-6xl font-black text-gray-900 dark:text-white font-mono tracking-tight">
                {ghostWord.word}
              </h2>
              {ghostWord.phonetic && (
                <p className="text-gray-600 dark:text-gray-400 font-mono text-lg mt-2">
                  {ghostWord.phonetic}
                </p>
              )}
            </div>
            {/* 黑底白字标签 */}
            <span className="px-4 py-2 text-sm font-bold uppercase border-2 border-black dark:border-gray-600 bg-black dark:bg-gray-700 text-white dark:text-gray-200">
              {ghostWord.error_type === 'wrong' ? '答错' : '放弃'}
            </span>
          </div>

          {ghostWord.definition && (
            <p className="text-gray-800 dark:text-gray-200 text-xl mb-6 leading-relaxed">
              {ghostWord.definition}
            </p>
          )}

          <div className="text-sm text-gray-500 dark:text-gray-400 font-mono">
            来自文章: {article.title}
          </div>
        </div>

        {/* 句子上下文卡片 */}
        <div className="p-8 rounded-none bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-700 shadow-[8px_8px_0px_0px_#000] dark:shadow-[8px_8px_0px_0px_#666]">
          <div className="flex items-center justify-between mb-6">
            {/* 标题前加黑色方块装饰 */}
            <h3 className="text-2xl font-black text-gray-900 dark:text-white flex items-center">
              <span className="w-4 h-4 bg-black dark:bg-white dark:border dark:border-gray-600 mr-3"></span>
              句子上下文
            </h3>
            {/* 播放按钮 - 黑底白字，hover荧光绿 */}
            <button
              onClick={togglePlayPause}
              className="flex items-center gap-2 px-6 py-3 border-2 border-black dark:border-gray-600 bg-black dark:bg-gray-700 text-white dark:text-gray-200 font-bold hover:bg-[#B4F416] dark:hover:bg-[#84cc16] hover:text-black transition-all"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-5 h-5" />
                  <span>暂停</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  <span>播放原声</span>
                </>
              )}
            </button>
          </div>

          {/* 高亮显示目标句子 - 浅灰背景 + 左侧4px粗黑竖线 */}
          {hasValidSentence ? (
            <div className="border-l-4 border-black dark:border-gray-600 pl-6 py-5 bg-gray-50 dark:bg-gray-900">
              <p className="text-xl leading-loose font-serif text-gray-900 dark:text-gray-100">
                {getSentenceText(targetSentence).split(/(\b\w+\b)/).map((part, index) => {
                  // 检查这部分是否是目标单词
                  const isTargetWord = part.trim().toLowerCase() === ghostWord.word.toLowerCase()

                  return (
                    <span
                      key={index}
                      className={isTargetWord
                        ? 'bg-[#B4F416] dark:bg-[#84cc16] px-2 font-bold border-b-4 border-black dark:border-gray-600'
                        : ''
                      }
                    >
                      {part}
                    </span>
                  )
                })}
              </p>
            </div>
          ) : (
            <div className="p-6 bg-red-50 dark:bg-red-900/20 border-2 border-red-500 dark:border-red-700 border-dashed">
              <p className="text-xl text-red-700 dark:text-red-400 font-bold">
                ⚠️ 无法找到句子数据（sentence_id: {ghostWord.sentence_id}）
              </p>
            </div>
          )}
        </div>

        {/* 完整段落卡片 */}
        <div className="p-8 rounded-none bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-700 shadow-[8px_8px_0px_0px_#000] dark:shadow-[8px_8px_0px_0px_#666]">
          {/* 标题前加黑色方块装饰 */}
          <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-6 flex items-center">
            <span className="w-4 h-4 bg-black dark:bg-white dark:border dark:border-gray-600 mr-3"></span>
            完整段落
          </h3>

          <div className="space-y-5">
            {sentences
              .filter((_, idx) => {
                // 显示目标句子前后各3句
                return Math.abs(idx - ghostWord.sentence_id) <= 3
              })
              .map((sentence, idx) => {
                const sentenceIndex = sentences.indexOf(sentence)
                const isTargetSentence = sentenceIndex === ghostWord.sentence_id

                // 获取句子文本
                const sentenceText = getSentenceText(sentence)

                // 跳过没有文本内容的句子
                if (!sentenceText) {
                  return (
                    <p
                      key={sentenceIndex}
                      className="text-base text-gray-400 dark:text-gray-600 italic"
                    >
                      [句子数据缺失]
                    </p>
                  )
                }

                return (
                  <p
                    key={sentenceIndex}
                    className={`text-lg leading-loose font-serif ${
                      isTargetSentence
                        ? 'p-5 font-bold border-2 border-dashed border-black dark:border-gray-600 bg-gray-50 dark:bg-gray-900'
                        : 'text-gray-800 dark:text-gray-200'
                    }`}
                  >
                    {sentenceText.split(/(\b\w+\b)/).map((part, wordIndex) => {
                      const isTargetWord = isTargetSentence && part.trim().toLowerCase() === ghostWord.word.toLowerCase()

                      return (
                        <span
                          key={wordIndex}
                          className={isTargetWord
                            ? 'bg-[#B4F416] dark:bg-[#84cc16] px-2 font-bold border-b-2 border-black dark:border-gray-600'
                            : ''
                          }
                        >
                          {part}
                        </span>
                      )
                    })}
                  </p>
                )
              })}
          </div>
        </div>

        {/* 继续学习按钮 */}
        <div className="flex justify-center">
          <button
            onClick={() => router.push(`/speaker/steps/step2?id=${article.id}`)}
            className="flex items-center gap-3 px-8 py-4 border-3 border-black dark:border-gray-700 bg-black dark:bg-gray-800 text-white dark:text-gray-200 font-black text-lg hover:bg-[#B4F416] dark:hover:bg-[#84cc16] hover:text-black transition-all"
          >
            <Play className="w-6 h-6" />
            <span>继续练习这篇文章</span>
          </button>
        </div>
      </div>
    </div>
  )
}
