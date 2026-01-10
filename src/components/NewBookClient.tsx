'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Plus, X, Check, AlertCircle, BookOpen, Lightbulb } from 'lucide-react'
import Link from 'next/link'

type Step = 'create' | 'import' | 'success'

interface SmartImportResult {
  word: string
  phonetic: string
  definition_en: string
  part_of_speech: string
  success: boolean
}

export function NewBookClient({ userId }: { userId: string }) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('create')
  const [bookId, setBookId] = useState<string>('')
  const [loading, setLoading] = useState(false)

  // 步骤1：创建词库
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  // 步骤2：智能录入
  const [wordInput, setWordInput] = useState('')
  const [words, setWords] = useState<string[]>([])
  const [importResults, setImportResults] = useState<SmartImportResult[]>([])
  const [quota, setQuota] = useState<{ used: number; remaining: number; limit: number } | null>(null)

  // 错误和成功消息
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [info, setInfo] = useState('') // 修复P2-3: 分离提示信息

  // 修复P1-2: 配额加载状态
  const [quotaLoading, setQuotaLoading] = useState(false)

  // 获取配额
  useEffect(() => {
    if (step === 'import') {
      setQuotaLoading(true) // 修复P1-2: 开始加载
      fetch('/api/smart-import')
        .then(res => res.json())
        .then(data => {
          setQuota(data)
          setQuotaLoading(false) // 修复P1-2: 加载完成
        })
        .catch(err => {
          console.error('Failed to fetch quota:', err)
          setQuotaLoading(false) // 修复P1-2: 加载失败
        })
    }
  }, [step])

  // 创建词库
  const handleCreateBook = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '创建失败')
      }

      setBookId(data.book.id)
      setSuccess('词库创建成功！')
      setTimeout(() => {
        setSuccess('')
        setStep('import')
      }, 3000) // 修复P2-1: 延长到3秒，让用户看清楚
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // 添加单词
  const handleAddWord = () => {
    if (!wordInput.trim()) return

    // 支持多种分隔符：换行、逗号、空格
    const splitWords = wordInput
      .split(/[\n,\s]+/)
      .map(w => w.trim())
      .filter(w => w.length > 0)

    if (splitWords.length === 0) {
      setError('请输入有效的单词')
      return
    }

    // 检查重复
    const newWords = splitWords.filter(w => !words.includes(w))
    const duplicateWords = splitWords.filter(w => words.includes(w))

    if (newWords.length === 0) {
      setError('所有单词都已存在')
      return
    }

    setWords([...words, ...newWords])
    setWordInput('')

    // 修复P2-3: 使用info状态显示提示信息（而不是error）
    if (duplicateWords.length > 0) {
      setInfo(`添加了 ${newWords.length} 个单词，${duplicateWords.length} 个重复已跳过`)
      setTimeout(() => setInfo(''), 3000)
    } else {
      setInfo(`成功添加 ${newWords.length} 个单词`)
      setTimeout(() => setInfo(''), 2000)
    }
  }

  // 移除单词
  const handleRemoveWord = (index: number) => {
    setWords(words.filter((_, i) => i !== index))
  }

  // 智能导入
  const handleSmartImport = async () => {
    if (words.length === 0) {
      setError('请先添加单词')
      return
    }

    if (!bookId) {
      setError('词库ID缺失')
      return
    }

    // 检查配额
    if (quota && words.length > quota.remaining) {
      setError(`超过每日配额限制！剩余：${quota.remaining}，请求：${words.length}`)
      return
    }

    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/smart-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words, bookId })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '导入失败')
      }

      setImportResults(data.words || [])
      setSuccess(`成功导入 ${data.words?.length || 0} 个单词！`)

      // 更新配额
      setQuota({
        used: quota ? quota.used + words.length : words.length,
        remaining: data.remaining,
        limit: quota ? quota.limit : 500
      })

      // 修复P1-3: 延迟清空单词列表，在跳转后再清空
      setTimeout(() => {
        setStep('success')
        setWords([]) // 在跳转后清空
        setWordInput('')
      }, 2000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // 渲染步骤1：创建词库
  if (step === 'create') {
    return (
      <div className="space-y-6">
        {/* 配额提示 */}
        <div className="clay-card p-4 bg-blue-50 border-2 border-blue-200">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-900">
              <strong>智能录入功能</strong>：每日500词配额，自动获取释义、音标、例句
            </div>
          </div>
        </div>

        {/* 创建表单 */}
        <form onSubmit={handleCreateBook} className="clay-card p-6 space-y-6">
          <h2 className="text-xl font-bold text-gray-900">📚 步骤1：创建词库</h2>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              词库名称 <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：雅思高频词汇"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              disabled={loading}
              maxLength={100}
            />
            {/* 修复P2-6: 添加输入字数统计 */}
            <div className="text-xs text-gray-500 text-right mt-1">
              {title.length}/100
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              描述（可选）
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="简要描述这个词库的用途..."
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              disabled={loading}
              rows={3}
              maxLength={500}
            />
            {/* 修复P3-11: 添加textarea字符统计 */}
            <div className="text-xs text-gray-500 text-right mt-1">
              {description.length}/500
            </div>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border-2 border-red-200 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-900">{error}</p>
            </div>
          )}

          {/* 修复P2-3: 添加info提示显示（蓝色背景，用于提示而非错误） */}
          {info && (
            <div className="flex items-start gap-2 p-3 bg-blue-50 border-2 border-blue-200 rounded-xl">
              <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-900">{info}</p>
            </div>
          )}

          {/* 成功提示 */}
          {success && (
            <div className="flex items-start gap-2 p-3 bg-green-50 border-2 border-green-200 rounded-xl">
              <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-900">{success}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !title.trim()}
            className="w-full py-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-bold rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                创建中...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                创建词库
              </>
            )}
          </button>
        </form>
      </div>
    )
  }

  // 渲染步骤2：智能录入
  if (step === 'import') {
    return (
      <div className="space-y-6">
        {/* 修复P1-2: 配额显示 - 添加加载状态 */}
        {quotaLoading ? (
          <div className="clay-card p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200">
            <div className="flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mr-3" />
              <p className="text-sm font-bold text-purple-900">加载配额中...</p>
            </div>
          </div>
        ) : quota && (
          <div className="clay-card p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-purple-900">今日智能录入配额</p>
                <p className="text-xs text-purple-700 mt-1">
                  已使用 {quota.used} / {quota.limit} 词
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-purple-600">{quota.remaining}</p>
                <p className="text-xs text-purple-700">剩余</p>
              </div>
            </div>
          </div>
        )}

        {/* 导入表单 */}
        <div className="clay-card p-6 space-y-6">
          <h2 className="text-xl font-bold text-gray-900">✨ 步骤2：智能录入单词</h2>

          {/* 添加单词 */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              添加单词（每行一个，或逗号分隔）
            </label>
            <textarea
              value={wordInput}
              onChange={(e) => setWordInput(e.target.value)}
              placeholder={`apple, banana, orange\n或每行一个单词：\napple\nbanana\norange`}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none font-mono text-sm"
              rows={6}
            />
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-3">
                {/* 修复P3-11: 添加字符统计 */}
                <p className="text-xs text-gray-500">
                  {wordInput.length} 字符
                </p>
                <p className="text-xs text-gray-500">
                  支持批量粘贴，自动识别分隔符
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddWord}
                className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                添加到列表
              </button>
            </div>
          </div>

          {/* 单词列表 */}
          {words.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-900">
                  待导入单词 ({words.length})
                </h3>
                {/* 修复P2-2: 添加清空列表确认提示 */}
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`确定要清空 ${words.length} 个单词吗？`)) {
                      setWords([])
                    }
                  }}
                  className="text-xs text-red-600 hover:text-red-700 font-semibold"
                >
                  清空列表
                </button>
              </div>
              <div className="max-h-60 overflow-y-auto border-2 border-gray-200 rounded-xl p-3 space-y-2">
                {words.map((word, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg"
                  >
                    <span className="text-sm font-mono">{word}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveWord(index)}
                      className="text-red-600 hover:text-red-700 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border-2 border-red-200 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-900">{error}</p>
            </div>
          )}

          {/* 修复P2-3: 添加info提示显示（蓝色背景，用于提示而非错误） */}
          {info && (
            <div className="flex items-start gap-2 p-3 bg-blue-50 border-2 border-blue-200 rounded-xl">
              <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-900">{info}</p>
            </div>
          )}

          {/* 成功提示 */}
          {success && (
            <div className="flex items-start gap-2 p-3 bg-green-50 border-2 border-green-200 rounded-xl">
              <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-900">{success}</p>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex gap-3">
            {/* 修复P0: 移除"上一步"按钮 - 词库已创建，不允许返回 */}
            {/* 原因：返回会导致bookId混乱，用户可能重复创建词库 */}
            <button
              type="button"
              onClick={() => {
                if (window.confirm('确定要放弃当前词库吗？这将返回首页。')) {
                  router.push('/')
                }
              }}
              className="flex-1 py-4 border-2 border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSmartImport}
              disabled={loading || words.length === 0 || (quota && words.length > quota.remaining)}
              className="flex-1 py-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-bold rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  导入中...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  智能导入 ({words.length} 词)
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 渲染步骤3：成功
  if (step === 'success') {
    return (
      <div className="clay-card p-12 text-center">
        <div className="w-24 h-24 mx-auto mb-6 clay-card clay-icon flex items-center justify-center">
          <Check className="w-12 h-12 text-green-600" />
        </div>
        <h2 className="text-3xl font-black text-gray-900 mb-4">
          🎉 词库创建成功！
        </h2>
        <p className="text-gray-600 mb-8 max-w-md mx-auto">
          你已成功创建自定义词库并导入了 {importResults.length} 个单词
        </p>

        {/* 导入结果统计 */}
        <div className="grid grid-cols-2 gap-4 mb-8 max-w-md mx-auto">
          <div className="bg-green-50 p-4 rounded-xl">
            <p className="text-2xl font-black text-green-600">
              {importResults.filter(r => r.success).length}
            </p>
            <p className="text-xs text-green-700 mt-1">成功获取释义</p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-xl">
            <p className="text-2xl font-black text-yellow-600">
              {importResults.filter(r => !r.success).length}
            </p>
            <p className="text-xs text-yellow-700 mt-1">仅保存单词</p>
          </div>
        </div>

        {/* 修复P2-5: 显示详细导入结果 */}
        {importResults.length > 0 && (
          <div className="mb-8 max-w-md mx-auto">
            <h3 className="text-sm font-bold text-gray-900 mb-3">导入结果详情</h3>
            <div className="max-h-60 overflow-y-auto border-2 border-gray-200 rounded-xl p-3">
              {importResults.slice(0, 20).map((result, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <span className="text-sm font-mono">{result.word}</span>
                  {result.success ? (
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0" title="成功获取释义" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0" title="仅保存单词，未获取释义" />
                  )}
                </div>
              ))}
              {importResults.length > 20 && (
                <p className="text-xs text-gray-500 text-center pt-2">
                  还有 {importResults.length - 20} 个单词...
                </p>
              )}
            </div>
          </div>
        )}

        {/* 下一步操作 */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/library/new"
            className="px-6 py-3 border-2 border-purple-600 text-purple-600 font-bold rounded-xl hover:bg-purple-50 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            再创建一个
          </Link>
          <Link
            href={`/library/${bookId}`}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-bold rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
          >
            <BookOpen className="w-5 h-5" />
            开始学习
          </Link>
        </div>
      </div>
    )
  }

  return null
}
