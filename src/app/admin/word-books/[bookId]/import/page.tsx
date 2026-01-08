'use client'

/**
 * Excel 批量导入单词页面
 */

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react'

interface Chapter {
  id: string
  title: string
  order_index: number
}

interface ImportError {
  row: number
  word: string
  error: string
  field?: string
}

export default function ImportWordsPage() {
  const router = useRouter()
  const params = useParams()
  const bookId = params.bookId as string

  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [chapters, setChapters] = useState<Chapter[]>([])

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedChapterId, setSelectedChapterId] = useState('')

  const [importResult, setImportResult] = useState<{
    success: boolean
    message: string
    imported?: number
    failed?: number
    errors?: ImportError[]
  } | null>(null)

  // 获取章节列表
  useEffect(() => {
    fetchChapters()
  }, [bookId])

  const fetchChapters = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/admin/word-books/${bookId}/chapters`
      )
      if (!response.ok) {
        throw new Error('获取章节列表失败')
      }
      const data = await response.json()
      setChapters(data.data.chapters || [])

      if (data.data.chapters?.length > 0) {
        setSelectedChapterId(data.data.chapters[0].id)
      }
    } catch (error: any) {
      console.error('获取章节列表失败:', error)
      alert(error.message || '获取章节列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 验证文件类型
    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ]
    if (!validTypes.includes(file.type)) {
      alert('请选择 Excel 文件 (.xlsx 或 .xls)')
      return
    }

    setSelectedFile(file)
    setImportResult(null)
  }

  const handleDownloadTemplate = () => {
    // 创建模板数据
    const template = [
      [
        '单词*',
        '音标',
        '释义*',
        '例句',
        '排序序号'
      ],
      [
        'hello',
        '/həˈloʊ/',
        '你好；问候',
        'Hello, how are you?',
        '1'
      ],
      [
        'world',
        '/wɜːrld/',
        '世界；地球',
        'Welcome to the world of English.',
        '2'
      ]
    ]

    // 转换为 CSV
    const csv = template.map(row => row.join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = '单词导入模板.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async () => {
    if (!selectedFile) {
      alert('请选择要导入的文件')
      return
    }

    if (!selectedChapterId) {
      alert('请选择目标章节')
      return
    }

    try {
      setUploading(true)

      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('chapter_id', selectedChapterId)

      const response = await fetch(
        `/api/admin/word-books/${bookId}/import`,
        {
          method: 'POST',
          body: formData,
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '导入失败')
      }

      setImportResult({
        success: true,
        message: '导入完成',
        imported: data.data.imported,
        failed: data.data.failed,
        errors: data.data.errors,
      })
    } catch (error: any) {
      console.error('导入失败:', error)
      setImportResult({
        success: false,
        message: error.message || '导入失败',
      })
    } finally {
      setUploading(false)
    }
  }

  const handleDownloadErrors = () => {
    if (!importResult?.errors || importResult.errors.length === 0) return

    const errors = importResult.errors
    const csv = [
      ['行号', '单词', '错误字段', '错误信息'],
      ...errors.map(e => [e.row.toString(), e.word, e.field || '', e.error])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `导入错误报告-${Date.now()}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="p-6 max-w-4xl">
        <div className="text-center py-12 text-gray-500">
          加载中...
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl">
      {/* 顶部导航 */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href={`/admin/word-books/${bookId}`}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">
            Excel 批量导入
          </h1>
          <p className="text-sm text-gray-500">
            从 Excel 文件批量导入单词
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* 使用说明 */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
          <h2 className="text-lg font-bold text-blue-900 mb-3">
            使用说明
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-blue-800">
            <li>下载 Excel 模板文件</li>
            <li>按照模板格式填写单词信息（带 * 的字段为必填）</li>
            <li>选择要导入到的章节</li>
            <li>上传填写好的 Excel 文件</li>
            <li>系统会自动验证数据并导入</li>
          </ol>
          <button
            onClick={handleDownloadTemplate}
            className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download size={18} />
            下载模板
          </button>
        </div>

        {/* 导入表单 */}
        <div className="bg-white rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_#000] p-6">
          <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
            {/* 选择章节 */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                目标章节 <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedChapterId}
                onChange={(e) => setSelectedChapterId(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">请选择章节</option>
                {chapters.map((chapter) => (
                  <option key={chapter.id} value={chapter.id}>
                    第{chapter.order_index}章 - {chapter.title}
                  </option>
                ))}
              </select>
            </div>

            {/* 文件上传 */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                上传 Excel 文件 <span className="text-red-500">*</span>
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-green-500 transition-colors">
                <input
                  type="file"
                  id="file-upload"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  {selectedFile ? (
                    <>
                      <FileSpreadsheet
                        className="text-green-600 mb-3"
                        size={48}
                      />
                      <p className="text-lg font-medium text-gray-900">
                        {selectedFile.name}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {(selectedFile.size / 1024).toFixed(2)} KB
                      </p>
                    </>
                  ) : (
                    <>
                      <Upload className="text-gray-400 mb-3" size={48} />
                      <p className="text-lg font-medium text-gray-900">
                        点击选择文件
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        支持 .xlsx 或 .xls 格式
                      </p>
                    </>
                  )}
                </label>
              </div>
            </div>

            {/* 导入按钮 */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
              <Link
                href={`/admin/word-books/${bookId}`}
                className="px-6 py-3 border-2 border-black rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </Link>
              <button
                onClick={handleImport}
                disabled={!selectedFile || !selectedChapterId || uploading}
                className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors border-2 border-black shadow-[3px_3px_0px_0px_#000] hover:shadow-[1px_1px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload size={20} />
                <span>
                  {uploading ? '导入中...' : '开始导入'}
                </span>
              </button>
            </div>
          </form>
        </div>

        {/* 导入结果 */}
        {importResult && (
          <div
            className={`rounded-xl border-2 p-6 ${
              importResult.success
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}
          >
            <div className="flex items-start gap-3">
              {importResult.success ? (
                <CheckCircle className="text-green-600 flex-shrink-0 mt-1" size={24} />
              ) : (
                <XCircle className="text-red-600 flex-shrink-0 mt-1" size={24} />
              )}
              <div className="flex-1">
                <h3
                  className={`text-lg font-bold mb-2 ${
                    importResult.success ? 'text-green-900' : 'text-red-900'
                  }`}
                >
                  {importResult.message}
                </h3>
                {importResult.success && importResult.imported !== undefined && (
                  <div className="text-green-800 space-y-1">
                    <p>
                      成功导入 <strong>{importResult.imported}</strong> 个单词
                    </p>
                    {importResult.failed && importResult.failed > 0 && (
                      <p>
                        失败 <strong>{importResult.failed}</strong> 个
                      </p>
                    )}
                  </div>
                )}
                {importResult.errors && importResult.errors.length > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="text-orange-600" size={20} />
                      <p className="text-orange-800 font-medium">
                        部分数据导入失败，请查看错误详情
                      </p>
                    </div>
                    <button
                                                      onClick={handleDownloadErrors}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                    >
                      下载错误报告
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
