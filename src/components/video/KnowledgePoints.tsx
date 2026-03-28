'use client'

/**
 * 知识点组件
 *
 * 左右分栏布局：左边视频标题列表，右边知识点内容
 * 设计风格：Neo-brutalism
 */

import { useState, useEffect } from 'react'
import {
  BookOpen,
  MessageSquare,
  Sparkles,
  Volume2,
  Loader2,
  Video,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface KnowledgeCard {
  id: string
  text: string
  translation: string
  partOfSpeech?: string
  example?: string
  exampleCn?: string
}

interface VideoKnowledge {
  video_id: string
  video_title: string
  thumbnail_url: string | null
  language: string
  words: KnowledgeCard[]
  phrases: KnowledgeCard[]
  expressions: KnowledgeCard[]
}

interface KnowledgeStats {
  videos: VideoKnowledge[]
  totals: {
    words: number
    phrases: number
    expressions: number
  }
}

// 骨架屏
function KnowledgeSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 border-[2px] lg:border-[3px] border-black dark:border-gray-600 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666] overflow-hidden animate-pulse">
      <div className="bg-[#B4F416] border-b-[2px] lg:border-b-[3px] border-black dark:border-gray-600 p-2 lg:p-3">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 lg:w-6 lg:h-6 bg-black/20" />
          <div className="h-4 lg:h-5 w-20 bg-black/20" />
        </div>
      </div>
      <div className="p-2 lg:p-3 space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-12 lg:h-14 bg-gray-200 dark:bg-gray-700 border-[2px] border-gray-300 dark:border-gray-600" />
        ))}
      </div>
    </div>
  )
}

// 知识点列表组件
function KnowledgeList({
  cards,
  language,
  emptyText
}: {
  cards: KnowledgeCard[]
  language: string
  emptyText: string
}) {
  const [playingId, setPlayingId] = useState<string | null>(null)
  const ttsCacheRef = useState<Map<string, string>>(new Map())

  const playAudio = async (text: string, cardId: string) => {
    if (playingId === cardId) return
    setPlayingId(cardId)

    try {
      // 检查缓存
      const cacheKey = `${language}:${text.toLowerCase()}`
      const cachedUrl = ttsCacheRef.current.get(cacheKey)

      if (cachedUrl) {
        const audio = new Audio(cachedUrl)
        audio.onended = () => setPlayingId(null)
        audio.onerror = () => setPlayingId(null)
        await audio.play()
        return
      }

      const res = await fetch(`/api/tts?text=${encodeURIComponent(text)}&type=2&language=${language}`)
      if (res.ok) {
        const blob = await res.blob()
        const audioUrl = URL.createObjectURL(blob)
        // 缓存音频 URL
        ttsCacheRef.current.set(cacheKey, audioUrl)
        const audio = new Audio(audioUrl)
        audio.onended = () => setPlayingId(null)
        audio.onerror = () => setPlayingId(null)
        await audio.play()
        return
      }
      // API 失败，回退浏览器 TTS
      if ('speechSynthesis' in window) {
        speechSynthesis.cancel()
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = language === 'fr' ? 'fr-FR' : language === 'en' ? 'en-US' : language
        utterance.rate = 0.8
        utterance.onend = () => setPlayingId(null)
        utterance.onerror = () => setPlayingId(null)
        speechSynthesis.speak(utterance)
        return
      }
    } catch {
      if ('speechSynthesis' in window) {
        speechSynthesis.cancel()
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = language === 'fr' ? 'fr-FR' : language === 'en' ? 'en-US' : language
        utterance.onend = () => setPlayingId(null)
        utterance.onerror = () => setPlayingId(null)
        speechSynthesis.speak(utterance)
        return
      }
    }
    setPlayingId(null)
  }

  if (cards.length === 0) {
    return (
      <div className="p-4 text-center">
        <span className="text-xs text-gray-400">{emptyText}</span>
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-700">
      {cards.slice(0, 20).map((card) => (
        <div
          key={card.id}
          className="p-2 lg:p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              {/* 单词/短语 + 词性 */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-xs lg:text-sm text-black dark:text-white">
                  {card.text}
                </span>
                {card.partOfSpeech && (
                  <span className="text-[9px] lg:text-[10px] px-1 py-0.5 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 font-mono">
                    {card.partOfSpeech}
                  </span>
                )}
              </div>
              {/* 翻译 */}
              <div className="text-[10px] lg:text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {card.translation}
              </div>
              {/* 例句 */}
              {card.example && (
                <div className="mt-1.5 p-1.5 lg:p-2 bg-gray-50 dark:bg-gray-700/50 border-l-2 border-[#B4F416]">
                <div className="text-[10px] lg:text-xs text-gray-700 dark:text-gray-300 italic">
                  {card.example}
                </div>
                {card.exampleCn && (
                  <div className="text-[9px] lg:text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                    {card.exampleCn}
                  </div>
                )}
              </div>
              )}
            </div>
            {/* 播放按钮 */}
            <button
              onClick={() => playAudio(card.text, card.id)}
              className={cn(
                'w-7 h-7 lg:w-8 lg:h-8 flex items-center justify-center border-[2px] border-black dark:border-gray-600 transition-all shrink-0 mt-1',
                playingId === card.id
                  ? 'bg-[#B4F416] animate-pulse'
                  : 'bg-gray-100 dark:bg-gray-600 hover:bg-[#B4F416]'
              )}
            >
              {playingId === card.id ? (
                <Loader2 className="w-3 h-3 lg:w-4 lg:h-4 animate-spin text-black" />
              ) : (
                <Volume2 className="w-3 h-3 lg:w-4 lg:h-4 text-black dark:text-white" />
              )}
            </button>
          </div>
        </div>
      ))}
      {cards.length > 20 && (
        <div className="p-2 text-center bg-gray-50 dark:bg-gray-700">
          <span className="text-[10px] text-gray-400 font-mono">
            +{cards.length - 20} more
          </span>
        </div>
      )}
    </div>
  )
}

// 主组件
export default function KnowledgePoints() {
  const [data, setData] = useState<KnowledgeStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'words' | 'phrases' | 'expressions'>('words')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/user/knowledge-stats')
        if (res.ok) {
          const json = await res.json()
          if (json.success) {
            setData(json.data)
            // 默认选中第一个视频
            if (json.data?.videos?.length > 0) {
              setSelectedVideoId(json.data.videos[0].video_id)
            }
          }
        }
      } catch (err) {
        console.error('[KnowledgePoints] Failed to fetch:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  if (isLoading) {
    return <KnowledgeSkeleton />
  }

  if (!data || data.videos.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 border-[2px] lg:border-[3px] border-black dark:border-gray-600 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666] overflow-hidden">
        <div className="bg-[#B4F416] border-b-[2px] lg:border-b-[3px] border-black dark:border-gray-600 p-2 lg:p-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 lg:w-6 lg:h-6 text-black" />
            <span className="font-black text-sm lg:text-base text-black">知识点</span>
          </div>
        </div>
        <div className="p-4 lg:p-6 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-xs lg:text-sm font-medium">
            暂无学习记录
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-[10px] lg:text-xs mt-1">
            开始学习视频，积累知识点吧！
          </p>
        </div>
      </div>
    )
  }

  const selectedVideo = data.videos.find(v => v.video_id === selectedVideoId)

  const tabs = [
    {
      key: 'words' as const,
      label: '词汇',
      icon: BookOpen,
      count: selectedVideo?.words.length || 0,
      bgActive: 'bg-blue-400',
    },
    {
      key: 'phrases' as const,
      label: '短语',
      icon: MessageSquare,
      count: selectedVideo?.phrases.length || 0,
      bgActive: 'bg-purple-400',
    },
    {
      key: 'expressions' as const,
      label: '地道',
      icon: Sparkles,
      count: selectedVideo?.expressions.length || 0,
      bgActive: 'bg-orange-400',
    },
  ]

  return (
    <div className="space-y-3">
      {/* 统计摘要 */}
      <div className="bg-white dark:bg-gray-800 border-[2px] lg:border-[3px] border-black dark:border-gray-600 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666] p-2 lg:p-3 flex items-center gap-3 lg:gap-4 flex-wrap">
        <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 border-[2px] border-black">
          <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span className="font-bold text-xs text-black dark:text-white">{data.totals.words}</span>
          <span className="text-[10px] text-gray-600 dark:text-gray-400">词汇</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 border-[2px] border-black">
          <MessageSquare className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
          <span className="font-bold text-xs text-black dark:text-white">{data.totals.phrases}</span>
          <span className="text-[10px] text-gray-600 dark:text-gray-400">短语</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 border-[2px] border-black">
          <Sparkles className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
          <span className="font-bold text-xs text-black dark:text-white">{data.totals.expressions}</span>
          <span className="text-[10px] text-gray-600 dark:text-gray-400">地道</span>
        </div>
      </div>

      {/* 左右分栏布局 */}
      <div className="bg-white dark:bg-gray-800 border-[2px] lg:border-[3px] border-black dark:border-gray-600 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666] overflow-hidden">
        <div className="flex flex-col md:flex-row">
          {/* 左侧：视频标题列表 */}
          <div className="w-full md:w-48 lg:w-56 shrink-0 border-b-[2px] md:border-b-0 md:border-r-[2px] border-black dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
            <div className="p-2 border-b-[2px] border-black dark:border-gray-600 bg-[#B4F416]">
              <span className="font-bold text-xs text-black">视频列表</span>
            </div>
            <div className="max-h-[200px] md:max-h-[400px] overflow-y-auto">
              {data.videos.map((video) => {
                const isSelected = selectedVideoId === video.video_id
                return (
                  <button
                    key={video.video_id}
                    onClick={() => setSelectedVideoId(video.video_id)}
                    className={cn(
                      'w-full flex items-center justify-between p-2 lg:p-3 text-left border-b border-gray-200 dark:border-gray-600 last:border-b-0 transition-colors',
                      isSelected
                        ? 'bg-white dark:bg-gray-800'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-600'
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className={cn(
                        'font-bold text-[11px] lg:text-xs truncate',
                        isSelected ? 'text-black dark:text-white' : 'text-gray-700 dark:text-gray-300'
                      )}>
                        {video.video_title}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-[9px] lg:text-[10px] font-mono">
                        <span className="text-blue-500">{video.words.length}</span>
                        <span className="text-gray-300">|</span>
                        <span className="text-purple-500">{video.phrases.length}</span>
                        <span className="text-gray-300">|</span>
                        <span className="text-orange-500">{video.expressions.length}</span>
                      </div>
                    </div>
                    {isSelected && (
                      <ChevronRight className="w-4 h-4 text-black dark:text-white shrink-0" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 右侧：知识点内容 */}
          <div className="flex-1 min-w-0">
            {selectedVideo ? (
              <>
                {/* 当前视频标题 */}
                <div className="p-2 lg:p-3 border-b-[2px] border-black dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4 text-black dark:text-white" />
                    <span className="font-bold text-xs lg:text-sm text-black dark:text-white truncate">
                      {selectedVideo.video_title}
                    </span>
                  </div>
                </div>

                {/* Tab 切换 */}
                <div className="flex border-b-[2px] border-black dark:border-gray-600">
                  {tabs.map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-1 py-2 text-[10px] lg:text-xs font-bold border-r-[2px] last:border-r-0 border-black dark:border-gray-600 transition-all',
                        activeTab === tab.key
                          ? cn(tab.bgActive, 'text-black')
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                      )}
                    >
                      <tab.icon className="w-3 h-3" />
                      <span>{tab.label}</span>
                      <span className="font-mono">({tab.count})</span>
                    </button>
                  ))}
                </div>

                {/* 知识点列表 */}
                <div className="max-h-[250px] md:max-h-[340px] overflow-y-auto">
                  <KnowledgeList
                    cards={selectedVideo[activeTab]}
                    language={selectedVideo.language}
                    emptyText={`暂无${tabs.find(t => t.key === activeTab)?.label}`}
                  />
                </div>
              </>
            ) : (
              <div className="p-8 text-center">
                <span className="text-xs text-gray-400">请选择视频</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
