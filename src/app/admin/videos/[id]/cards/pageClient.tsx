'use client'

/**
 * 管理后台 - 卡片审核页面
 *
 * 对应 PRD: VIDEO_MODULE_PRD.md Section 5.11
 * - 审核列表：显示所有待审核/已审核卡片
 * - 快速审核：通过/不通过
 * - 编辑功能：修正 AI 生成错误
 * - 批量操作：一键全部通过
 */

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Sparkles,
  Trash2,
  Filter,
  Check,
  X,
  ChevronDown,
  Loader2,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// 类型定义
type CardType = 'word' | 'phrase' | 'expression' | 'exercise'

interface CardItem {
  id: string
  type: CardType
  content: string
  chinese_definition: string
  phonetic?: string
  part_of_speech?: string
  example_from_video?: string
  example_translation?: string
  context?: string
  context_translation?: string
  formula?: string
  meaning?: string
  usage_note?: string
  difficulty_level: number
  is_reviewed: boolean
  reviewed_at?: string
  created_at: string
}

interface CardStats {
  total: number
  reviewed: number
  pending: number
  by_type: {
    word: { total: number; pending: number }
    phrase: { total: number; pending: number }
    expression: { total: number; pending: number }
    exercise: { total: number; pending: number }
  }
}

interface VideoInfo {
  id: string
  title: string
  language: string
}

const CARD_TYPE_LABELS: Record<CardType, string> = {
  word: '单词',
  phrase: '短语',
  expression: '地道表达',
  exercise: '填空练习',
}

const CARD_TYPE_COLORS: Record<CardType, string> = {
  word: 'bg-blue-100 text-blue-700 border-blue-300',
  phrase: 'bg-purple-100 text-purple-700 border-purple-300',
  expression: 'bg-amber-100 text-amber-700 border-amber-300',
  exercise: 'bg-green-100 text-green-700 border-green-300',
}

export function CardReviewClient() {
  const params = useParams()
  const router = useRouter()
  const videoId = params.id as string

  // 状态
  const [video, setVideo] = useState<VideoInfo | null>(null)
  const [cards, setCards] = useState<CardItem[]>([])
  const [stats, setStats] = useState<CardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 筛选
  const [filterType, setFilterType] = useState<CardType | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'reviewed'>('pending')

  // 操作状态
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set())
  const [isBatchApproving, setIsBatchApproving] = useState(false)

  // 加载数据
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // 获取视频信息
      const videoRes = await fetch(`/api/admin/videos/${videoId}`)
      if (!videoRes.ok) throw new Error('获取视频信息失败')
      const videoData = await videoRes.json()
      setVideo(videoData.data)

      // 获取卡片数据
      const cardsRes = await fetch(`/api/admin/videos/${videoId}/cards`)
      if (!cardsRes.ok) throw new Error('获取卡片失败')
      const cardsData = await cardsRes.json()
      setCards(cardsData.data.cards)
      setStats(cardsData.data.stats)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [videoId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // 单个审核操作
  const handleReview = async (cardId: string, cardType: CardType, isReviewed: boolean) => {
    const key = `${cardType}-${cardId}`
    setUpdatingIds(prev => new Set(prev).add(key))

    try {
      const res = await fetch(`/api/admin/videos/${videoId}/cards`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: [{ id: cardId, type: cardType, is_reviewed: isReviewed }],
        }),
      })

      if (!res.ok) throw new Error('更新失败')

      // 更新本地状态
      setCards(prev =>
        prev.map(c =>
          c.id === cardId && c.type === cardType
            ? { ...c, is_reviewed: isReviewed }
            : c
        )
      )
      setStats(prev => {
        if (!prev) return prev
        const delta = isReviewed ? 1 : -1
        return {
          ...prev,
          reviewed: prev.reviewed + delta,
          pending: prev.pending - delta,
          by_type: {
            ...prev.by_type,
            [cardType]: {
              ...prev.by_type[cardType],
              pending: prev.by_type[cardType].pending - delta,
            },
          },
        }
      })
    } catch (err) {
      alert(err instanceof Error ? err.message : '操作失败')
    } finally {
      setUpdatingIds(prev => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }
  }

  // 删除卡片
  const handleDelete = async (cardId: string, cardType: CardType) => {
    if (!confirm('确定要删除这张卡片吗？此操作不可撤销。')) return

    const key = `${cardType}-${cardId}`
    setUpdatingIds(prev => new Set(prev).add(key))

    try {
      const res = await fetch(
        `/api/admin/videos/${videoId}/cards?cardId=${cardId}&cardType=${cardType}`,
        { method: 'DELETE' }
      )

      if (!res.ok) throw new Error('删除失败')

      // 更新本地状态
      setCards(prev => prev.filter(c => !(c.id === cardId && c.type === cardType)))
      setStats(prev => {
        if (!prev) return prev
        return {
          ...prev,
          total: prev.total - 1,
          pending: prev.pending - (cards.find(c => c.id === cardId && c.type === cardType)?.is_reviewed ? 0 : 1),
          by_type: {
            ...prev.by_type,
            [cardType]: {
              total: prev.by_type[cardType].total - 1,
              pending: prev.by_type[cardType].pending - (cards.find(c => c.id === cardId && c.type === cardType)?.is_reviewed ? 0 : 1),
            },
          },
        }
      })
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败')
    } finally {
      setUpdatingIds(prev => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }
  }

  // 批量通过所有待审核
  const handleBatchApprove = async () => {
    const pendingCards = filteredCards.filter(c => !c.is_reviewed)
    if (pendingCards.length === 0) {
      alert('没有待审核的卡片')
      return
    }

    if (!confirm(`确定要批量通过 ${pendingCards.length} 张待审核卡片吗？`)) return

    setIsBatchApproving(true)

    try {
      const res = await fetch(`/api/admin/videos/${videoId}/cards`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: pendingCards.map(c => ({
            id: c.id,
            type: c.type,
            is_reviewed: true,
          })),
        }),
      })

      if (!res.ok) throw new Error('批量审核失败')

      // 重新加载数据
      await fetchData()
    } catch (err) {
      alert(err instanceof Error ? err.message : '批量审核失败')
    } finally {
      setIsBatchApproving(false)
    }
  }

  // 筛选后的卡片
  const filteredCards = cards.filter(card => {
    if (filterType !== 'all' && card.type !== filterType) return false
    if (filterStatus === 'pending' && card.is_reviewed) return false
    if (filterStatus === 'reviewed' && !card.is_reviewed) return false
    return true
  })

  // 加载状态
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-green-500" />
          <p className="text-gray-600 dark:text-gray-400">加载中...</p>
        </div>
      </div>
    )
  }

  // 错误状态
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={() => router.push('/admin/videos')}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-800 border-2 border-black dark:border-gray-600 font-bold"
          >
            返回视频列表
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 顶部导航 */}
      <div className="bg-white dark:bg-gray-800 border-b-2 border-black dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/admin/videos"
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 border-2 border-black dark:border-gray-600"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-black">卡片审核</h1>
                {video && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {video.title}
                  </p>
                )}
              </div>
            </div>

            {/* 统计信息 */}
            {stats && (
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 border-2 border-black dark:border-gray-600">
                  <span className="font-bold">总计:</span>
                  <span>{stats.total}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 border-2 border-green-500 text-green-700 dark:text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  <span className="font-bold">已审:</span>
                  <span>{stats.reviewed}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 dark:bg-amber-900/30 border-2 border-amber-500 text-amber-700 dark:text-amber-400">
                  <Clock className="w-4 h-4" />
                  <span className="font-bold">待审:</span>
                  <span>{stats.pending}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* 工具栏 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {/* 类型筛选 */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value as CardType | 'all')}
                className="px-3 py-2 border-2 border-black dark:border-gray-600 bg-white dark:bg-gray-800 font-semibold text-sm"
              >
                <option value="all">全部类型</option>
                <option value="word">单词</option>
                <option value="phrase">短语</option>
                <option value="expression">地道表达</option>
                <option value="exercise">填空练习</option>
              </select>
            </div>

            {/* 状态筛选 */}
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as 'all' | 'pending' | 'reviewed')}
              className="px-3 py-2 border-2 border-black dark:border-gray-600 bg-white dark:bg-gray-800 font-semibold text-sm"
            >
              <option value="pending">待审核</option>
              <option value="reviewed">已审核</option>
              <option value="all">全部</option>
            </select>
          </div>

          {/* 批量操作 */}
          <div className="flex items-center gap-3">
            {/* 批量通过 */}
            {stats && stats.pending > 0 && (
              <button
                onClick={handleBatchApprove}
                disabled={isBatchApproving}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 font-bold border-2 border-black dark:border-gray-600 transition-colors",
                  isBatchApproving
                    ? "bg-gray-100 dark:bg-gray-700 text-gray-400"
                    : "bg-green-400 hover:bg-green-500 text-black"
                )}
              >
                {isBatchApproving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    处理中...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    一键全部通过 ({stats.pending})
                  </>
                )}
              </button>
            )}

            {/* 完成审核，返回工作流 */}
            <button
              onClick={() => router.push(`/admin/videos/new?step=5&videoId=${videoId}`)}
              className="flex items-center gap-2 px-4 py-2 font-bold bg-blue-400 hover:bg-blue-500 text-black border-2 border-black dark:border-gray-600 transition-colors"
            >
              <ChevronDown className="w-4 h-4 rotate-180" />
              完成审核，继续工作流
            </button>
          </div>
        </div>

        {/* 卡片列表 */}
        {filteredCards.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 border-2 border-black dark:border-gray-600">
            <Sparkles className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              {filterStatus === 'pending' ? '没有待审核的卡片' : '没有符合条件的卡片'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCards.map(card => {
              const isUpdating = updatingIds.has(`${card.type}-${card.id}`)

              return (
                <div
                  key={`${card.type}-${card.id}`}
                  className={cn(
                    "bg-white dark:bg-gray-800 border-2 transition-all",
                    card.is_reviewed
                      ? "border-green-300 dark:border-green-700"
                      : "border-black dark:border-gray-600"
                  )}
                >
                  {/* 卡片头部 */}
                  <div className="flex items-center justify-between px-4 py-3 border-b-2 border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "px-2 py-0.5 text-xs font-bold border-2",
                        CARD_TYPE_COLORS[card.type]
                      )}>
                        {CARD_TYPE_LABELS[card.type]}
                      </span>
                      <span className="font-bold text-lg">{card.content}</span>
                      {card.phonetic && (
                        <span className="text-gray-500 dark:text-gray-400 text-sm font-mono">
                          /{card.phonetic}/
                        </span>
                      )}
                      {card.part_of_speech && (
                        <span className="text-gray-500 dark:text-gray-400 text-sm">
                          {card.part_of_speech}
                        </span>
                      )}
                    </div>

                    {/* 状态标签 */}
                    <div className="flex items-center gap-2">
                      {card.is_reviewed ? (
                        <span className="flex items-center gap-1 px-2 py-1 text-xs font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-2 border-green-300 dark:border-green-700">
                          <CheckCircle className="w-3 h-3" />
                          已审核
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-2 py-1 text-xs font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-2 border-amber-300 dark:border-amber-700">
                          <Clock className="w-3 h-3" />
                          待审核
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 卡片内容 */}
                  <div className="p-4 space-y-3">
                    {/* 释义 */}
                    <div>
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400">中文释义</span>
                      <p className="text-base font-semibold">{card.chinese_definition}</p>
                    </div>

                    {/* 例句（来自视频） */}
                    {card.example_from_video && (
                      <div className="bg-gray-50 dark:bg-gray-700/50 p-3 border-l-4 border-green-500">
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400">视频例句</span>
                        <p className="text-sm mt-1 italic">"{card.example_from_video}"</p>
                        {card.example_translation && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            → {card.example_translation}
                          </p>
                        )}
                      </div>
                    )}

                    {/* 上下文（短语/表达） */}
                    {card.context && !card.example_from_video && (
                      <div>
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400">上下文</span>
                        <p className="text-sm">{card.context}</p>
                        {card.context_translation && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            → {card.context_translation}
                          </p>
                        )}
                      </div>
                    )}

                    {/* 表达卡片额外信息 */}
                    {card.type === 'expression' && (
                      <>
                        {card.formula && (
                          <div>
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">句式</span>
                            <p className="text-sm font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 inline-block">
                              {card.formula}
                            </p>
                          </div>
                        )}
                        {card.meaning && (
                          <div>
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">含义</span>
                            <p className="text-sm">{card.meaning}</p>
                          </div>
                        )}
                        {card.usage_note && (
                          <div>
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">用法说明</span>
                            <p className="text-sm">{card.usage_note}</p>
                          </div>
                        )}
                      </>
                    )}

                    {/* 难度等级 */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400">难度</span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(level => (
                          <div
                            key={level}
                            className={cn(
                              "w-4 h-4 border-2",
                              level <= card.difficulty_level
                                ? "bg-green-500 border-green-600"
                                : "bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                            )}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex items-center justify-end gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-t-2 border-gray-100 dark:border-gray-700">
                    {card.is_reviewed ? (
                      <button
                        onClick={() => handleReview(card.id, card.type, false)}
                        disabled={isUpdating}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-2 border-amber-300 dark:border-amber-700 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors disabled:opacity-50"
                      >
                        {isUpdating ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <X className="w-4 h-4" />
                        )}
                        取消审核
                      </button>
                    ) : (
                      <button
                        onClick={() => handleReview(card.id, card.type, true)}
                        disabled={isUpdating}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm font-bold bg-green-400 hover:bg-green-500 text-black border-2 border-black transition-colors disabled:opacity-50"
                      >
                        {isUpdating ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        通过审核
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(card.id, card.type)}
                      disabled={isUpdating}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-2 border-red-300 dark:border-red-700 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50"
                    >
                      {isUpdating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                      删除
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
