'use client'

/**
 * 视频管理 - 客户端组件
 * Neo-brutalism 风格
 */

import { useState, useCallback, useEffect } from 'react'
import useSWR from 'swr'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  ExternalLink,
  Clock,
  Eye,
  Play,
  ImageIcon,
  Sparkles,
  Upload,
  Layers,
  Rocket,
  ArrowLeft,
} from 'lucide-react'
import { VideoUploadField } from '@/components/admin/VideoUploadField'
import ImageUploadModal from '@/components/admin/ImageUploadModal'
import Link from 'next/link'
import type { Video, VideoLanguage, VideoDifficulty, VideoStatus, WorkflowProgress, WorkflowStepStatus } from '@/types/video'
import { VIDEO_LANGUAGE_LABELS, VIDEO_DIFFICULTY_LABELS, formatDuration, WORKFLOW_STEPS } from '@/types/video'

// SWR fetcher
const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

// 视频状态配置
const STATUS_CONFIG: Record<VideoStatus, { label: string; bgColor: string; borderColor: string }> = {
  draft: { label: '草稿', bgColor: 'bg-gray-300 dark:bg-gray-600', borderColor: 'border-gray-500' },
  published: { label: '已发布', bgColor: 'bg-green-400 dark:bg-green-600', borderColor: 'border-green-500' },
  archived: { label: '已归档', bgColor: 'bg-yellow-400 dark:bg-yellow-600', borderColor: 'border-yellow-500' },
}

// 难度颜色配置
const DIFFICULTY_COLORS: Record<VideoDifficulty, string> = {
  beginner: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700',
  intermediate: 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 border-purple-300 dark:border-purple-700',
  advanced: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700',
}

// 语言国旗
const LANGUAGE_FLAGS: Record<VideoLanguage, string> = {
  en: '🇬🇧',
  fr: '🇫🇷',
  de: '🇩🇪',
  es: '🇪🇸',
  ja: '🇯🇵',
  it: '🇮🇹',
  ru: '🇷🇺',
}

// 工作流步骤状态颜色
const WORKFLOW_STEP_COLORS: Record<WorkflowStepStatus, string> = {
  pending: 'bg-gray-300 dark:bg-gray-600',
  in_progress: 'bg-blue-400 dark:bg-blue-600',
  completed: 'bg-green-500 dark:bg-green-600',
  skipped: 'bg-yellow-400 dark:bg-yellow-600',
}

// 工作流步骤边框颜色
const WORKFLOW_STEP_BORDER: Record<WorkflowStepStatus, string> = {
  pending: 'border-gray-400 dark:border-gray-500',
  in_progress: 'border-blue-500',
  completed: 'border-green-600',
  skipped: 'border-yellow-500',
}

// 工作流步骤组件
function WorkflowStepsIndicator({ progress }: { progress: WorkflowProgress | null }) {
  if (!progress) {
    return (
      <div className="flex items-center gap-1 text-xs text-gray-400 font-semibold">
        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600">
          无工作流
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1">
      {WORKFLOW_STEPS.map((step, index) => {
        const status = progress.steps[step.key]
        const isActive = progress.current_step === index
        return (
          <div
            key={step.key}
            className={cn(
              "relative flex items-center justify-center w-7 h-7 text-[10px] font-black border-2 transition-all",
              WORKFLOW_STEP_COLORS[status],
              WORKFLOW_STEP_BORDER[status],
              isActive && "ring-2 ring-offset-1 ring-blue-400 dark:ring-offset-gray-800"
            )}
            title={`${step.label}: ${status === 'completed' ? '已完成' : status === 'in_progress' ? '进行中' : status === 'skipped' ? '已跳过' : '待处理'}`}
          >
            {status === 'completed' ? '✓' : status === 'skipped' ? '○' : index + 1}
            {index < WORKFLOW_STEPS.length - 1 && (
              <div className={cn(
                "absolute left-full w-1 h-[2px]",
                progress.steps[WORKFLOW_STEPS[index + 1].key] !== 'pending' || status === 'completed'
                  ? "bg-green-500"
                  : "bg-gray-300 dark:bg-gray-600"
              )} />
            )}
          </div>
        )
      })}
    </div>
  )
}

interface VideoFormData {
  title: string
  description: string
  video_url: string
  thumbnail_url: string
  duration: number
  language: VideoLanguage
  difficulty: VideoDifficulty
  status: VideoStatus
  creator_name: string
  source_url: string
  package_ids: string[]
  tags: string[]
}

const initialFormData: VideoFormData = {
  title: '',
  description: '',
  video_url: '',
  thumbnail_url: '',
  duration: 0,
  language: 'en',
  difficulty: 'beginner',
  status: 'draft',
  creator_name: '',
  source_url: '',
  package_ids: [],
  tags: [],
}

interface VideoPackage {
  id: string
  name: string
  description?: string
  feature_permissions?: string[]
  is_active: boolean
}

export function VideoManagementClient() {
  const [search, setSearch] = useState('')
  const [languageFilter, setLanguageFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingVideo, setEditingVideo] = useState<Video | null>(null)
  const [formData, setFormData] = useState<VideoFormData>(initialFormData)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isThumbnailModalOpen, setIsThumbnailModalOpen] = useState(false)
  const [subtitleFile, setSubtitleFile] = useState<File | null>(null)
  const [isUploadingSubtitles, setIsUploadingSubtitles] = useState(false)
  const [subtitleUploadStatus, setSubtitleUploadStatus] = useState<{ success: boolean; message: string } | null>(null)
  const [isGeneratingCards, setIsGeneratingCards] = useState(false)
  const [cardGenerationStatus, setCardGenerationStatus] = useState<{ success: boolean; message: string } | null>(null)
  const [isTranslating, setIsTranslating] = useState(false)
  const [translationStatus, setTranslationStatus] = useState<{ success: boolean; message: string } | null>(null)
  const [isSkippingTranslation, setIsSkippingTranslation] = useState(false)

  const { data, error, isLoading, mutate } = useSWR(
    `/api/admin/videos?search=${search}&language=${languageFilter}&status=${statusFilter}`,
    fetcher
  )

  // 获取邀请码套餐列表（复用现有 invitation_packages 系统）
  const { data: packagesData } = useSWR(
    '/api/admin/packages?is_active=true',
    fetcher
  )

  const fetchVideoPackages = useCallback(async (videoId: string) => {
    try {
      // 直接从视频详情获取 package_ids（复用 invitation_packages）
      const res = await fetch(`/api/admin/videos/${videoId}`)
      if (res.ok) {
        const json = await res.json()
        const packageIds = json.data?.package_ids || []
        setFormData((prev) => ({ ...prev, package_ids: packageIds }))
      }
    } catch (error) {
      // 静默处理
    }
  }, [])

  // 字幕文件上传处理
  const handleSubtitleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSubtitleFile(file)
      setSubtitleUploadStatus(null)
    }
  }

  // 上传字幕文件
  const handleUploadSubtitles = async () => {
    if (!subtitleFile || !editingVideo) return

    setIsUploadingSubtitles(true)
    setSubtitleUploadStatus(null)

    try {
      const text = await subtitleFile.text()
      const data = JSON.parse(text)

      const res = await fetch(`/api/admin/videos/${editingVideo.id}/subtitles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await res.json()

      if (res.ok && result.success) {
        setSubtitleUploadStatus({ success: true, message: result.message })
        setSubtitleFile(null)
      } else {
        setSubtitleUploadStatus({ success: false, message: result.error || '上传失败' })
      }
    } catch (error) {
      setSubtitleUploadStatus({ success: false, message: '文件解析失败，请检查 JSON 格式' })
    } finally {
      setIsUploadingSubtitles(false)
    }
  }

  // AI 生成知识点卡片
  const handleGenerateCards = async () => {
    if (!editingVideo) return

    setIsGeneratingCards(true)
    setCardGenerationStatus(null)

    try {
      const res = await fetch(`/api/admin/videos/${editingVideo.id}/generate-cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const result = await res.json()

      if (res.ok && result.success) {
        setCardGenerationStatus({
          success: true,
          message: result.message || 'AI 卡片生成成功',
        })
      } else {
        setCardGenerationStatus({
          success: false,
          message: result.error || 'AI 生成失败',
        })
      }
    } catch (error) {
      setCardGenerationStatus({
        success: false,
        message: '网络错误，请重试',
      })
    } finally {
      setIsGeneratingCards(false)
    }
  }

  // 翻译字幕
  const handleTranslateSubtitles = async () => {
    if (!editingVideo) return

    setIsTranslating(true)
    setTranslationStatus(null)

    try {
      const res = await fetch(`/api/admin/videos/${editingVideo.id}/translate-subtitles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const result = await res.json()

      if (res.ok && result.success) {
        setTranslationStatus({
          success: true,
          message: result.message || '翻译成功',
        })
      } else {
        setTranslationStatus({
          success: false,
          message: result.error || '翻译失败',
        })
      }
    } catch (error) {
      setTranslationStatus({
        success: false,
        message: '网络错误，请重试',
      })
    } finally {
      setIsTranslating(false)
    }
  }

  // 跳过字幕翻译
  const handleSkipTranslation = async () => {
    if (!editingVideo) return

    setIsSkippingTranslation(true)

    try {
      const res = await fetch(`/api/admin/videos/${editingVideo.id}/skip-translation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const result = await res.json()

      if (res.ok && result.success) {
        setTranslationStatus({
          success: true,
          message: '已跳过字幕翻译',
        })
        // 刷新数据以更新工作流状态
        mutate()
      } else {
        setTranslationStatus({
          success: false,
          message: result.error || '操作失败',
        })
      }
    } catch (error) {
      setTranslationStatus({
        success: false,
        message: '网络错误，请重试',
      })
    } finally {
      setIsSkippingTranslation(false)
    }
  }

  const handleEdit = async (video: Video & { tags?: Array<{ id: string; name: string }> }) => {
    setEditingVideo(video)
    setFormData({
      title: video.title,
      description: video.description || '',
      video_url: video.video_url,
      thumbnail_url: video.thumbnail_url || '',
      duration: video.duration,
      language: video.language,
      difficulty: video.difficulty,
      status: video.status,
      creator_name: video.creator_name || '',
      source_url: video.source_url || '',
      package_ids: [],
      tags: video.tags?.map(t => t.name) || [],
    })
    await fetchVideoPackages(video.id)
    setIsDialogOpen(true)
  }

  const handleDelete = async (videoId: string) => {
    if (!confirm('确定要删除这个视频吗？')) return
    try {
      await fetch(`/api/admin/videos/${videoId}`, { method: 'DELETE' })
      mutate()
    } catch (error) {
      // 静默处理
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      let response: Response
      if (editingVideo) {
        // 更新视频（package_ids 直接保存在 videos 表）
        response = await fetch(`/api/admin/videos/${editingVideo.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
      } else {
        // 创建视频（package_ids 直接保存在 videos 表）
        response = await fetch('/api/admin/videos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
      }

      const result = await response.json()
      if (result.success) {
        setIsDialogOpen(false)
        mutate()
      } else {
        alert(result.error || '保存失败')
      }
    } catch (error) {
      alert('保存失败，请重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 操作栏 */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* 搜索框 */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="搜索视频..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border-[3px] border-black dark:border-gray-600 bg-white dark:bg-gray-800 text-black dark:text-white font-semibold focus:ring-2 focus:ring-green-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {/* 语言筛选 */}
          <select
            value={languageFilter}
            onChange={(e) => setLanguageFilter(e.target.value)}
            className="px-4 py-3 font-bold border-[3px] border-black dark:border-gray-600 bg-white dark:bg-gray-800 text-black dark:text-white focus:outline-none cursor-pointer"
          >
            <option value="all">全部语言</option>
            {Object.entries(VIDEO_LANGUAGE_LABELS).map(([code, label]) => (
              <option key={code} value={code}>{LANGUAGE_FLAGS[code as VideoLanguage] || ''} {label}</option>
            ))}
          </select>

          {/* 状态筛选 */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 font-bold border-[3px] border-black dark:border-gray-600 bg-white dark:bg-gray-800 text-black dark:text-white focus:outline-none cursor-pointer"
          >
            <option value="all">全部状态</option>
            {Object.entries(STATUS_CONFIG).map(([code, { label }]) => (
              <option key={code} value={code}>{label}</option>
            ))}
          </select>

          {/* 添加按钮 - 指向工作流 */}
          <Link
            href="/admin/videos/new"
            className="inline-flex items-center px-4 py-3 bg-green-500 hover:bg-green-600 text-white font-bold border-[3px] border-black shadow-[3px_3px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5 transition-all"
          >
            <Plus className="w-4 h-4 mr-2" />
            创建视频
          </Link>

          {/* 批量上传按钮 */}
          <Link
            href="/admin/videos/batch-upload"
            className="inline-flex items-center px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold border-[3px] border-black shadow-[3px_3px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5 transition-all"
          >
            <Layers className="w-4 h-4 mr-2" />
            批量上传
          </Link>

          {/* 批量发布按钮 */}
          <Link
            href="/admin/videos/batch-publish"
            className="inline-flex items-center px-4 py-3 bg-purple-500 hover:bg-purple-600 text-white font-bold border-[3px] border-black shadow-[3px_3px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5 transition-all"
          >
            <Rocket className="w-4 h-4 mr-2" />
            批量发布
          </Link>
        </div>
      </div>

      {/* 加载状态 */}
      {isLoading && (
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 animate-pulse border-[3px] border-black dark:border-gray-600" />
          ))}
        </div>
      )}

      {/* 错误状态 */}
      {error && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-600 p-8">
          <p className="text-gray-500 dark:text-gray-400 font-bold mb-4">加载失败</p>
          <Button
            onClick={() => mutate()}
            className="bg-blue-500 text-white font-bold border-[3px] border-black shadow-[3px_3px_0px_0px_#000]"
          >
            重试
          </Button>
        </div>
      )}

      {/* 视频卡片列表 */}
      {data?.data?.items && (
        <div className="grid gap-4">
          {data.data.items.map((video: Video & { view_count: number }) => (
            <div
              key={video.id}
              className="bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-600 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666] p-4 transition-all hover:shadow-[6px_6px_0px_0px_#000] dark:hover:shadow-[6px_6px_0px_0px_#666] hover:-translate-y-1"
            >
              <div className="flex flex-col md:flex-row gap-4">
                {/* 缩略图 */}
                <div className="w-full md:w-48 h-28 bg-gray-100 dark:bg-gray-700 border-[2px] border-black dark:border-gray-500 flex-shrink-0 overflow-hidden flex items-center justify-center">
                  {video.thumbnail_url ? (
                    <img
                      src={video.thumbnail_url}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Play className="w-8 h-8 text-gray-400" />
                      <span className="text-xs text-gray-400 font-bold">无缩略图</span>
                    </div>
                  )}
                </div>

                {/* 视频信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-start gap-2 mb-2">
                    <h3 className="text-lg font-black text-black dark:text-white truncate">
                      {video.title}
                    </h3>
                    <span className={`px-2 py-0.5 text-xs font-bold border-2 ${STATUS_CONFIG[video.status].bgColor} ${STATUS_CONFIG[video.status].borderColor} text-black`}>
                      {STATUS_CONFIG[video.status].label}
                    </span>
                  </div>

                  {video.creator_name && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-semibold mb-2">
                      {video.creator_name}
                    </p>
                  )}

                  {/* 标签行 */}
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="px-3 py-1 text-xs font-bold bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-2 border-blue-300 dark:border-blue-700">
                      {LANGUAGE_FLAGS[video.language]} {VIDEO_LANGUAGE_LABELS[video.language]}
                    </span>
                    <span className={`px-3 py-1 text-xs font-bold border-2 ${DIFFICULTY_COLORS[video.difficulty]}`}>
                      {VIDEO_DIFFICULTY_LABELS[video.difficulty]}
                    </span>
                    <span className="flex items-center gap-1 px-3 py-1 text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-2 border-gray-300 dark:border-gray-600">
                      <Clock className="w-3 h-3" />
                      {formatDuration(video.duration)}
                    </span>
                    <span className="flex items-center gap-1 px-3 py-1 text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-2 border-gray-300 dark:border-gray-600">
                      <Eye className="w-3 h-3" />
                      {video.view_count || 0}
                    </span>
                  </div>

                  {/* 工作流进度 */}
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400">工作流:</span>
                    <WorkflowStepsIndicator progress={video.workflow_progress} />
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex md:flex-col gap-2 flex-shrink-0">
                  {/* 继续工作流 */}
                  {video.status !== 'published' && (
                    <Link
                      href={`/admin/videos/new?step=${video.workflow_progress?.current_step || 0}&videoId=${video.id}`}
                      className="px-4 py-2 font-bold text-sm bg-green-400 text-black border-[3px] border-black shadow-[2px_2px_0px_0px_#000] hover:shadow-[3px_3px_0px_0px_#000] hover:-translate-y-0.5 transition-all flex items-center gap-1"
                    >
                      <Play className="w-4 h-4" />
                      继续
                    </Link>
                  )}
                  {/* 改为草稿 - 已发布的视频显示 */}
                  {video.status === 'published' && (
                    <button
                      onClick={async () => {
                        if (!confirm('确定要将此视频改为草稿吗？')) return
                        try {
                          const res = await fetch('/api/admin/videos/batch-publish', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              video_id: video.id,
                              updates: { status: 'draft' }
                            })
                          })
                          if (res.ok) {
                            mutate()
                          } else {
                            alert('操作失败')
                          }
                        } catch {
                          alert('操作失败')
                        }
                      }}
                      className="px-4 py-2 font-bold text-sm bg-gray-400 text-black border-[3px] border-black shadow-[2px_2px_0px_0px_#000] hover:shadow-[3px_3px_0px_0px_#000] hover:-translate-y-0.5 transition-all flex items-center gap-1"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      改为草稿
                    </button>
                  )}
                  {/* 卡片 - 暂时隐藏 */}
                  {/* <Link
                    href={`/admin/videos/${video.id}/cards`}
                    className="px-4 py-2 font-bold text-sm bg-purple-400 text-black border-[3px] border-black shadow-[2px_2px_0px_0px_#000] hover:shadow-[3px_3px_0px_0px_#000] hover:-translate-y-0.5 transition-all flex items-center gap-1"
                  >
                    <Layers className="w-4 h-4" />
                    卡片
                  </Link> */}
                  {/* 编辑 - 暂时隐藏 */}
                  {/* <button
                    onClick={() => handleEdit(video)}
                    className="px-4 py-2 font-bold text-sm bg-yellow-400 text-black border-[3px] border-black shadow-[2px_2px_0px_0px_#000] hover:shadow-[3px_3px_0px_0px_#000] hover:-translate-y-0.5 transition-all flex items-center gap-1"
                  >
                    <Pencil className="w-4 h-4" />
                    编辑
                  </button> */}
                  <button
                    onClick={() => handleDelete(video.id)}
                    className="px-4 py-2 font-bold text-sm bg-red-500 text-white border-[3px] border-black shadow-[2px_2px_0px_0px_#000] hover:shadow-[3px_3px_0px_0px_#000] hover:-translate-y-0.5 transition-all flex items-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))}

          {data.data.items?.length === 0 && (
            <div className="text-center py-16 bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-600">
              <Play className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 font-bold text-lg">暂无视频</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">点击"添加视频"创建第一个视频</p>
            </div>
          )}
        </div>
      )}

      {/* 编辑/新建弹窗 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 border-[3px] border-black dark:border-gray-600 shadow-[6px_6px_0px_0px_#000] dark:shadow-[6px_6px_0px_0px_#666]">
          <DialogHeader className="border-b-[3px] border-black dark:border-gray-700 pb-4">
            <DialogTitle className="text-2xl font-black text-black dark:text-white">
              {editingVideo ? '编辑视频' : '添加视频'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
            {/* 标题 */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-bold text-black dark:text-white mb-2">
                标题 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="视频标题"
                className="w-full px-4 py-3 border-[3px] border-black dark:border-gray-600 bg-white dark:bg-gray-800 text-black dark:text-white font-semibold focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
            </div>

            {/* 描述 */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-bold text-black dark:text-white mb-2">描述</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="视频描述"
                rows={3}
                className="w-full px-4 py-3 border-[3px] border-black dark:border-gray-600 bg-white dark:bg-gray-800 text-black dark:text-white font-semibold focus:ring-2 focus:ring-green-500 focus:outline-none resize-none"
              />
            </div>

            {/* 视频上传 */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-bold text-black dark:text-white mb-2">
                视频文件 <span className="text-red-500">*</span>
              </label>
              <VideoUploadField
                value={formData.video_url}
                onChange={(url, duration) => setFormData({ ...formData, video_url: url, duration: duration ?? formData.duration })}
              />
            </div>

            {/* 缩略图上传 */}
            <div>
              <label className="block text-sm font-bold text-black dark:text-white mb-2">缩略图</label>
              <div className="space-y-3">
                {/* 缩略图预览 */}
                {formData.thumbnail_url && (
                  <div className="relative w-full aspect-video bg-gray-100 dark:bg-gray-700 border-[3px] border-black dark:border-gray-600 overflow-hidden">
                    <img
                      src={formData.thumbnail_url}
                      alt="缩略图预览"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                {/* 上传按钮 */}
                <button
                  type="button"
                  onClick={() => setIsThumbnailModalOpen(true)}
                  className="w-full px-4 py-3 font-bold border-[3px] border-black dark:border-gray-600 bg-white dark:bg-gray-800 text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-all flex items-center justify-center gap-2"
                >
                  <ImageIcon className="w-4 h-4" />
                  {formData.thumbnail_url ? '更换缩略图' : '上传缩略图'}
                </button>
              </div>
            </div>

            {/* 时长 */}
            <div>
              <label className="block text-sm font-bold text-black dark:text-white mb-2">
                时长（秒）<span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })}
                placeholder="300"
                className="w-full px-4 py-3 border-[3px] border-black dark:border-gray-600 bg-white dark:bg-gray-800 text-black dark:text-white font-semibold focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
            </div>

            {/* 语言 */}
            <div>
              <label className="block text-sm font-bold text-black dark:text-white mb-2">
                语言 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.language}
                onChange={(e) => setFormData({ ...formData, language: e.target.value as VideoLanguage })}
                className="w-full px-4 py-3 border-[3px] border-black dark:border-gray-600 bg-white dark:bg-gray-800 text-black dark:text-white font-semibold focus:outline-none cursor-pointer"
              >
                {Object.entries(VIDEO_LANGUAGE_LABELS).map(([code, label]) => (
                  <option key={code} value={code}>{LANGUAGE_FLAGS[code as VideoLanguage] || ''} {label}</option>
                ))}
              </select>
            </div>

            {/* 难度 */}
            <div>
              <label className="block text-sm font-bold text-black dark:text-white mb-2">
                难度 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as VideoDifficulty })}
                className="w-full px-4 py-3 border-[3px] border-black dark:border-gray-600 bg-white dark:bg-gray-800 text-black dark:text-white font-semibold focus:outline-none cursor-pointer"
              >
                {Object.entries(VIDEO_DIFFICULTY_LABELS).map(([code, label]) => (
                  <option key={code} value={code}>{label}</option>
                ))}
              </select>
            </div>

            {/* 状态 */}
            <div>
              <label className="block text-sm font-bold text-black dark:text-white mb-2">
                状态 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as VideoStatus })}
                className="w-full px-4 py-3 border-[3px] border-black dark:border-gray-600 bg-white dark:bg-gray-800 text-black dark:text-white font-semibold focus:outline-none cursor-pointer"
              >
                {Object.entries(STATUS_CONFIG).map(([code, { label }]) => (
                  <option key={code} value={code}>{label}</option>
                ))}
              </select>
            </div>

            {/* 创作者 */}
            <div>
              <label className="block text-sm font-bold text-black dark:text-white mb-2">创作者</label>
              <input
                type="text"
                value={formData.creator_name}
                onChange={(e) => setFormData({ ...formData, creator_name: e.target.value })}
                placeholder="创作者名称"
                className="w-full px-4 py-3 border-[3px] border-black dark:border-gray-600 bg-white dark:bg-gray-800 text-black dark:text-white font-semibold focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
            </div>

            {/* 来源 URL */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-bold text-black dark:text-white mb-2">来源 URL</label>
              <input
                type="text"
                value={formData.source_url}
                onChange={(e) => setFormData({ ...formData, source_url: e.target.value })}
                placeholder="https://youtube.com/..."
                className="w-full px-4 py-3 border-[3px] border-black dark:border-gray-600 bg-white dark:bg-gray-800 text-black dark:text-white font-semibold focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
            </div>

            {/* 标签 */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-bold text-black dark:text-white mb-2">
                标签
                <span className="text-gray-500 font-normal ml-2">（用于分类筛选）</span>
              </label>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="tag-input"
                    placeholder="输入标签后按回车添加"
                    className="flex-1 px-4 py-3 border-[3px] border-black dark:border-gray-600 bg-white dark:bg-gray-800 text-black dark:text-white font-semibold focus:ring-2 focus:ring-green-500 focus:outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        const input = e.target as HTMLInputElement
                        const tag = input.value.trim()
                        if (tag && !formData.tags.includes(tag)) {
                          setFormData({ ...formData, tags: [...formData.tags, tag] })
                          input.value = ''
                        }
                      }
                    }}
                  />
                </div>
                {/* 已添加的标签 */}
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-2 border-green-300 dark:border-green-700 text-sm font-bold"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) })}
                          className="ml-1 hover:text-red-500 transition-colors"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  示例：美食、旅行、职场、日常、口语、听力
                </p>
              </div>
            </div>

            {/* 套餐关联 */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-bold text-black dark:text-white mb-2">
                关联套餐（邀请码套餐）
                {formData.package_ids.length === 0 && (
                  <span className="text-orange-500 ml-2">（至少选择一个套餐才能发布）</span>
                )}
              </label>
              <div className="border-[3px] border-black dark:border-gray-600 p-4 max-h-48 overflow-y-auto space-y-2 bg-gray-50 dark:bg-gray-800">
                {(packagesData?.packages?.length ?? 0) === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-semibold">暂无可用套餐，请先在"套餐管理"中创建</p>
                )}
                {(packagesData?.packages || []).map((pkg: VideoPackage) => (
                  <label
                    key={pkg.id}
                    className={cn(
                      "flex items-center gap-3 p-3 cursor-pointer border-[3px] transition-all",
                      formData.package_ids.includes(pkg.id)
                        ? "border-green-500 bg-green-50 dark:bg-green-900/30"
                        : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={formData.package_ids.includes(pkg.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({ ...formData, package_ids: [...formData.package_ids, pkg.id] })
                        } else {
                          setFormData({ ...formData, package_ids: formData.package_ids.filter((id) => id !== pkg.id) })
                        }
                      }}
                      className="w-5 h-5 border-[3px] border-black dark:border-gray-500"
                    />
                    <div className="flex-1">
                      <p className="font-bold text-sm text-black dark:text-white">{pkg.name}</p>
                      {pkg.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">{pkg.description}</p>
                      )}
                    </div>
                    {/* 显示是否有视频权限 */}
                    {pkg.feature_permissions?.includes('video') && (
                      <span className="px-2 py-1 text-xs font-bold bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 border-2 border-purple-300 dark:border-purple-700">
                                含视频权限
                      </span>
                    )}
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 font-semibold">
                已选择 {formData.package_ids.length} 个套餐 · 用户购买这些套餐后可观看此视频
              </p>
            </div>

            {/* 字幕上传 - 仅编辑模式 */}
            {editingVideo && (
              <div className="sm:col-span-2 border-t-[3px] border-black dark:border-gray-700 pt-4">
                <label className="block text-sm font-bold text-black dark:text-white mb-2">
                  字幕文件（JSON）
                </label>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleSubtitleFileChange}
                      className="flex-1 text-sm file:mr-4 file:py-2 file:border-[3px] file:border-black dark:file:border-gray-600 file:bg-white dark:file:bg-gray-800 file:text-black dark:file:text-white"
                    />
                    <button
                      type="button"
                      onClick={handleUploadSubtitles}
                      disabled={!subtitleFile || isUploadingSubtitles}
                      className="px-4 py-2 font-bold text-sm bg-blue-500 text-white border-[3px] border-black shadow-[2px_2px_0px_0px_#000] hover:shadow-[1px_1px_0px_0px_#000] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUploadingSubtitles ? '上传中...' : '上传字幕'}
                    </button>
                  </div>
                  {subtitleFile && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      已选择: {subtitleFile.name} ({(subtitleFile.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                  {subtitleUploadStatus && (
                    <div className={`p-2 text-sm font-semibold border-2 ${
                      subtitleUploadStatus.success
                        ? 'bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300'
                        : 'bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300'
                    }`}>
                      {subtitleUploadStatus.message}
                    </div>
                  )}
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    格式: {`{"sentences": [{"id": 1, "text": "...", "start_time": 0.0, "end_time": 2.5}]}`}
                  </p>
                </div>
              </div>
            )}

            {/* 字幕翻译 - 仅编辑模式 */}
            {editingVideo && (
              <div className="sm:col-span-2 border-t-[3px] border-black dark:border-gray-700 pt-4">
                <label className="block text-sm font-bold text-black dark:text-white mb-2">
                  字幕翻译
                </label>
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={handleTranslateSubtitles}
                      disabled={isTranslating}
                      className="px-4 py-3 font-bold text-sm bg-cyan-500 text-white border-[3px] border-black shadow-[3px_3px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isTranslating ? '翻译中...' : '翻译字幕'}
                    </button>
                    <button
                      type="button"
                      onClick={handleSkipTranslation}
                      disabled={isSkippingTranslation}
                      className="px-4 py-3 font-bold text-sm bg-gray-400 text-black border-[3px] border-black shadow-[3px_3px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSkippingTranslation ? '处理中...' : '跳过翻译'}
                    </button>
                  </div>
                  {translationStatus && (
                    <div className={`p-3 text-sm font-semibold border-2 ${
                      translationStatus.success
                        ? 'bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300'
                        : 'bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300'
                    }`}>
                      {translationStatus.message}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    使用 MyMemory（免费）或 DeepL 翻译字幕。如果不需要翻译，可以跳过此步骤。
                  </p>
                </div>
              </div>
            )}

            {/* AI 生成知识点卡片 - 仅编辑模式 */}
            {editingVideo && (
              <div className="sm:col-span-2 border-t-[3px] border-black dark:border-gray-700 pt-4">
                <label className="block text-sm font-bold text-black dark:text-white mb-2">
                  AI 生成知识点
                </label>
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={handleGenerateCards}
                      disabled={isGeneratingCards}
                      className="px-4 py-3 font-bold text-sm bg-purple-500 text-white border-[3px] border-black shadow-[3px_3px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      {isGeneratingCards ? 'AI 生成中...' : 'AI 生成知识点卡片'}
                    </button>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      根据字幕内容自动生成单词、短语和地道表达卡片
                    </p>
                  </div>
                  {cardGenerationStatus && (
                    <div className={`p-3 text-sm font-semibold border-2 ${
                      cardGenerationStatus.success
                        ? 'bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300'
                        : 'bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300'
                    }`}>
                      {cardGenerationStatus.message}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="border-t-[3px] border-black dark:border-gray-700 pt-4 gap-3">
            <button
              type="button"
              onClick={() => setIsDialogOpen(false)}
              className="px-6 py-3 font-bold bg-gray-200 dark:bg-gray-700 text-black dark:text-white border-[3px] border-black dark:border-gray-600 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
              disabled={isSubmitting}
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !formData.title || !formData.video_url}
              className="px-6 py-3 font-bold bg-green-500 text-white border-[3px] border-black shadow-[3px_3px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '保存中...' : '保存'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 缩略图上传模态框 */}
      <ImageUploadModal
        isOpen={isThumbnailModalOpen}
        onClose={() => setIsThumbnailModalOpen(false)}
        onConfirm={(url) => {
          setFormData({ ...formData, thumbnail_url: url })
          setIsThumbnailModalOpen(false)
        }}
        currentImageUrl={formData.thumbnail_url}
      />
    </div>
  )
}
