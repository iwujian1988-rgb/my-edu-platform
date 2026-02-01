'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Edit, Trash2, GripVertical, Loader2, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Chapter {
  id: string
  title: string
  order_index: number
  word_count?: number
  is_default?: boolean
}

interface ChapterManagementDialogProps {
  isOpen: boolean
  onClose: () => void
  bookId: string
  bookTitle: string
  isOfficial: boolean
}

export function ChapterManagementDialog({
  isOpen,
  onClose,
  bookId,
  bookTitle,
  isOfficial
}: ChapterManagementDialogProps) {
  const router = useRouter()
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  // 创建/编辑章节状态
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null)
  const [newChapterTitle, setNewChapterTitle] = useState('')

  // 删除确认状态
  const [chapterToDelete, setChapterToDelete] = useState<Chapter | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // 获取章节列表
  const fetchChapters = async () => {
    try {
      setIsLoading(true)
      setError('')

      const response = await fetch(`/api/books/${bookId}/chapters?includeWordCount=true`)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '获取章节列表失败')
      }

      const data = await response.json()
      setChapters(data.data || [])
    } catch (err: any) {
      setError(err.message)
      console.error('Failed to fetch chapters:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchChapters()
    }
  }, [isOpen, bookId])

  // 创建章节
  const handleCreateChapter = async () => {
    if (!newChapterTitle.trim()) {
      setError('章节标题不能为空')
      return
    }

    if (newChapterTitle.length > 50) {
      setError('章节标题不能超过50个字符')
      return
    }

    setIsSaving(true)
    setError('')

    try {
      const response = await fetch(`/api/books/${bookId}/chapters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newChapterTitle.trim() })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '创建章节失败')
      }

      // 成功创建
      setNewChapterTitle('')
      setShowCreateForm(false)
      await fetchChapters() // 刷新列表

      // 刷新页面以更新筛选器
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  // 更新章节
  const handleUpdateChapter = async () => {
    if (!editingChapter) return

    if (!newChapterTitle.trim()) {
      setError('章节标题不能为空')
      return
    }

    if (newChapterTitle.length > 50) {
      setError('章节标题不能超过50个字符')
      return
    }

    setIsSaving(true)
    setError('')

    try {
      const response = await fetch(
        `/api/books/${bookId}/chapters/${editingChapter.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: newChapterTitle.trim() })
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '更新章节失败')
      }

      // 成功更新
      setNewChapterTitle('')
      setEditingChapter(null)
      await fetchChapters() // 刷新列表

      // 刷新页面以更新筛选器
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  // 删除章节
  const handleDeleteChapter = async () => {
    if (!chapterToDelete) return

    setIsSaving(true)
    setError('')

    try {
      const response = await fetch(
        `/api/books/${bookId}/chapters/${chapterToDelete.id}`,
        {
          method: 'DELETE'
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '删除章节失败')
      }

      // 成功删除
      setChapterToDelete(null)
      setShowDeleteConfirm(false)
      await fetchChapters() // 刷新列表

      // 刷新页面以更新筛选器
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  // 开始编辑章节
  const startEdit = (chapter: Chapter) => {
    if (chapter.is_default) {
      setError('默认章节不能编辑')
      return
    }
    setEditingChapter(chapter)
    setNewChapterTitle(chapter.title)
    setShowCreateForm(false)
  }

  // 开始删除章节
  const startDelete = (chapter: Chapter) => {
    if (chapter.is_default) {
      setError('默认章节不能删除')
      return
    }
    setChapterToDelete(chapter)
    setShowDeleteConfirm(true)
  }

  // 取消创建/编辑
  const cancelEdit = () => {
    setShowCreateForm(false)
    setEditingChapter(null)
    setNewChapterTitle('')
    setError('')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-900">章节管理</h2>
            <p className="text-sm text-slate-500 mt-1">{bookTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded transition-colors"
            disabled={isSaving}
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
        ) : (
          <>
            {/* Chapter List */}
            <div className="flex-1 overflow-y-auto p-6">
              {chapters.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <p>暂无章节</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {chapters.map((chapter, index) => (
                    <div
                      key={chapter.id}
                      className="flex items-center gap-3 p-3 bg-slate-50 rounded hover:bg-slate-100 transition-colors group"
                    >
                      {/* Drag Handle (visual only) */}
                      <GripVertical className="w-5 h-5 text-slate-400 cursor-grab" />

                      {/* Order Badge */}
                      <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-white rounded text-sm font-bold text-slate-700 border border-slate-200">
                        {index + 1}
                      </span>

                      {/* Chapter Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-900 truncate">
                            {chapter.title}
                          </h3>
                          {chapter.is_default && (
                            <span className="flex-shrink-0 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full">
                              默认
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {chapter.word_count || 0} 个单词
                        </p>
                      </div>

                      {/* Actions */}
                      {!isOfficial && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => startEdit(chapter)}
                            disabled={chapter.is_default || isSaving}
                            className="p-2 hover:bg-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="编辑章节"
                          >
                            <Edit className="w-4 h-4 text-slate-600" />
                          </button>
                          <button
                            onClick={() => startDelete(chapter)}
                            disabled={chapter.is_default || isSaving}
                            className="p-2 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="删除章节"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Create/Edit Form */}
            <div className="p-6 border-t border-slate-200 bg-slate-50">
              {showCreateForm || editingChapter ? (
                <div className="space-y-3">
                  <h3 className="font-semibold text-slate-900">
                    {editingChapter ? '编辑章节' : '创建新章节'}
                  </h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newChapterTitle}
                      onChange={(e) => setNewChapterTitle(e.target.value)}
                      placeholder="输入章节标题"
                      maxLength={50}
                      className="flex-1 px-4 py-2.5 border-2 border-slate-200 rounded focus:border-indigo-400 focus:outline-none"
                      autoFocus
                      disabled={isSaving}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          editingChapter ? handleUpdateChapter() : handleCreateChapter()
                        }
                      }}
                    />
                    <button
                      onClick={editingChapter ? handleUpdateChapter : handleCreateChapter}
                      disabled={isSaving || !newChapterTitle.trim()}
                      className="px-4 py-2.5 bg-indigo-600 text-white font-semibold rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          保存中...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          {editingChapter ? '更新' : '创建'}
                        </>
                      )}
                    </button>
                    <button
                      onClick={cancelEdit}
                      disabled={isSaving}
                      className="px-4 py-2.5 border-2 border-slate-200 text-slate-700 font-semibold rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      取消
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">
                    {newChapterTitle.length}/50 字符
                  </p>
                </div>
              ) : (
                !isOfficial && (
                  <button
                    onClick={() => {
                      setShowCreateForm(true)
                      setEditingChapter(null)
                      setNewChapterTitle('')
                      setError('')
                    }}
                    className="w-full px-4 py-2.5 bg-indigo-600 text-white font-semibold rounded hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    创建新章节
                  </button>
                )
              )}
            </div>
          </>
        )}

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && chapterToDelete && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded shadow-xl w-full max-w-md p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-2">确认删除章节</h3>
              <p className="text-sm text-slate-600 mb-4">
                您即将删除章节「{chapterToDelete.title}」。
                {chapterToDelete.word_count && chapterToDelete.word_count > 0 ? (
                  <>
                    该章节包含 <span className="font-semibold text-slate-900">{chapterToDelete.word_count}</span> 个单词，
                    这些单词将被移动到默认章节。
                  </>
                ) : (
                  '该章节为空章节。'
                )}
              </p>
              <p className="text-sm text-red-600 font-semibold mb-4">
                此操作不可撤销，确定要继续吗？
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false)
                    setChapterToDelete(null)
                  }}
                  disabled={isSaving}
                  className="flex-1 px-4 py-2.5 border-2 border-slate-200 text-slate-700 font-semibold rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleDeleteChapter}
                  disabled={isSaving}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white font-semibold rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      删除中...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      确认删除
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
