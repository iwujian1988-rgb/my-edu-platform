/**
 * 听写历史记录页面组件
 *
 * 严格按照三个文档实现：
 * - shangwenjie.md 第 2.4 节 F（训练结果页 - 历史切片入口）
 * - TECHNICAL_MODIFICATION_PLAN.md（技术方案）
 * - AI_DEVELOPMENT_GUIDE.md（开发指南）
 *
 * 核心功能：
 * 1. 显示该文章的所有听写记录
 * 2. 时间切片对比（展示进步曲线）
 * 3. 查看某次提交的详细内容
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, TrendingUp, Clock, Target, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import type { SpeakerDictationSubmission } from '@/types/speaker'

interface DictationHistoryPageProps {
  userId: string
  articleId: string
}

export function DictationHistoryPage({ userId, articleId }: DictationHistoryPageProps) {
  const router = useRouter()

  const [submissions, setSubmissions] = useState<SpeakerDictationSubmission[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedSubmissionId, setExpandedSubmissionId] = useState<string | null>(null)

  // 获取历史记录
  useEffect(() => {
    if (articleId) {
      fetchHistory()
    }
  }, [articleId])

  const fetchHistory = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/speaker/dictation/history?articleId=${articleId}&userId=${userId}`
      )
      const data = await response.json()

      if (data.success) {
        setSubmissions(data.submissions)
      } else {
        setError(data.message || '获取历史记录失败')
      }
    } catch (err) {
      console.error('[Dictation History] 获取失败:', err)
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  // 格式化时间
  const formatTime = (isoString: string) => {
    const date = new Date(isoString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes} 分钟前`
    if (hours < 24) return `${hours} 小时前`
    if (days < 7) return `${days} 天前`

    return date.toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* 顶部导航栏 */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => router.push(articleId ? `/speaker/steps/step2?id=${articleId}` : '/speaker')}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-3 flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>返回听写训练</span>
          </button>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            听写历史记录
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            共 {submissions.length} 条记录
          </p>
        </div>
      </div>

      {/* 内容区 */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={fetchHistory}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              重试
            </button>
          </div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              暂无历史记录
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              完成第一次听写后，这里会显示你的进步曲线
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 进步概览卡片 */}
            {submissions.length > 1 && (
              <div className="p-4 rounded-xl bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <span className="font-bold text-gray-900 dark:text-white">
                    进步趋势
                  </span>
                </div>

                {(() => {
                  const latest = submissions[0]
                  const earliest = submissions[submissions.length - 1]
                  const accuracyImprovement = (latest.accuracy_rate || 0) - (earliest.accuracy_rate || 0)

                  return (
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      {accuracyImprovement > 0 ? (
                        <span>正确率提升了 <strong className="text-green-600">+{accuracyImprovement.toFixed(1)}%</strong></span>
                      ) : accuracyImprovement < 0 ? (
                        <span>正确率下降了 <strong className="text-red-600">{accuracyImprovement.toFixed(1)}%</strong></span>
                      ) : (
                        <span>正确率保持不变</span>
                      )}
                      <span className="mx-2">·</span>
                      <span>从 {earliest.accuracy_rate?.toFixed(1)}% → {latest.accuracy_rate?.toFixed(1)}%</span>
                    </div>
                  )
                })()}
              </div>
            )}

            {/* 历史记录列表 */}
            {submissions.map((submission, index) => (
              <div
                key={submission.id}
                className={`
                  p-4 rounded-xl border-2 transition-all
                  ${index === 0
                    ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                  }
                `}
              >
                {/* 标题行 */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {index === 0 && (
                      <span className="px-2 py-1 text-xs font-bold rounded bg-blue-600 text-white">
                        最新
                      </span>
                    )}
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {formatTime(submission.created_at)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      {submission.accuracy_rate?.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* 统计数据 */}
                <div className="grid grid-cols-3 gap-3">
                  {/* 正确数 */}
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">正确</div>
                      <div className="font-bold text-green-900 dark:text-green-100">
                        {submission.correct_count}
                      </div>
                    </div>
                  </div>

                  {/* 错误数 */}
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                    <div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">错误</div>
                      <div className="font-bold text-red-900 dark:text-red-100">
                        {submission.wrong_count}
                      </div>
                    </div>
                  </div>

                  {/* 放弃数 */}
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                    <div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">放弃</div>
                      <div className="font-bold text-yellow-900 dark:text-yellow-100">
                        {submission.skipped_count}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 详细数据（可折叠） */}
                <button
                  onClick={() => setExpandedSubmissionId(
                    expandedSubmissionId === submission.id ? null : submission.id
                  )}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-2"
                >
                  {expandedSubmissionId === submission.id ? '收起详情' : '查看详情'}
                </button>

                {expandedSubmissionId === submission.id && (
                  <div className="mt-3 space-y-3">
                    {/* 判断是否有错误（优先使用统计数据，因为 wrong_words 可能不完整） */}
                    {(submission.wrong_count || 0) + (submission.skipped_count || 0) > 0 ? (
                      /* 有错误或放弃 */
                      <>
                        {/* 错误单词列表 */}
                        {submission.wrong_words && submission.wrong_words.length > 0 ? (
                          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                            <div className="flex items-center gap-2 mb-2">
                              <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                              <span className="font-semibold text-red-900 dark:text-red-100 text-sm">
                                错误单词 ({submission.wrong_words.length})
                              </span>
                            </div>
                            <div className="space-y-1 max-h-48 overflow-y-auto">
                              {submission.wrong_words.map((wrongWord, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-2 text-sm p-2 rounded bg-white dark:bg-red-900/30 border border-red-100 dark:border-red-800"
                                >
                                  <span className="text-gray-600 dark:text-gray-400 text-xs">
                                    句子 {wrongWord.sentenceIndex + 1}
                                  </span>
                                  <span className="text-red-600 dark:text-red-400 font-medium line-through">
                                    {wrongWord.userInput || '(空)'}
                                  </span>
                                  <span className="text-gray-400">→</span>
                                  <span className="text-green-600 dark:text-green-400 font-medium">
                                    {wrongWord.correctWord}
                                  </span>
                                  <span className="ml-auto px-2 py-0.5 text-xs rounded bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-300">
                                    {wrongWord.errorType === 'wrong' ? '错误' : '放弃'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          /* 有错误但 wrong_words 数据不完整 */
                          <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                              <span className="font-semibold text-yellow-900 dark:text-yellow-100 text-sm">
                                详细错误数据未保存
                              </span>
                            </div>
                            <div className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                              此记录创建时未保存详细错误信息
                            </div>
                          </div>
                        )}

                        {/* 统计摘要 */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2 rounded bg-gray-100 dark:bg-gray-700">
                            <div className="text-gray-600 dark:text-gray-400">用时</div>
                            <div className="font-semibold text-gray-900 dark:text-white">
                              {Math.floor(submission.time_spent_seconds / 60)} 分 {submission.time_spent_seconds % 60} 秒
                            </div>
                          </div>
                          <div className="p-2 rounded bg-gray-100 dark:bg-gray-700">
                            <div className="text-gray-600 dark:text-gray-400">平均速度</div>
                            <div className="font-semibold text-gray-900 dark:text-white">
                              {submission.total_words > 0
                                ? Math.round(submission.time_spent_seconds / submission.total_words)
                                : 0} 秒/词
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      /* 真的全部正确 */
                      <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                          <span className="font-semibold text-green-900 dark:text-green-100 text-sm">
                            全部正确！太棒了！
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                          <div className="p-2 rounded bg-green-100 dark:bg-green-800">
                            <div className="text-green-700 dark:text-green-300">用时</div>
                            <div className="font-semibold text-green-900 dark:text-green-100">
                              {Math.floor(submission.time_spent_seconds / 60)} 分 {submission.time_spent_seconds % 60} 秒
                            </div>
                          </div>
                          <div className="p-2 rounded bg-green-100 dark:bg-green-800">
                            <div className="text-green-700 dark:text-green-300">平均速度</div>
                            <div className="font-semibold text-green-900 dark:text-green-100">
                              {submission.total_words > 0
                                ? Math.round(submission.time_spent_seconds / submission.total_words)
                                : 0} 秒/词
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
