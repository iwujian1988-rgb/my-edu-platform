'use client'

/**
 * 单词列表页面
 * 功能：分页展示某单词书的所有单词，支持搜索、章节筛选
 */

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  Search,
  Filter,
  Edit,
  Trash2,
  BookOpen,
  ArrowLeft,
  Plus,
  List as ListIcon
} from 'lucide-react'

interface Word {
  id: string
  word: string
  phonetic: string | null
  definition: string | null
  definition_en: string | null
  part_of_speech: string | null
  chapter_id: string | null
  chapters?: {  // API返回的是chapters（复数）
    id: string
    title: string
    order_index: number
  }
  order_index: number
  // 🌍 多语言支持（Phase 3）
  language_data?: import('@/types/word').LanguageData
}

interface Chapter {
  id: string
  title: string
  order_index: number
}

interface PaginationInfo {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export default function WordsListPage() {
  const router = useRouter()
  const params = useParams()
  const bookId = params.bookId as string

  const [words, setWords] = useState<Word[]>([])
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 0
  })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [chapterFilter, setChapterFilter] = useState<string>('')
  const [sortBy, setSortBy] = useState('order_index')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  // 获取单词列表
  const fetchWords = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
        sortBy,
        sortOrder
      })

      if (search) params.append('search', search)
      if (chapterFilter) params.append('chapterId', chapterFilter)

      const response = await fetch(`/api/admin/word-books/${bookId}/words?${params}`)
      if (!response.ok) throw new Error('获取单词列表失败')

      const data = await response.json()
      setWords(data.data || [])
      setPagination({
        page: data.page,
        pageSize: data.pageSize,
        total: data.total,
        totalPages: data.totalPages
      })
    } catch (error) {
      console.error('获取单词列表失败:', error)
      alert('获取单词列表失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  // 获取章节列表
  const fetchChapters = async () => {
    try {
      const response = await fetch(`/api/admin/word-books/${bookId}/chapters`)
      if (!response.ok) throw new Error('获取章节列表失败')

      const data = await response.json()
      setChapters(data.data.chapters || [])
    } catch (error) {
      console.error('获取章节列表失败:', error)
    }
  }

  // 删除单词
  const handleDelete = async (id: string, word: string) => {
    if (!confirm(`确定要删除单词"${word}"吗？此操作不可恢复！`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/word-books/${bookId}/words/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('删除失败')

      alert('删除成功')
      fetchWords() // 重新获取列表
    } catch (error) {
      console.error('删除单词失败:', error)
      alert('删除失败，请稍后重试')
    }
  }

  useEffect(() => {
    fetchWords()
    fetchChapters()
  }, [pagination.page, search, chapterFilter, sortBy, sortOrder])

  return (
    <div className="p-6">
      {/* 页面标题和操作按钮 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            href={`/admin/word-books/${bookId}`}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">单词列表</h1>
            <p className="text-gray-600">管理该单词书的单词内容</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Link
            href={`/admin/word-books/${bookId}/words/create`}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors border-2 border-black shadow-[3px_3px_0px_0px_#000] hover:shadow-[1px_1px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px]"
          >
            <Plus size={20} />
            <span>添加单词</span>
          </Link>
        </div>
      </div>

      {/* 搜索和筛选 */}
      <div className="bg-white rounded-xl border-2 border-black p-4 mb-6 shadow-[3px_3px_0px_0px_#000]">
        <div className="flex flex-col md:flex-row gap-4">
          {/* 搜索框 */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="搜索单词或释义..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPagination(prev => ({ ...prev, page: 1 }))
              }}
              className="w-full pl-10 pr-4 py-2 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* 章节筛选 */}
          <select
            value={chapterFilter}
            onChange={(e) => {
              setChapterFilter(e.target.value)
              setPagination(prev => ({ ...prev, page: 1 }))
            }}
            className="px-4 py-2 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
          >
            <option value="">全部章节</option>
            {chapters.map((chapter) => (
              <option key={chapter.id} value={chapter.id}>
                第{chapter.order_index}章 - {chapter.title}
              </option>
            ))}
          </select>

          {/* 排序 */}
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [sort, order] = e.target.value.split('-')
              setSortBy(sort)
              setSortOrder(order as 'asc' | 'desc')
            }}
            className="px-4 py-2 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
          >
            <option value="order_index-asc">排序序号↑</option>
            <option value="order_index-desc">排序序号↓</option>
            <option value="word-asc">单词 A-Z</option>
            <option value="word-desc">单词 Z-A</option>
          </select>
        </div>
      </div>

      {/* 单词列表 */}
      <div className="bg-white rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_#000] overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            加载中...
          </div>
        ) : words.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <ListIcon className="mx-auto mb-4 text-gray-300" size={48} />
            <p className="text-lg font-medium mb-2">暂无单词</p>
            <p className="text-sm">点击上方"添加单词"按钮添加第一个单词</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-black">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    单词信息
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    章节
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    排序
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {words.map((word) => (
                  <tr key={word.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-bold text-gray-900 mb-1">
                          {word.word}
                          {word.phonetic && (
                            <span className="ml-2 text-sm font-normal text-gray-500">
                              {word.phonetic}
                            </span>
                          )}
                        </p>
                        {word.part_of_speech && (
                          <span className="inline-block mr-2 px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                            {word.part_of_speech}
                          </span>
                        )}
                        <p className="text-xs text-gray-600 mt-1">
                          {word.definition}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {word.chapters ? (
                        <Link
                          href={`/admin/word-books/${bookId}/chapters/${word.chapters.id}`}
                          className="text-purple-600 hover:text-purple-800 hover:underline"
                        >
                          第{word.chapters.order_index}章 - {word.chapters.title}
                        </Link>
                      ) : (
                        <span className="text-gray-400">未分类</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {word.order_index}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/word-books/${bookId}/words/${word.id}/edit`}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="编辑"
                        >
                          <Edit size={18} />
                        </Link>
                        <button
                          onClick={() => handleDelete(word.id, word.word)}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
        )}
      </div>

      {/* 分页 */}
      {pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            共 {pagination.total} 个单词，第 {pagination.page} / {pagination.totalPages} 页
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
              className="px-4 py-2 border-2 border-black rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              上一页
            </button>
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page === pagination.totalPages}
              className="px-4 py-2 border-2 border-black rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
