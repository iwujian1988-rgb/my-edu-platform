/**
 * 听写历史记录弹窗组件
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
import { X, TrendingUp, Clock, Target, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import type { SpeakerDictationSubmission } from '@/types/speaker'

/**
 * 答案条目类型（用于历史记录详情展示）
 */
interface AnswerEntry {
  userWords?: Array<string | null>
  correctWords?: string[]
}

interface DictationHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  articleId: string
  userId: string
}

export function DictationHistoryModal({
  isOpen,
  onClose,
  articleId,
  userId
}: DictationHistoryModalProps) {
  const [submissions, setSubmissions] = useState<SpeakerDictationSubmission[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedSubmissionId, setExpandedSubmissionId] = useState<string | null>(null)  // 展开的记录ID

  // 获取历史记录
  useEffect(() => {
    if (isOpen) {
      fetchHistory()
    }
  }, [isOpen, articleId, userId])

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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              听写历史记录
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              共 {submissions.length} 条记录
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto p-6">
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

                  {expandedSubmissionId === submission.id && submission.answers && (
                    <div className="mt-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm">
                      <p className="font-semibold text-gray-900 dark:text-white mb-2">答案详情:</p>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {Object.entries(submission.answers).map(([sentenceIndex, answer]: [string, AnswerEntry]) => (
                          <div key={sentenceIndex} className="flex gap-2">
                            <span className="text-gray-600 dark:text-gray-400">句子 {parseInt(sentenceIndex) + 1}:</span>
                            <span className="text-gray-900 dark:text-white">
                              {answer.userWords?.filter(w => w).join(', ') || '(未填写)'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full py-3 px-6 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}
