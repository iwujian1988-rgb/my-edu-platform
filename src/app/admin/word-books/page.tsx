'use client'

/**
 * 单词书管理页面
 * 功能：列表展示、创建、编辑、删除单词书
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  BookOpen,
  Eye,
  Upload,
  MoreVertical,
  ChevronDown,
  Power,
  List
} from 'lucide-react'

interface WordBook {
  id: string
  title: string
  description: string | null
  category: 'exam' | 'scenario' | 'textbook' | 'custom'
  is_official: boolean
  total_words: number
  total_chapters: number
  is_published: boolean
  created_at: string
  review_status: 'pending' | 'approved' | 'rejected'
  cover_url: string | null
  learner_count: number
  completion_rate: number
}

interface PaginationInfo {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

const CATEGORY_MAP = {
  exam: '考试',
  scenario: '场景',
  textbook: '教材',
  custom: '自定义'
}

const REVIEW_STATUS_MAP = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已拒绝'
}

const REVIEW_STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800'
}

const SHELF_STATUS_MAP = {
  true: '上架',
  false: '下架'
}

const SHELF_STATUS_COLORS = {
  true: 'bg-green-100 text-green-800 border-green-300',
  false: 'bg-gray-100 text-gray-800 border-gray-300'
}

export default function WordBooksPage() {
  const router = useRouter()
  const [books, setBooks] = useState<WordBook[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0
  })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [shelfFilter, setShelfFilter] = useState<string>('')
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // 获取单词书列表
  const fetchBooks = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
        sortBy,
        sortOrder
      })

      if (search) params.append('search', search)
      if (categoryFilter) params.append('category', categoryFilter)
      if (shelfFilter) params.append('is_published', shelfFilter)

      const response = await fetch(`/api/admin/word-books?${params}`)
      if (!response.ok) throw new Error('获取单词书列表失败')

      const data = await response.json()
      setBooks(data.data || [])
      setPagination(data.pagination || pagination)
    } catch (error) {
      console.error('获取单词书列表失败:', error)
      alert('获取单词书列表失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  // 删除单词书
  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`确定要删除单词书"${title}"吗？此操作不可恢复！`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/word-books/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('删除失败')

      alert('删除成功')
      fetchBooks() // 重新获取列表
    } catch (error) {
      console.error('删除单词书失败:', error)
      alert('删除失败，请稍后重试')
    }
  }

  // 切换上架/下架状态
  const handleToggleShelf = async (id: string, title: string, currentStatus: boolean) => {
    const newStatus = !currentStatus
    const action = newStatus ? '上架' : '下架'

    if (!confirm(`确定要${action}单词书"${title}"吗？`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/word-books/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_published: newStatus })
      })

      if (!response.ok) throw new Error(`${action}失败`)

      alert(`${action}成功！`)
      fetchBooks() // 重新获取列表
    } catch (error) {
      console.error(`${action}单词书失败:`, error)
      alert(`${action}失败，请稍后重试`)
    }
  }

  useEffect(() => {
    fetchBooks()
  }, [pagination.page, search, categoryFilter, shelfFilter, sortBy, sortOrder])

  return (
    <div className="p-6">
      {/* 页面标题和操作按钮 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">词库管理</h1>
          <p className="text-gray-600">管理平台上的所有单词书</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/word-books/create"
            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors border-2 border-black shadow-[3px_3px_0px_0px_#000] hover:shadow-[1px_1px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px]"
          >
            <Plus size={20} />
            <span>创建词库</span>
          </Link>
          <Link
            href="/admin/word-books/import"
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors border-2 border-green-800 shadow-[3px_3px_0px_0px_#000] hover:shadow-[1px_1px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px]"
          >
            <Upload size={20} />
            <span>Excel导入</span>
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
              placeholder="搜索单词书名称或描述..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPagination(prev => ({ ...prev, page: 1 }))
              }}
              className="w-full pl-10 pr-4 py-2 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* 分类筛选 */}
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value)
              setPagination(prev => ({ ...prev, page: 1 }))
            }}
            className="px-4 py-2 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
          >
            <option value="">全部分类</option>
            <option value="exam">考试</option>
            <option value="scenario">场景</option>
            <option value="textbook">教材</option>
            <option value="custom">自定义</option>
          </select>

          {/* 上架/下架筛选 */}
          <select
            value={shelfFilter}
            onChange={(e) => {
              setShelfFilter(e.target.value)
              setPagination(prev => ({ ...prev, page: 1 }))
            }}
            className="px-4 py-2 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
          >
            <option value="">全部状态</option>
            <option value="true">已上架</option>
            <option value="false">已下架</option>
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
            <option value="created_at-desc">创建时间↓</option>
            <option value="created_at-asc">创建时间↑</option>
            <option value="title-asc">名称 A-Z</option>
            <option value="title-desc">名称 Z-A</option>
            <option value="total_words-desc">单词数↓</option>
            <option value="total_words-asc">单词数↑</option>
          </select>
        </div>
      </div>

      {/* 单词书列表 */}
      <div className="bg-white rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_#000] overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            加载中...
          </div>
        ) : books.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <BookOpen className="mx-auto mb-4 text-gray-300" size={48} />
            <p className="text-lg font-medium mb-2">暂无单词书</p>
            <p className="text-sm">点击上方"新建单词书"按钮创建第一个单词书</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-black">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    单词书信息
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    分类
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    统计
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    创建时间
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {books.map((book) => (
                  <tr key={book.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        {book.cover_url ? (
                          <img
                            src={book.cover_url}
                            alt={book.title}
                            className="w-[60px] h-[60px] rounded-lg border-2 border-black object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-[60px] h-[60px] bg-gradient-to-br from-green-400 to-green-600 rounded-lg border-2 border-black flex items-center justify-center flex-shrink-0">
                            <BookOpen className="text-white" size={24} />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate mb-1">
                            {book.title}
                          </p>
                          <p className="text-xs text-gray-500 line-clamp-2">
                            {book.description || '暂无描述'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {CATEGORY_MAP[book.category]}
                      </span>
                      {book.is_official && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          官方
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center px-3 py-1 rounded text-xs font-bold border-2 ${SHELF_STATUS_COLORS[book.is_published]}`}>
                          {SHELF_STATUS_MAP[book.is_published]}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <p className="font-medium">{book.total_words} 个单词</p>
                      <p className="text-xs text-gray-500">{book.total_chapters} 个章节</p>
                      {book.learner_count > 0 && (
                        <p className="text-xs text-gray-600 mt-1">
                          <span className="font-medium text-blue-600">{book.learner_count}</span> 人学习
                        </p>
                      )}
                      {book.completion_rate > 0 && (
                        <p className="text-xs text-gray-600">
                          完成率 <span className="font-medium text-green-600">{book.completion_rate.toFixed(1)}%</span>
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(book.created_at).toLocaleDateString('zh-CN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/word-books/${book.id}`}
                          className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="查看详情"
                        >
                          <Eye size={18} />
                        </Link>
                        <Link
                          href={`/admin/word-books/${book.id}/words`}
                          className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="查看单词"
                        >
                          <List size={18} />
                        </Link>
                        <button
                          onClick={() => handleToggleShelf(book.id, book.title, book.is_published)}
                          className={`p-2 rounded-lg transition-colors ${
                            book.is_published
                              ? 'text-orange-600 hover:text-orange-700 hover:bg-orange-50'
                              : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                          }`}
                          title={book.is_published ? '下架' : '上架'}
                        >
                          <Power size={18} />
                        </button>
                        <Link
                          href={`/admin/word-books/${book.id}/edit`}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="编辑"
                        >
                          <Edit size={18} />
                        </Link>
                        <button
                          onClick={() => handleDelete(book.id, book.title)}
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
            共 {pagination.total} 个单词书，第 {pagination.page} / {pagination.totalPages} 页
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
