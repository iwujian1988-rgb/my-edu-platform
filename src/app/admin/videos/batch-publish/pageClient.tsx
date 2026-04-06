'use client'

/**
 * 批量发布视频 - 客户端组件
 *
 * 功能：
 * 1. 显示所有草稿状态的视频列表
 * 2. 多选视频
 * 3. 选择关联套餐（所有选中视频共用）
 * 4. 为每个视频单独选择标签
 * 5. 预览并一键发布
 */

import { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Loader2,
  Package,
  Tag,
  Video,
  Clock,
  BookOpen,
  MessageSquare,
  Rocket,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Image as ImageIcon,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { InlineThumbnailSelector } from '@/components/admin/InlineThumbnailSelector'
import ImageUploadModal from '@/components/admin/ImageUploadModal'

// ============================================
// 类型定义
// ============================================

interface DraftVideo {
  id: string
  title: string
  description: string | null
  language: string
  difficulty: string
  duration: number
  status: string
  created_at: string
  learning_date: string | null
  package_ids: string[] | null
  creator_id: string | null
  video_url: string | null
  thumbnail_url: string | null
  content_type: string | null
  cover_url: string | null
  card_stats: {
    words: number
    expressions: number
  }
  tag_ids: string[]
}

interface Package {
  id: string
  name: string
  description: string | null
  validity_days: number | null
  is_active: boolean
}

interface VideoTag {
  id: string
  name: string
  type: 'topic' | 'creator' | 'difficulty' | 'duration'
  color: string
}

interface Creator {
  id: string
  name: string
  platform: string | null
}

interface FetchDataResponse {
  success: boolean
  data: {
    videos: DraftVideo[]
    packages: Package[]
    tags: VideoTag[]
    creators: Creator[]
  }
}

interface PublishResult {
  video_id: string
  title: string
  success: boolean
  error?: string
}

// 视频编辑状态
interface VideoEdit {
  title?: string
  description?: string
  difficulty?: string
  language?: string
  creator_id?: string
  learning_date?: string
}

// 自动分析结果
interface AnalyzeResult {
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  difficulty_score: number
  difficulty_breakdown: {
    vocabulary: number
    speech_rate: number
    info_density: number
  }
  description: string
  speech_rate_wpm: number
  total_words: number
  unique_words: number
}

// ============================================
// 常量
// ============================================

const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: '入门',
  intermediate: '进阶',
  advanced: '高级',
}

const LANGUAGE_LABELS: Record<string, string> = {
  en: '🇬🇧 英语',
  fr: '🇫🇷 法语',
  de: '🇩🇪 德语',
  es: '🇪🇸 西班牙语',
  ja: '🇯🇵 日语',
}

const TAG_TYPE_LABELS: Record<string, string> = {
  topic: '主题',
  creator: '创作者',
  difficulty: '难度',
  duration: '时长',
}

// ============================================
// 组件
// ============================================

export default function BatchPublishClient() {
  const router = useRouter()

  // 数据状态
  const [videos, setVideos] = useState<DraftVideo[]>([])
  const [packages, setPackages] = useState<Package[]>([])
  const [tags, setTags] = useState<VideoTag[]>([])
  const [creators, setCreators] = useState<Creator[]>([])

  // 选择状态
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set())
  const [selectedPackageIds, setSelectedPackageIds] = useState<Set<string>>(new Set())
  const [videoTags, setVideoTags] = useState<Record<string, string[]>>({})  // video_id -> tag_ids[]
  const [videoEdits, setVideoEdits] = useState<Record<string, VideoEdit>>({})  // video_id -> edits
  const [savingEdits, setSavingEdits] = useState<Set<string>>(new Set())  // 正在保存的视频ID
  const [analyzingVideos, setAnalyzingVideos] = useState<Set<string>>(new Set())  // 正在分析的视频ID
  const [analyzeResults, setAnalyzeResults] = useState<Record<string, AnalyzeResult>>({})  // 分析结果

  // UI 状态
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [publishResults, setPublishResults] = useState<PublishResult[] | null>(null)
  const [expandedVideoId, setExpandedVideoId] = useState<string | null>(null)

  // 封面选择器状态（内嵌模式）
  const [activeThumbnailSelector, setActiveThumbnailSelector] = useState<string | null>(null) // 当前展开的视频ID

  // 封面图上传弹窗状态
  const [coverUploadVideoId, setCoverUploadVideoId] = useState<string | null>(null)

  // 重新上传内容状态
  const [reuploadingVideoId, setReuploadingVideoId] = useState<string | null>(null)
  const [reuploading, setReuploading] = useState(false)

  // 更新封面
  const handleThumbnailSelect = useCallback(async (videoId: string, thumbnailUrl: string) => {
    console.log('[handleThumbnailSelect] 开始', { videoId, thumbnailUrl })

    // 更新本地状态
    setVideos(prev => {
      const updated = prev.map(v =>
        v.id === videoId ? { ...v, thumbnail_url: thumbnailUrl } : v
      )
      console.log('[handleThumbnailSelect] 状态更新', {
        oldCount: prev.length,
        newCount: updated.length,
        updatedVideo: updated.find(v => v.id === videoId)
      })
      return updated
    })

    // 保存到数据库
    try {
      const res = await fetch('/api/admin/videos/batch-publish', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_id: videoId,
          updates: { thumbnail_url: thumbnailUrl },
        }),
      })

      const data = await res.json()
      console.log('[handleThumbnailSelect] API 响应', data)

      if (!data.success) {
        console.error('保存封面失败:', data.error)
        alert(`保存封面失败: ${data.error || '未知错误'}`)
      }
    } catch (error) {
      console.error('保存封面失败:', error)
      alert('保存封面失败，请重试')
    }
  }, [])

  // 打开/关闭封面选择器
  const toggleThumbnailSelector = useCallback((video: DraftVideo) => {
    if (!video.video_url) {
      alert('该视频没有视频文件，无法提取封面')
      return
    }
    // 如果当前视频已经打开，则关闭；否则打开
    setActiveThumbnailSelector(prev => prev === video.id ? null : video.id)
  }, [])

  // 处理重新上传内容（传什么更新什么）
  const handleReuploadSubmit = useCallback(async (
    videoId: string,
    subtitleFile: File | null,
    materialFile: File | null,
  ) => {
    if (!subtitleFile && !materialFile) {
      alert('请至少选择一个文件')
      return
    }
    setReuploading(true)
    try {
      const payload: Record<string, unknown> = { videoId }
      if (subtitleFile) {
        payload.subtitle_json = JSON.parse(await subtitleFile.text())
      }
      if (materialFile) {
        payload.learning_material_json = JSON.parse(await materialFile.text())
      }

      const res = await fetch('/api/admin/videos/batch-upload', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (data.success) {
        const { subtitles_count, words_count, expressions_count } = data.data
        const parts: string[] = []
        if (subtitles_count) parts.push(`字幕: ${subtitles_count} 条`)
        if (words_count) parts.push(`单词: ${words_count} 个`)
        if (expressions_count) parts.push(`表达: ${expressions_count} 个`)
        alert(`重新处理成功!\n${parts.join('\n')}`)

        // 刷新视频列表以更新统计数据
        const refreshRes = await fetch('/api/admin/videos/batch-publish')
        const refreshData: FetchDataResponse = await refreshRes.json()
        if (refreshData.success) {
          setVideos(refreshData.data.videos)
        }
      } else {
        alert(`重新处理失败: ${data.error || '未知错误'}`)
      }
    } catch (error) {
      console.error('重新上传失败:', error)
      alert('重新上传失败，请检查文件格式')
    } finally {
      setReuploading(false)
      setReuploadingVideoId(null)
    }
  }, [])

  // 获取数据
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/admin/videos/batch-publish')
        const data: FetchDataResponse = await res.json()

        if (data.success) {
          setVideos(data.data.videos)
          setPackages(data.data.packages)
          setTags(data.data.tags)
          setCreators(data.data.creators || [])

          // 用视频已有的标签关联预填 videoTags 状态
          const existingTags: Record<string, string[]> = {}
          data.data.videos.forEach(v => {
            if (v.tag_ids && v.tag_ids.length > 0) {
              existingTags[v.id] = v.tag_ids
            }
          })
          setVideoTags(existingTags)
        } else {
          console.error('获取数据失败:', data)
        }
      } catch (error) {
        console.error('获取数据异常:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // 视频选择
  const toggleVideo = useCallback((videoId: string) => {
    setSelectedVideoIds(prev => {
      const next = new Set(prev)
      if (next.has(videoId)) {
        next.delete(videoId)
      } else {
        next.add(videoId)
      }
      return next
    })
  }, [])

  const toggleAllVideos = useCallback(() => {
    if (selectedVideoIds.size === videos.length) {
      setSelectedVideoIds(new Set())
    } else {
      setSelectedVideoIds(new Set(videos.map(v => v.id)))
    }
  }, [selectedVideoIds.size, videos])

  // 套餐选择
  const togglePackage = useCallback((packageId: string) => {
    setSelectedPackageIds(prev => {
      const next = new Set(prev)
      if (next.has(packageId)) {
        next.delete(packageId)
      } else {
        next.add(packageId)
      }
      return next
    })
  }, [])

  // 标签选择
  const toggleVideoTag = useCallback((videoId: string, tagId: string) => {
    setVideoTags(prev => {
      const currentTags = prev[videoId] || []
      const newTags = currentTags.includes(tagId)
        ? currentTags.filter(id => id !== tagId)
        : [...currentTags, tagId]
      return { ...prev, [videoId]: newTags }
    })
  }, [])

  // 更新视频编辑状态
  const updateVideoEdit = useCallback((videoId: string, field: keyof VideoEdit, value: string | null) => {
    setVideoEdits(prev => ({
      ...prev,
      [videoId]: {
        ...prev[videoId],
        [field]: value,
      },
    }))
  }, [])

  // 获取视频的编辑值（优先使用编辑状态，否则使用原始值）
  const getVideoEditValue = useCallback((video: DraftVideo, field: keyof VideoEdit) => {
    if (videoEdits[video.id]?.[field] !== undefined) {
      return videoEdits[video.id][field] ?? ''
    }
    return video[field as keyof DraftVideo] ?? ''
  }, [videoEdits])

  // 保存视频编辑
  const saveVideoEdit = useCallback(async (videoId: string) => {
    const edits = videoEdits[videoId]
    if (!edits || Object.keys(edits).length === 0) return

    setSavingEdits(prev => new Set([...prev, videoId]))

    try {
      const res = await fetch('/api/admin/videos/batch-publish', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_id: videoId,
          updates: edits,
        }),
      })

      const data = await res.json()

      if (data.success) {
        // 更新本地 videos 状态
        setVideos(prev => prev.map(v =>
          v.id === videoId ? { ...v, ...edits } : v
        ))
        // 清除编辑状态
        setVideoEdits(prev => {
          const next = { ...prev }
          delete next[videoId]
          return next
        })
        // 显示成功提示（简单方式）
        alert('保存成功')
      } else {
        alert(`保存失败: ${data.error || '未知错误'}`)
      }
    } catch (error) {
      console.error('保存视频编辑失败:', error)
      alert('保存失败，请重试')
    } finally {
      setSavingEdits(prev => {
        const next = new Set(prev)
        next.delete(videoId)
        return next
      })
    }
  }, [videoEdits])

  // 检查视频是否有未保存的编辑
  const hasUnsavedEdits = useCallback((videoId: string) => {
    const edits = videoEdits[videoId]
    return edits && Object.keys(edits).length > 0
  }, [videoEdits])

  // 自动分析视频（难度 + 描述）
  const autoAnalyze = useCallback(async (videoId: string) => {
    setAnalyzingVideos(prev => new Set([...prev, videoId]))

    try {
      const res = await fetch('/api/admin/videos/batch-publish/auto-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_id: videoId }),
      })

      const data = await res.json()

      if (data.success) {
        const result: AnalyzeResult = data.data

        // 保存分析结果
        setAnalyzeResults(prev => ({
          ...prev,
          [videoId]: result,
        }))

        // 自动填充编辑表单
        setVideoEdits(prev => ({
          ...prev,
          [videoId]: {
            ...prev[videoId],
            difficulty: result.difficulty,
            description: result.description,
          },
        }))
      } else {
        alert(`分析失败: ${data.error || '未知错误'}`)
      }
    } catch (error) {
      console.error('自动分析失败:', error)
      alert('分析失败，请重试')
    } finally {
      setAnalyzingVideos(prev => {
        const next = new Set(prev)
        next.delete(videoId)
        return next
      })
    }
  }, [])

  // 发布
  const handlePublish = useCallback(async () => {
    if (selectedVideoIds.size === 0 || selectedPackageIds.size === 0) {
      return
    }

    setPublishing(true)
    setPublishResults(null)

    try {
      const res = await fetch('/api/admin/videos/batch-publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_ids: Array.from(selectedVideoIds),
          package_ids: Array.from(selectedPackageIds),
          video_tags: videoTags,
        }),
      })

      const data = await res.json()

      if (data.success) {
        setPublishResults(data.data.results)

        // 如果全部成功，2秒后跳转
        if (data.data.failed_count === 0) {
          setTimeout(() => {
            router.push('/admin/videos')
          }, 2000)
        }
      } else {
        alert(`发布失败: ${data.error || '未知错误'}`)
      }
    } catch (error) {
      console.error('发布异常:', error)
      alert('发布失败，请重试')
    } finally {
      setPublishing(false)
    }
  }, [selectedVideoIds, selectedPackageIds, videoTags, router])

  // 格式化时长
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // 按类型分组标签
  const tagsByType = tags.reduce((acc, tag) => {
    if (!acc[tag.type]) {
      acc[tag.type] = []
    }
    acc[tag.type].push(tag)
    return acc
  }, {} as Record<string, VideoTag[]>)

  // 加载中
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  // 发布结果页面
  if (publishResults) {
    const successCount = publishResults.filter(r => r.success).length
    const failedCount = publishResults.filter(r => !r.success).length

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-black dark:border-gray-600 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666] overflow-hidden">
            {/* 头部 */}
            <div className={cn(
              "p-6 text-center",
              failedCount === 0 ? "bg-green-50 dark:bg-green-900/20" : "bg-yellow-50 dark:bg-yellow-900/20"
            )}>
              {failedCount === 0 ? (
                <>
                  <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" />
                  <h2 className="text-2xl font-bold text-green-700 dark:text-green-300">
                    发布成功！
                  </h2>
                  <p className="text-green-600 dark:text-green-400 mt-2">
                    已成功发布 {successCount} 个视频
                  </p>
                </>
              ) : (
                <>
                  <AlertCircle className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
                  <h2 className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                    部分发布成功
                  </h2>
                  <p className="text-yellow-600 dark:text-yellow-400 mt-2">
                    成功 {successCount} 个，失败 {failedCount} 个
                  </p>
                </>
              )}
            </div>

            {/* 结果列表 */}
            <div className="p-4 max-h-80 overflow-y-auto">
              {publishResults.map((result) => (
                <div
                  key={result.video_id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg mb-2",
                    result.success
                      ? "bg-green-50 dark:bg-green-900/20"
                      : "bg-red-50 dark:bg-red-900/20"
                  )}
                >
                  {result.success ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{result.title}</p>
                    {result.error && (
                      <p className="text-sm text-red-600 dark:text-red-400">{result.error}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* 底部按钮 */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-center gap-4">
              <Button
                variant="outline"
                onClick={() => {
                  setPublishResults(null)
                  setShowPreview(false)
                }}
              >
                继续发布
              </Button>
              <Link href="/admin/videos">
                <Button>返回视频列表</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 预览页面
  if (showPreview) {
    const selectedVideos = videos.filter(v => selectedVideoIds.has(v.id))
    const selectedPackages = packages.filter(p => selectedPackageIds.has(p.id))

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-3xl mx-auto">
          {/* 头部 */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => setShowPreview(false)}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            >
              <ArrowLeft className="w-5 h-5" />
              返回编辑
            </button>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              确认发布
            </h1>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-black dark:border-gray-600 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666] overflow-hidden">
            {/* 发布摘要 */}
            <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-b border-gray-200 dark:border-gray-700">
              <h2 className="font-bold text-lg mb-4">📦 发布摘要</h2>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white dark:bg-gray-700 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 dark:text-gray-400">将发布视频</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {selectedVideos.length} 个
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-700 p-4 rounded-lg">
                  <p className="text-sm text-gray-500 dark:text-gray-400">关联套餐</p>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {selectedPackages.length} 个
                  </p>
                </div>
              </div>
            </div>

            {/* 视频列表 */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-medium mb-3">视频列表</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {selectedVideos.map(video => (
                  <div
                    key={video.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{video.title}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {video.card_stats.words} 单词 · {video.card_stats.expressions} 表达
                      </p>
                    </div>
                    {videoTags[video.id] && videoTags[video.id].length > 0 && (
                      <div className="flex gap-1">
                        {videoTags[video.id].map(tagId => {
                          const tag = tags.find(t => t.id === tagId)
                          return tag ? (
                            <span
                              key={tagId}
                              className="px-2 py-0.5 text-xs rounded"
                              style={{ backgroundColor: tag.color + '20', color: tag.color }}
                            >
                              {tag.name}
                            </span>
                          ) : null
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 套餐列表 */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-medium mb-3">关联套餐</h3>
              <div className="flex flex-wrap gap-2">
                {selectedPackages.map(pkg => (
                  <span
                    key={pkg.id}
                    className="px-3 py-1.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-lg text-sm font-medium"
                  >
                    {pkg.name}
                  </span>
                ))}
              </div>
            </div>

            {/* 警告 */}
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  发布后视频将对已购买该套餐的用户可见。请确认信息无误后再发布。
                </p>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="p-6 flex justify-center gap-4">
              <Button
                variant="outline"
                onClick={() => setShowPreview(false)}
                disabled={publishing}
              >
                返回修改
              </Button>
              <Button
                onClick={handlePublish}
                disabled={publishing}
                className="bg-green-500 hover:bg-green-600 text-white gap-2"
              >
                {publishing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    发布中...
                  </>
                ) : (
                  <>
                    <Rocket className="w-4 h-4" />
                    确认发布
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 主页面
  return (
    <>
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-5xl mx-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/videos"
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            >
              <ArrowLeft className="w-5 h-5" />
              返回视频列表
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              批量发布视频
            </h1>
          </div>

          <Button
            onClick={() => setShowPreview(true)}
            disabled={selectedVideoIds.size === 0 || selectedPackageIds.size === 0}
            className="gap-2"
          >
            <Rocket className="w-4 h-4" />
            预览并发布
          </Button>
        </div>

        {/* 提示 */}
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            💡 选择要发布的草稿视频，选择关联的套餐，并为每个视频设置标签后即可发布
          </p>
        </div>

        {/* 没有草稿视频 */}
        {videos.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 p-12 text-center">
            <Video className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">
              暂无草稿视频
            </h3>
            <p className="text-gray-500 dark:text-gray-500 mb-4">
              请先通过批量上传创建视频
            </p>
            <Link href="/admin/videos/batch-upload">
              <Button>前往批量上传</Button>
            </Link>
          </div>
        )}

        {videos.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 左侧：视频列表 */}
            <div className="lg:col-span-2 space-y-6">
              {/* Step 1: 选择视频 */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-8 h-8 bg-blue-500 text-white rounded-full font-bold text-sm">
                        1
                      </span>
                      <div>
                        <h3 className="font-bold">选择视频</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          已选 {selectedVideoIds.size} / {videos.length} 个草稿
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleAllVideos}
                    >
                      {selectedVideoIds.size === videos.length ? '取消全选' : '全选'}
                    </Button>
                  </div>
                </div>

                <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[500px] overflow-y-auto">
                  {videos.map(video => {
                    const isSelected = selectedVideoIds.has(video.id)
                    const isExpanded = expandedVideoId === video.id

                    return (
                      <div key={video.id} className={cn(
                        "transition-colors",
                        isSelected && "bg-blue-50/50 dark:bg-blue-900/10"
                      )}>
                        {/* 视频行 */}
                        <div
                          className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
                          onClick={() => toggleVideo(video.id)}
                        >
                          <div className="flex items-start gap-3">
                            {/* 选择框 */}
                            <div className={cn(
                              "w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5",
                              isSelected
                                ? "bg-blue-500 border-blue-500"
                                : "border-gray-300 dark:border-gray-600"
                            )}>
                              {isSelected && (
                                <CheckCircle2 className="w-3 h-3 text-white" />
                              )}
                            </div>

                            {/* 视频信息 */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium truncate">{video.title}</span>
                                <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                                  {LANGUAGE_LABELS[video.language] || video.language}
                                </span>
                                <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                                  {DIFFICULTY_LABELS[video.difficulty] || video.difficulty}
                                </span>
                              </div>

                              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                                <span className="flex items-center gap-1">
                                  <BookOpen className="w-3.5 h-3.5" />
                                  {video.card_stats.words} 单词
                                </span>
                                <span className="flex items-center gap-1">
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  {video.card_stats.expressions} 表达
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5" />
                                  {formatDuration(video.duration)}
                                </span>
                              </div>

                              {/* 已选标签 */}
                              {videoTags[video.id] && videoTags[video.id].length > 0 && (
                                <div className="flex gap-1 mt-2">
                                  {videoTags[video.id].map(tagId => {
                                    const tag = tags.find(t => t.id === tagId)
                                    return tag ? (
                                      <span
                                        key={tagId}
                                        className="px-2 py-0.5 text-xs rounded"
                                        style={{ backgroundColor: tag.color + '20', color: tag.color }}
                                      >
                                        {tag.name}
                                      </span>
                                    ) : null
                                  })}
                                </div>
                              )}
                            </div>

                            {/* 展开按钮 */}
                            {isSelected && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setExpandedVideoId(isExpanded ? null : video.id)
                                }}
                                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-5 h-5" />
                                ) : (
                                  <ChevronDown className="w-5 h-5" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* 展开的编辑和标签选择 */}
                        {isSelected && isExpanded && (
                          <div className="px-4 pb-4 pl-12 bg-gray-50 dark:bg-gray-700/30">
                            {/* 编辑视频信息 */}
                            <div className="mb-4 p-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded">
                              <div className="flex items-center justify-between mb-3">
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  📝 编辑视频信息
                                </p>
                                <div className="flex items-center gap-2">
                                  {/* 自动分析按钮 */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      autoAnalyze(video.id)
                                    }}
                                    disabled={analyzingVideos.has(video.id)}
                                    className={cn(
                                      "px-2 py-1 text-xs font-medium rounded border-2 transition-all flex items-center gap-1",
                                      analyzingVideos.has(video.id)
                                        ? "bg-gray-100 text-gray-400 cursor-wait border-gray-300"
                                        : "bg-purple-100 text-purple-700 border-purple-300 hover:bg-purple-200"
                                    )}
                                  >
                                    {analyzingVideos.has(video.id) ? (
                                      <>
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        分析中...
                                      </>
                                    ) : (
                                      <>
                                        <Sparkles className="w-3 h-3" />
                                        自动分析
                                      </>
                                    )}
                                  </button>
                                  {hasUnsavedEdits(video.id) && (
                                    <span className="text-xs text-orange-500">有未保存的修改</span>
                                  )}
                                </div>
                              </div>

                              {/* 分析结果展示 */}
                              {analyzeResults[video.id] && (
                                <div className="mb-3 p-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded text-xs">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-purple-700 dark:text-purple-300">📊 分析结果</span>
                                  </div>
                                  <div className="grid grid-cols-4 gap-2 text-gray-600 dark:text-gray-400">
                                    <div>
                                      <span className="text-purple-600 dark:text-purple-400 font-mono">{analyzeResults[video.id].speech_rate_wpm}</span>
                                      <span className="ml-1">词/分</span>
                                    </div>
                                    <div>
                                      <span className="text-purple-600 dark:text-purple-400 font-mono">{analyzeResults[video.id].total_words}</span>
                                      <span className="ml-1">总词</span>
                                    </div>
                                    <div>
                                      <span className="text-purple-600 dark:text-purple-400 font-mono">{analyzeResults[video.id].difficulty_score}</span>
                                      <span className="ml-1">难度分</span>
                                    </div>
                                    <div>
                                      <span className={cn(
                                        "font-medium",
                                        analyzeResults[video.id].difficulty === 'beginner' && "text-green-600",
                                        analyzeResults[video.id].difficulty === 'intermediate' && "text-yellow-600",
                                        analyzeResults[video.id].difficulty === 'advanced' && "text-red-600"
                                      )}>
                                        {DIFFICULTY_LABELS[analyzeResults[video.id].difficulty]}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )}

                              <div className="space-y-3">
                                {/* 标题 */}
                                <div>
                                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">标题</label>
                                  <input
                                    type="text"
                                    value={getVideoEditValue(video, 'title') as string}
                                    onChange={(e) => updateVideoEdit(video.id, 'title', e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-full px-2 py-1.5 text-sm border-2 border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 focus:border-blue-500 focus:outline-none"
                                    placeholder="视频标题"
                                  />
                                </div>

                                {/* 难度 + 语种 + UP主 */}
                                <div className="grid grid-cols-3 gap-2">
                                  {/* 难度 */}
                                  <div>
                                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">难度</label>
                                    <select
                                      value={getVideoEditValue(video, 'difficulty') as string}
                                      onChange={(e) => updateVideoEdit(video.id, 'difficulty', e.target.value)}
                                      onClick={(e) => e.stopPropagation()}
                                      className="w-full px-2 py-1.5 text-sm border-2 border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 focus:border-blue-500 focus:outline-none"
                                    >
                                      <option value="beginner">入门</option>
                                      <option value="intermediate">进阶</option>
                                      <option value="advanced">难</option>
                                    </select>
                                  </div>

                                  {/* 语种 */}
                                  <div>
                                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">语种</label>
                                    <select
                                      value={getVideoEditValue(video, 'language') as string}
                                      onChange={(e) => updateVideoEdit(video.id, 'language', e.target.value)}
                                      onClick={(e) => e.stopPropagation()}
                                      className="w-full px-2 py-1.5 text-sm border-2 border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 focus:border-blue-500 focus:outline-none"
                                    >
                                      <option value="en">🇬🇧 英语</option>
                                      <option value="fr">🇫🇷 法语</option>
                                      <option value="de">🇩🇪 德语</option>
                                      <option value="es">🇪🇸 西班牙语</option>
                                      <option value="ja">🇯🇵 日语</option>
                                      <option value="it">🇮🇹 意大利语</option>
                                      <option value="ru">🇷🇺 俄语</option>
                                    </select>
                                  </div>

                                  {/* UP主 */}
                                  <div>
                                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">UP主</label>
                                    <select
                                      value={getVideoEditValue(video, 'creator_id') as string || ''}
                                      onChange={(e) => updateVideoEdit(video.id, 'creator_id', e.target.value || null)}
                                      onClick={(e) => e.stopPropagation()}
                                      className="w-full px-2 py-1.5 text-sm border-2 border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 focus:border-blue-500 focus:outline-none"
                                    >
                                      <option value="">未选择</option>
                                      {creators.map(creator => (
                                        <option key={creator.id} value={creator.id}>
                                          {creator.name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>

                                {/* 描述 */}
                                <div>
                                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">描述</label>
                                  <textarea
                                    value={getVideoEditValue(video, 'description') as string}
                                    onChange={(e) => updateVideoEdit(video.id, 'description', e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    rows={2}
                                    className="w-full px-2 py-1.5 text-sm border-2 border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 focus:border-blue-500 focus:outline-none resize-none"
                                    placeholder="视频描述（可选）"
                                  />
                                </div>

                                {/* 学习归属时间 */}
                                <div>
                                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                    📅 学习归属时间
                                  </label>
                                  <input
                                    type="date"
                                    value={getVideoEditValue(video, 'learning_date') as string || video.learning_date || ''}
                                    onChange={(e) => updateVideoEdit(video.id, 'learning_date', e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-full px-2 py-1.5 text-sm border-2 border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 focus:border-blue-500 focus:outline-none"
                                  />
                                  <p className="text-xs text-gray-400 mt-1">用于前台视频列表排序</p>
                                </div>

                                {/* 封面选择 */}
                                <div>
                                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                    🖼️ 封面图
                                  </label>
                                  <div className="flex items-center gap-3">
                                    {/* 封面预览 */}
                                    <div className="w-32 h-18 rounded border-2 border-gray-200 dark:border-gray-600 overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                      {(video.cover_url || video.thumbnail_url) ? (
                                        <img
                                          src={video.cover_url || video.thumbnail_url || ''}
                                          alt="封面"
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <ImageIcon className="w-8 h-8 text-gray-400" />
                                      )}
                                    </div>
                                    <div className="flex-1 flex flex-col gap-2">
                                      {/* 上传封面按钮（所有类型可用） */}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setCoverUploadVideoId(video.id)
                                        }}
                                        className="px-3 py-1.5 text-sm font-medium rounded border-2 bg-[#B4F416] text-black border-black hover:bg-[#c5f74d] transition-all"
                                      >
                                        上传封面
                                      </button>
                                      {/* 从视频提取封面按钮（仅视频类型） */}
                                      {video.content_type !== 'audio' && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            toggleThumbnailSelector(video)
                                          }}
                                          disabled={!video.video_url}
                                          className={cn(
                                            "px-3 py-1.5 text-sm font-medium rounded border-2 transition-all",
                                            video.video_url
                                              ? "bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200"
                                              : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                                          )}
                                        >
                                          {video.video_url ? '从视频提取封面' : '无视频文件'}
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {/* 内嵌式封面选择器 */}
                                  {activeThumbnailSelector === video.id && video.video_url && (
                                    <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                                      <InlineThumbnailSelector
                                        videoUrl={video.video_url}
                                        videoDuration={video.duration}
                                        videoId={video.id}
                                        onSelect={(thumbnailUrl) => {
                                          handleThumbnailSelect(video.id, thumbnailUrl)
                                          setActiveThumbnailSelector(null)
                                        }}
                                        onCancel={() => setActiveThumbnailSelector(null)}
                                      />
                                    </div>
                                  )}
                                </div>

                                {/* 重新上传字幕和学习材料 */}
                                <div className="mt-3">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setReuploadingVideoId(reuploadingVideoId === video.id ? null : video.id)
                                    }}
                                    className={cn(
                                      "px-3 py-1.5 text-sm font-medium rounded border-2 transition-all flex items-center gap-1",
                                      reuploadingVideoId === video.id
                                        ? "bg-orange-100 text-orange-700 border-orange-300"
                                        : "bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100"
                                    )}
                                  >
                                    📂 重新上传字幕/学习材料
                                  </button>

                                  {reuploadingVideoId === video.id && (
                                    <div
                                      className="mt-2 p-3 bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-200 dark:border-orange-700 rounded space-y-2"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <p className="text-xs text-orange-600 dark:text-orange-400">
                                        选择要更新的文件，至少选一个。字幕 JSON 会替换所有字幕；学习材料 JSON 会替换单词卡片、表达、语法点等。
                                      </p>
                                      <div className="grid grid-cols-2 gap-2">
                                        <div>
                                          <label className="block text-xs text-gray-500 mb-1">字幕 JSON（可选）</label>
                                          <input
                                            type="file"
                                            accept=".json"
                                            id={`subtitle-${video.id}`}
                                            className="w-full text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-orange-100 file:text-orange-700"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-xs text-gray-500 mb-1">学习材料 JSON（可选）</label>
                                          <input
                                            type="file"
                                            accept=".json"
                                            id={`material-${video.id}`}
                                            className="w-full text-xs file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-orange-100 file:text-orange-700"
                                          />
                                        </div>
                                      </div>
                                      <div className="flex justify-end gap-2">
                                        <button
                                          onClick={() => setReuploadingVideoId(null)}
                                          className="px-2 py-1 text-xs rounded border border-gray-300 hover:bg-gray-100"
                                        >
                                          取消
                                        </button>
                                        <button
                                          onClick={async () => {
                                            const subInput = document.getElementById(`subtitle-${video.id}`) as HTMLInputElement
                                            const matInput = document.getElementById(`material-${video.id}`) as HTMLInputElement
                                            const subFile = subInput?.files?.[0] || null
                                            const matFile = matInput?.files?.[0] || null
                                            await handleReuploadSubmit(video.id, subFile, matFile)
                                          }}
                                          disabled={reuploading}
                                          className={cn(
                                            "px-3 py-1 text-xs font-medium rounded border-2 transition-all",
                                            reuploading
                                              ? "bg-gray-200 text-gray-400 cursor-wait border-gray-300"
                                              : "bg-orange-500 text-white border-orange-600 hover:bg-orange-600"
                                          )}
                                        >
                                          {reuploading ? '处理中...' : '确认重新处理'}
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* 保存按钮 */}
                                {hasUnsavedEdits(video.id) && (
                                  <div className="flex justify-end">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        saveVideoEdit(video.id)
                                      }}
                                      disabled={savingEdits.has(video.id)}
                                      className={cn(
                                        "px-3 py-1.5 text-sm font-medium rounded border-2 border-black transition-all",
                                        savingEdits.has(video.id)
                                          ? "bg-gray-100 text-gray-400 cursor-wait"
                                          : "bg-green-500 text-white hover:bg-green-600"
                                      )}
                                    >
                                      {savingEdits.has(video.id) ? '保存中...' : '保存修改'}
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* 标签选择 */}
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                              <Tag className="w-4 h-4 inline mr-1" />
                              选择标签
                            </p>

                            {Object.entries(tagsByType).map(([type, typeTags]) => (
                              <div key={type} className="mb-3">
                                <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">
                                  {TAG_TYPE_LABELS[type] || type}
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {typeTags.map(tag => {
                                    const isTagSelected = videoTags[video.id]?.includes(tag.id)
                                    return (
                                      <button
                                        key={tag.id}
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          toggleVideoTag(video.id, tag.id)
                                        }}
                                        className={cn(
                                          "px-2 py-1 text-xs rounded border-2 transition-all",
                                          isTagSelected
                                            ? "border-current"
                                            : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                                        )}
                                        style={isTagSelected ? {
                                          backgroundColor: tag.color + '20',
                                          color: tag.color,
                                          borderColor: tag.color,
                                        } : {}}
                                      >
                                        {tag.name}
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* 右侧：套餐选择 */}
            <div className="lg:col-span-1">
              <div className="sticky top-4">
                {/* Step 2: 选择套餐 */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="px-4 py-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-8 h-8 bg-purple-500 text-white rounded-full font-bold text-sm">
                        2
                      </span>
                      <div>
                        <h3 className="font-bold">选择套餐</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          已选 {selectedPackageIds.size} 个
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 space-y-2 max-h-[300px] overflow-y-auto">
                    {packages.length === 0 ? (
                      <p className="text-center text-gray-500 dark:text-gray-400 py-4">
                        暂无可用套餐
                      </p>
                    ) : (
                      packages.map(pkg => {
                        const isSelected = selectedPackageIds.has(pkg.id)
                        return (
                          <button
                            key={pkg.id}
                            onClick={() => togglePackage(pkg.id)}
                            className={cn(
                              "w-full p-3 rounded-lg border-2 text-left transition-all",
                              isSelected
                                ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                                : "border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-700"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <Package className={cn(
                                "w-5 h-5",
                                isSelected ? "text-purple-500" : "text-gray-400"
                              )} />
                              <span className="font-medium">{pkg.name}</span>
                            </div>
                            {pkg.description && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {pkg.description}
                              </p>
                            )}
                            {pkg.validity_days && (
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                有效期: {pkg.validity_days} 天
                              </p>
                            )}
                          </button>
                        )
                      })
                    )}
                  </div>
                </div>

                {/* 发布按钮（固定在右下角） */}
                <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700">
                  <div className="text-center mb-3">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      将发布 <span className="font-bold text-blue-600 dark:text-blue-400">{selectedVideoIds.size}</span> 个视频
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      关联 <span className="font-bold text-purple-600 dark:text-purple-400">{selectedPackageIds.size}</span> 个套餐
                    </p>
                  </div>

                  <Button
                    onClick={() => setShowPreview(true)}
                    disabled={selectedVideoIds.size === 0 || selectedPackageIds.size === 0}
                    className="w-full gap-2"
                  >
                    <Rocket className="w-4 h-4" />
                    预览并发布
                  </Button>

                  {(selectedVideoIds.size === 0 || selectedPackageIds.size === 0) && (
                    <p className="text-xs text-center text-gray-400 dark:text-gray-500 mt-2">
                      {selectedVideoIds.size === 0 && '请先选择视频'}
                      {selectedVideoIds.size > 0 && selectedPackageIds.size === 0 && '请选择套餐'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>

      {/* 封面图上传弹窗（全局单例，按 videoId 区分） */}
      {coverUploadVideoId && (
        <ImageUploadModal
          isOpen={true}
          onClose={() => setCoverUploadVideoId(null)}
          onConfirm={(url) => {
            const targetVideo = videos.find(v => v.id === coverUploadVideoId)
            if (targetVideo) {
              // 更新 cover_url（音频类型优先），视频类型也支持
              setVideos(prev => prev.map(v =>
                v.id === coverUploadVideoId
                  ? { ...v, cover_url: url, thumbnail_url: v.thumbnail_url || url }
                  : v
              ))
              // 持久化到数据库
              fetch('/api/admin/videos/batch-publish', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  video_id: coverUploadVideoId,
                  updates: { cover_url: url, thumbnail_url: targetVideo.thumbnail_url || url },
                }),
              }).catch(() => {})
            }
            setCoverUploadVideoId(null)
          }}
          currentImageUrl={videos.find(v => v.id === coverUploadVideoId)?.cover_url || videos.find(v => v.id === coverUploadVideoId)?.thumbnail_url || ''}
        />
      )}
  </>
  )
}
