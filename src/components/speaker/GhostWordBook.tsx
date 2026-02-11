/**
 * 魔鬼生词本 - 页面组件（重构版）
 *
 * 功能：
 * 1. 显示错词列表（包括答错和放弃的）
 * 2. 调用有道 API 显示音标和释义
 * 3. 原声回放（定位到具体单词）
 * 4. 上下文回溯（跳转到独立页面）
 * 5. 标记为"我已掌握"
 * 6. 筛选：按错误类型、收录时间
 * 7. 显示文章名称和收录日期
 */

'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Volume2, CheckCircle, BookOpen, ExternalLink, Filter, X, Pause, Play, BookText, ChevronLeft } from 'lucide-react'
import type { SpeakerGhostWord, SpeakerArticle } from '@/types/speaker'
import { toast } from 'sonner'

// 词典数据类型
interface DictEntry {
  word: string
  phonetic?: string
  definition?: string
  example_sentence?: string
  explanation?: string
  translations?: string[]
}

interface GhostWordBookProps {
  userId: string
}

type ErrorTypeFilter = 'all' | 'wrong' | 'skipped'
type TimeFilter = 'all' | 'today' | 'week' | 'month'
type ArticleFilter = string | 'all'  // 'all' 或具体的 article_id

export function GhostWordBook({ userId }: GhostWordBookProps) {
  const router = useRouter()

  const [words, setWords] = useState<SpeakerGhostWord[]>([])
  const [loading, setLoading] = useState(true)
  const [articles, setArticles] = useState<Map<string, SpeakerArticle>>(new Map())
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState<string | null>(null)

  // 词典弹窗状态
  const [dictModal, setDictModal] = useState<{
    word: SpeakerGhostWord
    data: DictEntry | null
    loading: boolean
  } | null>(null)

  // 筛选状态
  const [errorTypeFilter, setErrorTypeFilter] = useState<ErrorTypeFilter>('all')
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all')
  const [articleFilter, setArticleFilter] = useState<ArticleFilter>('all')
  const [showFilters, setShowFilters] = useState(true)  // 默认展示筛选面板

  // 清理音频资源
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  // 控制弹层打开时背景页面不滚动
  useEffect(() => {
    if (dictModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    // 组件卸载时恢复
    return () => {
      document.body.style.overflow = ''
    }
  }, [dictModal])

  // 加载文章标题（独立的函数，放在useEffect之前）
  const loadArticleTitle = async (articleId: string) => {
    if (articles.has(articleId)) return

    try {
      const res = await fetch(`/api/speaker/articles/${articleId}`)
      if (!res.ok) return
      const d = await res.json()
      if (d.article) {
        setArticles(prev => new Map(prev).set(articleId, d.article))
        console.log('[Ghost Word Book] ✅ 文章标题加载成功:', d.article.title)
      }
    } catch (err) {
      console.error('[Ghost Word Book] 文章加载失败:', articleId, err)
    }
  }

  // 加载生词列表（优化性能：立即显示界面，后台异步加载）
  useEffect(() => {
    const fetchWords = async () => {
      try {
        const response = await fetch(`/api/speaker/words?userId=${userId}&pageSize=1000`)
        const data = await response.json()

        if (data.success) {
          setWords(data.words || [])
          console.log('[Ghost Word Book] ✅ 生词列表加载成功，数量:', data.words?.length)
        }
      } catch (error) {
        console.error('[Ghost Word Book] ❌ 获取生词失败:', error)
        toast.error('获取生词失败')
      } finally {
        setLoading(false)
      }
    }

    fetchWords()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  // 单独的useEffect：当words加载完成后，异步加载文章标题
  useEffect(() => {
    if (words.length === 0) return

    const loadArticleTitles = async () => {
      const uniqueArticleIds = Array.from(new Set(words.map((w: SpeakerGhostWord) => w.article_id)))
      console.log('[Ghost Word Book] 准备加载', uniqueArticleIds.length, '个文章标题')

      // 使用更大的批次，加快加载速度
      const BATCH_SIZE = 20
      for (let i = 0; i < uniqueArticleIds.length; i += BATCH_SIZE) {
        const batch = uniqueArticleIds.slice(i, i + BATCH_SIZE)
        await Promise.all(batch.map(articleId => loadArticleTitle(articleId)))
        console.log(`[Ghost Word Book] 已加载 ${Math.min(i + BATCH_SIZE, uniqueArticleIds.length)}/${uniqueArticleIds.length} 个文章标题`)
      }
    }

    // 延迟执行，让界面先渲染
    const timer = setTimeout(() => {
      loadArticleTitles()
    }, 100)

    return () => clearTimeout(timer)
  }, [words])

  // 使用 useMemo 优化性能：避免每次渲染都重新筛选
  const filteredWords = useMemo(() => {
    let filtered = [...words]

    if (errorTypeFilter !== 'all') {
      filtered = filtered.filter(w => w.error_type === errorTypeFilter)
    }

    if (timeFilter !== 'all') {
      const now = new Date()
      const cutoffDate = new Date()

      if (timeFilter === 'today') {
        cutoffDate.setHours(0, 0, 0, 0)
      } else if (timeFilter === 'week') {
        cutoffDate.setDate(now.getDate() - 7)
      } else if (timeFilter === 'month') {
        cutoffDate.setMonth(now.getMonth() - 1)
      }

      filtered = filtered.filter(w => {
        const createdAt = new Date(w.created_at)
        return createdAt >= cutoffDate
      })
    }

    if (articleFilter !== 'all') {
      filtered = filtered.filter(w => w.article_id === articleFilter)
    }

    return filtered
  }, [words, errorTypeFilter, timeFilter, articleFilter])

  // 格式化日期
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return '今天'
    if (diffDays === 1) return '昨天'
    if (diffDays < 7) return `${diffDays} 天前`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} 周前`
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  }

  // 播放原声（TODO: 优化为定位到具体单词）
  const playOriginalAudio = async (word: SpeakerGhostWord) => {
    try {
      console.log('[Ghost Word Book] 播放原声:', word)

      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }

      setIsPlaying(word.id)

      let article = articles.get(word.article_id)
      if (!article) {
        const response = await fetch(`/api/speaker/articles/${word.article_id}`)

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: '请求失败' }))
          throw new Error(errorData.message || '获取文章失败')
        }

        const data = await response.json()

        if (!data.article) {
          throw new Error('文章数据不存在')
        }

        article = data.article
        setArticles(prev => new Map(prev).set(word.article_id, article))
      }

      if (!article || !article.audio_url) {
        toast.error('音频文件不存在')
        setIsPlaying(null)
        return
      }

      if (word.start_time === null) {
        toast.warning('该句子尚未添加时间戳，无法播放')
        setIsPlaying(null)
        return
      }

      const audio = new Audio(article.audio_url)
      audioRef.current = audio

      audio.currentTime = word.start_time

      // 🔧 修复：播放完整句子，不设置5秒限制
      // 只在播放自然结束时停止
      audio.onended = () => {
        console.log('[Ghost Word Book] 播放完成')
        setIsPlaying(null)
      }

      audio.onerror = () => {
        console.error('[Ghost Word Book] 音频播放失败')
        toast.error('音频播放失败')
        setIsPlaying(null)
      }

      await audio.play()
      console.log('[Ghost Word Book] ✅ 开始播放句子:', {
        url: article.audio_url,
        startTime: word.start_time,
        sentenceId: word.sentence_id
      })

    } catch (error) {
      console.error('[Ghost Word Book] 播放原声失败:', error)
      toast.error('播放失败，请重试')
      setIsPlaying(null)
    }
  }

  // 停止播放
  const stopOriginalAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setIsPlaying(null)
  }

  // 查看词典（实时调用有道API，优化体验：立即显示弹窗）
  const viewDict = async (word: SpeakerGhostWord) => {
    // 立即显示弹窗（loading状态）
    setDictModal({ word, data: null, loading: true })

    // 异步加载数据
    try {
      console.log('[Ghost Word Book] 查询词典:', word.word)

      const response = await fetch('/api/speaker/dict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: word.word })
      })

      if (!response.ok) {
        throw new Error('词典查询失败')
      }

      const data = await response.json()

      if (data.success && data.entry) {
        console.log('[Ghost Word Book] ✅ 词典数据获取成功')
        setDictModal({ word, data: data.entry, loading: false })
      } else {
        throw new Error('词典数据为空')
      }
    } catch (error) {
      console.error('[Ghost Word Book] 查询词典失败:', error)
      toast.error('查询词典失败，请重试')
      setDictModal(prev => prev ? { ...prev, loading: false } : null)
    }
  }

  // 关闭词典弹窗
  const closeDictModal = () => {
    setDictModal(null)
  }

  // 播放单词发音（使用有道TTS）
  const playWordAudio = (word: string) => {
    try {
      // 使用有道词典的TTS接口
      const audio = new Audio(`https://dict.youdao.com/dictvoice?type=2&audio=${encodeURIComponent(word)}`)
      audio.play()
      toast.success(`🔊 正在播放: ${word}`)
    } catch (error) {
      console.error('播放失败:', error)
      toast.error('播放失败，请重试')
    }
  }

  // 标记为已掌握（乐观更新：立即移除UI，后台异步更新）
  const markAsMastered = async (wordId: string) => {
    // 立即从UI移除，给用户即时反馈
    setWords(prev => prev.filter(w => w.id !== wordId))
    toast.success('✅ 已标记为掌握')

    // 后台异步更新，不阻塞UI
    try {
      const response = await fetch(`/api/speaker/words?id=${wordId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })

      const data = await response.json()

      if (!data.success) {
        // 如果后台更新失败，恢复数据
        toast.error('❌ 标记失败，已撤销')
        // 重新加载数据
        const reloadResponse = await fetch(`/api/speaker/words?userId=${userId}&pageSize=1000`)
        const reloadData = await reloadResponse.json()
        if (reloadData.success) {
          setWords(reloadData.words || [])
        }
      }
    } catch (error) {
      console.error('[Ghost Word Book] 标记失败:', error)
      toast.error('❌ 网络错误，已撤销')
      // 重新加载数据
      try {
        const reloadResponse = await fetch(`/api/speaker/words?userId=${userId}&pageSize=1000`)
        const reloadData = await reloadResponse.json()
        if (reloadData.success) {
          setWords(reloadData.words || [])
        }
      } catch (reloadError) {
        console.error('[Ghost Word Book] 重新加载失败:', reloadError)
      }
    }
  }

  // 跳转到上下文查看页面
  const jumpToContext = (word: SpeakerGhostWord) => {
    router.push(`/speaker/word-context?wordId=${word.id}`)
  }

  // 获取文章标题
  const getArticleTitle = (articleId: string) => {
    const article = articles.get(articleId)
    if (!article) {
      return articleId.slice(0, 8) + '...'
    }
    return article.title
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-black dark:text-white font-mono">加载中...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 顶部导航栏 - 黑底白字档案库风格 */}
      <div className="bg-black dark:bg-black border-b-4 border-black">
        <div className="max-w-6xl mx-auto px-6 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.push('/speaker')}
              className="w-10 h-10 flex items-center justify-center bg-white dark:bg-gray-800 border-2 border-black dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-black dark:text-white" strokeWidth={3} />
            </button>
            <span className="text-white text-sm font-medium">返回雯姐学习法首页</span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black text-white font-mono tracking-tight">
                魔鬼生词本
              </h1>
              <p className="text-gray-400 mt-1 font-mono text-sm">
                来自 Step 2 听写训练的错题 · 共 {filteredWords.length} 个
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 筛选面板 - 粗黑边框控制面板 */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-800 border-y-2 border-black dark:border-gray-700">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between flex-wrap">
              {/* 左侧筛选 */}
              <div className="flex items-center gap-4 flex-wrap">
                {/* 错误类型筛选 */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-black dark:text-white font-bold uppercase tracking-wide">类型:</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setErrorTypeFilter('all')}
                      className={`px-3 py-1 rounded-sm text-sm font-medium transition-all ${
                        errorTypeFilter === 'all'
                          ? 'bg-[#B4F416] text-black border-2 border-black'
                          : 'bg-white dark:bg-gray-700 text-black dark:text-white border-2 border-black dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }`}
                    >
                      全部
                    </button>
                    <button
                      onClick={() => setErrorTypeFilter('wrong')}
                      className={`px-3 py-1 rounded-sm text-sm font-medium transition-all ${
                        errorTypeFilter === 'wrong'
                          ? 'bg-[#B4F416] text-black border-2 border-black'
                          : 'bg-white dark:bg-gray-700 text-black dark:text-white border-2 border-black dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }`}
                    >
                      答错
                    </button>
                    <button
                      onClick={() => setErrorTypeFilter('skipped')}
                      className={`px-3 py-1 rounded-sm text-sm font-medium transition-all ${
                        errorTypeFilter === 'skipped'
                          ? 'bg-[#B4F416] text-black border-2 border-black'
                          : 'bg-white dark:bg-gray-700 text-black dark:text-white border-2 border-black dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }`}
                    >
                      放弃
                    </button>
                  </div>
                </div>

                {/* 时间筛选 */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-black dark:text-white font-bold uppercase tracking-wide">时间:</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setTimeFilter('all')}
                      className={`px-3 py-1 rounded-sm text-sm font-medium transition-all ${
                        timeFilter === 'all'
                          ? 'bg-[#B4F416] text-black border-2 border-black'
                          : 'bg-white dark:bg-gray-700 text-black dark:text-white border-2 border-black dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }`}
                    >
                      全部
                    </button>
                    <button
                      onClick={() => setTimeFilter('today')}
                      className={`px-3 py-1 rounded-sm text-sm font-medium transition-all ${
                        timeFilter === 'today'
                          ? 'bg-[#B4F416] text-black border-2 border-black'
                          : 'bg-white dark:bg-gray-700 text-black dark:text-white border-2 border-black dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }`}
                    >
                      今天
                    </button>
                    <button
                      onClick={() => setTimeFilter('week')}
                      className={`px-3 py-1 rounded-sm text-sm font-medium transition-all ${
                        timeFilter === 'week'
                          ? 'bg-[#B4F416] text-black border-2 border-black'
                          : 'bg-white dark:bg-gray-700 text-black dark:text-white border-2 border-black dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }`}
                    >
                      本周
                    </button>
                    <button
                      onClick={() => setTimeFilter('month')}
                      className={`px-3 py-1 rounded-sm text-sm font-medium transition-all ${
                        timeFilter === 'month'
                          ? 'bg-[#B4F416] text-black border-2 border-black'
                          : 'bg-white dark:bg-gray-700 text-black dark:text-white border-2 border-black dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }`}
                    >
                      本月
                    </button>
                  </div>
                </div>

                {/* 清除筛选 */}
                {(errorTypeFilter !== 'all' || timeFilter !== 'all' || articleFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setErrorTypeFilter('all')
                      setTimeFilter('all')
                      setArticleFilter('all')
                    }}
                    className="flex items-center gap-1 text-sm text-black dark:text-white font-bold hover:text-gray-600 dark:hover:text-gray-400"
                  >
                    <X className="w-4 h-4" />
                    <span>清除筛选</span>
                  </button>
                )}
              </div>

              {/* 右侧文章筛选 */}
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-sm text-black dark:text-white font-bold uppercase tracking-wide">文章:</span>
                <select
                  value={articleFilter}
                  onChange={(e) => setArticleFilter(e.target.value)}
                  className="px-3 py-1 rounded-sm text-sm bg-white dark:bg-gray-700 border-2 border-black dark:border-gray-600 text-black dark:text-white font-medium hover:border-gray-600 dark:hover:border-gray-500 transition-colors focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-gray-500"
                >
                  <option value="all">全部文章</option>
                  {Array.from(articles.entries()).map(([articleId, article]) => (
                    <option key={articleId} value={articleId}>
                      {article.title || articleId.slice(0, 8)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 主内容区 */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {filteredWords.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-4 rounded-sm bg-white dark:bg-gray-800 border-2 border-black dark:border-gray-700 flex items-center justify-center shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666]">
              <CheckCircle className="w-10 h-10 text-black dark:text-white" />
            </div>
            <h2 className="text-xl font-black text-black dark:text-white mb-2 font-mono">
              太棒了！
            </h2>
            <p className="text-black dark:text-gray-300 font-mono">
              {errorTypeFilter !== 'all' || timeFilter !== 'all' || articleFilter !== 'all'
                ? '没有符合条件的生词'
                : '你目前没有需要复习的生词'}
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredWords.map((word) => (
              <div
                key={word.id}
                className="flex flex-col p-8 rounded-sm bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-700 shadow-[6px_6px_0px_0px_#000] dark:shadow-[6px_6px_0px_0px_#666] hover:shadow-[6px_6px_0px_0px_#B4F416] dark:hover:shadow-[6px_6px_0px_0px_#84cc16] transition-all min-h-[320px]"
              >
                {/* 顶部：单词 + 查看上下文链接（左侧） + 标签（右侧） */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-4xl font-black text-black dark:text-white font-mono tracking-tight mb-2">
                      {word.word}
                    </h3>
                    <button
                      onClick={() => jumpToContext(word)}
                      className="flex items-center gap-2 text-sm font-bold text-black dark:text-white hover:text-[#B4F416] dark:hover:text-[#84cc16] transition-colors"
                    >
                      <span>查看上下文</span>
                      <span>→</span>
                    </button>
                  </div>

                  {/* 错误类型标签 - 方框标签 */}
                  <span className="px-3 py-1.5 text-sm font-bold uppercase border-2 border-black dark:border-gray-600 bg-white dark:bg-gray-700 text-black dark:text-white ml-4">
                    {word.error_type === 'wrong' ? '答错' : '放弃'}
                  </span>
                </div>

                {/* 音标 */}
                {word.phonetic && (
                  <p className="text-black dark:text-gray-300 font-mono text-base mb-4 tracking-wide">
                    {word.phonetic}
                  </p>
                )}

                {/* 中文释义 */}
                {word.definition && (
                  <p className="text-black dark:text-gray-200 text-lg mb-4 font-medium leading-relaxed">
                    {word.definition}
                  </p>
                )}

                {/* 英文例句 - 限制2行 */}
                {word.example_sentence && (
                  <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-900 border-2 border-black dark:border-gray-700">
                    <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2 leading-relaxed font-mono">
                      {word.example_sentence}
                    </p>
                  </div>
                )}

                {/* 来源信息 */}
                <div className="mb-auto flex items-center justify-between text-sm pb-4">
                  <span className="text-gray-500 dark:text-gray-400 font-mono">
                    {formatDate(word.created_at)}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400 font-mono truncate max-w-[150px]">
                    {getArticleTitle(word.article_id)}
                  </span>
                </div>

                {/* 底部按钮组 */}
                <div>
                  {/* 原声 & 释义 - 50%宽度并排 */}
                  <div className="flex gap-3 mb-3">
                    {/* 原声回放按钮 */}
                    <button
                      onClick={() => isPlaying === word.id ? stopOriginalAudio() : playOriginalAudio(word)}
                      className={`
                        flex-1 py-2 px-4 rounded-sm text-sm font-medium transition-all flex items-center justify-center gap-2 border-2 border-black dark:border-gray-600
                        ${isPlaying === word.id
                          ? 'bg-red-500 text-white hover:bg-red-600'
                          : 'bg-white dark:bg-gray-700 text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600'
                        }
                      `}
                      title={isPlaying === word.id ? '点击暂停' : '播放该单词所在句子的原声'}
                    >
                      {isPlaying === word.id ? (
                        <>
                          <Pause className="w-4 h-4 animate-pulse" />
                          <span>暂停</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-4 h-4" />
                          <span>原声</span>
                        </>
                      )}
                    </button>

                    {/* 查看释义按钮 */}
                    <button
                      onClick={() => viewDict(word)}
                      className="flex-1 py-2 px-4 rounded-sm bg-white dark:bg-gray-700 text-black dark:text-white text-sm font-medium border-2 border-black dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all flex items-center justify-center gap-2"
                    >
                      <BookText className="w-4 h-4" />
                      <span>释义</span>
                    </button>
                  </div>

                  {/* 我已掌握按钮 - 主按钮 */}
                  <button
                    onClick={() => markAsMastered(word.id)}
                    className="w-full py-3 px-4 rounded-sm bg-black dark:bg-gray-700 text-white dark:text-gray-200 font-bold border-2 border-black dark:border-gray-600 hover:bg-[#B4F416] dark:hover:bg-[#84cc16] hover:text-black dark:hover:text-black transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    <span>我已掌握</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 词典弹窗 */}
      {dictModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border-[3px] border-black dark:border-gray-600 shadow-[8px_8px_0px_0px_#000] dark:shadow-[8px_8px_0px_0px_#666] max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* 头部 */}
            <div className="px-6 py-4 border-b-[3px] border-black dark:border-gray-600 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800 z-10">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-black text-gray-900 dark:text-white">
                  {dictModal.word.word}
                </h2>
                {/* 音频播放按钮 */}
                <button
                  onClick={() => playWordAudio(dictModal.word.word)}
                  className="w-8 h-8 flex items-center justify-center bg-purple-600 hover:bg-purple-700 text-white rounded-lg border-2 border-purple-800 transition-all duration-150"
                  title="播放发音"
                >
                  <Volume2 className="w-4 h-4" strokeWidth={2.5} />
                </button>
                {dictModal.data?.phonetic && (
                  <p className="text-gray-600 dark:text-gray-400 font-mono text-sm">
                    [{dictModal.data.phonetic}]
                  </p>
                )}
              </div>
              <button
                onClick={closeDictModal}
                className="w-9 h-9 flex items-center justify-center bg-black dark:bg-gray-700 border-2 border-black dark:border-gray-600 text-white hover:bg-red-600 hover:border-red-600 transition-all duration-150"
                title="关闭"
              >
                <X className="w-5 h-5" strokeWidth={2.5} />
              </button>
            </div>

            {/* 内容 */}
            <div className="px-6 py-4">
              {dictModal.loading ? (
                <div className="py-12 text-center">
                  <div className="inline-block w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">正在查询词典...</p>
                </div>
              ) : dictModal.data ? (
                <div className="space-y-4">
                  {/* 词形变化 */}
                  {dictModal.data.forms && (
                    <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                      <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">
                        词形变化
                      </h3>
                      <p className="text-sm text-gray-900 dark:text-white font-mono">
                        {dictModal.data.forms}
                      </p>
                    </div>
                  )}

                  {/* 中文释义（所有词性） */}
                  {dictModal.data.definition && (
                    <div>
                      <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">
                        中文释义
                      </h3>
                      <p className="text-gray-900 dark:text-white leading-relaxed">
                        {dictModal.data.definition}
                      </p>
                    </div>
                  )}

                  {/* 英文释义 */}
                  {dictModal.data.definition_en && (
                    <div>
                      <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">
                        English Definition
                      </h3>
                      <p className="text-gray-900 dark:text-white leading-relaxed">
                        {dictModal.data.definition_en}
                      </p>
                    </div>
                  )}

                  {/* 同义词 */}
                  {dictModal.data.synonyms && (
                    <div>
                      <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">
                        同义词
                      </h3>
                      <p className="text-purple-700 dark:text-purple-300 leading-relaxed">
                        {dictModal.data.synonyms}
                      </p>
                    </div>
                  )}

                  {/* 例句（中英对照） */}
                  {dictModal.data._raw_exampleSentences && dictModal.data._raw_exampleSentences.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">
                        例句
                      </h3>
                      {dictModal.data._raw_exampleSentences.map((sent, idx) => (
                        <div key={idx} className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800">
                          <p className="text-gray-900 dark:text-white text-sm italic mb-1">
                            {sent.en}
                          </p>
                          <p className="text-gray-600 dark:text-gray-400 text-sm">
                            {sent.zh}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 搭配（中英对照） */}
                  {dictModal.data._raw_collocations && dictModal.data._raw_collocations.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">
                        常用搭配
                      </h3>
                      {dictModal.data._raw_collocations.map((col, idx) => (
                        <div key={idx} className="flex items-start gap-3 text-sm">
                          <span className="text-purple-700 dark:text-purple-300 font-medium">
                            {col.en}
                          </span>
                          <span className="text-gray-600 dark:text-gray-400">
                            {col.zh}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <p className="text-red-600 dark:text-red-400">查询失败，请重试</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
