'use client'

/**
 * Excel 批量导入单词页面
 * 改进版：
 * 1. 章节选择可选（Excel有Chapter字段可自动创建）
 * 2. 完整的Excel模板（所有字段+说明）
 * 3. 显示行数限制提示
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
  Info,
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
  const [selectedChapterId, setSelectedChapterId] = useState<string>('')
  const [autoCreateChapter, setAutoCreateChapter] = useState(false)

  const [importResult, setImportResult] = useState<{
    success: boolean
    message: string
    imported?: number
    failed?: number
    skipped?: number
    errors?: ImportError[]
    chaptersCreated?: number
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

  /**
   * 下载改进的Excel模板
   * 包含所有字段、必填说明、中文含义
   */
  const handleDownloadTemplate = () => {
    // 创建完整的模板数据
    const template = [
      // 第一行：字段英文名
      [
        'Chapter',
        'Word*',
        'Phonetic',
        'Definition*',
        'Definition EN',
        'Part of Speech',
        'Collocation',
        'Collocation EN',
        'Example Sentence',
        'Example EN'
      ],
      // 第二行：字段中文名 + 说明
      [
        '章节（可选，留空则不归入任何章节）',
        '单词*（必填）',
        '音标（可选）',
        '中文释义*（必填）',
        '英文释义（可选）',
        '词性（可选，如：n./v./adj./adv.）',
        '搭配（中文，可选）',
        '搭配（英文，可选）',
        '例句（中文，可选）',
        '例句（英文，可选）'
      ],
      // 第三行：示例数据1
      [
        '第一章',
        'agenda',
        '/əˈdʒendə/',
        '议程，日程表',
        'A list of items to be discussed at a meeting',
        'n.',
        '制定议程',
        'set the agenda',
        '请在会议前把议程发给我好吗？',
        'Could you please send me the agenda before the meeting?'
      ],
      // 第四行：示例数据2
      [
        '第一章',
        'compromise',
        '/ˈkɒmprəmaɪz/',
        '妥协，折中',
        'An agreement where each side gives up something',
        'n./v.',
        '达成妥协',
        'reach a compromise',
        '我们需要达成一个让双方都满意的妥协。',
        'We need to reach a compromise that satisfies both parties.'
      ],
      // 第五行：示例数据3（演示Chapter为空的情况）
      [
        '',
        'meeting',
        '/ˈmiːtɪŋ/',
        '会议，会面',
        'A gathering of people for discussion',
        'n.',
        '',
        '',
        '',
        ''
      ]
    ]

    // 转换为 CSV
    const csv = template.map(row => row.join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `单词导入模板-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async () => {
    if (!selectedFile) {
      alert('请选择要导入的文件')
      return
    }

    // 验证：如果选择了章节，不能同时启用自动创建
    if (selectedChapterId && autoCreateChapter) {
      alert('请选择一种方式：要么选择现有章节，要么启用自动创建章节')
      return
    }

    // 验证：如果没选章节也没启用自动创建，提示用户
    if (!selectedChapterId && !autoCreateChapter) {
      const confirmed = confirm(
        '您没有选择章节，也没有启用自动创建。\n\n' +
        '导入时：\n' +
        '- 有Chapter字段的单词会自动创建章节\n' +
        '- 没有Chapter字段的单词不归入任何章节（chapter_id为null）\n\n' +
        '是否继续？'
      )
      if (!confirmed) return
    }

    try {
      setUploading(true)

      const formData = new FormData()
      formData.append('file', selectedFile)

      // 只有选择了章节才添加chapter_id（留空表示使用Excel中的Chapter字段）
      if (selectedChapterId) {
        formData.append('chapter_id', selectedChapterId)
      }

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
        imported: data.result.imported,
        failed: data.result.failed,
        skipped: data.result.skipped,
        errors: data.result.errors,
        chaptersCreated: data.result.chaptersCreated
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
    <div className="p-6 max-w-5xl">
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
            从 Excel 文件批量导入单词（支持自动创建章节）
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* 使用说明和限制 */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
          <h2 className="text-lg font-bold text-blue-900 mb-3">
            📖 使用说明
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-blue-800 mb-4">
            <li>下载 Excel 模板文件（包含完整的字段说明和示例）</li>
            <li>按照模板格式填写单词信息</li>
            <li>选择章节分配方式：
              <ul className="list-disc list-inside ml-6 mt-1 text-sm">
                <li><strong>方式1</strong>：选择现有章节（所有单词导入到该章节）</li>
                <li><strong>方式2</strong>：使用Excel中的Chapter字段自动创建章节</li>
              </ul>
            </li>
            <li>上传填写好的 Excel 文件</li>
            <li>系统会自动验证数据并导入</li>
          </ol>
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download size={18} />
            下载完整模板（包含字段说明）
          </button>
        </div>

        {/* 限制说明 */}
        <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-6">
          <h2 className="text-lg font-bold text-amber-900 mb-3">
            <Info className="inline mr-2" size={20} />
            限制和要求
          </h2>
          <ul className="space-y-2 text-amber-800">
            <li>• <strong>文件格式</strong>：仅支持 .xlsx 或 .xls 格式</li>
            <li>• <strong>行数限制</strong>：单次最多导入 <strong className="text-amber-900">100,000</strong> 行</li>
            <li>• <strong>必填字段</strong>：Word（单词）、Definition（中文释义）</li>
            <li>• <strong>可选字段</strong>：Chapter、Phonetic、Definition EN、Part of Speech、Collocation、Example Sentence等</li>
            <li>• <strong>Chapter字段</strong>：如填写，会自动创建新章节；留空则 chapter_id 为 null（不归入任何章节）</li>
            <li>• <strong>重复检测</strong>：同一章节内的重复单词会被跳过</li>
          </ul>
        </div>

        {/* 导入表单 */}
        <div className="bg-white rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_#000] p-6">
          <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
            {/* 章节分配方式 */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3">
                章节分配方式
              </label>
              <div className="space-y-3">
                {/* 选项1：选择现有章节 */}
                <div className="flex items-start gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 transition-colors">
                  <input
                    type="radio"
                    id="select-chapter"
                    name="chapter-mode"
                    checked={!autoCreateChapter}
                    onChange={() => {
                      setAutoCreateChapter(false)
                    }}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <label htmlFor="select-chapter" className="cursor-pointer">
                      <span className="font-medium text-gray-900">导入到现有章节</span>
                      <p className="text-sm text-gray-500 mt-1">
                        所有单词将导入到选定的章节
                      </p>
                    </label>
                    <select
                      value={selectedChapterId}
                      onChange={(e) => setSelectedChapterId(e.target.value)}
                      disabled={autoCreateChapter}
                      className="mt-2 w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">请选择章节</option>
                      {chapters.map((chapter) => (
                        <option key={chapter.id} value={chapter.id}>
                          第{chapter.order_index}章 - {chapter.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 选项2：自动创建章节 */}
                <div className="flex items-start gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 transition-colors">
                  <input
                    type="radio"
                    id="auto-create"
                    name="chapter-mode"
                    checked={autoCreateChapter}
                    onChange={(e) => {
                      setAutoCreateChapter(e.target.checked)
                      if (e.target.checked) {
                        setSelectedChapterId('')
                      }
                    }}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <label htmlFor="auto-create" className="cursor-pointer">
                      <span className="font-medium text-gray-900">使用Excel中的Chapter字段自动创建章节</span>
                      <p className="text-sm text-gray-500 mt-1">
                        根据Excel中的Chapter列自动创建新章节，没有Chapter字段的单词不归入任何章节（chapter_id为null）
                      </p>
                    </label>
                  </div>
                </div>
              </div>
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
                disabled={!selectedFile || uploading}
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
                      ✅ 成功导入 <strong>{importResult.imported}</strong> 个单词
                    </p>
                    {importResult.skipped && importResult.skipped > 0 && (
                      <p>
                        ⏭️ 跳过重复 <strong>{importResult.skipped}</strong> 个
                      </p>
                    )}
                    {importResult.failed && importResult.failed > 0 && (
                      <p>
                        ❌ 失败 <strong>{importResult.failed}</strong> 个
                      </p>
                    )}
                    {importResult.chaptersCreated && importResult.chaptersCreated > 0 && (
                      <p>
                        📖 自动创建 <strong>{importResult.chaptersCreated}</strong> 个章节
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
