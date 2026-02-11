'use client'

import { useState, useEffect } from 'react'
import { X, Upload, Loader2, CheckCircle, AlertCircle, Sparkles } from 'lucide-react'

interface Chapter {
  id: string
  title: string
}

interface SmartImportDialogProps {
  isOpen: boolean
  onClose: () => void
  bookId: string
  bookTitle: string
  chapters: Chapter[]
  onSuccess?: () => void
}

interface ImportResult {
  word: string
  success: boolean
  error?: string
}

export function SmartImportDialog({
  isOpen,
  onClose,
  bookId,
  bookTitle,
  chapters,
  onSuccess
}: SmartImportDialogProps) {
  const [wordsText, setWordsText] = useState('')
  const [selectedChapterId, setSelectedChapterId] = useState<string>('')
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState('正在连接服务器...')
  const [importResults, setImportResults] = useState<ImportResult[]>([])
  const [quota, setQuota] = useState<{ used: number; remaining: number; limit: number } | null>(null)
  const [error, setError] = useState('')

  // 获取今日配额
  const fetchQuota = async () => {
    try {
      const response = await fetch('/api/smart-import')
      if (response.ok) {
        const data = await response.json()
        setQuota(data)
      }
    } catch (err) {
      console.error('Failed to fetch quota:', err)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchQuota()
      setWordsText('')
      setImportResults([])
      setError('')
      setImportProgress('')
      setSelectedChapterId('')
    }
  }, [isOpen])

  // 解析输入的单词（支持中英文逗号、换行符）
  const parseWords = (): { unique: string[]; original: string[]; duplicateCount: number } => {
    const words = wordsText
      .split(/[,\uFF0C\n\r]+/)  // , 英文逗号, \uFF0C 中文逗号, \n\r 换行符
      .map(w => w.trim().toLowerCase())
      .filter(w => w.length > 0)

    // 去重
    const unique = Array.from(new Set(words))
    return {
      unique,
      original: words,
      duplicateCount: words.length - unique.length
    }
  }

  // 验证单词格式
  const validateWord = (word: string): boolean => {
    // 允许单词、词组（字母、连字符、空格、单引号）
    // 至少包含一个字母，可以包含连字符、空格和单引号
    return /^[a-z][a-z\- '\s]*[a-z]$|^[a-z]$/.test(word) && word.trim().length > 0
  }

  // 执行导入
  const handleImport = async () => {
    const { unique: words, duplicateCount } = parseWords()

    if (words.length === 0) {
      setError('请输入至少一个单词')
      return
    }

    // 验证单词格式
    const invalidWords = words.filter(w => !validateWord(w))
    if (invalidWords.length > 0) {
      setError(`以下单词格式不正确: ${invalidWords.slice(0, 5).join(', ')}${invalidWords.length > 5 ? '...' : ''}`)
      return
    }

    // 检查配额
    if (quota && words.length > quota.remaining) {
      setError(`超过今日配额限制。今日剩余配额: ${quota.remaining} 个单词`)
      return
    }

    setIsImporting(true)
    setImportProgress(`正在导入 ${words.length} 个单词...`)
    setError('')
    setImportResults([])

    try {
      const response = await fetch('/api/smart-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          words,
          bookId,
          chapterId: selectedChapterId || undefined
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '导入失败')
      }

      // 🔧 修复：显示实际导入的数量，而不是请求数量
      const imported = data.imported || 0
      const results: ImportResult[] = words.map(word => ({
        word,
        success: true
      }))

      console.log(`[SmartImport] 请求: ${words.length}个, 实际导入: ${imported}个`)

      setImportProgress(`正在保存到数据库...`)
      setImportResults(results)

      // 更新配额
      await fetchQuota()

      // 如果成功,2秒后关闭对话框
      if (data.success) {
        setImportProgress('导入完成！')
        setTimeout(() => {
          onSuccess?.()
          onClose()
        }, 2000)
      }
    } catch (err: any) {
      setImportProgress('导入失败')
      setError(err.message)
    } finally {
      setIsImporting(false)
    }
  }

  if (!isOpen) return null

  const { unique: words, original, duplicateCount } = parseWords()
  const isValid = words.length > 0 && words.length <= 500

  // 🔧 调试：检查按钮为什么被禁用
  const disableReason = !quota ? '正在加载配额...'
    : !isValid ? words.length === 0 ? '请输入单词' : words.length > 500 ? '超过500个限制' : '格式错误'
    : words.length > (quota?.remaining || 0) ? `超过今日配额（剩余${quota?.remaining}个）`
    : isImporting ? '导入中...' : ''

  const canImport = isValid && !isImporting && quota && words.length <= quota.remaining

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded">
              <Sparkles className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">智能导入单词</h2>
              <p className="text-sm text-slate-500 mt-0.5">{bookTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded transition-colors"
            disabled={isImporting}
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* 配额提示 */}
          {quota && (
            <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-indigo-900">今日配额使用情况</span>
                <span className="text-2xl font-bold text-indigo-600">
                  {quota.remaining}/{quota.limit}
                </span>
              </div>
              <div className="w-full bg-white rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                  style={{ width: `${(quota.used / quota.limit) * 100}%` }}
                />
              </div>
              <p className="text-xs text-indigo-700 mt-2">
                已使用 {quota.used} 个单词，剩余 {quota.remaining} 个
              </p>
            </div>
          )}

          {/* 目标章节选择 */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              目标章节（可选）
            </label>
            <select
              value={selectedChapterId}
              onChange={(e) => setSelectedChapterId(e.target.value)}
              disabled={isImporting}
              className="w-full px-4 py-2.5 border-2 border-slate-200 rounded focus:border-indigo-400 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">自动创建默认章节</option>
              {chapters.map(chapter => (
                <option key={chapter.id} value={chapter.id}>
                  {chapter.title}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">
              如果不选择章节，系统将自动创建默认章节
            </p>
          </div>

          {/* 单词输入 */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              输入单词列表
            </label>
            <textarea
              value={wordsText}
              onChange={(e) => setWordsText(e.target.value)}
              placeholder="输入要导入的单词，用逗号或换行分隔&#10;例如: apple, banana, orange"
              rows={10}
              disabled={isImporting}
              className="w-full px-4 py-3 border-2 border-slate-200 rounded focus:border-indigo-400 focus:outline-none font-mono text-sm disabled:opacity-50 disabled:cursor-not-allowed resize-none"
            />
            <div className="flex items-center justify-between mt-2">
              <div className="flex flex-col gap-1">
                <p className="text-xs text-slate-500">
                  已识别 {words.length} 个单词（最多500个）
                </p>
                {duplicateCount > 0 && (
                  <p className="text-xs text-amber-600">
                    ⚠️ 检测到 {duplicateCount} 个重复，已自动去重（输入{original.length}个）
                  </p>
                )}
              </div>
              {words.length > 500 && (
                <p className="text-xs text-red-600 font-semibold">
                  超过限制，请减少到500个以内
                </p>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Import Progress */}
          {isImporting && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-900 mb-1">
                    正在处理中...
                  </p>
                  <p className="text-xs text-blue-700">
                    {importProgress}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    大约需要 1-2 分钟，请耐心等待
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Import Results */}
          {importResults.length > 0 && (
            <div className="p-4 bg-green-50 border border-green-200 rounded">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-green-900">导入成功</span>
                <span className="text-sm text-green-700">
                  (已识别 {importResults.length} 个单词，正在保存...)
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {importResults.slice(0, 20).map((result, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-white rounded text-sm font-medium text-slate-700 border border-green-200"
                  >
                    {result.word}
                  </span>
                ))}
                {importResults.length > 20 && (
                  <span className="px-2 py-1 bg-green-100 rounded text-sm font-semibold text-green-700">
                    +{importResults.length - 20} 更多
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 bg-slate-50">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isImporting}
              className="flex-1 px-4 py-2.5 border-2 border-slate-200 text-slate-700 font-semibold rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleImport}
              disabled={!canImport}
              className="flex-1 px-4 py-2.5 bg-indigo-600 text-white font-semibold rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              title={disableReason || undefined}
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  导入中...
                </>
              ) : disableReason ? (
                <>
                  <Upload className="w-4 h-4" />
                  {disableReason}
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  开始导入 ({words.length})
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
