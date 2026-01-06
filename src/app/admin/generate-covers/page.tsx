'use client'

import { useState } from 'react'
import { Upload, CheckCircle, XCircle, Loader2 } from 'lucide-react'

interface GenerationResult {
  bookId: string
  bookName: string
  success: boolean
  coverUrl?: string
  error?: string
}

export default function GenerateCoversPage() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [results, setResults] = useState<GenerationResult[]>([])
  const [progress, setProgress] = useState({ current: 0, total: 0 })

  const handleBatchGenerate = async () => {
    setIsGenerating(true)
    setResults([])
    setProgress({ current: 0, total: 0 })

    try {
      const response = await fetch('/api/generate-book-cover', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await response.json()

      if (data.success) {
        setResults(data.data || [])
        setProgress({
          current: data.data?.filter((r: GenerationResult) => r.success).length || 0,
          total: data.data?.length || 0
        })
      } else {
        alert('批量生成失败: ' + data.error)
      }
    } catch (error) {
      console.error('批量生成错误:', error)
      alert('批量生成失败，请检查控制台')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-gray-900 mb-2">
            🎨 AI 书籍封面生成器
          </h1>
          <p className="text-gray-600">
            使用 Google Imagen API 为所有单词书生成独特的 AI 封面
          </p>
        </div>

        {/* 控制面板 */}
        <div className="clay-card p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">批量生成</h2>
              <p className="text-sm text-gray-600">
                为所有没有封面的书籍生成 AI 封面图片
              </p>
            </div>
            <button
              onClick={handleBatchGenerate}
              disabled={isGenerating}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold rounded-xl hover:from-purple-600 hover:to-indigo-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  开始批量生成
                </>
              )}
            </button>
          </div>

          {/* 进度显示 */}
          {isGenerating && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600">生成进度</span>
                <span className="font-bold text-purple-600">
                  {progress.current} / {progress.total}
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300"
                  style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* 结果列表 */}
        {results.length > 0 && (
          <div className="clay-card p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">生成结果</h3>
            <div className="space-y-3">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                    result.success
                      ? 'border-green-200 bg-green-50'
                      : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {result.success ? (
                      <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
                    )}
                    <div>
                      <p className="font-bold text-gray-900">{result.bookName}</p>
                      <p className="text-sm text-gray-600">ID: {result.bookId}</p>
                      {result.error && (
                        <p className="text-sm text-red-600 mt-1">错误: {result.error}</p>
                      )}
                    </div>
                  </div>
                  {result.success && result.coverUrl && (
                    <div className="flex items-center gap-2">
                      <img
                        src={result.coverUrl}
                        alt={result.bookName}
                        className="w-16 h-8 object-cover rounded"
                      />
                      <a
                        href={result.coverUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-purple-600 hover:text-purple-700 font-semibold"
                      >
                        查看
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* 统计摘要 */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-900">
                  总计: {results.length} 本书
                </span>
                <span className={`font-bold ${
                  results.filter(r => r.success).length === results.length
                    ? 'text-green-600'
                    : 'text-yellow-600'
                }`}>
                  成功: {results.filter(r => r.success).length} / {results.length}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 说明信息 */}
        <div className="mt-6 clay-card p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-3">📝 使用说明</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <span className="text-purple-600 font-bold">1.</span>
              <span>点击"开始批量生成"按钮，系统将自动为所有书籍生成 AI 封面</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-600 font-bold">2.</span>
              <span>每本书的封面都是独一无二的，基于书名和"纳米香蕉"风格生成</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-600 font-bold">3.</span>
              <span>生成的封面会自动保存到 Supabase Storage 并更新数据库</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-600 font-bold">4.</span>
              <span>生成过程可能需要几分钟，请耐心等待</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-600 font-bold">5.</span>
              <span>生成完成后，返回工作台即可看到新的封面</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
