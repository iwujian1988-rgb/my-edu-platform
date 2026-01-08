'use client'

/**
 * 单词书详情页面
 * 功能：查看单词书详情、管理章节和单词
 */

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Edit,
  Trash2,
  Plus,
  Upload,
  BookOpen,
  List,
  FileText,
  ChevronRight,
  Settings
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
}

interface Chapter {
  id: string
  title: string
  order_index: number
  word_count: number
  created_at: string
}

type ViewMode = 'overview' | 'chapters' | 'words' | 'settings'

const CATEGORY_MAP = {
  exam: '考试',
  scenario: '场景',
  textbook: '教材',
  custom: '自定义'
}

export default function WordBookDetailPage() {
  const router = useRouter()
  const params = useParams()
  const bookId = params.bookId as string

  const [book, setBook] = useState<WordBook | null>(null)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('overview')

  // 获取单词书详情
  const fetchBookDetail = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/word-books/${bookId}`)
      if (!response.ok) throw new Error('获取单词书详情失败')

      const data = await response.json()
      setBook(data.data)
    } catch (error) {
      console.error('获取单词书详情失败:', error)
      alert('获取单词书详情失败')
      router.push('/admin/word-books')
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
      setChapters(data.data || [])
    } catch (error) {
      console.error('获取章节列表失败:', error)
    }
  }

  // 删除单词书
  const handleDelete = async () => {
    if (!confirm(`确定要删除单词书"${book?.title}"吗？此操作不可恢复！`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/word-books/${bookId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('删除失败')

      alert('删除成功')
      router.push('/admin/word-books')
    } catch (error) {
      console.error('删除单词书失败:', error)
      alert('删除失败，请稍后重试')
    }
  }

  useEffect(() => {
    if (bookId) {
      fetchBookDetail()
      fetchChapters()
    }
  }, [bookId])

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-gray-500">
          加载中...
        </div>
      </div>
    )
  }

  if (!book) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-gray-500">
          单词书不存在
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* 顶部导航 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/word-books"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">{book.title}</h1>
            <p className="text-sm text-gray-500">
              {CATEGORY_MAP[book.category]}
              {book.is_official && ' · 官方词库'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/admin/word-books/${bookId}/edit`}
            className="flex items-center gap-2 px-4 py-2 bg-white text-black border-2 border-black rounded-lg hover:bg-gray-50 transition-colors shadow-[3px_3px_0px_0px_#000] hover:shadow-[1px_1px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px]"
          >
            <Edit size={18} />
            <span>编辑</span>
          </Link>
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white border-2 border-black rounded-lg hover:bg-red-600 transition-colors shadow-[3px_3px_0px_0px_#000] hover:shadow-[1px_1px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px]"
          >
            <Trash2 size={18} />
            <span>删除</span>
          </button>
        </div>
      </div>

      {/* 标签页导航 */}
      <div className="bg-white rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_#000] mb-6">
        <div className="flex border-b-2 border-black">
          <button
            onClick={() => setViewMode('overview')}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
              viewMode === 'overview'
                ? 'text-black border-b-2 border-black bg-gray-50'
                : 'text-gray-600 hover:text-black hover:bg-gray-50'
            }`}
          >
            <BookOpen size={18} />
            概览
          </button>
          <button
            onClick={() => setViewMode('chapters')}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
              viewMode === 'chapters'
                ? 'text-black border-b-2 border-black bg-gray-50'
                : 'text-gray-600 hover:text-black hover:bg-gray-50'
            }`}
          >
            <List size={18} />
            章节管理
            <span className="px-2 py-0.5 text-xs bg-gray-200 rounded-full">
              {book.total_chapters}
            </span>
          </button>
          <button
            onClick={() => setViewMode('words')}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
              viewMode === 'words'
                ? 'text-black border-b-2 border-black bg-gray-50'
                : 'text-gray-600 hover:text-black hover:bg-gray-50'
            }`}
          >
            <FileText size={18} />
            单词管理
            <span className="px-2 py-0.5 text-xs bg-gray-200 rounded-full">
              {book.total_words}
            </span>
          </button>
          <button
            onClick={() => setViewMode('settings')}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
              viewMode === 'settings'
                ? 'text-black border-b-2 border-black bg-gray-50'
                : 'text-gray-600 hover:text-black hover:bg-gray-50'
            }`}
          >
            <Settings size={18} />
            设置
          </button>
        </div>

        <div className="p-6">
          {viewMode === 'overview' && (
            <div>
              {/* 概览内容 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg border-2 border-black p-4">
                  <p className="text-sm text-gray-600 mb-1">总单词数</p>
                  <p className="text-3xl font-bold text-gray-900">{book.total_words}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border-2 border-black p-4">
                  <p className="text-sm text-gray-600 mb-1">章节数</p>
                  <p className="text-3xl font-bold text-gray-900">{book.total_chapters}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border-2 border-black p-4">
                  <p className="text-sm text-gray-600 mb-1">创建时间</p>
                  <p className="text-lg font-bold text-gray-900">
                    {new Date(book.created_at).toLocaleDateString('zh-CN')}
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-bold mb-2">描述</h3>
                <p className="text-gray-600">
                  {book.description || '暂无描述'}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href={`/admin/word-books/${bookId}/import`}
                  className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors border-2 border-black shadow-[3px_3px_0px_0px_#000] hover:shadow-[1px_1px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px]"
                >
                  <Upload size={18} />
                  <span>导入单词</span>
                </Link>
                <Link
                  href={`/study/${bookId}`}
                  target="_blank"
                  className="flex items-center gap-2 px-4 py-2 bg-white text-black border-2 border-black rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <BookOpen size={18} />
                  <span>预览学习页面</span>
                </Link>
              </div>
            </div>
          )}

          {viewMode === 'chapters' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">章节列表</h2>
                <Link
                  href={`/admin/word-books/${bookId}/chapters/create`}
                  className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors border-2 border-black shadow-[3px_3px_0px_0px_#000] hover:shadow-[1px_1px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px]"
                >
                  <Plus size={18} />
                  <span>新建章节</span>
                </Link>
              </div>

              {chapters.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <List className="mx-auto mb-4 text-gray-300" size={48} />
                  <p className="text-lg font-medium mb-2">暂无章节</p>
                  <p className="text-sm mb-4">点击上方"新建章节"按钮创建第一个章节</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {chapters.map((chapter, index) => (
                    <Link
                      key={chapter.id}
                      href={`/admin/word-books/${bookId}/chapters/${chapter.id}`}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border-2 border-black hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <span className="flex items-center justify-center w-8 h-8 bg-black text-white rounded-full font-bold">
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-medium text-gray-900">{chapter.title}</p>
                          <p className="text-sm text-gray-500">{chapter.word_count} 个单词</p>
                        </div>
                      </div>
                      <ChevronRight className="text-gray-400" size={20} />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {viewMode === 'words' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">单词列表</h2>
                <Link
                  href={`/admin/word-books/${bookId}/words/create`}
                  className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors border-2 border-black shadow-[3px_3px_0px_0px_#000] hover:shadow-[1px_1px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px]"
                >
                  <Plus size={18} />
                  <span>添加单词</span>
                </Link>
              </div>

              <div className="text-center py-12 text-gray-500">
                <FileText className="mx-auto mb-4 text-gray-300" size={48} />
                <p className="text-lg font-medium mb-2">单词管理</p>
                <p className="text-sm">请先在"章节管理"中创建章节，然后可以在章节中管理单词</p>
                <Link
                  href={`/admin/word-books/${bookId}/chapters/create`}
                  className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <Plus size={18} />
                  创建第一个章节
                </Link>
              </div>
            </div>
          )}

          {viewMode === 'settings' && (
            <div>
              <h2 className="text-xl font-bold mb-4">单词书设置</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border-2 border-black">
                  <div>
                    <p className="font-medium">发布状态</p>
                    <p className="text-sm text-gray-500">
                      {book.is_published ? '已发布' : '草稿'}
                    </p>
                  </div>
                  <button
                    className={`px-4 py-2 rounded-lg border-2 border-black transition-colors ${
                      book.is_published
                        ? 'bg-gray-200 hover:bg-gray-300'
                        : 'bg-green-500 text-white hover:bg-green-600'
                    }`}
                  >
                    {book.is_published ? '设为草稿' : '发布'}
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border-2 border-black">
                  <div>
                    <p className="font-medium">审核状态</p>
                    <p className="text-sm text-gray-500">
                      {book.review_status === 'approved' && '已通过审核'}
                      {book.review_status === 'pending' && '待审核'}
                      {book.review_status === 'rejected' && '未通过审核'}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    book.review_status === 'approved' ? 'bg-green-100 text-green-800' :
                    book.review_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {book.review_status === 'approved' ? '已通过' :
                     book.review_status === 'pending' ? '待审核' : '未通过'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
