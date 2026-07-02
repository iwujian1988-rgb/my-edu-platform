'use client'

/**
 * Speaker 新建文章页面
 * 功能：手动创建新文章（不使用 JSON 导入）
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Save,
  Upload,
  Loader2,
  FileAudio,
  Mic,
  Image as ImageIcon,
  AlertTriangle,
  CheckCircle2,
  X
} from 'lucide-react'
import { LANGUAGE_NAMES, LANGUAGE_FLAGS, ARTICLE_CATEGORIES } from '@/types/speaker'
import ImageUploadModal from '@/components/admin/ImageUploadModal'

interface PageMessage {
  type: 'success' | 'error'
  text: string
}

const getErrorMessage = (error: unknown) => {
  return error instanceof Error ? error.message : '未知错误'
}

export default function SpeakerArticleCreatePage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [uploadingAudio, setUploadingAudio] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imageModalOpen, setImageModalOpen] = useState(false)
  const [message, setMessage] = useState<PageMessage | null>(null)

  // 表单数据
  const [formData, setFormData] = useState({
    level: 2,
    language: 'en',
    category: '心理' as any,
    title: '',
    source_url: '',
    audio_url: '',
    image_url: '',
    has_preroll_ad: false,
    status: 'active' as any,
    // JSON 数据
    jsonData: ''
  })

  // 上传音频文件
  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingAudio(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/admin/speaker/upload-audio', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('上传失败')
      }

      const result = await response.json()
      setFormData(prev => ({ ...prev, audio_url: result.data.url }))
      setMessage({ type: 'success', text: '音频上传成功，已自动填入音频 URL' })
    } catch (error: unknown) {
      console.error('上传音频失败:', error)
      setMessage({ type: 'error', text: `上传音频失败：${getErrorMessage(error)}` })
    } finally {
      setUploadingAudio(false)
    }
  }

  // 保存文章
  const handleSave = async () => {
    setMessage(null)

    // 验证必填字段
    if (!formData.title.trim()) {
      setMessage({ type: 'error', text: '请输入文章标题' })
      return
    }
    if (!formData.audio_url.trim()) {
      setMessage({ type: 'error', text: '请上传或输入音频 URL' })
      return
    }
    if (!formData.jsonData.trim()) {
      setMessage({ type: 'error', text: '请输入 JSON 数据' })
      return
    }

    // 解析 JSON
    let jsonData
    try {
      jsonData = JSON.parse(formData.jsonData)
    } catch (error: unknown) {
      setMessage({ type: 'error', text: `JSON 格式错误：${getErrorMessage(error)}` })
      return
    }

    // 验证 JSON 结构
    if (!jsonData.sentences || !Array.isArray(jsonData.sentences)) {
      setMessage({ type: 'error', text: 'JSON 必须包含 sentences 数组' })
      return
    }

    if (jsonData.sentences.length === 0) {
      setMessage({ type: 'error', text: 'sentences 不能为空' })
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/admin/speaker/articles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          level: formData.level,
          language: formData.language,
          category: formData.category,
          title: formData.title,
          source_url: formData.source_url || null,
          audio_url: formData.audio_url,
          image_url: formData.image_url || null,
          has_preroll_ad: formData.has_preroll_ad,
          status: formData.status,
          json_data: jsonData
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '创建失败')
      }

      setMessage({ type: 'success', text: '文章创建成功，正在返回列表' })
      router.push('/admin/speaker/articles')
    } catch (error: unknown) {
      console.error('创建失败:', error)
      setMessage({ type: 'error', text: `创建失败：${getErrorMessage(error)}` })
    } finally {
      setSaving(false)
    }
  }

  // 生成 JSON 模板
  const generateJsonTemplate = () => {
    const template = {
      meta: {
        level: formData.level,
        language: formData.language,
        category: formData.category,
        title: formData.title,
        source_url: formData.source_url || null,
        audio_filename: formData.audio_url.split('/').pop() || null,
        image_filename: formData.image_url?.split('/').pop() || null,
        has_preroll_ad: formData.has_preroll_ad,
        status: 'ready'
      },
      sentences: [
        {
          text: "This is the first sentence.",
          start_time: 0.0,
          end_time: 2.5
        },
        {
          text: "This is the second sentence.",
          start_time: 2.5,
          end_time: 5.0
        }
      ]
    }
    setFormData(prev => ({ ...prev, jsonData: JSON.stringify(template, null, 2) }))
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {message && (
        <div
          className={`mb-4 flex items-start justify-between gap-3 rounded-lg border-2 px-4 py-3 shadow-[3px_3px_0px_0px_#000] ${
            message.type === 'success'
              ? 'border-green-800 bg-green-50 text-green-900'
              : 'border-red-800 bg-red-50 text-red-900'
          }`}
          role={message.type === 'error' ? 'alert' : 'status'}
        >
          <div className="flex items-start gap-2">
            {message.type === 'success' ? (
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            ) : (
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            )}
            <span className="text-sm font-bold">{message.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="rounded p-1 hover:bg-black/5"
            aria-label="关闭提示"
          >
            <X size={16} />
          </button>
        </div>
      )}

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
              新建文章
            </h1>
            <p className="text-gray-600">手动创建新的 Speaker 文章</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={generateJsonTemplate}
            className="flex items-center gap-2 px-4 py-3 border-2 border-black bg-white rounded-lg hover:bg-gray-50 transition-colors"
          >
            生成 JSON 模板
          </button>
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
                创建文章
              </>
            )}
          </button>
        </div>
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
          音频文件 <span className="text-red-500">*</span>
        </h2>

        <div className="space-y-4">
          {/* 上传音频 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              上传音频到 OSS
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

          {/* 或手动输入 URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              或手动输入音频 URL
            </label>
            <input
              type="url"
              value={formData.audio_url}
              onChange={(e) => setFormData(prev => ({ ...prev, audio_url: e.target.value }))}
              className="w-full px-4 py-2 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="https://example.com/audio.mp3"
            />
            {formData.audio_url && (
              <div className="mt-2">
                <audio src={formData.audio_url} controls className="w-full" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* JSON 数据 */}
      <div className="bg-white rounded-xl border-2 border-black p-6 shadow-[3px_3px_0px_0px_#000] mb-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <span className="text-red-500">*</span>
          JSON 数据（包含句子列表）
        </h2>

        <p className="text-sm text-gray-600 mb-4">
          请输入包含 meta 和 sentences 的 JSON 数据。可以点击上方"生成 JSON 模板"按钮快速生成模板。
        </p>

        <textarea
          value={formData.jsonData}
          onChange={(e) => setFormData(prev => ({ ...prev, jsonData: e.target.value }))}
          className="w-full h-64 px-4 py-3 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono text-sm"
          placeholder={`{
  "meta": {
    "level": 2,
    "language": "en",
    "category": "心理",
    ...
  },
  "sentences": [
    {
      "text": "First sentence",
      "start_time": 0.0,
      "end_time": 2.5
    }
  ]
}`}
        />
      </div>

      {/* 其他选项 */}
      <div className="bg-white rounded-xl border-2 border-black p-6 shadow-[3px_3px_0px_0px_#000]">
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
