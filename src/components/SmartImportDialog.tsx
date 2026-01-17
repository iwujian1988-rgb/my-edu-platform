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
      setSelectedChapterId('')
    }
  }, [isOpen])

  // 解析输入的单词
  const parseWords = (): string[] => {
    const words = wordsText
      .split(/[,\n\r]+/)
      .map(w => w.trim().toLowerCase())
      .filter(w => w.length > 0)

    // 去重
    return Array.from(new Set(words))
  }

  // 验证单词格式
  const validateWord = (word: string): boolean => {
    // 只允许字母和连字符
    return /^[a-z][a-z-]*[a-z]$|^[a-z]$/.test(word)
  }

  // 执行导入
  const handleImport = async () => {
    const words = parseWords()

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

      // 生成导入结果
      const results: ImportResult[] = words.map(word => ({
        word,
        success: true
      }))

      setImportResults(results)

      // 更新配额
      await fetchQuota()

      // 如果成功,3秒后关闭对话框
      if (data.success) {
        setTimeout(() => {
          onSuccess?.()
          onClose()
        }, 2000)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsImporting(false)
    }
  }

  if (!isOpen) return null

  const words = parseWords()
  const isValid = words.length > 0 && words.length <= 100
  const canImport = isValid && !isImporting && quota && words.length <= quota.remaining

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-xl">
              <Sparkles className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">智能导入单词</h2>
              <p className="text-sm text-slate-500 mt-0.5">{bookTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
            disabled={isImporting}
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* 配额提示 */}
          {quota && (
            <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl">
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
              className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:border-indigo-400 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-indigo-400 focus:outline-none font-mono text-sm disabled:opacity-50 disabled:cursor-not-allowed resize-none"
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-slate-500">
                已识别 {words.length} 个单词（最多100个）
              </p>
              {words.length > 100 && (
                <p className="text-xs text-red-600 font-semibold">
                  超过限制，请减少到100个以内
                </p>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Import Results */}
          {importResults.length > 0 && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-green-900">导入成功</span>
                <span className="text-sm text-green-700">
                  ({importResults.length} 个单词)
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {importResults.slice(0, 20).map((result, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-white rounded-lg text-sm font-medium text-slate-700 border border-green-200"
                  >
                    {result.word}
                  </span>
                ))}
                {importResults.length > 20 && (
                  <span className="px-2 py-1 bg-green-100 rounded-lg text-sm font-semibold text-green-700">
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
              className="flex-1 px-4 py-2.5 border-2 border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleImport}
              disabled={!canImport}
              className="flex-1 px-4 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  导入中...
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
