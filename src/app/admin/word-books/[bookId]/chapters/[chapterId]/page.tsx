'use client'

/**
 * 章节详情和单词管理页面
 */

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  BookOpen,
} from 'lucide-react'

interface Word {
  id: string
  word: string
  phonetic: string | null
  definition: string | null
  example: string | null
  order_index: number
  created_at: string
}

interface Chapter {
  id: string
  title: string
  description: string | null
  order_index: number
  word_count: number
}

const PAGE_SIZE = 20

export default function ChapterDetailPage() {
  const router = useRouter()
  const params = useParams()
  const bookId = params.bookId as string
  const chapterId = params.chapterId as string

  const [loading, setLoading] = useState(true)
  const [chapter, setChapter] = useState<Chapter | null>(null)
  const [words, setWords] = useState<Word[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [deleting, setDeleting] = useState(false)

  // 获取章节详情和单词列表
  useEffect(() => {
    fetchData()
  }, [chapterId, currentPage, searchKeyword])

  const fetchData = async () => {
    try {
      setLoading(true)

      // 并行获取章节信息和单词列表
      const [chapterRes, wordsRes] = await Promise.all([
        fetch(`/api/admin/word-books/${bookId}/chapters/${chapterId}`),
        fetch(
          `/api/admin/word-books/${bookId}/words?chapterId=${chapterId}&page=${currentPage}&pageSize=${PAGE_SIZE}&search=${searchKeyword}`
        ),
      ])

      if (!chapterRes.ok) {
        throw new Error('获取章节信息失败')
      }

      if (!wordsRes.ok) {
        throw new Error('获取单词列表失败')
      }

      const chapterData = await chapterRes.json()
      const wordsData = await wordsRes.json()

      setChapter(chapterData.data)
      setWords(wordsData.data.words || [])
      setTotalCount(wordsData.data.total || 0)
    } catch (error: any) {
      console.error('获取数据失败:', error)
      alert(error.message || '获取数据失败')
      router.push(`/admin/word-books/${bookId}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    fetchData()
  }

  const handleDelete = async (wordId: string, word: string) => {
    if (!confirm(`确定要删除单词 "${word}" 吗？`)) {
      return
    }

    try {
      setDeleting(true)

      const response = await fetch(
        `/api/admin/word-books/${bookId}/words/${wordId}`,
        {
          method: 'DELETE',
        }
      )

      if (!response.ok) {
        throw new Error('删除失败')
      }

      alert('删除成功')
      fetchData()
    } catch (error: any) {
      console.error('删除失败:', error)
      alert(error.message || '删除失败')
    } finally {
      setDeleting(false)
    }
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-gray-500">加载中...</div>
      </div>
    )
  }

  if (!chapter) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-gray-500">章节不存在</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* 顶部导航 */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href={`/admin/word-books/${bookId}`}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">
            {chapter.title}
          </h1>
          <p className="text-sm text-gray-500">
            共 {chapter.word_count} 个单词 · 第 {chapter.order_index} 章
          </p>
        </div>
      </div>

      {/* 工具栏 */}
      <div className="bg-white rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_#000] p-4 mb-6">
        <div className="flex items-center justify-between">
          {/* 搜索 */}
          <form onSubmit={handleSearch} className="flex items-center gap-3">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="搜索单词..."
                className="pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors border-2 border-black"
            >
              搜索
            </button>
          </form>

          {/* 添加单词按钮 */}
          <Link
            href={`/admin/word-books/${bookId}/words/create?chapterId=${chapterId}`}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors border-2 border-green-600 shadow-[3px_3px_0px_0px_#000] hover:shadow-[1px_1px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px]"
          >
            <Plus size={18} />
            <span>添加单词</span>
          </Link>
        </div>
      </div>

      {/* 单词列表 */}
      <div className="bg-white rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_#000] overflow-hidden">
        {words.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <BookOpen className="mx-auto mb-3" size={48} />
            <p className="text-lg font-medium mb-2">暂无单词</p>
            <p className="text-sm mb-4">
              {searchKeyword ? '没有找到匹配的单词' : '这个章节还没有添加单词'}
            </p>
            {!searchKeyword && (
              <Link
                href={`/admin/word-books/${bookId}/words/create?chapterId=${chapterId}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus size={18} />
                添加第一个单词
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-black">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">
                      序号
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">
                      单词
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">
                      音标
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">
                      释义
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">
                      例句
                    </th>
                    <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {words.map((word, index) => (
                    <tr
                      key={word.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {(currentPage - 1) * PAGE_SIZE + index + 1}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">
                          {word.word}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {word.phonetic || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {word.definition || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                        {word.example || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/word-books/${bookId}/words/${word.id}/edit`}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="编辑"
                          >
                            <Edit size={18} />
                          </Link>
                          <button
                            onClick={() => handleDelete(word.id, word.word)}
                            disabled={deleting}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="删除"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t-2 border-black flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  共 {totalCount} 个单词，第 {currentPage} / {totalPages} 页
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 border-2 border-black rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`min-w-[40px] px-3 py-2 border-2 rounded-lg transition-colors ${
                          currentPage === pageNum
                            ? 'bg-black text-white border-black'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="p-2 border-2 border-black rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
