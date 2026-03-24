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
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// ============================================
// 类型定义
// ============================================

interface DraftVideo {
  id: string
  title: string
  language: string
  difficulty: string
  duration: number
  status: string
  created_at: string
  package_ids: string[] | null
  card_stats: {
    words: number
    expressions: number
  }
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

interface FetchDataResponse {
  success: boolean
  data: {
    videos: DraftVideo[]
    packages: Package[]
    tags: VideoTag[]
  }
}

interface PublishResult {
  video_id: string
  title: string
  success: boolean
  error?: string
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

  // 选择状态
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set())
  const [selectedPackageIds, setSelectedPackageIds] = useState<Set<string>>(new Set())
  const [videoTags, setVideoTags] = useState<Record<string, string[]>>({})  // video_id -> tag_ids[]

  // UI 状态
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [publishResults, setPublishResults] = useState<PublishResult[] | null>(null)
  const [expandedVideoId, setExpandedVideoId] = useState<string | null>(null)

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

                        {/* 展开的标签选择 */}
                        {isSelected && isExpanded && (
                          <div className="px-4 pb-4 pl-12 bg-gray-50 dark:bg-gray-700/30">
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
  )
}
