'use client'

/**
 * 批量上传视频 - 客户端组件
 *
 * 对应 PRD: VIDEO_BATCH_UPLOAD_PRD.md Section 4
 * 对应 Tech: VIDEO_BATCH_UPLOAD_TECH.md
 *
 * 功能:
 * - 默认 3 行视频输入
 * - 上传字幕 JSON
 * - 上传学习材料 JSON
 * - 视频地址输入
 * - 添加/删除行
 * - 保存全部
 * - 上传进度显示
 */

import { useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  Upload,
  Plus,
  Trash2,
  FileJson,
  Link as LinkIcon,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RotateCw,
} from 'lucide-react'
import Link from 'next/link'
import type { SubtitleJsonInput, LearningMaterialJsonInput, BatchUploadResponse } from '@/types/video'

// ============================================
// 类型定义
// ============================================

/** 单个视频输入行的状态 */
interface VideoInputRow {
  id: string
  subtitleFile: File | null
  subtitleFileName: string
  subtitleData: SubtitleJsonInput | null
  learningFile: File | null
  learningFileName: string
  learningData: LearningMaterialJsonInput | null
  videoUrl: string
  status: 'idle' | 'uploading' | 'success' | 'error'
  error?: string
  result?: {
    id: string
    title: string
    subtitles_count: number
    words_count: number
  }
}

// ============================================
// 常量
// ============================================

const INITIAL_ROW_COUNT = 3

// ============================================
// 组件
// ============================================

export default function BatchUploadClient() {
  // fileInputRefs 必须在 useState 之前声明，因为 createEmptyRow 依赖它
  const fileInputRefs = useRef<{ [key: string]: { subtitle?: HTMLInputElement; learning?: HTMLInputElement } }>({})

  // 生成唯一 ID - 定义在 useState 之前
  const createEmptyRow = useCallback((): VideoInputRow => {
    const id = `row_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    fileInputRefs.current[id] = {}
    return {
      id,
      subtitleFile: null,
      subtitleFileName: '',
      subtitleData: null,
      learningFile: null,
      learningFileName: '',
      learningData: null,
      videoUrl: '',
      status: 'idle',
    }
  }, [])

  const [rows, setRows] = useState<VideoInputRow[]>(() =>
    Array.from({ length: INITIAL_ROW_COUNT }, () => createEmptyRow())
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitProgress, setSubmitProgress] = useState(0)

  // 添加一行
  const addRow = useCallback(() => {
    setRows(prev => [...prev, createEmptyRow()])
  }, [])

  // 删除一行
  const removeRow = useCallback((rowId: string) => {
    setRows(prev => prev.filter(r => r.id !== rowId))
    delete fileInputRefs.current[rowId]
  }, [])

  // 处理字幕文件上传
  const handleSubtitleUpload = useCallback(async (rowId: string, file: File) => {
    try {
      const text = await file.text()
      const json = JSON.parse(text) as SubtitleJsonInput

      // 验证结构
      if (!json.unit_info?.theme || !json.subtitles) {
        throw new Error('字幕 JSON 格式无效：缺少 unit_info.theme 或 subtitles')
      }

      setRows(prev => prev.map(row =>
        row.id === rowId
          ? {
              ...row,
              subtitleFile: file,
              subtitleFileName: file.name,
              subtitleData: json,
              status: 'idle',
              error: undefined,
            }
          : row
      ))
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '解析失败'
      setRows(prev => prev.map(row =>
        row.id === rowId
          ? { ...row, error: `字幕文件错误: ${errorMsg}` }
          : row
      ))
    }
  }, [])

  // 处理学习材料文件上传
  const handleLearningUpload = useCallback(async (rowId: string, file: File) => {
    try {
      const text = await file.text()
      const json = JSON.parse(text) as LearningMaterialJsonInput

      // 验证结构
      if (!json.unit_info || !json.language_analysis) {
        throw new Error('学习材料 JSON 格式无效：缺少 unit_info 或 language_analysis')
      }

      setRows(prev => prev.map(row =>
        row.id === rowId
          ? {
              ...row,
              learningFile: file,
              learningFileName: file.name,
              learningData: json,
              status: 'idle',
              error: undefined,
            }
          : row
      ))
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '解析失败'
      setRows(prev => prev.map(row =>
        row.id === rowId
          ? { ...row, error: `学习材料错误: ${errorMsg}` }
          : row
      ))
    }
  }, [])

  // 处理视频 URL 输入
  const handleVideoUrlChange = useCallback((rowId: string, url: string) => {
    setRows(prev => prev.map(row =>
      row.id === rowId
        ? { ...row, videoUrl: url, status: 'idle', error: undefined }
        : row
    ))
  }, [])

  // 触发文件选择
  const triggerFileInput = useCallback((rowId: string, type: 'subtitle' | 'learning') => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      if (type === 'subtitle') {
        await handleSubtitleUpload(rowId, file)
      } else {
        await handleLearningUpload(rowId, file)
      }
    }

    input.click()
  }, [handleSubtitleUpload, handleLearningUpload])

  // 验证行是否可提交
  const canSubmitRow = useCallback((row: VideoInputRow): boolean => {
    return row.subtitleData !== null && row.learningData !== null && row.status !== 'uploading'
  }, [])

  // 重新上传单行（仅重置状态，不清除结果）
  const retryRow = useCallback((rowId: string) => {
    setRows(prev => prev.map(row =>
      row.id === rowId
        ? { ...row, status: 'idle' as const, error: undefined, result: undefined }
        : row
    ))
  }, [])

  // 提交所有有效的行

  // 提交所有有效的行
  const handleSubmit = useCallback(async () => {
    const validRows = rows.filter(canSubmitRow)
    if (validRows.length === 0) {
      alert('没有可提交的视频，请至少上传字幕和学习材料')
      return
    }

    setIsSubmitting(true)
    setSubmitProgress(0)

    // 标记所有有效行为上传中
    setRows(prev => prev.map(row =>
      canSubmitRow(row) ? { ...row, status: 'uploading' as const } : row
    ))

    // 动态更新进度
    const totalValidRows = validRows.length
    let processedCount = 0

    try {
      const response = await fetch('/api/admin/videos/batch-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videos: validRows.map(row => ({
            subtitle_json: row.subtitleData,
            learning_material_json: row.learningData,
            video_url: row.videoUrl,
          })),
        }),
      })

      const result: BatchUploadResponse = await response.json()

      if (result.success && result.data) {
        // 计算进度
        processedCount++
        const progress = Math.round((processedCount / totalValidRows) * 100)
        setSubmitProgress(progress)

        // 更新成功/失败的行
        setRows(prev => prev.map(row => {
          const rowIndex = validRows.findIndex(r => r.id === row.id)
          if (rowIndex === -1) return row

          const error = result.data.errors?.find(e => e.index === rowIndex)
          if (error) {
            return { ...row, status: 'error' as const, error: error.error }
          }

          const successResult = result.data.videos[rowIndex]
          if (successResult) {
            return {
              ...row,
              status: 'success' as const,
              result: {
                id: successResult.id,
                title: successResult.title,
                subtitles_count: successResult.subtitles_count,
                words_count: successResult.words_count,
              },
            }
          }

          return row
        }))

        // 显示成功消息
        if (result.data.created_count > 0) {
          alert(`成功创建 ${result.data.created_count} 个视频！`)
        }
      } else {
        throw new Error(result.data?.errors?.[0]?.error || '上传失败')
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '上传失败'
      setRows(prev => prev.map(row =>
        canSubmitRow(row) ? { ...row, status: 'error' as const, error: errorMsg } : row
      ))
      alert(`上传失败: ${errorMsg}`)
    } finally {
      setIsSubmitting(false)
    }
  }, [rows, canSubmitRow])

  // 获取行的状态图标
  const getStatusIcon = (row: VideoInputRow) => {
    switch (row.status) {
      case 'uploading':
        return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />
      default:
        return null
    }
  }

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
              批量上传视频
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {rows.filter(r => r.status === 'success').length} / {rows.length} 成功
            </span>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !rows.some(canSubmitRow)}
              className="gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  上传中...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  保存全部
                </>
              )}
            </Button>
          </div>
        </div>

        {/* 进度条 */}
        {isSubmitting && (
          <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg p-4 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">上传进度</span>
              <span>{submitProgress}%</span>
            </div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${submitProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* 视频输入行 */}
        <div className="space-y-4">
          {rows.map((row, index) => (
            <div
              key={row.id}
              className={cn(
                "bg-white dark:bg-gray-800 rounded-lg p-4 border-2 transition-all",
                row.status === 'success'
                  ? "border-green-500 shadow-[3px_3px_0px_0px_rgba(34,197,94,1)]"
                  : row.status === 'error'
                    ? "border-red-500 shadow-[3px_3px_0px_0px_rgba(239,68,68,1)]"
                    : "border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
              )}
            >
              {/* 行头部 */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold">视频 {index + 1}</span>
                  {getStatusIcon(row)}
                  {row.result && (
                    <span className="text-sm text-green-600 dark:text-green-400">
                      {row.result.title} ({row.result.subtitles_count} 字幕, {row.result.words_count} 单词)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {/* 重新上传按钮 - 仅在错误时显示 */}
                  {row.status === 'error' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => retryRow(row.id)}
                      disabled={isSubmitting}
                      className="gap-1 text-blue-600 hover:text-blue-800 border-blue-300"
                    >
                      <RotateCw className="w-4 h-4" />
                      <span className="text-xs">重试</span>
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRow(row.id)}
                    disabled={rows.length <= 1 || isSubmitting}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* 输入区域 */}
              <div className="grid grid-cols-3 gap-4">
                {/* 字幕上传 */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    字幕 JSON
                  </label>
                  <button
                    onClick={() => triggerFileInput(row.id, 'subtitle')}
                    disabled={isSubmitting}
                    className={cn(
                      "w-full h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 transition-colors",
                      row.subtitleData
                        ? "border-green-400 bg-green-50 dark:bg-green-900/20 text-green-600"
                        : "border-gray-300 dark:border-gray-600 hover:border-blue-400 text-gray-500"
                    )}
                  >
                    <FileJson className="w-6 h-6" />
                    <span className="text-xs">
                      {row.subtitleFileName || '点击上传'}
                    </span>
                  </button>
                  {row.subtitleData && (
                    <p className="mt-1 text-xs text-gray-500">
                      {row.subtitleData.subtitles?.length || 0} 条字幕
                    </p>
                  )}
                </div>

                {/* 学习材料上传 */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    学习材料 JSON
                  </label>
                  <button
                    onClick={() => triggerFileInput(row.id, 'learning')}
                    disabled={isSubmitting}
                    className={cn(
                      "w-full h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 transition-colors",
                      row.learningData
                        ? "border-green-400 bg-green-50 dark:bg-green-900/20 text-green-600"
                        : "border-gray-300 dark:border-gray-600 hover:border-blue-400 text-gray-500"
                    )}
                  >
                    <FileJson className="w-6 h-6" />
                    <span className="text-xs">
                      {row.learningFileName || '点击上传'}
                    </span>
                  </button>
                  {row.learningData && (
                    <p className="mt-1 text-xs text-gray-500">
                      {row.learningData.language_analysis?.vocabulary?.length || 0} 个单词
                    </p>
                  )}
                </div>

                {/* 视频 URL */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    视频播放地址 (可选)
                  </label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="url"
                      value={row.videoUrl}
                      onChange={(e) => handleVideoUrlChange(row.id, e.target.value)}
                      placeholder="https://..."
                      disabled={isSubmitting}
                      className="w-full h-24 pl-10 pr-4 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:border-blue-500 focus:outline-none dark:bg-gray-700 dark:text-gray-200"
                    />
                  </div>
                </div>
              </div>

              {/* 错误信息 */}
              {row.error && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-red-600 dark:text-red-400">{row.error}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 添加行按钮 */}
        <div className="mt-6">
          <Button
            variant="outline"
            onClick={addRow}
            disabled={isSubmitting}
            className="w-full gap-2 border-2 border-dashed"
          >
            <Plus className="w-4 h-4" />
            添加一行
          </Button>
        </div>

        {/* 提示信息 */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg">
          <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-2">上传说明</h3>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <li>• 字幕 JSON 需包含 <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-800 rounded">unit_info</code> 和 <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-800 rounded">subtitles</code> 字段</li>
            <li>• 学习材料 JSON 需包含 <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-800 rounded">unit_info</code> 和 <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-800 rounded">language_analysis</code> 字段</li>
            <li>• 视频地址可选，稍后可在视频详情页补充</li>
            <li>• 创建的视频默认为"草稿"状态，需手动发布</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
