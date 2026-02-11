'use client'

/**
 * Speaker 文章管理页面
 * 功能：列表展示、创建、编辑、删除文章
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Plus,
  Search,
  Upload,
  Edit,
  Trash2,
  Mic,
  Play,
  Eye,
  Filter,
  ChevronDown,
  FileAudio,
  FileJson
} from 'lucide-react'
import { LANGUAGE_NAMES, LANGUAGE_FLAGS, ARTICLE_CATEGORIES } from '@/types/speaker'

interface SpeakerArticle {
  id: string
  level: number
  language: string
  category: string
  title: string
  audio_url: string
  image_url: string | null
  total_sentences: number
  duration_seconds: number | null
  status: string
  created_at: string
}

interface PaginationInfo {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

const LEVEL_MAP = {
  1: 'Level 1',
  2: 'Level 2',
  3: 'Level 3',
  4: 'Level 4',
  5: 'Level 5'
}

const LEVEL_COLORS = {
  1: 'bg-green-100 text-green-800',
  2: 'bg-lime-100 text-lime-800',
  3: 'bg-yellow-100 text-yellow-800',
  4: 'bg-orange-100 text-orange-800',
  5: 'bg-red-100 text-red-800'
}

const STATUS_MAP = {
  active: '已发布',
  archived: '已归档'
}

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-800',
  archived: 'bg-gray-100 text-gray-800'
}

export default function SpeakerArticlesPage() {
  const router = useRouter()
  const [articles, setArticles] = useState<SpeakerArticle[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0
  })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState<string>('')
  const [languageFilter, setLanguageFilter] = useState<string>('')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // 获取文章列表
  const fetchArticles = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
        sortBy,
        sortOrder
      })

      if (search) params.append('search', search)
      if (levelFilter) params.append('level', levelFilter)
      if (languageFilter) params.append('language', languageFilter)
      if (categoryFilter) params.append('category', categoryFilter)
      if (statusFilter) params.append('status', statusFilter)

      const response = await fetch(`/api/admin/speaker/articles?${params}`)
      if (!response.ok) throw new Error('获取文章列表失败')

      const data = await response.json()
      setArticles(data.data || [])
      setPagination(data.pagination || pagination)
    } catch (error) {
      console.error('获取文章列表失败:', error)
      alert('获取文章列表失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  // 删除文章
  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`确定要删除文章"${title}"吗？此操作不可恢复！`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/speaker/articles/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('删除失败')

      alert('删除成功')
      fetchArticles()
    } catch (error) {
      console.error('删除文章失败:', error)
      alert('删除失败，请稍后重试')
    }
  }

  // 格式化时长
  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-'
    const minutes = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  useEffect(() => {
    fetchArticles()
  }, [pagination.page, search, levelFilter, languageFilter, categoryFilter, statusFilter, sortBy, sortOrder])

  return (
    <div className="p-6">
      {/* 页面标题和操作按钮 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Mic className="text-purple-600" size={32} />
            雯姐学习法 - 文章管理
          </h1>
          <p className="text-gray-600">管理 Speaker 模块的所有文章内容</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/speaker/articles/upload"
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors border-2 border-green-800 shadow-[3px_3px_0px_0px_#000] hover:shadow-[1px_1px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px]"
          >
            <Upload size={20} />
            <span>批量导入</span>
          </Link>
          <Link
            href="/admin/speaker/articles/create"
            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors border-2 border-black shadow-[3px_3px_0px_0px_#000] hover:shadow-[1px_1px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px]"
          >
            <Plus size={20} />
            <span>新建文章</span>
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
              placeholder="搜索文章标题..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPagination(prev => ({ ...prev, page: 1 }))
              }}
              className="w-full pl-10 pr-4 py-2 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* 难度筛选 */}
          <select
            value={levelFilter}
            onChange={(e) => {
              setLevelFilter(e.target.value)
              setPagination(prev => ({ ...prev, page: 1 }))
            }}
            className="px-4 py-2 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
          >
            <option value="">全部难度</option>
            <option value="1">Level 1 入门级</option>
            <option value="2">Level 2 基础级</option>
            <option value="3">Level 3 进阶级</option>
            <option value="4">Level 4 高级</option>
            <option value="5">Level 5 专家级</option>
          </select>

          {/* 语言筛选 */}
          <select
            value={languageFilter}
            onChange={(e) => {
              setLanguageFilter(e.target.value)
              setPagination(prev => ({ ...prev, page: 1 }))
            }}
            className="px-4 py-2 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
          >
            <option value="">全部语言</option>
            {(Object.keys(LANGUAGE_NAMES) as Array<keyof typeof LANGUAGE_NAMES>).map(lang => (
              <option key={lang} value={lang}>
                {LANGUAGE_FLAGS[lang]} {LANGUAGE_NAMES[lang]}
              </option>
            ))}
          </select>

          {/* 分类筛选 */}
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value)
              setPagination(prev => ({ ...prev, page: 1 }))
            }}
            className="px-4 py-2 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
          >
            <option value="">全部分类</option>
            {ARTICLE_CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
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
            className="px-4 py-2 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
          >
            <option value="created_at-desc">创建时间↓</option>
            <option value="created_at-asc">创建时间↑</option>
            <option value="title-asc">标题 A-Z</option>
            <option value="title-desc">标题 Z-A</option>
          </select>
        </div>
      </div>

      {/* 文章列表 */}
      <div className="bg-white rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_#000] overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            加载中...
          </div>
        ) : articles.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Mic className="mx-auto mb-4 text-gray-300" size={48} />
            <p className="text-lg font-medium mb-2">暂无文章</p>
            <p className="text-sm">点击上方"批量导入"或"新建文章"开始添加内容</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2 border-black">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    文章信息
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    难度
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    语言
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    分类
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    统计
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {articles.map((article) => (
                  <tr key={article.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        {article.image_url ? (
                          <img
                            src={article.image_url}
                            alt={article.title}
                            className="w-[60px] h-[60px] rounded-lg border-2 border-black object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-[60px] h-[60px] bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg border-2 border-black flex items-center justify-center flex-shrink-0">
                            <Mic className="text-white" size={24} />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate mb-1">
                            {article.title}
                          </p>
                          <a
                            href={article.audio_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1"
                          >
                            <Play size={12} />
                            播放音频
                          </a>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${(LEVEL_COLORS as any)[article.level]}`}>
                        {(LEVEL_MAP as any)[article.level]}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-sm">
                        <span className="text-lg">{(LANGUAGE_FLAGS as any)[article.language]}</span>
                        {(LANGUAGE_NAMES as any)[article.language]}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {article.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <p className="font-medium">{article.total_sentences} 个句子</p>
                      <p className="text-xs text-gray-500">时长: {formatDuration(article.duration_seconds)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded text-xs font-bold ${(STATUS_COLORS as any)[article.status]}`}>
                        {(STATUS_MAP as any)[article.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/speaker/articles/${article.id}/edit`}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="编辑"
                        >
                          <Edit size={18} />
                        </Link>
                        <button
                          onClick={() => handleDelete(article.id, article.title)}
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
            共 {pagination.total} 篇文章，第 {pagination.page} / {pagination.totalPages} 页
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
