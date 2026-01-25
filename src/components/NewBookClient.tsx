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
        {/* 配额提示 - Neo-Brutalism */}
        <div className="transition-all duration-300 p-4 md:p-6" style={{ backgroundColor: '#FEF3C7', border: '3px solid #000000', borderRadius: '12px', boxShadow: '4px 4px 0px 0px #000000' }}>
          <div className="flex items-start gap-3">
            <div className="transition-all duration-300 p-2 flex-shrink-0" style={{ backgroundColor: 'var(--card-bg)', border: '2px solid #000000', borderRadius: '8px', boxShadow: '2px 2px 0px 0px #000000' }}>
              <Lightbulb className="w-5 h-5" style={{ color: '#FACC15' }} strokeWidth={2.5} />
            </div>
            <div className="text-sm">
              <p className="font-black mb-1 transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>智能录入功能</p>
              <p className="font-semibold transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>每日500词配额，自动获取释义、音标、例句</p>
            </div>
          </div>
        </div>

        {/* 创建表单 - Neo-Brutalism */}
        <form onSubmit={handleCreateBook} className="transition-all duration-300 p-6 md:p-8 space-y-6" style={{ backgroundColor: 'var(--card-bg)', border: '3px solid #000000', borderRadius: '16px', boxShadow: '4px 4px 0px 0px #000000' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-[#22C55E] border-2 border-black p-3 shadow-[2px_2px_0px_0px_#000]">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>步骤1：创建词库</h2>
              <p className="text-sm font-bold mt-0.5 transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>填写基本信息</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-black mb-2 flex items-center gap-2 transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>
              <span>词库名称</span>
              <span className="px-2 py-0.5 text-white text-xs font-black border-2 border-black" style={{ backgroundColor: '#EF4444' }}>必填</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：雅思高频词汇"
              className="w-full px-4 py-3 border-2 border-black focus:outline-none transition-colors font-bold"
              style={{ backgroundColor: 'var(--input-bg, #F3F4F6)', color: 'var(--text-primary)' }}
              disabled={loading}
              maxLength={100}
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs font-bold transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>💡 建议使用简洁明了的名称</p>
              <p className="text-xs font-black transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>{title.length}/100</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-black mb-2 transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>
              描述（可选）
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="简要描述这个词库的用途..."
              className="w-full px-4 py-3 border-2 border-black focus:outline-none resize-none transition-colors font-bold"
              style={{ backgroundColor: 'var(--input-bg, #F3F4F6)', color: 'var(--text-primary)' }}
              disabled={loading}
              rows={3}
              maxLength={500}
            />
            <div className="text-xs text-right mt-2 font-black transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>
              {description.length}/500
            </div>
          </div>

          {/* 错误提示 - Neo-Brutalism */}
          {error && (
            <div className="transition-all duration-300 p-4" style={{ backgroundColor: '#EF4444', border: '3px solid #000000', borderRadius: '12px', boxShadow: '2px 2px 0px 0px #000000' }}>
              <div className="flex items-start gap-3">
                <div className="transition-all duration-300 p-2 flex-shrink-0" style={{ backgroundColor: 'var(--card-bg)', border: '2px solid #000000', borderRadius: '8px', boxShadow: '2px 2px 0px 0px #000000' }}>
                  <AlertCircle className="w-5 h-5" style={{ color: '#EF4444' }} strokeWidth={2.5} />
                </div>
                <p className="text-sm font-black text-white flex-1">{error}</p>
              </div>
            </div>
          )}

          {/* Info 提示 - Neo-Brutalism */}
          {info && (
            <div className="transition-all duration-300 p-4" style={{ backgroundColor: '#3B82F6', border: '3px solid #000000', borderRadius: '12px', boxShadow: '2px 2px 0px 0px #000000' }}>
              <div className="flex items-start gap-3">
                <div className="transition-all duration-300 p-2 flex-shrink-0" style={{ backgroundColor: 'var(--card-bg)', border: '2px solid #000000', borderRadius: '8px', boxShadow: '2px 2px 0px 0px #000000' }}>
                  <Check className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
                <p className="text-sm font-black text-white flex-1">{info}</p>
              </div>
            </div>
          )}

          {/* 成功提示 - Neo-Brutalism */}
          {success && (
            <div className="transition-all duration-300 p-4" style={{ backgroundColor: '#22C55E', border: '3px solid #000000', borderRadius: '12px', boxShadow: '2px 2px 0px 0px #000000' }}>
              <div className="flex items-start gap-3">
                <div className="transition-all duration-300 p-2 flex-shrink-0" style={{ backgroundColor: 'var(--card-bg)', border: '2px solid #000000', borderRadius: '8px', boxShadow: '2px 2px 0px 0px #000000' }}>
                  <Check className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
                <p className="text-sm font-black text-white flex-1">{success}</p>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !title.trim()}
            className="w-full py-4 bg-[#22C55E] text-white font-black border-3px border-black shadow-[4px_4px_0px_0px_#000] hover:shadow-[6px_6px_0px_0px_#000] hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2 text-lg"
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
        {/* 配额显示 - Neo-Brutalism */}
        {quotaLoading ? (
          <div className="transition-all duration-300 p-6" style={{ backgroundColor: 'var(--card-bg)', border: '3px solid #000000', borderRadius: '16px', boxShadow: '4px 4px 0px 0px #000000' }}>
            <div className="flex items-center justify-center gap-3">
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-black transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>加载配额中...</p>
            </div>
          </div>
        ) : quota && (
          <div className="transition-all duration-300 p-4 md:p-6" style={{ backgroundColor: '#3B82F6', border: '3px solid #000000', borderRadius: '16px', boxShadow: '4px 4px 0px 0px #000000' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="transition-all duration-300 p-2" style={{ backgroundColor: 'var(--card-bg)', border: '2px solid #000000', borderRadius: '8px', boxShadow: '2px 2px 0px 0px #000000' }}>
                  <Sparkles className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-sm font-black text-white">今日智能录入配额</p>
                  <p className="text-xs mt-1 font-bold text-white">
                    已使用 {quota.used} / {quota.limit} 词
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black text-white">{quota.remaining}</p>
                <p className="text-xs font-black mt-1 text-white">剩余</p>
              </div>
            </div>
            {/* 进度条 */}
            <div className="mt-4">
              <div className="border-2 border-black h-3 overflow-hidden" style={{ backgroundColor: 'var(--card-bg)' }}>
                <div
                  className="h-full border-r-2 border-black"
                  style={{ width: `${(quota.used / quota.limit) * 100}%`, backgroundColor: '#22C55E' }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {/* 导入表单 - Neo-Brutalism */}
        <div className="transition-all duration-300 p-6 md:p-8 space-y-6" style={{ backgroundColor: 'var(--card-bg)', border: '3px solid #000000', borderRadius: '16px', boxShadow: '4px 4px 0px 0px #000000' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 shadow-[2px_2px_0px_0px_#000]" style={{ backgroundColor: '#22C55E', border: '2px solid #000000', borderRadius: '12px', boxShadow: '2px 2px 0px 0px #000000' }}>
              <Sparkles className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>步骤2：智能录入单词</h2>
              <p className="text-sm font-bold mt-0.5 transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>批量添加，AI 自动获取释义</p>
            </div>
          </div>

          {/* 添加单词 */}
          <div>
            <label className="block text-sm font-black mb-2 transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>
              添加单词
              <span className="block text-xs font-bold mt-1 transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>
                支持每行一个、逗号或空格分隔
              </span>
            </label>
            <textarea
              value={wordInput}
              onChange={(e) => setWordInput(e.target.value)}
              placeholder={`apple, banana, orange\n\n或每行一个单词：\napple\nbanana\norange`}
              className="w-full px-4 py-3 border-2 border-black focus:outline-none resize-none font-mono text-sm transition-colors font-bold"
              style={{ backgroundColor: 'var(--input-bg, #F3F4F6)', color: 'var(--text-primary)' }}
              rows={6}
            />
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-3">
                <p className="text-xs font-black transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>
                  📝 {wordInput.length} 字符
                </p>
                <p className="text-xs font-bold transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>
                  💡 支持批量粘贴，自动识别分隔符
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddWord}
                className="text-white px-6 py-2 font-black border-2 border-black shadow-[2px_2px_0px_0px_#000] hover:shadow-[4px_4px_0px_0px_#000] hover:-translate-y-0.5 transition-all text-sm flex items-center gap-2"
                style={{ backgroundColor: '#3B82F6' }}
              >
                <Plus className="w-4 h-4" />
                添加到列表
              </button>
            </div>
          </div>

          {/* 单词列表 - Neo-Brutalism */}
          {words.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="bg-[#3B82F6] border-2 border-black p-2 shadow-[2px_2px_0px_0px_#000]">
                    <BookOpen className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="text-sm font-black text-black">
                    待导入单词 ({words.length})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`确定要清空 ${words.length} 个单词吗？`)) {
                      setWords([])
                    }
                  }}
                  className="text-xs text-white font-black px-3 py-1.5 bg-[#EF4444] border-2 border-black shadow-[2px_2px_0px_0px_#000] hover:bg-red-500 transition-colors"
                >
                  清空列表
                </button>
              </div>
              <div className="max-h-60 overflow-y-auto border-2 border-black p-3 space-y-2 bg-[var(--card-bg)]">
                {words.map((word, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between px-3 py-2 border-2 border-black bg-gray-50 hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_0px_#000] transition-all"
                  >
                    <span className="text-sm font-mono font-black text-black">{word}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveWord(index)}
                      className="bg-[var(--card-bg)] border-2 border-black p-1.5 hover:bg-[#EF4444] hover:text-white transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 错误提示 - Neo-Brutalism */}
          {error && (
            <div className="transition-all duration-300 p-4" style={{ backgroundColor: '#EF4444', border: '3px solid #000000', borderRadius: '12px', boxShadow: '2px 2px 0px 0px #000000' }}>
              <div className="flex items-start gap-3">
                <div className="transition-all duration-300 p-2 flex-shrink-0" style={{ backgroundColor: 'var(--card-bg)', border: '2px solid #000000', borderRadius: '8px', boxShadow: '2px 2px 0px 0px #000000' }}>
                  <AlertCircle className="w-5 h-5" style={{ color: '#EF4444' }} strokeWidth={2.5} />
                </div>
                <p className="text-sm font-black text-white flex-1">{error}</p>
              </div>
            </div>
          )}

          {/* Info 提示 - Neo-Brutalism */}
          {info && (
            <div className="transition-all duration-300 p-4" style={{ backgroundColor: '#3B82F6', border: '3px solid #000000', borderRadius: '12px', boxShadow: '2px 2px 0px 0px #000000' }}>
              <div className="flex items-start gap-3">
                <div className="transition-all duration-300 p-2 flex-shrink-0" style={{ backgroundColor: 'var(--card-bg)', border: '2px solid #000000', borderRadius: '8px', boxShadow: '2px 2px 0px 0px #000000' }}>
                  <Check className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
                <p className="text-sm font-black text-white flex-1">{info}</p>
              </div>
            </div>
          )}

          {/* 成功提示 - Neo-Brutalism */}
          {success && (
            <div className="transition-all duration-300 p-4" style={{ backgroundColor: '#22C55E', border: '3px solid #000000', borderRadius: '12px', boxShadow: '2px 2px 0px 0px #000000' }}>
              <div className="flex items-start gap-3">
                <div className="transition-all duration-300 p-2 flex-shrink-0" style={{ backgroundColor: 'var(--card-bg)', border: '2px solid #000000', borderRadius: '8px', boxShadow: '2px 2px 0px 0px #000000' }}>
                  <Check className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
                <p className="text-sm font-black text-white flex-1">{success}</p>
              </div>
            </div>
          )}

          {/* 操作按钮 - Neo-Brutalism */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                if (window.confirm('确定要放弃当前词库吗？这将返回首页。')) {
                  router.push('/')
                }
              }}
              className="flex-1 py-3 bg-[var(--card-bg)] text-black font-black border-3px border-black shadow-[2px_2px_0px_0px_#000] hover:shadow-[4px_4px_0px_0px_#000] hover:-translate-y-0.5 transition-all"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSmartImport}
              disabled={loading || words.length === 0 || (quota && words.length > quota.remaining)}
              className="flex-1 py-3 bg-[#22C55E] text-white font-black border-3px border-black shadow-[4px_4px_0px_0px_#000] hover:shadow-[6px_6px_0px_0px_#000] hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2"
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
      <div className="bg-[var(--card-bg)] border-3px border-black shadow-[6px_6px_0px_0px_#000] p-8 md:p-12 text-center">
        {/* 成功图标 - Neo-Brutalism */}
        <div className="w-24 h-24 mx-auto mb-6 bg-[#22C55E] border-3px border-black shadow-[4px_4px_0px_0px_#000] flex items-center justify-center">
          <Check className="w-12 h-12 text-white" />
        </div>

        {/* 标题 */}
        <h2 className="text-3xl md:text-4xl font-black text-black mb-4">
          🎉 词库创建成功！
        </h2>
        <p className="text-gray-700 font-bold mb-8 max-w-md mx-auto">
          你已成功创建自定义词库并导入了 <span className="text-[#22C55E] font-black">{importResults.length}</span> 个单词
        </p>

        {/* 导入结果统计 - Neo-Brutalism */}
        <div className="grid grid-cols-2 gap-4 mb-8 max-w-md mx-auto">
          <div className="bg-[#22C55E] border-3px border-black shadow-[4px_4px_0px_0px_#000] p-4 md:p-6 hover:shadow-[6px_6px_0px_0px_#000] hover:-translate-y-1 transition-all">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="bg-[var(--card-bg)] border-2 border-black p-2 shadow-[2px_2px_0px_0px_#000]">
                <Check className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-black text-white">
              {importResults.filter(r => r.success).length}
            </p>
            <p className="text-xs font-bold mt-1">成功获取释义</p>
          </div>
          <div className="bg-yellow-300 border-3px border-black shadow-[4px_4px_0px_0px_#000] p-4 md:p-6 hover:shadow-[6px_6px_0px_0px_#000] hover:-translate-y-1 transition-all">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="bg-[var(--card-bg)] border-2 border-black p-2 shadow-[2px_2px_0px_0px_#000]">
                <AlertCircle className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-black text-black">
              {importResults.filter(r => !r.success).length}
            </p>
            <p className="text-xs font-black mt-1">仅保存单词</p>
          </div>
        </div>

        {/* 导入结果详情 - Neo-Brutalism */}
        {importResults.length > 0 && (
          <div className="mb-8 max-w-md mx-auto">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="bg-[#3B82F6] border-2 border-black p-2 shadow-[2px_2px_0px_0px_#000]">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-sm font-black text-black">导入结果详情</h3>
            </div>
            <div className="border-2 border-black p-3 max-h-60 overflow-y-auto bg-[var(--card-bg)]">
              {importResults.slice(0, 20).map((result, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 px-3 border-b-2 border-black last:border-0 hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm font-mono font-black text-black">{result.word}</span>
                  {result.success ? (
                    <div className="bg-[#22C55E] border-2 border-black p-1">
                      <Check className="w-4 h-4 text-white" title="成功获取释义" />
                    </div>
                  ) : (
                    <div className="bg-yellow-300 border-2 border-black p-1">
                      <AlertCircle className="w-4 h-4" title="仅保存单词，未获取释义" />
                    </div>
                  )}
                </div>
              ))}
              {importResults.length > 20 && (
                <p className="text-xs text-black text-center pt-2 font-black">
                  还有 {importResults.length - 20} 个单词...
                </p>
              )}
            </div>
          </div>
        )}

        {/* 下一步操作 - Neo-Brutalism */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/library/new"
            className="px-6 py-3 bg-[#3B82F6] text-white font-black border-3px border-black shadow-[4px_4px_0px_0px_#000] hover:shadow-[6px_6px_0px_0px_#000] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            再创建一个
          </Link>
          <Link
            href={`/library/${bookId}`}
            className="px-6 py-3 bg-[#22C55E] text-white font-black border-3px border-black shadow-[4px_4px_0px_0px_#000] hover:shadow-[6px_6px_0px_0px_#000] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
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
