'use client'

/**
 * Speaker 文章编辑页面
 * 功能：编辑文章的元数据、上传音频、修改 JSON 数据
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Save,
  Upload,
  Loader2,
  FileAudio,
  CheckCircle,
  Mic,
  Play,
  Image as ImageIcon
} from 'lucide-react'
import { LANGUAGE_NAMES, LANGUAGE_FLAGS, ARTICLE_CATEGORIES } from '@/types/speaker'
import { uploadAudio as uploadAudioAction } from '@/app/api/admin/speaker/upload-audio/action'
import ImageUploadModal from '@/components/admin/ImageUploadModal'

interface SpeakerArticle {
  id: string
  level: number
  language: string
  category: string
  title: string
  source_url: string | null
  audio_url: string
  image_url: string | null
  has_preroll_ad: boolean
  status: string
  total_sentences: number
  duration_seconds: number | null
  word_count: number | null
  json_data: {
    meta: any
    sentences: any[]
  }
  created_at: string
  updated_at: string
}

const LEVEL_MAP = {
  1: 'Level 1',
  2: 'Level 2',
  3: 'Level 3',
  4: 'Level 4',
  5: 'Level 5'
}

export default function SpeakerArticleEditPage({ params }: { params: Promise<{ articleId: string }> }) {
  const router = useRouter()
  const [articleId, setArticleId] = useState<string>('')
  const [article, setArticle] = useState<SpeakerArticle | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAudio, setUploadingAudio] = useState(false)
  const [imageModalOpen, setImageModalOpen] = useState(false)

  // 表单数据
  const [formData, setFormData] = useState({
    level: 1,
    language: 'en',
    category: '心理' as any,
    title: '',
    source_url: '',
    audio_url: '',
    image_url: '',
    has_preroll_ad: false,
    status: 'active' as any
  })

  // 获取文章详情
  const fetchArticle = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/speaker/articles/${articleId}`)
      if (!response.ok) throw new Error('获取文章详情失败')

      const result = await response.json()
      const data = result.data as SpeakerArticle

      setArticle(data)
      setFormData({
        level: data.level,
        language: data.language,
        category: data.category,
        title: data.title,
        source_url: data.source_url || '',
        audio_url: data.audio_url,
        image_url: data.image_url || '',
        has_preroll_ad: data.has_preroll_ad,
        status: data.status
      })
    } catch (error: any) {
      console.error('获取文章详情失败:', error)
      alert('获取文章详情失败: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // 上传音频文件（使用 Server Action 绕过 10MB 限制）
  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingAudio(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const result = await uploadAudioAction(formData)

      if (!result.success) {
        throw new Error(result.error || '上传失败')
      }

      setFormData(prev => ({ ...prev, audio_url: result.data.url }))
      alert('音频上传成功！')
    } catch (error: any) {
      console.error('上传音频失败:', error)
      alert('上传音频失败: ' + error.message)
    } finally {
      setUploadingAudio(false)
    }
  }

  // 保存文章
  const handleSave = async () => {
    // 验证必填字段
    if (!formData.title.trim()) {
      alert('请输入文章标题')
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/admin/speaker/articles/${articleId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        throw new Error('保存失败')
      }

      alert('保存成功！')
      await fetchArticle() // 重新加载数据
    } catch (error: any) {
      console.error('保存失败:', error)
      alert('保存失败: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  // 解析 params
  useEffect(() => {
    params.then(p => setArticleId(p.articleId))
  }, [params])

  // 加载文章数据
  useEffect(() => {
    if (articleId) {
      fetchArticle()
    }
  }, [articleId])

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="animate-spin text-purple-600" size={48} />
      </div>
    )
  }

  if (!article) {
    return (
      <div className="p-6 text-center text-gray-500">
        文章不存在
      </div>
    )
  }

  // 格式化时长
  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-'
    const minutes = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/speaker/articles"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={24} />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Mic className="text-purple-600" size={32} />
              编辑文章
            </h1>
            <p className="text-gray-600">修改文章的元数据和内容</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors border-2 border-purple-800 shadow-[3px_3px_0px_0px_#000] disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              保存中...
            </>
          ) : (
            <>
              <Save size={20} />
              保存修改
            </>
          )}
        </button>
      </div>

      {/* 基本信息表单 */}
      <div className="bg-white rounded-xl border-2 border-black p-6 shadow-[3px_3px_0px_0px_#000] mb-6">
        <h2 className="text-xl font-bold mb-4">基本信息</h2>

        <div className="space-y-4">
          {/* 标题 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              文章标题 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-4 py-2 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="请输入文章标题"
            />
          </div>

          {/* 难度、语言、分类 */}
          <div className="grid grid-cols-3 gap-4">
            {/* 难度 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                难度 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.level}
                onChange={(e) => setFormData(prev => ({ ...prev, level: parseInt(e.target.value) as any }))}
                className="w-full px-4 py-2 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value={1}>Level 1 入门级</option>
                <option value={2}>Level 2 基础级</option>
                <option value={3}>Level 3 进阶级</option>
                <option value={4}>Level 4 高级</option>
                <option value={5}>Level 5 专家级</option>
              </select>
            </div>

            {/* 语言 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                语言 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.language}
                onChange={(e) => setFormData(prev => ({ ...prev, language: e.target.value as any }))}
                className="w-full px-4 py-2 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {(Object.keys(LANGUAGE_NAMES) as Array<keyof typeof LANGUAGE_NAMES>).map(lang => (
                  <option key={lang} value={lang}>
                    {LANGUAGE_FLAGS[lang]} {LANGUAGE_NAMES[lang]}
                  </option>
                ))}
              </select>
            </div>

            {/* 分类 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                分类 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as any }))}
                className="w-full px-4 py-2 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {ARTICLE_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 来源 URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              来源 URL
            </label>
            <input
              type="url"
              value={formData.source_url}
              onChange={(e) => setFormData(prev => ({ ...prev, source_url: e.target.value }))}
              className="w-full px-4 py-2 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="https://example.com/article"
            />
          </div>

          {/* 图片 URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              封面图片 URL
            </label>
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => setImageModalOpen(true)}
                className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                <ImageIcon size={16} />
                上传图片
              </button>
              <input
                type="url"
                value={formData.image_url}
                onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                className="flex-1 px-4 py-2 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="https://example.com/image.jpg"
              />
            </div>
            {/* 图片预览 */}
            {formData.image_url && (
              <div className="w-48 aspect-[8/5] bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                <img
                  src={formData.image_url}
                  alt="封面预览"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 音频管理 */}
      <div className="bg-white rounded-xl border-2 border-black p-6 shadow-[3px_3px_0px_0px_#000] mb-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <FileAudio className="text-purple-600" size={24} />
          音频文件
        </h2>

        {/* 当前音频 */}
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            当前音频
          </label>
          <div className="flex items-center gap-4">
            <audio src={formData.audio_url} controls className="flex-1" />
            <a
              href={formData.audio_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-2 text-purple-600 hover:text-purple-800 border border-purple-300 rounded-lg hover:bg-purple-50"
            >
              <Play size={16} />
              新窗口打开
            </a>
          </div>
        </div>

        {/* 上传新音频 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            上传新音频（将替换当前音频）
          </label>
          <div className="flex items-center gap-4">
            <input
              type="file"
              accept="audio/*"
              onChange={handleAudioUpload}
              disabled={uploadingAudio}
              className="flex-1 px-4 py-2 border-2 border-black rounded-lg"
            />
            {uploadingAudio && (
              <div className="flex items-center gap-2 text-purple-600">
                <Loader2 className="animate-spin" size={20} />
                上传中...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 其他选项 */}
      <div className="bg-white rounded-xl border-2 border-black p-6 shadow-[3px_3px_0px_0px_#000] mb-6">
        <h2 className="text-xl font-bold mb-4">其他选项</h2>

        <div className="space-y-4">
          {/* 是否有片头广告 */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="has_preroll_ad"
              checked={formData.has_preroll_ad}
              onChange={(e) => setFormData(prev => ({ ...prev, has_preroll_ad: e.target.checked }))}
              className="w-5 h-5 text-purple-600 border-2 border-black rounded"
            />
            <label htmlFor="has_preroll_ad" className="text-sm font-medium text-gray-700">
              包含片头广告
            </label>
          </div>

          {/* 状态 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              文章状态
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
              className="w-full px-4 py-2 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="active">已发布</option>
              <option value="archived">已归档</option>
            </select>
          </div>
        </div>
      </div>

      {/* 统计信息 */}
      <div className="bg-gray-50 rounded-xl border-2 border-black p-6">
        <h2 className="text-xl font-bold mb-4">统计信息</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600">句子数</p>
            <p className="text-2xl font-bold text-gray-900">{article.total_sentences}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">时长</p>
            <p className="text-2xl font-bold text-gray-900">{formatDuration(article.duration_seconds)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">单词数</p>
            <p className="text-2xl font-bold text-gray-900">{article.word_count || '-'}</p>
          </div>
        </div>
        <div className="mt-4 text-sm text-gray-500">
          <p>创建时间: {new Date(article.created_at).toLocaleString('zh-CN')}</p>
          <p>更新时间: {new Date(article.updated_at).toLocaleString('zh-CN')}</p>
        </div>
      </div>

      {/* 图片上传弹层 */}
      <ImageUploadModal
        isOpen={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        onConfirm={(url) => {
          setFormData(prev => ({ ...prev, image_url: url }))
          setImageModalOpen(false)
        }}
        currentImageUrl={formData.image_url || undefined}
        category={formData.category}
      />
    </div>
  )
}
