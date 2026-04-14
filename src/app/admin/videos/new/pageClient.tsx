'use client'

/**
 * 视频工作流 - 7 步骤引导
 *
 * Step 0: 字幕上传 + AI 分析
 * Step 1: 基本信息
 * Step 2: 字幕翻译（可跳过）
 * Step 3: 生成卡片
 * Step 4: 审核卡片
 * Step 5: 上传视频（可跳过）
 * Step 6: 发布
 */

import { useState, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Upload,
  FileText,
  Languages,
  Sparkles,
  CheckSquare,
  Video,
  Send,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Check,
  SkipForward,
} from 'lucide-react'
import { VideoUploadField } from '@/components/admin/VideoUploadField'
import type { VideoLanguage, VideoDifficulty, ContentType, WorkflowProgress } from '@/types/video'
import { VIDEO_LANGUAGE_LABELS, VIDEO_DIFFICULTY_LABELS, CONTENT_TYPE_LABELS, WORKFLOW_STEPS, DEFAULT_WORKFLOW_PROGRESS } from '@/types/video'
import Link from 'next/link'
import ImageUploadModal from '@/components/admin/ImageUploadModal'

// ============================================
// 步骤配置
// ============================================

const STEPS = [
  { key: 'subtitles', label: '字幕上传', icon: Upload, canSkip: false },
  { key: 'info', label: '基本信息', icon: FileText, canSkip: false },
  { key: 'translation', label: '字幕翻译', icon: Languages, canSkip: true },
  { key: 'cards', label: '生成卡片', icon: Sparkles, canSkip: false },
  { key: 'review', label: '审核卡片', icon: CheckSquare, canSkip: false },
  { key: 'video', label: '上传视频', icon: Video, canSkip: true },
  { key: 'publish', label: '发布', icon: Send, canSkip: false },
] as const

// 语言国旗
const LANGUAGE_FLAGS: Record<VideoLanguage, string> = {
  en: '🇬🇧', fr: '🇫🇷', de: '🇩🇪', es: '🇪🇸', ja: '🇯🇵', it: '🇮🇹', ru: '🇷🇺',
}

// ============================================
// 主组件
// ============================================

interface VideoData {
  id: string | null
  title: string
  description: string
  language: VideoLanguage
  difficulty: VideoDifficulty
  content_type: ContentType
  cover_url: string
  duration: number
  video_url: string
  thumbnail_url: string
  creator_name: string
  source_url: string
  tags: string[]
  package_ids: string[]
  workflow_progress: WorkflowProgress
}

const initialVideoData: VideoData = {
  id: null,
  title: '',
  description: '',
  language: 'en',
  difficulty: 'beginner',
  content_type: 'video',
  cover_url: '',
  duration: 0,
  video_url: '',
  thumbnail_url: '',
  creator_name: '',
  source_url: '',
  tags: [],
  package_ids: [],
  workflow_progress: DEFAULT_WORKFLOW_PROGRESS,
}

export function VideoWorkflowClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [currentStep, setCurrentStep] = useState(0)
  const [videoData, setVideoData] = useState<VideoData>(initialVideoData)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRestoring, setIsRestoring] = useState(true) // 恢复状态中
  const [coverImageModalOpen, setCoverImageModalOpen] = useState(false)

  // 从 URL 参数恢复工作流状态
  useEffect(() => {
    const restoreState = async () => {
      const stepParam = searchParams.get('step')
      const videoIdParam = searchParams.get('videoId')

      if (videoIdParam) {
        try {
          // 从数据库加载视频数据
          const res = await fetch(`/api/admin/videos/${videoIdParam}`)
          if (res.ok) {
            const data = await res.json()
            if (data.success && data.data) {
              setVideoData({
                id: data.data.id,
                title: data.data.title || '',
                description: data.data.description || '',
                language: data.data.language || 'en',
                difficulty: data.data.difficulty || 'beginner',
                content_type: data.data.content_type || 'video',
                cover_url: data.data.cover_url || '',
                duration: data.data.duration || 0,
                video_url: data.data.video_url || '',
                thumbnail_url: data.data.thumbnail_url || '',
                creator_name: data.data.creator_name || '',
                source_url: data.data.source_url || '',
                tags: data.data.tags || [],
                package_ids: data.data.package_ids || [],
                workflow_progress: data.data.workflow_progress || DEFAULT_WORKFLOW_PROGRESS,
              })

              // 恢复到指定步骤
              if (stepParam) {
                setCurrentStep(parseInt(stepParam, 10))
              }
            }
          }
        } catch (err) {
          console.error('恢复工作流状态失败:', err)
        }
      }
      setIsRestoring(false)
    }

    restoreState()
  }, [searchParams])

  // 字幕分析结果
  const [analysisResult, setAnalysisResult] = useState<{
    language: VideoLanguage
    duration: number
    suggested_title: string
    difficulty: VideoDifficulty
    difficulty_analysis: {
      vocabulary_score: number
      speech_rate: number
      sentence_complexity: number
      reason: string
    }
    total_words: number
    total_sentences: number
  } | null>(null)

  // 字幕文件
  const [subtitleFile, setSubtitleFile] = useState<File | null>(null)
  const [subtitleSentences, setSubtitleSentences] = useState<Array<{
    id: number
    text: string
    start_time: number
    end_time: number
  }>>([])

  // 卡片生成状态
  const [cardGenerationStatus, setCardGenerationStatus] = useState<{
    words: number
    phrases: number
    expressions: number
    exercises: number
  } | null>(null)

  // ============================================
  // 步骤 0: 上传字幕 + AI 分析
  // ============================================

  const handleSubtitleUpload = useCallback(async () => {
    if (!subtitleFile) return

    setIsLoading(true)
    setError(null)

    try {
      const text = await subtitleFile.text()
      const data = JSON.parse(text)

      if (!data.sentences || !Array.isArray(data.sentences)) {
        throw new Error('字幕格式错误，需要 { sentences: [...] }')
      }

      setSubtitleSentences(data.sentences)

      // 调用 AI 分析
      const analyzeRes = await fetch('/api/admin/videos/analyze-subtitles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sentences: data.sentences }),
      })

      const analyzeResult = await analyzeRes.json()

      if (!analyzeRes.ok || !analyzeResult.success) {
        throw new Error(analyzeResult.error || 'AI 分析失败')
      }

      setAnalysisResult(analyzeResult.data)
      setVideoData(prev => ({
        ...prev,
        language: analyzeResult.data.language,
        difficulty: analyzeResult.data.difficulty,
        duration: analyzeResult.data.duration,
        title: analyzeResult.data.suggested_title || '新视频',
      }))

      // 创建视频记录
      const createRes = await fetch('/api/admin/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: analyzeResult.data.suggested_title || '新视频',
          language: analyzeResult.data.language,
          difficulty: analyzeResult.data.difficulty,
          duration: analyzeResult.data.duration,
        }),
      })

      const createResult = await createRes.json()

      if (!createRes.ok || !createResult.success) {
        throw new Error(createResult.error || '创建视频失败')
      }

      setVideoData(prev => ({ ...prev, id: createResult.data.id }))

      // 上传字幕到视频
      if (createResult.data.id) {
        await fetch(`/api/admin/videos/${createResult.data.id}/subtitles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
      }

      // 进入下一步
      setCurrentStep(1)
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败')
    } finally {
      setIsLoading(false)
    }
  }, [subtitleFile])

  // ============================================
  // 步骤 1: 保存基本信息
  // ============================================

  const handleSaveInfo = useCallback(async () => {
    if (!videoData.id) return

    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/videos/${videoData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: videoData.title,
          description: videoData.description,
          language: videoData.language,
          difficulty: videoData.difficulty,
          content_type: videoData.content_type,
          cover_url: videoData.cover_url || undefined,
          creator_name: videoData.creator_name,
          source_url: videoData.source_url,
          tags: videoData.tags,
        }),
      })

      const result = await res.json()

      if (!res.ok || !result.success) {
        throw new Error(result.error || '保存失败')
      }

      setCurrentStep(2)
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setIsLoading(false)
    }
  }, [videoData])

  // ============================================
  // 步骤 2: 翻译 / 跳过翻译
  // ============================================

  const handleTranslate = useCallback(async () => {
    if (!videoData.id) return

    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/videos/${videoData.id}/translate-subtitles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const result = await res.json()

      if (!res.ok || !result.success) {
        throw new Error(result.error || '翻译失败')
      }

      setCurrentStep(3)
    } catch (err) {
      setError(err instanceof Error ? err.message : '翻译失败')
    } finally {
      setIsLoading(false)
    }
  }, [videoData.id])

  const handleSkipTranslation = useCallback(async () => {
    if (!videoData.id) return

    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/videos/${videoData.id}/skip-translation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const result = await res.json()

      if (!res.ok || !result.success) {
        throw new Error(result.error || '操作失败')
      }

      setCurrentStep(3)
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败')
    } finally {
      setIsLoading(false)
    }
  }, [videoData.id])

  // ============================================
  // 步骤 3: 生成卡片
  // ============================================

  const handleGenerateCards = useCallback(async () => {
    if (!videoData.id) return

    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/videos/${videoData.id}/generate-cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const result = await res.json()

      if (!res.ok || !result.success) {
        throw new Error(result.error || '生成失败')
      }

      setCardGenerationStatus(result.data?.cards || { words: 0, phrases: 0, expressions: 0, exercises: 0 })
      setCurrentStep(4)
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败')
    } finally {
      setIsLoading(false)
    }
  }, [videoData.id])

  // ============================================
  // 步骤 4: 跳转审核页面
  // ============================================

  const handleGoToReview = useCallback(() => {
    if (videoData.id) {
      router.push(`/admin/videos/${videoData.id}/cards`)
    }
  }, [videoData.id, router])

  const handleSkipReview = useCallback(() => {
    setCurrentStep(5)
  }, [])

  // ============================================
  // 步骤 5: 上传视频
  // ============================================

  const handleUploadVideo = useCallback(async (videoUrl: string) => {
    if (!videoData.id) return

    setIsLoading(true)
    setError(null)

    try {
      // 检测上传的文件类型，自动修正 content_type
      const isAudioFile = /\.(mp3|m4a|wav|ogg|aac|flac|wma)(\?|$)/i.test(videoUrl)
      const updateData: Record<string, any> = { video_url: videoUrl }

      // 如果是音频文件且当前类型不是audio，自动修正
      if (isAudioFile && videoData.content_type !== 'audio') {
        updateData.content_type = 'audio'
      }

      const res = await fetch(`/api/admin/videos/${videoData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      })

      const result = await res.json()

      if (!res.ok || !result.success) {
        throw new Error(result.error || '保存失败')
      }

      setVideoData(prev => ({
        ...prev,
        video_url: videoUrl,
        ...(isAudioFile && prev.content_type !== 'audio' ? { content_type: 'audio' } : {})
      }))
      setCurrentStep(6)
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setIsLoading(false)
    }
  }, [videoData.id, videoData.content_type])

  // ============================================
  // 步骤 6: 发布
  // ============================================

  const handlePublish = useCallback(async () => {
    if (!videoData.id) return

    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/videos/${videoData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'published',
          package_ids: videoData.package_ids,
        }),
      })

      const result = await res.json()

      if (!res.ok || !result.success) {
        throw new Error(result.error || '发布失败')
      }

      // 跳转到视频列表
      router.push('/admin/videos')
    } catch (err) {
      setError(err instanceof Error ? err.message : '发布失败')
    } finally {
      setIsLoading(false)
    }
  }, [videoData.id, videoData.package_ids, router])

  // ============================================
  // 渲染步骤内容
  // ============================================

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-black text-black dark:text-white mb-2">
                上传字幕文件
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                上传 JSON 格式的字幕文件，AI 将自动分析语言、难度并提取关键词
              </p>
            </div>

            <div className="border-[3px] border-black dark:border-gray-600 border-dashed p-8 text-center">
              <input
                type="file"
                accept=".json"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    setSubtitleFile(file)
                    setError(null)
                  }
                }}
                className="hidden"
                id="subtitle-upload"
              />
              <label
                htmlFor="subtitle-upload"
                className="cursor-pointer"
              >
                <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="font-bold text-black dark:text-white">
                  {subtitleFile ? subtitleFile.name : '点击选择字幕文件'}
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  格式: {'{ "sentences": [{ "id": 1, "text": "...", "start_time": 0, "end_time": 2.5 }] }'}
                </p>
              </label>
            </div>

            {analysisResult && (
              <div className="bg-green-50 dark:bg-green-900/30 border-2 border-green-300 dark:border-green-700 p-4">
                <h3 className="font-bold text-green-700 dark:text-green-300 mb-2">AI 分析结果</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>语言: {LANGUAGE_FLAGS[analysisResult.language]} {VIDEO_LANGUAGE_LABELS[analysisResult.language]}</div>
                  <div>难度: {VIDEO_DIFFICULTY_LABELS[analysisResult.difficulty]}</div>
                  <div>时长: {Math.floor(analysisResult.duration / 60)}:{String(analysisResult.duration % 60).padStart(2, '0')}</div>
                  <div>句子数: {analysisResult.total_sentences}</div>
                  <div>词汇评分: {analysisResult.difficulty_analysis.vocabulary_score}/10</div>
                  <div>语速: {analysisResult.difficulty_analysis.speech_rate} 词/分钟</div>
                </div>
                <p className="text-xs text-gray-500 mt-2">{analysisResult.difficulty_analysis.reason}</p>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                onClick={handleSubtitleUpload}
                disabled={!subtitleFile || isLoading}
                className="bg-green-500 hover:bg-green-600 text-white font-bold border-[3px] border-black shadow-[3px_3px_0px_0px_#000]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    分析中...
                  </>
                ) : (
                  <>
                    上传并分析
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )

      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-black text-black dark:text-white mb-2">
                基本信息
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                确认或修改视频的基本信息
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-bold mb-2">标题 *</label>
                <input
                  type="text"
                  value={videoData.title}
                  onChange={(e) => setVideoData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-3 border-[3px] border-black dark:border-gray-600 bg-white dark:bg-gray-800 font-semibold"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-bold mb-2">描述</label>
                <textarea
                  value={videoData.description}
                  onChange={(e) => setVideoData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 border-[3px] border-black dark:border-gray-600 bg-white dark:bg-gray-800 font-semibold resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">内容类型 *</label>
                <select
                  value={videoData.content_type}
                  onChange={(e) => setVideoData(prev => ({ ...prev, content_type: e.target.value as ContentType }))}
                  className="w-full px-4 py-3 border-[3px] border-black dark:border-gray-600 bg-white dark:bg-gray-800 font-semibold"
                >
                  {Object.entries(CONTENT_TYPE_LABELS).map(([code, label]) => (
                    <option key={code} value={code}>{label}</option>
                  ))}
                </select>
              </div>

              {/* 封面图上传（视频和音频通用） */}
              <div>
                <label className="block text-sm font-bold mb-2">封面图</label>
                <div className="flex items-start gap-3">
                  {videoData.cover_url ? (
                    <div className="relative w-24 h-24 border-[3px] border-black flex-shrink-0">
                      <img src={videoData.cover_url} alt="封面预览" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setVideoData(prev => ({ ...prev, cover_url: '' }))}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setCoverImageModalOpen(true)}
                      className="w-24 h-24 border-[3px] border-dashed border-black dark:border-gray-600 flex flex-col items-center justify-center gap-1 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <Upload className="w-5 h-5 text-gray-400" />
                      <span className="text-[10px] font-bold text-gray-400">上传封面</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setCoverImageModalOpen(true)}
                    className="px-3 py-1.5 text-xs font-bold border-[3px] border-black dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-[#B4F416] transition-colors"
                  >
                    {videoData.cover_url ? '更换封面' : '选择图片'}
                  </button>
                </div>
                <ImageUploadModal
                  isOpen={coverImageModalOpen}
                  onClose={() => setCoverImageModalOpen(false)}
                  onConfirm={(url) => {
                    setVideoData(prev => ({ ...prev, cover_url: url }))
                    setCoverImageModalOpen(false)
                  }}
                  currentImageUrl={videoData.cover_url}
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">语言 *</label>
                <select
                  value={videoData.language}
                  onChange={(e) => setVideoData(prev => ({ ...prev, language: e.target.value as VideoLanguage }))}
                  className="w-full px-4 py-3 border-[3px] border-black dark:border-gray-600 bg-white dark:bg-gray-800 font-semibold"
                >
                  {Object.entries(VIDEO_LANGUAGE_LABELS).map(([code, label]) => (
                    <option key={code} value={code}>{LANGUAGE_FLAGS[code as VideoLanguage]} {label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">难度 *</label>
                <select
                  value={videoData.difficulty}
                  onChange={(e) => setVideoData(prev => ({ ...prev, difficulty: e.target.value as VideoDifficulty }))}
                  className="w-full px-4 py-3 border-[3px] border-black dark:border-gray-600 bg-white dark:bg-gray-800 font-semibold"
                >
                  {Object.entries(VIDEO_DIFFICULTY_LABELS).map(([code, label]) => (
                    <option key={code} value={code}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">创作者</label>
                <input
                  type="text"
                  value={videoData.creator_name}
                  onChange={(e) => setVideoData(prev => ({ ...prev, creator_name: e.target.value }))}
                  className="w-full px-4 py-3 border-[3px] border-black dark:border-gray-600 bg-white dark:bg-gray-800 font-semibold"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2">来源 URL</label>
                <input
                  type="text"
                  value={videoData.source_url}
                  onChange={(e) => setVideoData(prev => ({ ...prev, source_url: e.target.value }))}
                  className="w-full px-4 py-3 border-[3px] border-black dark:border-gray-600 bg-white dark:bg-gray-800 font-semibold"
                />
              </div>
            </div>

            <div className="flex justify-between">
              <Button
                onClick={() => setCurrentStep(0)}
                variant="outline"
                className="font-bold border-[3px] border-black"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                上一步
              </Button>
              <Button
                onClick={handleSaveInfo}
                disabled={!videoData.title || isLoading}
                className="bg-green-500 hover:bg-green-600 text-white font-bold border-[3px] border-black shadow-[3px_3px_0px_0px_#000]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    保存并继续
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-black text-black dark:text-white mb-2">
                字幕翻译
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                将字幕翻译为中文，方便学习者理解
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-300 dark:border-blue-700 p-6 text-center">
              <Languages className="w-12 h-12 mx-auto mb-4 text-blue-500" />
              <p className="font-bold text-blue-700 dark:text-blue-300 mb-2">
                使用 MyMemory 免费翻译服务
              </p>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                每天免费额度: 10,000 字符
              </p>
            </div>

            <div className="flex justify-between">
              <Button
                onClick={() => setCurrentStep(1)}
                variant="outline"
                className="font-bold border-[3px] border-black"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                上一步
              </Button>
              <div className="flex gap-2">
                <Button
                  onClick={handleSkipTranslation}
                  variant="outline"
                  className="font-bold border-[3px] border-black"
                  disabled={isLoading}
                >
                  <SkipForward className="w-4 h-4 mr-2" />
                  跳过翻译
                </Button>
                <Button
                  onClick={handleTranslate}
                  className="bg-green-500 hover:bg-green-600 text-white font-bold border-[3px] border-black shadow-[3px_3px_0px_0px_#000]"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      翻译中...
                    </>
                  ) : (
                    <>
                      开始翻译
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-black text-black dark:text-white mb-2">
                生成知识点卡片
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                AI 将从字幕中提取单词、短语和地道表达
              </p>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/30 border-2 border-purple-300 dark:border-purple-700 p-6 text-center">
              <Sparkles className="w-12 h-12 mx-auto mb-4 text-purple-500" />
              <p className="font-bold text-purple-700 dark:text-purple-300 mb-2">
                使用 GLM AI 分析字幕内容
              </p>
              <p className="text-sm text-purple-600 dark:text-purple-400">
                自动生成：单词卡片、短语卡片、地道表达、填空练习
              </p>
            </div>

            {cardGenerationStatus && (
              <div className="bg-green-50 dark:bg-green-900/30 border-2 border-green-300 dark:border-green-700 p-4">
                <h3 className="font-bold text-green-700 dark:text-green-300 mb-2">生成完成</h3>
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-black">{cardGenerationStatus.words}</div>
                    <div className="text-sm text-gray-500">单词</div>
                  </div>
                  <div>
                    <div className="text-2xl font-black">{cardGenerationStatus.phrases}</div>
                    <div className="text-sm text-gray-500">短语</div>
                  </div>
                  <div>
                    <div className="text-2xl font-black">{cardGenerationStatus.expressions}</div>
                    <div className="text-sm text-gray-500">表达</div>
                  </div>
                  <div>
                    <div className="text-2xl font-black">{cardGenerationStatus.exercises}</div>
                    <div className="text-sm text-gray-500">练习</div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <Button
                onClick={() => setCurrentStep(2)}
                variant="outline"
                className="font-bold border-[3px] border-black"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                上一步
              </Button>
              <Button
                onClick={handleGenerateCards}
                className="bg-purple-500 hover:bg-purple-600 text-white font-bold border-[3px] border-black shadow-[3px_3px_0px_0px_#000]"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    生成卡片
                  </>
                )}
              </Button>
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-black text-black dark:text-white mb-2">
                审核卡片
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                检查 AI 生成的卡片，修改或删除不准确的内容
              </p>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/30 border-2 border-yellow-300 dark:border-yellow-700 p-6 text-center">
              <CheckSquare className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
              <p className="font-bold text-yellow-700 dark:text-yellow-300 mb-2">
                建议审核后再发布
              </p>
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                确保卡片内容准确，提升学习体验
              </p>
            </div>

            <div className="flex justify-between">
              <Button
                onClick={() => setCurrentStep(3)}
                variant="outline"
                className="font-bold border-[3px] border-black"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                上一步
              </Button>
              <div className="flex gap-2">
                <Button
                  onClick={handleSkipReview}
                  variant="outline"
                  className="font-bold border-[3px] border-black"
                >
                  稍后审核
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
                <Button
                  onClick={handleGoToReview}
                  className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold border-[3px] border-black shadow-[3px_3px_0px_0px_#000]"
                >
                  <CheckSquare className="w-4 h-4 mr-2" />
                  去审核
                </Button>
              </div>
            </div>
          </div>
        )

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-black text-black dark:text-white mb-2">
                {videoData.content_type === 'audio' ? '上传音频' : '上传视频'}
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                {videoData.content_type === 'audio' ? '上传音频文件或填写音频 URL（可选）' : '上传视频文件或填写视频 URL（可选）'}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2">
                  {videoData.content_type === 'audio' ? '上传音频文件' : '上传视频文件'}
                </label>
                <VideoUploadField
                  value={videoData.video_url}
                  onChange={(url, duration) => {
                    setVideoData(prev => ({ ...prev, video_url: url, duration: duration || prev.duration }))
                  }}
                  accept={videoData.content_type === 'audio' ? 'audio/*' : 'video/*'}
                />
              </div>
            </div>

            <div className="flex justify-between">
              <Button
                onClick={() => setCurrentStep(4)}
                variant="outline"
                className="font-bold border-[3px] border-black"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                上一步
              </Button>
              <div className="flex gap-2">
                <Button
                  onClick={() => setCurrentStep(6)}
                  variant="outline"
                  className="font-bold border-[3px] border-black"
                >
                  <SkipForward className="w-4 h-4 mr-2" />
                  稍后上传
                </Button>
                <Button
                  onClick={() => videoData.video_url ? handleUploadVideo(videoData.video_url) : setCurrentStep(6)}
                  className="bg-green-500 hover:bg-green-600 text-white font-bold border-[3px] border-black shadow-[3px_3px_0px_0px_#000]"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    <>
                      {videoData.video_url ? '保存并继续' : '跳过'}
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )

      case 6:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-black text-black dark:text-white mb-2">
                发布视频
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                选择关联套餐后发布视频
              </p>
            </div>

            <div className="bg-green-50 dark:bg-green-900/30 border-2 border-green-300 dark:border-green-700 p-6 text-center">
              <Send className="w-12 h-12 mx-auto mb-4 text-green-500" />
              <p className="font-bold text-green-700 dark:text-green-300 mb-2">
                准备就绪！
              </p>
              <p className="text-sm text-green-600 dark:text-green-400">
                点击发布后，用户将可以看到这个视频
              </p>
            </div>

            <div className="flex justify-between">
              <Button
                onClick={() => setCurrentStep(5)}
                variant="outline"
                className="font-bold border-[3px] border-black"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                上一步
              </Button>
              <Button
                onClick={handlePublish}
                className="bg-green-500 hover:bg-green-600 text-white font-bold border-[3px] border-black shadow-[3px_3px_0px_0px_#000]"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    发布中...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    发布视频
                  </>
                )}
              </Button>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  // ============================================
  // 渲染
  // ============================================

  // 恢复状态中
  if (isRestoring) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-green-500" />
          <p className="text-gray-600 dark:text-gray-400">恢复工作流状态...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* 返回链接 */}
      <Link
        href="/admin/videos"
        className="inline-flex items-center text-sm text-gray-500 hover:text-black dark:hover:text-white mb-6"
      >
        <ChevronLeft className="w-4 h-4 mr-1" />
        返回视频列表
      </Link>

      {/* 步骤指示器 */}
      <div className="flex items-center justify-between mb-8 overflow-x-auto pb-2">
        {STEPS.map((step, index) => {
          const Icon = step.icon
          const isActive = currentStep === index
          const isCompleted = index < currentStep

          return (
            <div
              key={step.key}
              className="flex items-center flex-shrink-0"
            >
              <div
                className={cn(
                  "flex flex-col items-center",
                  isActive && "text-green-500",
                  isCompleted && "text-green-500",
                  !isActive && !isCompleted && "text-gray-400"
                )}
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-[3px] font-bold",
                    isActive && "border-green-500 bg-green-50 dark:bg-green-900/30",
                    isCompleted && "border-green-500 bg-green-500 text-white",
                    !isActive && !isCompleted && "border-gray-300 dark:border-gray-600"
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                <span className="text-xs mt-1 font-semibold whitespace-nowrap">
                  {step.label}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    "w-8 h-[3px] mx-1",
                    index < currentStep ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
                  )}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* 步骤内容 */}
      <div className="bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-600 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666] p-6">
        {renderStepContent()}

        {/* 错误提示 */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/30 border-2 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 font-semibold">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
