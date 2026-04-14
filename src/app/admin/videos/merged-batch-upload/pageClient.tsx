'use client'

/**
 * 合并批量上传视频 - 客户端组件
 *
 * 处理新格式的合并 JSON（单文件包含多 unit）
 * 每个 unit 自动创建一个独立的视频记录
 * 支持多选文件，最多同时处理5个
 */

import { useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  Upload,
  FileJson,
  Link as LinkIcon,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RotateCw,
  Sparkles,
  Plus,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'
import type { MergedBatchUploadResponse, MergedBatchUploadJson } from '@/types/video'

// ============================================
// 类型定义
// ============================================

/** 单个文件处理状态 */
interface FileProcessingStatus {
  id: string
  fileName: string
  data: MergedBatchUploadJson
  videoUrl: string
  status: 'idle' | 'processing' | 'success' | 'error'
  error?: string
  unitsProcessed: number
  unitsTotal: number
  results?: Array<{
    id: string
    title: string
    unitKey: string
  }>
}

// ============================================
// 常量
// ============================================

const MAX_FILES = 5

/** 解析合并 JSON 文件 */
async function parseMergedJsonFile(file: File): Promise<{ fileName: string; data: MergedBatchUploadJson }> {
  const text = await file.text()
  const json = JSON.parse(text) as MergedBatchUploadJson

  // 基本结构校验
  if (!json.materials || typeof json.materials !== 'object') {
    throw new Error(`合并 JSON 格式无效：缺少 "materials" 对象`)
  }

  const unitKeys = Object.keys(json.materials)
  if (unitKeys.length === 0) {
    throw new Error('合并 JSON 格式无效：materials 为空')
  }

  return { fileName: file.name, data: json }
}

// ============================================
// 组件
// ============================================

export default function MergedBatchUploadClient() {
  const [files, setFiles] = useState<FileProcessingStatus[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [globalProgress, setGlobalProgress] = useState(0)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // 生成唯一 ID
  const createId = useCallback(() => {
    return `file_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  }, [])

  // 处理多文件选择
  const handleFileSelect = useCallback(async (fileList: FileList) => {
    const selectedFiles = Array.from(fileList)

    if (files.length + selectedFiles.length > MAX_FILES) {
      alert(`最多只能同时处理 ${MAX_FILES} 个文件`)
      return
    }

    const newFiles: FileProcessingStatus[] = []

    for (const file of selectedFiles) {
      try {
        const { fileName, data } = await parseMergedJsonFile(file)
        const unitKeys = Object.keys(data.materials)

        newFiles.push({
          id: createId(),
          fileName,
          data,
          videoUrl: '',
          status: 'idle',
          unitsProcessed: 0,
          unitsTotal: unitKeys.length,
        })
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : '解析失败'
        alert(`文件 "${file.name}" 解析失败: ${errorMsg}`)
        console.error('[合并上传] 文件解析失败:', err)
      }
    }

    if (newFiles.length > 0) {
      setFiles(prev => [...prev, ...newFiles])
      console.log(`[合并上传] 成功添加 ${newFiles.length} 个文件`)
    }
  }, [files.length, createId])

  // 触发文件选择
  const triggerFileSelect = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.multiple = true

    input.onchange = async (e) => {
      const selectedFiles = (e.target as HTMLInputElement).files
      if (selectedFiles && selectedFiles.length > 0) {
        await handleFileSelect(selectedFiles)
      }
    }

    input.click()
  }, [handleFileSelect])

  // 删除文件
  const removeFile = useCallback((fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId))
  }, [])

  // 更新文件的视频 URL
  const updateVideoUrl = useCallback((fileId: string, url: string) => {
    setFiles(prev => prev.map(f =>
      f.id === fileId ? { ...f, videoUrl: url } : f
    ))
  }, [])

  // 提交处理
  const handleSubmit = useCallback(async () => {
    const validFiles = files.filter(f => f.status === 'idle')
    if (validFiles.length === 0) {
      alert('没有可处理的文件')
      return
    }

    setIsSubmitting(true)
    setGlobalProgress(0)

    // 标记所有有效文件为处理中
    setFiles(prev => prev.map(f =>
      f.status === 'idle' ? { ...f, status: 'processing' } : f
    ))

    let processedCount = 0
    const totalFiles = validFiles.length

    // 逐个处理文件
    for (const file of validFiles) {
      try {
        const response = await fetch('/api/admin/videos/merged-batch-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            merged_json: file.data,
            video_url: file.videoUrl || undefined,
          }),
        })

        const result: MergedBatchUploadResponse = await response.json()

        if (result.success && result.data) {
          const unitKeys = Object.keys(file.data.materials)

          // 构建结果
          const results = result.data.videos.map((video, index) => ({
            id: video.id,
            title: video.title,
            unitKey: unitKeys[index],
          }))

          setFiles(prev => prev.map(f =>
            f.id === file.id
              ? {
                  ...f,
                  status: 'success',
                  unitsProcessed: result.data.created_count,
                  results,
                }
              : f
          ))
        } else {
          throw new Error(result.data?.errors?.[0]?.error || '处理失败')
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : '处理失败'
        setFiles(prev => prev.map(f =>
          f.id === file.id
            ? { ...f, status: 'error', error: errorMsg }
            : f
        ))
      }

      // 更新进度
      processedCount++
      setGlobalProgress(Math.round((processedCount / totalFiles) * 100))
    }

    setIsSubmitting(false)

    // 显示总结
    const successCount = files.filter(f => f.status === 'success').length
    const errorCount = files.filter(f => f.status === 'error').length

    if (successCount > 0) {
      alert(`处理完成！成功: ${successCount}, 失败: ${errorCount}`)
    }
  }, [files])

  // 重试失败的文件
  const retryFailed = useCallback(() => {
    setFiles(prev => prev.map(f =>
      f.status === 'error'
        ? { ...f, status: 'idle', error: undefined }
        : f
    ))
  }, [])

  // 清空所有
  const clearAll = useCallback(() => {
    if (confirm('确定要清空所有文件吗？')) {
      setFiles([])
    }
  }, [])

  // 获取文件状态图标
  const getFileStatusIcon = (status: FileProcessingStatus['status']) => {
    switch (status) {
      case 'processing':
        return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />
      default:
        return null
    }
  }

  const successCount = files.filter(f => f.status === 'success').length
  const errorCount = files.filter(f => f.status === 'error').length
  const processingCount = files.filter(f => f.status === 'processing').length

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
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
              合并批量上传
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {files.length > 0 && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {files.length}/{MAX_FILES} 文件
                {successCount > 0 && ` • ${successCount} 成功`}
                {errorCount > 0 && ` • ${errorCount} 失败`}
              </span>
            )}
            <Button
              onClick={triggerFileSelect}
              disabled={isSubmitting || files.length >= MAX_FILES}
              className="gap-2 bg-yellow-500 hover:bg-yellow-600 text-black border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              <Plus className="w-4 h-4" />
              添加文件
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || files.filter(f => f.status === 'idle').length === 0}
              className="gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  处理中...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  开始处理
                </>
              )}
            </Button>
          </div>
        </div>

        {/* 全局进度条 */}
        {isSubmitting && (
          <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg p-4 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">总体进度</span>
              <span>{globalProgress}%</span>
            </div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${globalProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* 文件列表 */}
        {files.length === 0 ? (
          /* 空状态 */
          <div className="bg-white dark:bg-gray-800 rounded-lg p-12 border-2 border-dashed border-gray-300 dark:border-gray-600 text-center">
            <FileJson className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-bold mb-2">还没有选择文件</h3>
            <p className="text-gray-500 mb-4">选择 1-5 个合并 JSON 文件开始处理</p>
            <Button
              onClick={triggerFileSelect}
              className="gap-2 bg-yellow-500 hover:bg-yellow-600 text-black border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              <Sparkles className="w-4 h-4" />
              选择文件
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 操作栏 */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">文件列表 ({files.length}/{MAX_FILES})</h2>
              <div className="flex items-center gap-2">
                {errorCount > 0 && !isSubmitting && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={retryFailed}
                    className="gap-1 text-blue-600 hover:text-blue-800 border-blue-300"
                  >
                    <RotateCw className="w-4 h-4" />
                    重试失败项
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAll}
                  disabled={isSubmitting}
                  className="text-red-500 hover:text-red-700"
                >
                  清空全部
                </Button>
              </div>
            </div>

            {/* 文件卡片 */}
            {files.map((file) => (
              <div
                key={file.id}
                className={cn(
                  "bg-white dark:bg-gray-800 rounded-lg p-4 border-2 transition-all",
                  file.status === 'success'
                    ? "border-green-500 shadow-[3px_3px_0px_0px_rgba(34,197,94,1)]"
                    : file.status === 'error'
                      ? "border-red-500 shadow-[3px_3px_0px_0px_rgba(239,68,68,1)]"
                      : "border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                )}
              >
                {/* 文件头部 */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {getFileStatusIcon(file.status)}
                    <div>
                      <h3 className="font-bold">{file.fileName}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {file.unitsTotal} 个 unit
                        {file.status === 'processing' && ` • 处理中 ${file.unitsProcessed}/${file.unitsTotal}`}
                        {file.status === 'success' && ` • 成功创建 ${file.unitsProcessed} 个视频`}
                      </p>
                    </div>
                  </div>

                  {file.status !== 'processing' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(file.id)}
                      disabled={isSubmitting}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                {/* 视频 URL 输入 */}
                {file.status === 'idle' && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                      视频播放地址 (可选)
                    </label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="url"
                        value={file.videoUrl}
                        onChange={(e) => updateVideoUrl(file.id, e.target.value)}
                        placeholder="https://..."
                        disabled={isSubmitting}
                        className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:border-blue-500 focus:outline-none dark:bg-gray-700 dark:text-gray-200"
                      />
                    </div>
                  </div>
                )}

                {/* 错误信息 */}
                {file.status === 'error' && file.error && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-red-600 dark:text-red-400">{file.error}</span>
                  </div>
                )}

                {/* 处理结果预览 */}
                {file.status === 'success' && file.results && file.results.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">
                      已创建的视频：
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {file.results.slice(0, 4).map(result => (
                        <div
                          key={result.id}
                          className="p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-sm"
                        >
                          <div className="font-medium">{result.unitKey}</div>
                          <div className="text-gray-600 dark:text-gray-400 truncate">{result.title}</div>
                        </div>
                      ))}
                    </div>
                    {file.results.length > 4 && (
                      <p className="text-xs text-gray-500">
                        还有 {file.results.length - 4} 个视频...
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 说明信息 */}
        <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-200 dark:border-purple-800 rounded-lg">
          <h3 className="font-medium text-purple-800 dark:text-purple-200 mb-2">合并上传说明</h3>
          <ul className="text-sm text-purple-700 dark:text-purple-300 space-y-1">
            <li>• 支持同时选择 1-{MAX_FILES} 个合并 JSON 文件</li>
            <li>• 每个 JSON 文件可包含多个 unit，每个 unit 创建独立视频</li>
            <li>• 支持额外的学习数据：liaison、intonation、sentence_patterns、scenario</li>
            <li>• 创建的视频默认为"草稿"状态，需手动发布</li>
            <li>• 可以为每个文件单独设置视频 URL，或留空稍后设置</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
