'use client'

import { useState } from 'react'
import { Trash2, ArrowRight, Loader2, AlertCircle, CheckCircle } from 'lucide-react'

interface BatchActionBarProps {
  selectedCount: number
  onClear: () => void
  bookId: string
  chapters: Array<{ id: string; title: string }>
  onSuccess?: () => void
}

export function BatchActionBar({
  selectedCount,
  onClear,
  bookId,
  chapters,
  onSuccess
}: BatchActionBarProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [showMoveDialog, setShowMoveDialog] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [targetChapterId, setTargetChapterId] = useState<string>('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // 获取选中的单词ID列表（通过全局选择器）
  const getSelectedWordIds = (): string[] => {
    const checkboxes = document.querySelectorAll('.word-checkbox:checked') as NodeListOf<HTMLInputElement>
    return Array.from(checkboxes).map(cb => cb.value)
  }

  // 批量删除
  const handleBatchDelete = async () => {
    const wordIds = getSelectedWordIds()

    if (wordIds.length === 0) {
      setError('请先选择要删除的单词')
      return
    }

    if (wordIds.length > 100) {
      setError('每次最多删除100个单词')
      return
    }

    setIsProcessing(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/words/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wordIds })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '批量删除失败')
      }

      // 成功
      setSuccess(`成功删除 ${data.data.deleted} 个单词`)
      onClear()
      onSuccess?.()

      // 3秒后清除成功消息
      setTimeout(() => {
        setSuccess('')
        setShowDeleteConfirm(false)
      }, 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  // 批量移动
  const handleBatchMove = async () => {
    const wordIds = getSelectedWordIds()

    if (wordIds.length === 0) {
      setError('请先选择要移动的单词')
      return
    }

    if (wordIds.length > 100) {
      setError('每次最多移动100个单词')
      return
    }

    setIsProcessing(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/words/batch-move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wordIds,
          targetChapterId: targetChapterId || null
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '批量移动失败')
      }

      // 成功
      const chapterTitle = targetChapterId
        ? chapters.find(c => c.id === targetChapterId)?.title
        : '默认章节'

      setSuccess(`成功移动 ${data.data.moved} 个单词到「${chapterTitle}」`)
      onClear()
      setShowMoveDialog(false)
      onSuccess?.()

      // 3秒后清除成功消息
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  if (selectedCount === 0) return null

  return (
    <>
      {/* 批量操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t-2 border-slate-200 shadow-lg">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* 选中数量 */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-900">
                已选择 <span className="text-indigo-600">{selectedCount}</span> 个单词
              </span>
              <button
                onClick={onClear}
                className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
              >
                清除选择
              </button>
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center gap-3">
              {/* 错误消息 */}
              {error && (
                <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span className="text-sm text-red-600">{error}</span>
                </div>
              )}

              {/* 成功消息 */}
              {success && (
                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded">
                  <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span className="text-sm text-green-700">{success}</span>
                </div>
              )}

              {/* 批量移动按钮 */}
              <button
                onClick={() => {
                  setShowMoveDialog(true)
                  setError('')
                }}
                disabled={isProcessing}
                className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    处理中...
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-4 h-4" />
                    移动到章节
                  </>
                )}
              </button>

              {/* 批量删除按钮 */}
              <button
                onClick={() => {
                  setShowDeleteConfirm(true)
                  setError('')
                }}
                disabled={isProcessing}
                className="px-4 py-2 bg-red-600 text-white font-semibold rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    处理中...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    批量删除
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 移动到章节对话框 */}
      {showMoveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">移动到章节</h3>
            <p className="text-sm text-slate-600 mb-4">
              将选中的 {selectedCount} 个单词移动到：
            </p>
            <div className="space-y-2 mb-4">
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                选择目标章节
              </label>
              <select
                value={targetChapterId}
                onChange={(e) => setTargetChapterId(e.target.value)}
                disabled={isProcessing}
                className="w-full px-4 py-2.5 border-2 border-slate-200 rounded focus:border-indigo-400 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">默认章节</option>
                {chapters.map(chapter => (
                  <option key={chapter.id} value={chapter.id}>
                    {chapter.title}
                  </option>
                ))}
              </select>
            </div>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowMoveDialog(false)
                  setError('')
                  setTargetChapterId('')
                }}
                disabled={isProcessing}
                className="flex-1 px-4 py-2.5 border-2 border-slate-200 text-slate-700 font-semibold rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleBatchMove}
                disabled={isProcessing}
                className="flex-1 px-4 py-2.5 bg-indigo-600 text-white font-semibold rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    移动中...
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-4 h-4" />
                    确认移动
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认对话框 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded shadow-xl w-full max-w-md p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900 mb-2">确认批量删除</h3>
                <p className="text-sm text-slate-600 mb-4">
                  您即将删除选中的 <span className="font-semibold text-slate-900">{selectedCount}</span> 个单词。
                  此操作不可撤销，确定要继续吗？
                </p>
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false)
                      setError('')
                    }}
                    disabled={isProcessing}
                    className="flex-1 px-4 py-2.5 border-2 border-slate-200 text-slate-700 font-semibold rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleBatchDelete}
                    disabled={isProcessing}
                    className="flex-1 px-4 py-2.5 bg-red-600 text-white font-semibold rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        删除中...
                      </>
                    ) : (
                      '确认删除'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
