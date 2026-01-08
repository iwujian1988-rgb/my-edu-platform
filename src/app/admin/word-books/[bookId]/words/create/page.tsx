'use client'

/**
 * 创建单词页面
 */

import { useState, useEffect } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save } from 'lucide-react'

interface Chapter {
  id: string
  title: string
  order_index: number
}

export default function CreateWordPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const bookId = params.bookId as string
  const preSelectedChapterId = searchParams.get('chapterId')

  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [chapters, setChapters] = useState<Chapter[]>([])

  const [formData, setFormData] = useState({
    word: '',
    phonetic: '',
    definition: '',
    example: '',
    chapter_id: preSelectedChapterId || '',
    order_index: 1,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // 获取章节列表
  useEffect(() => {
    fetchChapters()
  }, [bookId])

  const fetchChapters = async () => {
    try {
      const response = await fetch(
        `/api/admin/word-books/${bookId}/chapters`
      )
      if (!response.ok) {
        throw new Error('获取章节列表失败')
      }
      const data = await response.json()
      setChapters(data.data.chapters || [])

      // 如果没有预选章节且有章节，自动选择第一个
      if (!preSelectedChapterId && data.data.chapters?.length > 0) {
        setFormData((prev) => ({
          ...prev,
          chapter_id: data.data.chapters[0].id,
        }))
      }
    } catch (error: any) {
      console.error('获取章节列表失败:', error)
      alert(error.message || '获取章节列表失败')
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : value,
    }))
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.word.trim()) {
      newErrors.word = '请输入单词'
    }

    if (!formData.chapter_id) {
      newErrors.chapter_id = '请选择章节'
    }

    if (!formData.definition.trim()) {
      newErrors.definition = '请输入释义'
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

      const response = await fetch(
        `/api/admin/word-books/${bookId}/words`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            word: formData.word.trim(),
            phonetic: formData.phonetic.trim() || null,
            definition: formData.definition.trim(),
            example: formData.example.trim() || null,
            chapter_id: formData.chapter_id,
            order_index: formData.order_index,
          }),
        }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '创建失败')
      }

      const data = await response.json()

      alert('单词添加成功！')

      // 返回章节详情页
      router.push(`/admin/word-books/${bookId}/chapters/${formData.chapter_id}`)
    } catch (error: any) {
      console.error('创建单词失败:', error)
      alert(error.message || '创建失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl">
      {/* 顶部导航 */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href={
            formData.chapter_id
              ? `/admin/word-books/${bookId}/chapters/${formData.chapter_id}`
              : `/admin/word-books/${bookId}`
          }
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">添加单词</h1>
          <p className="text-sm text-gray-500">填写单词的详细信息</p>
        </div>
      </div>

      {/* 表单 */}
      <div className="bg-white rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_#000] p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 单词和章节 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 单词 */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                单词 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="word"
                value={formData.word}
                onChange={handleChange}
                placeholder="例如：hello"
                className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.word ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.word && (
                <p className="mt-1 text-sm text-red-500">{errors.word}</p>
              )}
            </div>

            {/* 章节 */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                所属章节 <span className="text-red-500">*</span>
              </label>
              <select
                name="chapter_id"
                value={formData.chapter_id}
                onChange={handleChange}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.chapter_id ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">请选择章节</option>
                {chapters.map((chapter) => (
                  <option key={chapter.id} value={chapter.id}>
                    第{chapter.order_index}章 - {chapter.title}
                  </option>
                ))}
              </select>
              {errors.chapter_id && (
                <p className="mt-1 text-sm text-red-500">{errors.chapter_id}</p>
              )}
            </div>
          </div>

          {/* 音标 */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              音标
            </label>
            <input
              type="text"
              name="phonetic"
              value={formData.phonetic}
              onChange={handleChange}
              placeholder="例如：/həˈloʊ/"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* 释义 */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              释义 <span className="text-red-500">*</span>
            </label>
            <textarea
              name="definition"
              value={formData.definition}
              onChange={handleChange}
              placeholder="例如：你好；问候"
              rows={3}
              className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                errors.definition ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.definition && (
              <p className="mt-1 text-sm text-red-500">{errors.definition}</p>
            )}
          </div>

          {/* 例句 */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              例句
            </label>
            <textarea
              name="example"
              value={formData.example}
              onChange={handleChange}
              placeholder="例如：Hello, how are you?"
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* 排序 */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              排序序号
            </label>
            <input
              type="number"
              name="order_index"
              value={formData.order_index}
              onChange={handleChange}
              min="1"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <p className="mt-1 text-sm text-gray-500">
              数值越小越靠前
            </p>
          </div>

          {/* 提交按钮 */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <Link
              href={
                formData.chapter_id
                  ? `/admin/word-books/${bookId}/chapters/${formData.chapter_id}`
                  : `/admin/word-books/${bookId}`
              }
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
              <span>{submitting ? '保存中...' : '保存'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
