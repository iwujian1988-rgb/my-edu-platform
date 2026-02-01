'use client'

import { useState, useEffect, useMemo } from 'react'
import { Search, Filter, ChevronDown, Edit, Save, X, Loader2, AlertCircle } from 'lucide-react'
import { stripHtmlTags } from '@/lib/utils/text'

interface Word {
  id: string
  word: string
  phonetic: string
  uk_phonetic: string
  us_phonetic: string
  definition: string
  definition_en: string
  part_of_speech: string
  collocation: string
  collocation_en: string
  example_sentence: string
  example_sentence_en: string
  theme: string
  scene: string
  chapter_id: string | null
  chapter?: string
  order_index: number
}

interface Chapter {
  id: string
  title: string
}

interface WordTableEditorProps {
  bookId: string
  chapters: Chapter[]
  onWordUpdated?: () => void
  onWordDeleted?: () => void
}

export function WordTableEditor({
  bookId,
  chapters,
  onWordUpdated,
  onWordDeleted
}: WordTableEditorProps) {
  // 状态
  const [words, setWords] = useState<Word[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // 分页状态
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [totalWords, setTotalWords] = useState(0)

  // 筛选状态
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedChapterId, setSelectedChapterId] = useState<string>('')
  const [showChapterFilter, setShowChapterFilter] = useState(false)

  // 编辑状态
  const [editingWordId, setEditingWordId] = useState<string | null>(null)
  const [editingData, setEditingData] = useState<Partial<Word>>({})
  const [isSaving, setIsSaving] = useState(false)

  // 获取单词列表
  const fetchWords = async () => {
    try {
      setIsLoading(true)
      setError('')

      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString()
      })

      if (selectedChapterId) {
        params.append('chapterId', selectedChapterId)
      }

      if (searchQuery) {
        params.append('search', searchQuery)
      }

      const response = await fetch(`/api/books/${bookId}/words?${params}`)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '获取单词列表失败')
      }

      const data = await response.json()
      setWords(data.data || [])
      setTotalWords(data.total || 0)
    } catch (err: any) {
      setError(err.message)
      console.error('Failed to fetch words:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchWords()
  }, [page, selectedChapterId, searchQuery])

  // 开始编辑
  const startEdit = (word: Word) => {
    setEditingWordId(word.id)
    setEditingData({
      ...word,
      // 清理例句中的 HTML 标签，避免编辑时显示 <b> 等标签
      example_sentence: stripHtmlTags(word.example_sentence),
      example_sentence_en: stripHtmlTags(word.example_sentence_en)
    })
  }

  // 取消编辑
  const cancelEdit = () => {
    setEditingWordId(null)
    setEditingData({})
  }

  // 保存编辑
  const saveEdit = async () => {
    if (!editingWordId) return

    setIsSaving(true)
    setError('')

    try {
      const response = await fetch(`/api/words/${editingWordId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '更新单词失败')
      }

      // 成功更新 - 立即更新本地状态
      setWords(prevWords =>
        prevWords.map(word =>
          word.id === editingWordId
            ? {
                ...word,
                ...data.data,
                // 如果修改了章节，需要更新章节标题
                chapter: editingData.chapter_id
                  ? chapters.find(c => c.id === editingData.chapter_id)?.title || '默认章节'
                  : word.chapter
              }
            : word
        )
      )

      setEditingWordId(null)
      setEditingData({})
      onWordUpdated?.()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  // 删除单词
  const deleteWord = async (wordId: string) => {
    if (!confirm('确定要删除这个单词吗？')) return

    setIsSaving(true)
    setError('')

    try {
      const response = await fetch(`/api/words/${wordId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '删除单词失败')
      }

      // 成功删除 - 立即从本地状态中移除
      setWords(prevWords => prevWords.filter(word => word.id !== wordId))
      setTotalWords(prev => Math.max(0, prev - 1))
      onWordDeleted?.()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  // 更新编辑数据
  const updateEditingData = (field: keyof Word, value: string | null) => {
    setEditingData(prev => ({ ...prev, [field]: value }))
  }

  // 渲染例句（过滤 HTML 标签）
  const renderExampleSentence = (word: Word) => {
    const isEditing = editingWordId === word.id
    const text = word.example_sentence || ''

    if (isEditing) {
      return (
        <input
          type="text"
          value={editingData.example_sentence || ''}
          onChange={(e) => updateEditingData('example_sentence', e.target.value)}
          className="w-full px-2 py-1 border-2 border-indigo-300 rounded focus:border-indigo-500 focus:outline-none text-sm"
        />
      )
    }

    return (
      <span className="text-sm text-slate-700">
        {stripHtmlTags(text) || '-'}
      </span>
    )
  }

  // 分页
  const totalPages = Math.ceil(totalWords / pageSize)

  // 渲染输入框或文本
  const renderCell = (word: Word, field: keyof Word, className: string = '') => {
    const isEditing = editingWordId === word.id

    if (isEditing) {
      return (
        <input
          type="text"
          value={editingData[field] || ''}
          onChange={(e) => updateEditingData(field, e.target.value)}
          className={`w-full px-2 py-1 border-2 border-indigo-300 rounded focus:border-indigo-500 focus:outline-none text-sm ${className}`}
          autoFocus={field === 'word'}
        />
      )
    }

    return (
      <span className={`text-sm text-slate-700 ${className}`}>
        {word[field] || '-'}
      </span>
    )
  }

  return (
    <div className="bg-white rounded shadow-sm border border-slate-200 overflow-hidden">
      {/* 工具栏 */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center gap-4">
          {/* 搜索框 */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setPage(1)
              }}
              placeholder="搜索单词..."
              className="w-full pl-10 pr-4 py-2 border-2 border-slate-200 rounded focus:border-indigo-400 focus:outline-none"
            />
          </div>

          {/* 章节筛选 */}
          <div className="relative">
            <button
              onClick={() => setShowChapterFilter(!showChapterFilter)}
              className="flex items-center gap-2 px-4 py-2 border-2 border-slate-200 rounded hover:border-indigo-300 transition-colors"
            >
              <Filter className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-semibold text-slate-700">
                {selectedChapterId
                  ? chapters.find(c => c.id === selectedChapterId)?.title || '已选择章节'
                  : '全部章节'}
              </span>
              <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${showChapterFilter ? 'rotate-180' : ''}`} />
            </button>

            {showChapterFilter && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowChapterFilter(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded shadow-xl border border-slate-200 z-20 max-h-80 overflow-y-auto">
                  <button
                    onClick={() => {
                      setSelectedChapterId('')
                      setShowChapterFilter(false)
                    }}
                    className="w-full px-4 py-3 text-left text-sm font-semibold hover:bg-slate-50 transition-colors"
                  >
                    全部章节
                  </button>
                  {chapters.map(chapter => (
                    <button
                      key={chapter.id}
                      onClick={() => {
                        setSelectedChapterId(chapter.id)
                        setShowChapterFilter(false)
                        setPage(1)
                      }}
                      className="w-full px-4 py-3 text-left text-sm font-semibold hover:bg-slate-50 transition-colors"
                    >
                      {chapter.title}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* 表格 */}
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
        ) : words.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <p>没有找到符合条件的单词</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">序号</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">单词</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">音标</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">词性</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">中文释义</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">英文释义</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">搭配</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">例句</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">章节</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider w-32">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {words.map((word, index) => (
                <tr key={word.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {(page - 1) * pageSize + index + 1}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {renderCell(word, 'word')}
                  </td>
                  <td className="px-4 py-3">
                    {renderCell(word, 'phonetic', 'font-mono text-xs')}
                  </td>
                  <td className="px-4 py-3">
                    {renderCell(word, 'part_of_speech')}
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    {renderCell(word, 'definition')}
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    {renderCell(word, 'definition_en')}
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    {renderCell(word, 'collocation')}
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    {renderExampleSentence(word)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {editingWordId === word.id ? (
                      <select
                        value={editingData.chapter_id || ''}
                        onChange={(e) => updateEditingData('chapter_id', e.target.value || null)}
                        className="px-2 py-1 border-2 border-indigo-300 rounded focus:border-indigo-500 focus:outline-none text-sm"
                      >
                        <option value="">默认章节</option>
                        {chapters.map(chapter => (
                          <option key={chapter.id} value={chapter.id}>
                            {chapter.title}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-slate-700">{word.chapter || '默认章节'}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingWordId === word.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={saveEdit}
                          disabled={isSaving}
                          className="p-1.5 bg-green-100 text-green-600 rounded hover:bg-green-200 transition-colors disabled:opacity-50"
                          title="保存"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={cancelEdit}
                          disabled={isSaving}
                          className="p-1.5 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors disabled:opacity-50"
                          title="取消"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(word)}
                        className="p-1.5 bg-indigo-100 text-indigo-600 rounded hover:bg-indigo-200 transition-colors"
                        title="编辑"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-slate-200 flex items-center justify-between">
          <div className="text-sm text-slate-600">
            显示 {((page - 1) * pageSize + 1)}-{Math.min(page * pageSize, totalWords)} / 共 {totalWords} 个单词
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 border-2 border-slate-200 text-sm font-semibold text-slate-700 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              上一页
            </button>
            <span className="text-sm font-bold text-slate-900 px-3 py-1.5 bg-slate-100 rounded">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 bg-indigo-600 text-white text-sm font-semibold rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
