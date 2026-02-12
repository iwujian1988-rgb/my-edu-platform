'use client'

/**
 * Speaker 批量导入页面
 * 功能：批量上传 JSON 文件和音频文件，预览并导入文章
 * 上传方式：前端直传 OSS（ali-oss SDK）+ 进度条
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Upload,
  FileAudio,
  FileJson,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { LANGUAGE_NAMES, LANGUAGE_FLAGS, ARTICLE_CATEGORIES } from '@/types/speaker'
import OSS from 'ali-oss'

interface ParsedArticle {
  fileName: string
  meta: {
    level: number | null
    language: string | null
    category: string | null
    title: string
    source_url: string | null
    audio_filename: string | null
    image_filename: string | null
    has_preroll_ad: boolean
    status: string
  }
  stats: {
    total_sentences: number
    duration_seconds: number | null
    word_count: number
  }
  analysis?: {
    category: string
    categoryConfidence: number
    level: number
    levelConfidence: number
    suggestedImage: string | null
  }
  jsonData: any
  audioUrl?: string
  audioFile?: File
}

// 上传进度类型
interface UploadProgress {
  [key: number]: number // 文章索引 -> 进度百分比 (0-100)
}

const LEVEL_MAP = {
  1: 'Level 1',
  2: 'Level 2',
  3: 'Level 3',
  4: 'Level 4',
  5: 'Level 5'
}

export default function SpeakerUploadPage() {
  const router = useRouter()
  const [step, setStep] = useState<'upload' | 'preview' | 'importing'>('upload')
  const [jsonFiles, setJsonFiles] = useState<File[]>([])
  const [parsedArticles, setParsedArticles] = useState<ParsedArticle[]>([])
  const [errors, setErrors] = useState<Array<{ fileName: string; error: string }>>([])
  const [uploading, setUploading] = useState(false)
  const [audioUrls, setAudioUrls] = useState<Record<number, string>>({})
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({})

  // 处理 JSON 文件选择
  const handleJsonFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setJsonFiles(files)
  }

  // 处理音频文件选择
  const handleAudioFileChange = (articleIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const updatedArticles = [...parsedArticles]
    updatedArticles[articleIndex].audioFile = file
    setParsedArticles(updatedArticles)
  }

  // 上传音频文件到 OSS（前端直传，带进度条）
  const uploadAudio = async (file: File, index: number): Promise<string> => {
    try {
      // 1. 获取 STS Token
      console.log('[OSS上传] 正在获取 STS Token...')
      const tokenRes = await fetch('/api/admin/speaker/oss-token', {
        method: 'POST',
      })

      if (!tokenRes.ok) {
        const errorData = await tokenRes.json()
        throw new Error(errorData.error || '获取 OSS 凭证失败')
      }

      const tokenData = await tokenRes.json()
      console.log('[OSS上传] STS Token 获取成功')

      // 2. 初始化 OSS 客户端（使用临时凭证）
      const client = new OSS({
        region: tokenData.region,
        accessKeyId: tokenData.accessKeyId,
        accessKeySecret: tokenData.accessKeySecret,
        stsToken: tokenData.stsToken,
        bucket: tokenData.bucket,
        secure: true, // 使用 HTTPS
      })

      // 3. 生成唯一文件名
      const date = new Date()
      const datePath = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      const timestamp = Date.now()
      const filename = `speaker/${datePath}/${timestamp}-${file.name}`

      console.log(`[OSS上传] 开始上传: ${filename} (${(file.size / 1024 / 1024).toFixed(2)} MB)`)

      // 4. 上传文件（带进度回调）
      const result = await client.put(filename, file, {
        progress: (p: number) => {
          // p 是上传进度 (0-1)
          const percent = Math.round(p * 100)
          console.log(`[OSS上传] 上传进度: ${percent}%`)
          setUploadProgress(prev => ({ ...prev, [index]: percent }))
        },
      })

      console.log(`[OSS上传] 上传成功: ${result.url}`)

      // 5. 清除进度条
      setUploadProgress(prev => {
        const newProgress = { ...prev }
        delete newProgress[index]
        return newProgress
      })

      // 6. 更新 audioUrls
      setAudioUrls(prev => ({
        ...prev,
        [index]: result.url
      }))

      return result.url
    } catch (error: any) {
      console.error('[OSS上传] 失败:', error)
      setUploadProgress(prev => {
        const newProgress = { ...prev }
        delete newProgress[index]
        return newProgress
      })
      throw error
    }
  }

  // 移除音频
  const removeAudio = (index: number) => {
    const updated = [...parsedArticles]
    updated[index].audioFile = undefined
    updated[index].meta.audio_filename = null
    setParsedArticles(updated)

    const newAudioUrls = { ...audioUrls }
    delete newAudioUrls[index]
    setAudioUrls(newAudioUrls)
  }

  // 解析 JSON 文件
  const handleParseJson = async () => {
    if (jsonFiles.length === 0) {
      alert('请选择至少一个 JSON 文件')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      jsonFiles.forEach(file => {
        formData.append('files', file)
      })

      const response = await fetch('/api/admin/speaker/upload-json', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('解析失败')
      }

      const result = await response.json()
      console.log('[前端] API 返回数据:', result)
      console.log('[前端] 文章数量:', result.data.articles?.length)

      result.data.articles?.forEach((article: any, index: number) => {
        console.log(`[前端] 文章 ${index}:`, {
          title: article.meta.title,
          level: article.meta.level,
          category: article.meta.category,
          hasAnalysis: !!article.analysis,
          analysisLevel: article.analysis?.level,
          analysisCategory: article.analysis?.category,
          suggestedImage: article.analysis?.suggestedImage
        })
      })

      setParsedArticles(result.data.articles)
      setErrors(result.data.errors)
      setStep('preview')
    } catch (error: any) {
      console.error('解析 JSON 失败:', error)
      alert('解析失败: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  // 上传所有音频文件
  const handleUploadAllAudio = async () => {
    setUploading(true)
    try {
      const newAudioUrls: Record<number, string> = {}

      for (let i = 0; i < parsedArticles.length; i++) {
        const article = parsedArticles[i]
        if (article.audioFile) {
          const url = await uploadAudio(article.audioFile, i)
          newAudioUrls[i] = url
        }
      }

      setAudioUrls(newAudioUrls)
      alert('音频上传完成！')
    } catch (error: any) {
      console.error('上传音频失败:', error)
      alert('上传音频失败: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  // 导入文章
  const handleImport = async () => {
    // 验证所有文章都有必填字段
    const invalidArticles = parsedArticles.filter((article, index) => {
      const hasAudio = audioUrls[index] || article.meta.audio_filename
      return !article.meta.level || !article.meta.language || !article.meta.category || !hasAudio
    })

    if (invalidArticles.length > 0) {
      alert('请先完善所有文章的必填信息（难度、语言、分类、音频）')
      return
    }

    if (!confirm(`确定要导入 ${parsedArticles.length} 篇文章吗？`)) {
      return
    }

    setStep('importing')
    setUploading(true)

    try {
      let successCount = 0
      let failCount = 0

      for (let i = 0; i < parsedArticles.length; i++) {
        const article = parsedArticles[i]
        const audioUrl = audioUrls[i] || article.meta.audio_filename

        try {
          const response = await fetch('/api/admin/speaker/articles', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              level: article.meta.level,
              language: article.meta.language,
              category: article.meta.category,
              title: article.meta.title,
              source_url: article.meta.source_url,
              audio_url: audioUrl,
              image_url: article.meta.image_filename,
              has_preroll_ad: article.meta.has_preroll_ad,
              word_count: article.stats.word_count,
              json_data: article.jsonData
            })
          })

          if (response.ok) {
            successCount++
          } else {
            failCount++
          }
        } catch (error) {
          console.error('导入文章失败:', error)
          failCount++
        }
      }

      alert(`导入完成！成功: ${successCount}，失败: ${failCount}`)
      router.push('/admin/speaker/articles')
    } catch (error: any) {
      console.error('导入失败:', error)
      alert('导入失败: ' + error.message)
      setStep('preview')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* 页面标题 */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/admin/speaker/articles"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">批量导入文章</h1>
          <p className="text-gray-600">上传 JSON 文件和音频文件，批量创建文章</p>
        </div>
      </div>

      {step === 'upload' && (
        <div className="space-y-6">
          {/* JSON 文件上传 */}
          <div className="bg-white rounded-xl border-2 border-black p-6 shadow-[3px_3px_0px_0px_#000]">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FileJson className="text-blue-600" size={24} />
              第一步：上传 JSON 文件
            </h2>
            <p className="text-gray-600 mb-4">
              支持批量上传多个 JSON 文件，每个文件对应一篇文章
            </p>
            <input
              type="file"
              multiple
              accept=".json"
              onChange={handleJsonFileChange}
              className="w-full px-4 py-3 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            {jsonFiles.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-2">已选择 {jsonFiles.length} 个文件：</p>
                <ul className="text-sm text-gray-700 space-y-1">
                  {jsonFiles.map((file, index) => (
                    <li key={index}>• {file.name}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* 解析按钮 */}
          <div className="flex justify-end">
            <button
              onClick={handleParseJson}
              disabled={jsonFiles.length === 0 || uploading}
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors border-2 border-purple-800 shadow-[3px_3px_0px_0px_#000] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  解析中...
                </>
              ) : (
                <>
                  <FileJson size={20} />
                  解析 JSON 文件
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div className="space-y-6">
          {/* 错误信息 */}
          {errors.length > 0 && (
            <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4">
              <h3 className="font-bold text-red-800 mb-2 flex items-center gap-2">
                <XCircle size={20} />
                解析失败的文件 ({errors.length})
              </h3>
              <ul className="text-sm text-red-700 space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>
                    <strong>{error.fileName}</strong>: {error.error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 文章列表 */}
          <div className="bg-white rounded-xl border-2 border-black p-6 shadow-[3px_3px_0px_0px_#000]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <CheckCircle className="text-green-600" size={24} />
                解析成功 ({parsedArticles.length} 篇)
              </h2>
              <button
                onClick={handleUploadAllAudio}
                disabled={uploading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <Upload size={18} />
                一键上传所有音频
              </button>
            </div>

            <div className="space-y-6">
              {parsedArticles.map((article, index) => {
                const audioUrl = audioUrls[index] || article.meta.audio_filename
                // 图片URL优先级：用户手动设置 > AI推荐
                const imageUrl = article.meta.image_filename || article.analysis?.suggestedImage
                const hasRequiredFields = article.meta.level && article.meta.language && article.meta.category && audioUrl

                // 调试日志：打印图片相关信息
                console.log(`[文章 ${index}] 标题: ${article.meta.title}`)
                console.log(`[文章 ${index}] 手动图片: ${article.meta.image_filename}`)
                console.log(`[文章 ${index}] AI推荐图片: ${article.analysis?.suggestedImage}`)
                console.log(`[文章 ${index}] 最终图片URL: ${imageUrl}`)

                return (
                  <div key={index} className={`border-2 rounded-lg p-6 ${hasRequiredFields ? 'border-green-300 bg-green-50' : 'border-yellow-300 bg-yellow-50'}`}>
                    {/* 文件名和状态 */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 mb-1">{article.fileName}</p>
                        {hasRequiredFields ? (
                          <CheckCircle className="text-green-600" size={24} />
                        ) : (
                          <AlertCircle className="text-yellow-600" size={24} />
                        )}
                      </div>
                    </div>

                    {/* 标题编辑 */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        文章标题 <span className="text-red-500">*</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={article.meta.title}
                          onChange={(e) => {
                            const updated = [...parsedArticles]
                            updated[index].meta.title = e.target.value
                            setParsedArticles(updated)
                          }}
                          className="flex-1 px-3 py-2 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                          placeholder="请输入文章标题"
                        />
                        <button
                          onClick={() => {
                            const updated = [...parsedArticles]
                            // 移除下划线并合并多个空格
                            updated[index].meta.title = updated[index].meta.title
                              .replace(/_/g, ' ')
                              .replace(/\s+/g, ' ')
                              .trim()
                            setParsedArticles(updated)
                          }}
                          className="px-3 py-2 text-xs border-2 border-purple-300 text-purple-700 bg-purple-50 rounded hover:bg-purple-100"
                          title="移除下划线"
                        >
                          移除下划线
                        </button>
                        <button
                          onClick={() => {
                            const updated = [...parsedArticles]
                            updated[index].meta.title = ''
                            setParsedArticles(updated)
                          }}
                          className="px-3 py-2 text-xs border-2 border-gray-300 text-gray-600 rounded hover:bg-gray-50"
                          title="清除标题"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {/* 难度、语言、分类 */}
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      {/* 难度 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">
                          难度 <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={article.meta.level || article.analysis?.level || ''}
                          onChange={(e) => {
                            const updated = [...parsedArticles]
                            updated[index].meta.level = parseInt(e.target.value) || null
                            setParsedArticles(updated)
                          }}
                          className="w-full px-3 py-2 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 bg-white"
                        >
                          <option value="">选择难度</option>
                          <option value="1">Level 1 入门级</option>
                          <option value="2">Level 2 基础级</option>
                          <option value="3">Level 3 进阶级</option>
                          <option value="4">Level 4 高级</option>
                          <option value="5">Level 5 专家级</option>
                        </select>
                        {article.analysis?.level && (
                          <p className="mt-1 text-xs text-purple-600">
                            ✨ AI建议: Level {article.analysis.level} (置信度 {Math.round(article.analysis.levelConfidence * 100)}%)
                          </p>
                        )}
                      </div>

                      {/* 语言 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">
                          语言 <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={article.meta.language || ''}
                          onChange={(e) => {
                            const updated = [...parsedArticles]
                            updated[index].meta.language = e.target.value || null
                            setParsedArticles(updated)
                          }}
                          className="w-full px-3 py-2 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 bg-white"
                        >
                          <option value="">选择语言</option>
                          {(Object.keys(LANGUAGE_NAMES) as Array<keyof typeof LANGUAGE_NAMES>).map(lang => (
                            <option key={lang} value={lang}>
                              {LANGUAGE_FLAGS[lang]} {LANGUAGE_NAMES[lang]}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* 分类 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">
                          分类 <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={article.meta.category || article.analysis?.category || ''}
                          onChange={(e) => {
                            const updated = [...parsedArticles]
                            updated[index].meta.category = e.target.value || null
                            setParsedArticles(updated)
                          }}
                          className="w-full px-3 py-2 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 bg-white"
                        >
                          <option value="">选择分类</option>
                          {ARTICLE_CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                        {article.analysis?.category && (
                          <p className="mt-1 text-xs text-purple-600">
                            ✨ AI建议: {article.analysis.category} (置信度 {Math.round(article.analysis.categoryConfidence * 100)}%)
                          </p>
                        )}
                      </div>
                    </div>

                    {/* 统计信息 */}
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">
                        📊 {article.stats.total_sentences} 个句子 · {article.stats.word_count} 个单词
                        {article.stats.duration_seconds && (
                          <span className="ml-3">⏱ {Math.floor(article.stats.duration_seconds / 60)}:{String(Math.floor(article.stats.duration_seconds % 60)).padStart(2, '0')}</span>
                        )}
                      </p>
                    </div>

                    {/* 封面图片 */}
                    <div className="mb-4 p-4 bg-white rounded-lg border-2 border-gray-200">
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        🖼 封面图片（可选）
                      </label>

                      {imageUrl ? (
                        <div className="space-y-2">
                          {/* 图片预览 */}
                          <div className="relative w-64 aspect-[8/5] bg-gray-100 rounded-lg overflow-hidden mx-auto">
                            <img
                              src={imageUrl}
                              alt={article.meta.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                // 图片加载失败，显示占位符
                                console.error(`[图片加载失败] ${article.meta.title}:`, imageUrl)
                                e.currentTarget.src = 'https://via.placeholder.com/400x250?text=Image+Load+Failed'
                              }}
                              onLoad={(e) => {
                                // 图片加载成功的日志 - 显示最终 URL（可能是重定向后的）
                                const finalUrl = (e.target as HTMLImageElement).src
                                console.log(`[图片加载成功] ${article.meta.title}`)
                                console.log(`  - 原始 URL: ${imageUrl}`)
                                console.log(`  - 最终 URL: ${finalUrl}`)
                              }}
                            />
                            {article.analysis?.suggestedImage && imageUrl === article.analysis.suggestedImage && (
                              <div className="absolute top-2 left-2 px-2 py-1 bg-purple-500 text-white text-xs rounded">
                                ✨ AI推荐
                              </div>
                            )}
                          </div>

                          {/* 操作按钮 */}
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                const updated = [...parsedArticles]
                                updated[index].meta.image_filename = null
                                setParsedArticles(updated)
                              }}
                              className="px-3 py-2 text-sm border-2 border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                            >
                              移除图片
                            </button>
                            <button
                              onClick={() => {
                                // 生成新的图片 URL（使用新的 random lock）
                                // 尺寸：400x250 (适配前台 SpeakerCard)
                                const category = article.meta.category || article.analysis?.category || 'psychology'
                                const keywordsMap: Record<string, string[]> = {
                                  '健康': ['health', 'wellness'],
                                  '心理': ['psychology', 'mind'],
                                  '成长': ['success', 'growth'],
                                  '学习': ['study', 'education'],
                                  '社交': ['people', 'team'],
                                  '生活': ['lifestyle', 'daily']
                                }
                                const keywords = keywordsMap[category] || ['psychology', 'mind']
                                const newLock = Math.floor(Math.random() * 10000)
                                const newImageUrl = `https://loremflickr.com/400/250/${keywords.join(',')}?lock=${newLock}`

                                const updated = [...parsedArticles]
                                updated[index].meta.image_filename = newImageUrl
                                setParsedArticles(updated)

                                console.log(`[更换图片] ${article.meta.title}: ${newImageUrl}`)
                              }}
                              className="flex-1 px-3 py-2 text-sm border-2 border-purple-300 text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 flex items-center justify-center gap-2"
                            >
                              <span>🔄</span> 更换推荐
                            </button>
                            <input
                              type="text"
                              value={article.meta.image_filename || ''}
                              onChange={(e) => {
                                const updated = [...parsedArticles]
                                updated[index].meta.image_filename = e.target.value
                                setParsedArticles(updated)
                              }}
                              placeholder="或手动输入图片URL"
                              className="flex-1 px-3 py-2 border-2 border-black rounded-lg text-sm text-gray-900"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={article.meta.image_filename || ''}
                            onChange={(e) => {
                              const updated = [...parsedArticles]
                              updated[index].meta.image_filename = e.target.value
                              setParsedArticles(updated)
                            }}
                            placeholder="输入图片URL (https://...)"
                            className="w-full px-3 py-2 border-2 border-black rounded-lg text-sm text-gray-900"
                          />
                          {article.analysis?.suggestedImage && (
                            <button
                              onClick={() => {
                                const updated = [...parsedArticles]
                                updated[index].meta.image_filename = article.analysis!.suggestedImage
                                setParsedArticles(updated)
                              }}
                              className="w-full px-3 py-2 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 flex items-center justify-center gap-2"
                            >
                              <span>✨</span> 使用AI推荐图片
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 音频上传 */}
                    <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        🎵 音频文件 <span className="text-red-500">*</span>
                      </label>

                      {audioUrl ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 p-2 bg-green-100 rounded-lg">
                            <CheckCircle className="text-green-600" size={20} />
                            <span className="text-sm text-green-800 flex-1">
                              {audioUrls[index] ? '✅ 已上传到 OSS' : '✅ 使用文件名'}
                            </span>
                          </div>
                          <audio src={audioUrl} controls className="w-full h-10" />
                          <button
                            onClick={() => removeAudio(index)}
                            className="w-full px-3 py-2 text-sm border-2 border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                          >
                            移除音频
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {/* 进度条 */}
                          {uploadProgress[index] !== undefined && (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-700">上传进度</span>
                                <span className="font-bold text-purple-600">{uploadProgress[index]}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                                  style={{ width: `${uploadProgress[index]}%` }}
                                />
                              </div>
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            <input
                              type="file"
                              accept="audio/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) {
                                  handleAudioFileChange(index, e)
                                }
                              }}
                              className="flex-1 px-3 py-2 border-2 border-black rounded-lg text-sm"
                              disabled={uploadProgress[index] !== undefined}
                            />
                            <button
                              onClick={async () => {
                                const file = article.audioFile
                                if (!file) {
                                  alert('请先选择音频文件')
                                  return
                                }

                                // 立即上传
                                setUploading(true)
                                try {
                                  await uploadAudio(file, index)
                                  alert('音频上传成功！')
                                } catch (error: any) {
                                  alert('上传失败: ' + error.message)
                                } finally {
                                  setUploading(false)
                                }
                              }}
                              disabled={!article.audioFile || uploading || uploadProgress[index] !== undefined}
                              className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {uploadProgress[index] !== undefined
                                ? `${uploadProgress[index]}%`
                                : uploading
                                ? '上传中...'
                                : '上传到OSS'}
                            </button>
                          </div>
                          <input
                            type="text"
                            value={article.meta.audio_filename || ''}
                            onChange={(e) => {
                              const updated = [...parsedArticles]
                              updated[index].meta.audio_filename = e.target.value
                              setParsedArticles(updated)
                            }}
                            placeholder="或手动输入音频URL"
                            className="w-full px-3 py-2 border-2 border-black rounded-lg text-sm text-gray-900"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-between">
            <button
              onClick={() => setStep('upload')}
              className="px-6 py-3 border-2 border-black rounded-lg hover:bg-gray-50 transition-colors"
            >
              返回重新上传
            </button>
            <button
              onClick={handleImport}
              disabled={uploading}
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors border-2 border-purple-800 shadow-[3px_3px_0px_0px_#000] disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  导入中...
                </>
              ) : (
                <>
                  <Upload size={20} />
                  导入所有文章
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {step === 'importing' && (
        <div className="bg-white rounded-xl border-2 border-black p-12 shadow-[3px_3px_0px_0px_#000] text-center">
          <Loader2 className="animate-spin text-purple-600 mx-auto mb-4" size={48} />
          <h2 className="text-2xl font-bold mb-2">正在导入文章...</h2>
          <p className="text-gray-600">请稍候，正在处理 {parsedArticles.length} 篇文章</p>
        </div>
      )}
    </div>
  )
}
