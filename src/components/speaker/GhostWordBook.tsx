/**
 * 魔鬼生词本 - 页面组件（重构版）
 *
 * 功能：
 * 1. 显示错词列表（包括答错和放弃的）
 * 2. 调用有道 API 显示音标和释义
 * 3. 原声回放（播放单词所在句）
 * 4. 上下文回溯（跳转到独立页面）
 * 5. 标记为"我已掌握"
 * 6. 筛选：按错误类型、收录时间
 * 7. 显示文章名称和收录日期
 */

'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Volume2, CheckCircle, BookOpen, ExternalLink, Filter, X, Pause, Play, BookText, ChevronLeft, Ban } from 'lucide-react'
import type { SpeakerGhostWord, SpeakerArticle } from '@/types/speaker'
import { toast } from 'sonner'
import { SpeakerSubPageLayout } from '@/components/speaker/SpeakerSubPageLayout'

// 词典数据类型
interface DictEntry {
  word: string
  phonetic?: string
  definition?: string
  definition_en?: string
  example_sentence?: string
  explanation?: string
  forms?: string
  synonyms?: string
  translations?: string[]
  _raw_exampleSentences?: Array<{ en: string; zh: string }>
  _raw_collocations?: Array<{ en: string; zh: string }>
}

interface GhostWordBookProps {
  userId: string
  articleId?: string  // 可选：从 URL 参数传入，自动筛选指定文章的生词
}

type ErrorTypeFilter = 'all' | 'wrong' | 'skipped'
type TimeFilter = 'all' | 'today' | 'week' | 'month'
type ArticleFilter = string | 'all'  // 'all' 或具体的 article_id
type WordAction = 'mastered' | 'ignored'
type GhostArticle = Pick<SpeakerArticle, 'id' | 'title'> & Partial<Pick<SpeakerArticle, 'language' | 'audio_url' | 'sentences' | 'json_data'>>

const TASK_BATCH_SIZE = 12
const ACTION_REMOVAL_DELAY_MS = 700

function hasLocalDictData(word: SpeakerGhostWord): boolean {
  return Boolean(word.definition || word.phonetic || word.example_sentence)
}

function createLocalDictEntry(word: SpeakerGhostWord): DictEntry {
  return {
    word: word.word,
    phonetic: word.phonetic || undefined,
    definition: word.definition || undefined,
    example_sentence: word.example_sentence || undefined
  }
}

function hasDictEntryContent(entry: DictEntry): boolean {
  return Boolean(entry.definition || entry.definition_en || entry.phonetic || entry.example_sentence)
}

function getPlayableAudioUrl(audioUrl: string): string {
  try {
    const url = new URL(audioUrl)
    if (url.hostname.endsWith('aliyuncs.com')) {
      return audioUrl
    }
  } catch {
    return audioUrl
  }

  return `/api/proxy-audio?url=${encodeURIComponent(audioUrl)}`
}

export function GhostWordBook({ userId, articleId }: GhostWordBookProps) {
  const router = useRouter()

  const [words, setWords] = useState<SpeakerGhostWord[]>([])
  const [loading, setLoading] = useState(true)
  const [articles, setArticles] = useState<Map<string, GhostArticle>>(new Map())
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState<string | null>(null)
  const [pendingWordActions, setPendingWordActions] = useState<Record<string, WordAction>>({})

  // 词典弹窗状态
  const [dictModal, setDictModal] = useState<{
    word: SpeakerGhostWord
    data: DictEntry | null
    loading: boolean
  } | null>(null)

  // 筛选状态 - 如果传入 articleId，默认按该文章筛选
  const [errorTypeFilter, setErrorTypeFilter] = useState<ErrorTypeFilter>('all')
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all')
  const [articleFilter, setArticleFilter] = useState<ArticleFilter>(articleId || 'all')
  const [showFilters, setShowFilters] = useState(true)  // 默认展示筛选面板

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [visibleWordLimit, setVisibleWordLimit] = useState(TASK_BATCH_SIZE)
  const step3CompletionSavedRef = useRef(false)

  const goToRecitation = () => {
    if (articleId) {
      router.push(`/speaker/steps/step3?id=${articleId}`)
    } else {
      router.push('/speaker')
    }
  }

  const markStep3WordsCompleted = useCallback(async () => {
    if (!articleId || step3CompletionSavedRef.current) return

    try {
      const response = await fetch('/api/speaker/progress', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId,
          step3_words_completed: true,
          status: 'in_progress'
        })
      })

      if (response.ok) {
        step3CompletionSavedRef.current = true
      }
    } catch (error) {
      console.error('[Ghost Word Book] 保存 Step 3 进度失败:', error)
    }
  }, [articleId])

  // 当 articleId prop 变化时更新筛选器
  useEffect(() => {
    if (articleId) {
      setArticleFilter(articleId)
    }
  }, [articleId])

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

  const getArticleForWord = async (articleId: string, requireFullArticle = false): Promise<GhostArticle | null> => {
    const cachedArticle = articles.get(articleId)
    const cachedSentences = cachedArticle?.sentences || cachedArticle?.json_data?.sentences || []
    const hasRequiredArticleData = cachedArticle?.language && (
      !requireFullArticle || (cachedArticle.audio_url && cachedSentences.length > 0)
    )

    if (cachedArticle && hasRequiredArticleData) {
      return cachedArticle
    }

    try {
      const res = await fetch(`/api/speaker/articles/${articleId}`)
      if (!res.ok) return cachedArticle || null
      const d = await res.json()
      if (d.article) {
        setArticles(prev => new Map(prev).set(articleId, d.article))
        console.log('[Ghost Word Book] ✅ 文章数据加载成功:', d.article.title)
        return d.article
      }
    } catch (err) {
      console.error('[Ghost Word Book] 文章加载失败:', articleId, err)
    }

    return cachedArticle || null
  }

  // 加载文章标题（独立的函数，放在useEffect之前）- 保留用于播放原声时按需加载完整文章信息
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

  // 加载生词列表（性能优化：分页加载 + 批量获取文章标题）
  useEffect(() => {
    const fetchWords = async () => {
      try {
        setLoading(true)
        // 性能优化：使用分页，初始只加载50条
        // 如果有 articleId，传递给后端进行筛选
        const articleIdParam = articleId ? `&articleId=${articleId}` : ''
        const response = await fetch(`/api/speaker/words?page=1&pageSize=50${articleIdParam}`)
        const data = await response.json()

        if (data.success) {
          setWords(data.words || [])
          setTotalCount(data.pagination?.totalCount || 0)
          setHasMore(data.pagination?.hasMore || false)
          setCurrentPage(1)

          if (articleId && (data.pagination?.totalCount || 0) === 0) {
            await markStep3WordsCompleted()
          }

          // 性能优化：直接使用API返回的articles映射，不再逐个请求
          if (data.articles) {
            const newArticlesMap = new Map<string, GhostArticle>()
            Object.entries(data.articles).forEach(([id, article]: [string, unknown]) => {
              newArticlesMap.set(id, article as GhostArticle)
            })
            setArticles(newArticlesMap)
            console.log('[Ghost Word Book] ✅ 批量获取文章标题:', newArticlesMap.size)
          }

          console.log('[Ghost Word Book] ✅ 生词列表加载成功，数量:', data.words?.length, '总数:', data.pagination?.totalCount)
        }
      } catch (error) {
        console.error('[Ghost Word Book] ❌ 获取生词失败:', error)
        toast.error('获取生词失败')
      } finally {
        setLoading(false)
      }
    }

    fetchWords()
     
  }, [userId, articleId, markStep3WordsCompleted])

  useEffect(() => {
    setVisibleWordLimit(TASK_BATCH_SIZE)
  }, [articleFilter, errorTypeFilter, timeFilter])

  // 加载更多生词
  const loadMoreWords = async () => {
    if (loadingMore || !hasMore) return

    try {
      setLoadingMore(true)
      const nextPage = currentPage + 1
      const articleIdParam = articleId ? `&articleId=${articleId}` : ''
      const response = await fetch(`/api/speaker/words?page=${nextPage}&pageSize=50${articleIdParam}`)
      const data = await response.json()

      if (data.success) {
        setWords(prev => [...prev, ...data.words])
        setCurrentPage(nextPage)
        setHasMore(data.pagination?.hasMore || false)

        // 合并新的文章标题
        if (data.articles) {
          setArticles(prev => {
            const newMap = new Map(prev)
            Object.entries(data.articles).forEach(([id, article]: [string, unknown]) => {
              newMap.set(id, article as SpeakerArticle)
            })
            return newMap
          })
        }

        console.log('[Ghost Word Book] ✅ 加载更多成功，新加载:', data.words?.length)
      }
    } catch (error) {
      console.error('[Ghost Word Book] ❌ 加载更多失败:', error)
      toast.error('内容暂时没有加载出来，请稍后再试')
    } finally {
      setLoadingMore(false)
    }
  }

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

  const visibleWords = useMemo(
    () => filteredWords.slice(0, visibleWordLimit),
    [filteredWords, visibleWordLimit]
  )
  const hiddenLocalWordsCount = Math.max(filteredWords.length - visibleWords.length, 0)
  const hasLocalFilters = errorTypeFilter !== 'all' || timeFilter !== 'all'
  const remainingWordCount = hasLocalFilters ? filteredWords.length : totalCount

  // 重新加载生词数据（提取为独立函数，消除重复代码）
  const reloadGhostWords = async () => {
    try {
      // 如果有 articleId，传递给后端进行筛选
      const articleIdParam = articleId ? `&articleId=${articleId}` : ''
      const response = await fetch(`/api/speaker/words?page=1&pageSize=50${articleIdParam}`)
      const data = await response.json()
      if (data.success) {
        setWords(data.words || [])
        setTotalCount(data.pagination?.totalCount || 0)
        setHasMore(data.pagination?.hasMore || false)
        setCurrentPage(1)

        // 更新文章标题
        if (data.articles) {
          const newArticlesMap = new Map<string, GhostArticle>()
          Object.entries(data.articles).forEach(([id, article]: [string, unknown]) => {
            newArticlesMap.set(id, article as GhostArticle)
          })
          setArticles(newArticlesMap)
        }
      }
    } catch (error) {
      console.error('[Ghost Word Book] 重新加载失败:', error)
      toast.error('内容暂时没有加载出来，请稍后再试')
    }
  }

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

      const article = await getArticleForWord(word.article_id, true)

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

      const audio = new Audio(getPlayableAudioUrl(article.audio_url))
      audioRef.current = audio

      audio.currentTime = word.start_time

      // 获取句子结束时间，用于限制播放范围
      const sentences = article.sentences || article.json_data?.sentences || []
      const sentence = sentences.find(s => s.sentence_index === word.sentence_id) || sentences[word.sentence_id]
      const endTime = sentence?.end_time

      // 使用 timeupdate 事件在到达结束时间时暂停
      if (endTime) {
        audio.ontimeupdate = () => {
          if (audio.currentTime >= endTime) {
            audio.pause()
            setIsPlaying(null)
            console.log('[Ghost Word Book] 句子播放完成，已暂停')
          }
        }
      }

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
        endTime: endTime,
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
    const localDictEntry = hasLocalDictData(word) ? createLocalDictEntry(word) : null

    // 已有入库释义时直接展示，在线词典只做后台刷新，避免用户卡在外部 API 上。
    setDictModal({ word, data: localDictEntry, loading: !localDictEntry })

    // 异步加载数据
    try {
      console.log('[Ghost Word Book] 查询词典:', word.word)

      const article = await getArticleForWord(word.article_id)
      const language = article?.language === 'fr' ? 'fr' : 'en'
      const response = await fetch('/api/speaker/dict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: word.word, language })
      })

      if (!response.ok) {
        throw new Error('词典查询失败')
      }

      const data = await response.json()

      if (data.success && data.entry && hasDictEntryContent(data.entry)) {
        console.log('[Ghost Word Book] ✅ 词典数据获取成功')
        setDictModal({ word, data: data.entry, loading: false })
        setWords(prev => prev.map(item => item.id === word.id
          ? {
              ...item,
              phonetic: data.entry.phonetic || item.phonetic,
              definition: data.entry.definition || item.definition,
              example_sentence: data.entry.example_sentence || item.example_sentence
            }
          : item
        ))
      } else if (localDictEntry) {
        setDictModal({ word, data: localDictEntry, loading: false })
      } else {
        throw new Error('词典数据为空')
      }
    } catch (error) {
      console.error('[Ghost Word Book] 查询词典失败:', error)
      if (localDictEntry) {
        setDictModal({ word, loading: false, data: localDictEntry })
        return
      }

      if (word.definition || word.phonetic || word.example_sentence) {
        toast.warning('在线词典暂时不可用，已显示本地缓存')
        setDictModal({
          word,
          loading: false,
          data: {
            word: word.word,
            phonetic: word.phonetic || undefined,
            definition: word.definition || undefined,
            example_sentence: word.example_sentence || undefined
          }
        })
        return
      }

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

  const restoreWord = async (word: SpeakerGhostWord) => {
    try {
      const response = await fetch(`/api/speaker/words?id=${word.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore' })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.message || '恢复失败')
      }

      setWords(prev => prev.some(item => item.id === word.id) ? prev : [word, ...prev])
      setPendingWordActions(prev => {
        const next = { ...prev }
        delete next[word.id]
        return next
      })
      setTotalCount(prev => prev + 1)
      step3CompletionSavedRef.current = false
      toast.success('已撤销，单词回到本轮任务')
    } catch (error) {
      console.error('[Ghost Word Book] 撤销失败:', error)
      toast.error('撤销失败，请刷新后重试')
      await reloadGhostWords()
    }
  }

  const completeWord = async (word: SpeakerGhostWord, action: WordAction) => {
    const remainingAfterAction = filteredWords.filter(item => item.id !== word.id).length

    setPendingWordActions(prev => ({ ...prev, [word.id]: action }))

    try {
      const response = await fetch(`/api/speaker/words?id=${word.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })

      const data = await response.json()

      if (!data.success) {
        setPendingWordActions(prev => {
          const next = { ...prev }
          delete next[word.id]
          return next
        })
        toast.error('操作失败，已恢复列表')
        await reloadGhostWords()
      } else if (data.step3WordsCompleted || remainingAfterAction === 0) {
        step3CompletionSavedRef.current = true
        toast.success('单词清理完成，可以进入跟读背诵', {
          action: {
            label: '进入',
            onClick: goToRecitation
          }
        })
      } else {
        toast.success(action === 'ignored' ? '已忽略这个词' : '已标记为掌握', {
          action: {
            label: '撤销',
            onClick: () => {
              void restoreWord(word)
            }
          }
        })
      }

      window.setTimeout(() => {
        setWords(prev => prev.filter(item => item.id !== word.id))
        setTotalCount(prev => Math.max(prev - 1, 0))
        setPendingWordActions(prev => {
          const next = { ...prev }
          delete next[word.id]
          return next
        })
      }, ACTION_REMOVAL_DELAY_MS)
    } catch (error) {
      console.error('[Ghost Word Book] 操作失败:', error)
      setPendingWordActions(prev => {
        const next = { ...prev }
        delete next[word.id]
        return next
      })
      toast.error('网络错误，已恢复列表')
      await reloadGhostWords()
    }
  }

  // 跳转到上下文查看页面
  const jumpToContext = (word: SpeakerGhostWord) => {
    router.push(`/speaker/word-context?wordId=${word.id}&from=ghost-words`)
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
    <SpeakerSubPageLayout userId={userId}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 顶部导航栏 - 黑底白字档案库风格 */}
      <div className="bg-black dark:bg-black border-b-4 border-black">
        <div className="max-w-6xl mx-auto px-6 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.push(articleId ? `/speaker/timeline?id=${articleId}` : '/speaker')}
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
                来自 Step 2 听写训练的错题 · 共 {totalCount} 个
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 筛选面板 - 粗黑边框控制面板 */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-800 border-y-2 border-black dark:border-gray-700">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              {/* 左侧筛选 */}
              <div className="flex w-full items-center gap-4 flex-wrap lg:w-auto">
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
              <div className="flex w-full items-center gap-2 lg:w-auto lg:ml-auto">
                <span className="text-sm text-black dark:text-white font-bold uppercase tracking-wide">文章:</span>
                <select
                  value={articleFilter}
                  onChange={(e) => setArticleFilter(e.target.value)}
                  className="min-w-0 flex-1 px-3 py-1 rounded-sm text-sm bg-white dark:bg-gray-700 border-2 border-black dark:border-gray-600 text-black dark:text-white font-medium hover:border-gray-600 dark:hover:border-gray-500 transition-colors focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-gray-500 lg:flex-none"
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
        {filteredWords.length > 0 && (
          <div className="mb-6 border-[3px] border-black dark:border-gray-700 bg-white dark:bg-gray-800 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666] p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-mono font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Step 3 · 搞懂单词
                </p>
                <h2 className="mt-1 text-xl sm:text-2xl font-black text-black dark:text-white">
                  还剩 {remainingWordCount} 个，本轮先清 {visibleWords.length} 个
                </h2>
              </div>
              {articleId && (
                <button
                  onClick={goToRecitation}
                  className="inline-flex items-center justify-center gap-2 border-2 border-black bg-[#B4F416] px-4 py-2 text-sm font-black text-black shadow-[3px_3px_0px_0px_#000] transition-all hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_0px_#000]"
                >
                  <span>清完后去跟读</span>
                  <ArrowLeft className="w-4 h-4 rotate-180" strokeWidth={3} />
                </button>
              )}
            </div>
          </div>
        )}

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
            {articleId && (
              <button
                onClick={goToRecitation}
                className="mt-6 inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#B4F416] text-black border-2 border-black font-black shadow-[4px_4px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5 transition-all"
              >
                <span>进入跟读背诵</span>
                <ArrowLeft className="w-4 h-4 rotate-180" strokeWidth={3} />
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {visibleWords.map((word) => {
                const pendingAction = pendingWordActions[word.id]
                return (
              <div
                key={word.id}
                className={`relative flex flex-col p-4 sm:p-6 md:p-8 rounded-sm bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-700 shadow-[4px_4px_0px_0px_#000] sm:shadow-[6px_6px_0px_0px_#000] dark:shadow-[6px_6px_0px_0px_#666] hover:shadow-[4px_4px_0px_0px_#B4F416] sm:hover:shadow-[6px_6px_0px_0px_#B4F416] dark:hover:shadow-[6px_6px_0px_0px_#84cc16] transition-all min-h-0 sm:min-h-[320px] ${
                  pendingAction ? 'opacity-75 translate-y-1' : ''
                }`}
              >
                {pendingAction && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/85 dark:bg-gray-900/85">
                    <div className="border-2 border-black bg-[#B4F416] px-4 py-2 text-sm font-black text-black shadow-[3px_3px_0px_0px_#000]">
                      {pendingAction === 'ignored' ? '正在忽略...' : '正在标记掌握...'}
                    </div>
                  </div>
                )}
                {/* 顶部：单词 + 查看上下文链接（左侧） + 标签（右侧） */}
                <div className="flex items-start justify-between mb-2 sm:mb-4">
                  <div className="flex-1">
                    <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-black dark:text-white font-mono tracking-tight mb-1 sm:mb-2">
                      {word.word}
                    </h3>
                    <button
                      onClick={() => jumpToContext(word)}
                      className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-bold text-black dark:text-white hover:text-[#B4F416] dark:hover:text-[#84cc16] transition-colors"
                    >
                      <span>查看上下文</span>
                      <span>→</span>
                    </button>
                  </div>

                  {/* 错误类型标签 - 方框标签 */}
                  <span className="px-2 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm font-bold uppercase border-2 border-black dark:border-gray-600 bg-white dark:bg-gray-700 text-black dark:text-white ml-2 sm:ml-4">
                    {word.error_type === 'wrong' ? '答错' : '放弃'}
                  </span>
                </div>

                {/* 音标 */}
                {word.phonetic && (
                  <p className="text-black dark:text-gray-300 font-mono text-sm sm:text-base mb-2 sm:mb-4 tracking-wide">
                    {word.phonetic}
                  </p>
                )}

                {/* 中文释义 */}
                {word.definition && (
                  <p className="text-black dark:text-gray-200 text-base sm:text-lg mb-2 sm:mb-4 font-medium leading-relaxed">
                    {word.definition}
                  </p>
                )}

                {/* 英文例句 - 限制2行 */}
                {word.example_sentence && (
                  <div className="mb-2 sm:mb-4 p-2 sm:p-4 bg-gray-50 dark:bg-gray-900 border-2 border-black dark:border-gray-700">
                    <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 line-clamp-2 leading-relaxed font-mono">
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
                      disabled={Boolean(pendingAction)}
                      className={`
                        flex-1 py-2 px-4 rounded-sm text-sm font-medium transition-all flex items-center justify-center gap-2 border-2 border-black dark:border-gray-600
                        ${isPlaying === word.id
                          ? 'bg-red-500 text-white hover:bg-red-600'
                          : 'bg-white dark:bg-gray-700 text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600'
                        }
                      `}
                      title={isPlaying === word.id ? '点击暂停' : '播放这个词所在句子的原声'}
                    >
                      {isPlaying === word.id ? (
                        <>
                          <Pause className="w-4 h-4 animate-pulse" />
                          <span>暂停</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-4 h-4" />
                          <span>所在句</span>
                        </>
                      )}
                    </button>

                    {/* 查看释义按钮 */}
                    <button
                      onClick={() => viewDict(word)}
                      disabled={Boolean(pendingAction)}
                      className="flex-1 py-2 px-4 rounded-sm bg-white dark:bg-gray-700 text-black dark:text-white text-sm font-medium border-2 border-black dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all flex items-center justify-center gap-2"
                    >
                      <BookText className="w-4 h-4" />
                      <span>释义</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <button
                      onClick={() => completeWord(word, 'mastered')}
                      disabled={Boolean(pendingAction)}
                      className="py-3 px-4 rounded-sm bg-black dark:bg-gray-700 text-white dark:text-gray-200 font-bold border-2 border-black dark:border-gray-600 hover:bg-[#B4F416] dark:hover:bg-[#84cc16] hover:text-black dark:hover:text-black transition-all flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-5 h-5" />
                      <span>我已掌握</span>
                    </button>
                    <button
                      onClick={() => completeWord(word, 'ignored')}
                      disabled={Boolean(pendingAction)}
                      className="w-12 py-3 rounded-sm bg-white dark:bg-gray-700 text-black dark:text-white font-bold border-2 border-black dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-all flex items-center justify-center"
                      title="忽略这个词"
                    >
                      <Ban className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
                )
              })}
          </div>

          {hiddenLocalWordsCount > 0 && (
            <div className="mt-8 text-center">
              <button
                onClick={() => setVisibleWordLimit(prev => prev + TASK_BATCH_SIZE)}
                className="px-8 py-3 bg-white dark:bg-gray-800 text-black dark:text-white font-bold border-2 border-black dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
              >
                显示下一批（还有 {hiddenLocalWordsCount} 个）
              </button>
            </div>
          )}

          {/* 加载更多按钮 */}
          {hasMore && hiddenLocalWordsCount === 0 && (
            <div className="mt-8 text-center">
              <button
                onClick={loadMoreWords}
                disabled={loadingMore}
                className="px-8 py-3 bg-black dark:bg-gray-700 text-white font-bold border-2 border-black dark:border-gray-600 hover:bg-[#B4F416] hover:text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingMore ? '加载中...' : `加载更多 (还有 ${totalCount - words.length} 个)`}
              </button>
            </div>
          )}
        </>
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

                  {dictModal.data.example_sentence && (
                    <div>
                      <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">
                        例句
                      </h3>
                      <p className="text-gray-900 dark:text-white leading-relaxed">
                        {dictModal.data.example_sentence}
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
    </SpeakerSubPageLayout>
  )
}
