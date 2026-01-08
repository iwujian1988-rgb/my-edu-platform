'use client'

/**
 * 编辑单词书页面
 */

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, BookOpen } from 'lucide-react'

const CATEGORY_OPTIONS = [
  { value: 'exam', label: '考试' },
  { value: 'scenario', label: '场景' },
  { value: 'textbook', label: '教材' },
  { value: 'custom', label: '自定义' },
]

const DIFFICULTY_OPTIONS = [
  { value: 'beginner', label: '初级' },
  { value: 'intermediate', label: '中级' },
  { value: 'advanced', label: '高级' },
]

export default function EditWordBookPage() {
  const router = useRouter()
  const params = useParams()
  const bookId = params.bookId as string

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [notFound, setNotFound] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'custom' as 'exam' | 'scenario' | 'textbook' | 'custom',
    is_official: false,
    cover_url: '',
    difficulty_level: '' as 'beginner' | 'intermediate' | 'advanced' | '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // 获取单词书详情
  useEffect(() => {
    const fetchBookDetail = async () => {
      try {
        const response = await fetch(`/api/admin/word-books/${bookId}`)
        if (!response.ok) {
          if (response.status === 404) {
            setNotFound(true)
          }
          throw new Error('获取单词书详情失败')
        }

        const data = await response.json()
        const book = data.data

        setFormData({
          title: book.title || '',
          description: book.description || '',
          category: book.category || 'custom',
          is_official: book.is_official || false,
          cover_url: book.cover_url || '',
          difficulty_level: book.difficulty_level || '',
        })
      } catch (error) {
        console.error('获取单词书详情失败:', error)
        alert('获取单词书详情失败')
        router.push('/admin/word-books')
      } finally {
        setLoading(false)
      }
    }

    fetchBookDetail()
  }, [bookId, router])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.title.trim()) {
      newErrors.title = '请输入单词书标题'
    }

    if (!formData.category) {
      newErrors.category = '请选择分类'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      return
    }

    try {
      setSubmitting(true)

      const response = await fetch(`/api/admin/word-books/${bookId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          category: formData.category,
          is_official: formData.is_official,
          cover_url: formData.cover_url.trim() || null,
          difficulty_level: formData.difficulty_level || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '更新失败')
      }

      alert('单词书更新成功！')
      router.push(`/admin/word-books/${bookId}`)
    } catch (error: any) {
      console.error('更新单词书失败:', error)
      alert(error.message || '更新失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-4xl">
        <div className="text-center py-12 text-gray-500">
          加载中...
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="p-6 max-w-4xl">
        <div className="text-center py-12 text-gray-500">
          单词书不存在
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl">
      {/* 顶部导航 */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href={`/admin/word-books/${bookId}`}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">编辑单词书</h1>
          <p className="text-sm text-gray-500">修改单词书的基本信息</p>
        </div>
      </div>

      {/* 表单 */}
      <div className="bg-white rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_#000] p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 标题 */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              标题 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="例如：高考英语核心词汇"
              className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                errors.title ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-500">{errors.title}</p>
            )}
          </div>

          {/* 描述 */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              描述
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="简单描述这个单词书的内容和用途..."
              rows={4}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* 分类和难度 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 分类 */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                分类 <span className="text-red-500">*</span>
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.category ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                {CATEGORY_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.category && (
                <p className="mt-1 text-sm text-red-500">{errors.category}</p>
              )}
            </div>

            {/* 难度 */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                难度级别
              </label>
              <select
                name="difficulty_level"
                value={formData.difficulty_level}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">请选择</option>
                {DIFFICULTY_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 封面图片 URL */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              封面图片 URL
            </label>
            <input
              type="url"
              name="cover_url"
              value={formData.cover_url}
              onChange={handleChange}
              placeholder="https://example.com/cover.jpg"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <p className="mt-1 text-sm text-gray-500">可选：输入图片的完整 URL</p>
          </div>

          {/* 官方标识 */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_official"
              name="is_official"
              checked={formData.is_official}
              onChange={handleChange}
              className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
            />
            <label htmlFor="is_official" className="text-sm font-medium text-gray-700">
              标记为官方词库
            </label>
          </div>

          {/* 提交按钮 */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <Link
              href={`/admin/word-books/${bookId}`}
              className="px-6 py-3 border-2 border-black rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors border-2 border-black shadow-[3px_3px_0px_0px_#000] hover:shadow-[1px_1px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={20} />
              <span>{submitting ? '保存中...' : '保存更改'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
