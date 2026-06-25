/**
 * Step 2 听写训练 - 判分结果页组件
 *
 * 严格按照三个文档实现：
 * - shangwenjie.md 第 2.4-F 节（训练结果页）
 * - TECHNICAL_MODIFICATION_PLAN.md（技术方案）
 * - AI_DEVELOPMENT_GUIDE.md（开发指南）
 *
 * 核心功能：
 * 1. 显示统计数据（正确、错误、放弃）
 * 2. 历史记录入口
 * 3. 导出 PDF
 * 4. 跳转到下一步
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, XCircle, AlertCircle, Download, History, ArrowRight, FileText, BookX, X } from 'lucide-react'
import { exportDictationResultAsPDF, exportWrongWordsAsPDF, exportArticleAsPDF } from '@/lib/speaker-pdf'
import { toast } from 'sonner'

interface GradingResultProps {
  totalSentences: number
  totalWords: number
  correctCount: number
  wrongCount: number
  skippedCount: number
  accuracyRate: number
  wrongWords?: Array<{
    sentenceIndex: number
    wordIndex: number
    userInput: string | null
    correctWord: string
    errorType: 'wrong' | 'skipped'
  }>
  articleId: string
  articleTitle?: string  // 新增：文章标题
  articleContent?: string  // 新增：文章内容
  userId: string  // 新增：用户ID
  onClose?: () => void  // 新增：关闭回调
}

export function DictationResultModal({
  totalSentences,
  totalWords,
  correctCount,
  wrongCount,
  skippedCount,
  accuracyRate,
  wrongWords = [],
  articleId,
  articleTitle,
  articleContent,
  userId,
  onClose
}: GradingResultProps) {
  const router = useRouter()
  const hasGhostWords = wrongWords.length > 0

  // 有生词时先完成单词清理，避免用户跳过必要学习步骤。
  const goToNextStep = () => {
    if (hasGhostWords) {
      router.push(`/speaker/ghost-words?articleId=${articleId}`)
      return
    }

    router.push(`/speaker/steps/step3?id=${articleId}`)
  }

  // 查看历史记录
  const goToHistory = () => {
    router.push(`/speaker/dictation-history?id=${articleId}`)
  }

  // 导出全文 PDF（文章内容）
  const exportFullPDF = async () => {
    console.log('[Dictation Result] 导出全文 PDF')

    if (!articleTitle || !articleContent) {
      toast.error('文章信息不完整，无法导出')
      return
    }

    try {
      // 导出文章内容（标题+正文）
      exportArticleAsPDF({
        title: articleTitle,
        content: articleContent,
        totalSentences,
        totalWords,
        correctCount,
        wrongCount,
        skippedCount,
        accuracyRate,
        submissionDate: new Date().toLocaleString('zh-CN')
      })

      toast.success('PDF 导出窗口已打开，请在打印对话框中选择"另存为 PDF"')
    } catch (error) {
      console.error('[Dictation Result] 导出全文 PDF 失败:', error)
      toast.error('导出失败，请重试')
    }
  }

  // 导出错词 PDF
  const exportWrongWordsPDF = async () => {
    console.log('[Dictation Result] 导出错词 PDF')

    if (wrongWords.length === 0) {
      toast.info('本次听写没有错词，无需导出错词本')
      return
    }

    try {
      await exportWrongWordsAsPDF(wrongWords.map(w => w.correctWord))

      toast.success('错词本 PDF 导出窗口已打开，请在打印对话框中选择"另存为 PDF"')
    } catch (error) {
      console.error('[Dictation Result] 导出错词 PDF 失败:', error)
      toast.error('导出失败，请重试')
    }
  }

  // 关闭弹窗
  const handleClose = () => {
    if (onClose) {
      onClose()
    }
  }

  // 查看魔鬼生词本
  const goToGhostWords = () => {
    console.log('[Dictation Result] 查看生词本')
    router.push(`/speaker/ghost-words?articleId=${articleId}`)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-none shadow-[10px_10px_0px_0px_#000] dark:shadow-[10px_10px_0px_0px_#666] border-[4px] border-black dark:border-gray-600 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* 头部 */}
        <div className="px-6 py-4 border-b-[3px] border-black dark:border-gray-600 relative">
          <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-wider">
            听写训练结果
          </h2>

          {/* 关闭按钮 - 黑底白字方块 */}
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center bg-black dark:bg-gray-700 border-2 border-black dark:border-gray-600 text-white dark:text-white hover:bg-red-600 hover:border-red-600 transition-all duration-150"
            title="关闭"
          >
            <X className="w-5 h-5" strokeWidth={2.5} />
          </button>
        </div>

        {/* 统计数据卡片 - 仪表盘风格（紧凑版） */}
        <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-2">
          {/* 正确数 */}
          <div className="py-2 px-3 rounded-none bg-white dark:bg-gray-800 border-[2px] border-black dark:border-gray-600 shadow-[2px_2px_0px_0px_#000] dark:shadow-[2px_2px_0px_0px_#666]">
            <div className="flex items-center gap-1.5 mb-1">
              <CheckCircle2 className="w-4 h-4" style={{ color: '#00C853' }} />
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#00C853' }}>正确</span>
            </div>
            <div className="text-2xl font-mono font-black" style={{ color: '#00C853' }}>
              {correctCount}
            </div>
          </div>

          {/* 错误数 */}
          <div className="py-2 px-3 rounded-none bg-white dark:bg-gray-800 border-[2px] border-black dark:border-gray-600 shadow-[2px_2px_0px_0px_#000] dark:shadow-[2px_2px_0px_0px_#666]">
            <div className="flex items-center gap-1.5 mb-1">
              <XCircle className="w-4 h-4" style={{ color: '#FF0000' }} />
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#FF0000' }}>错误</span>
            </div>
            <div className="text-2xl font-mono font-black" style={{ color: '#FF0000' }}>
              {wrongCount}
            </div>
          </div>

          {/* 放弃数 */}
          <div className="py-2 px-3 rounded-none bg-white dark:bg-gray-800 border-[2px] border-black dark:border-gray-600 shadow-[2px_2px_0px_0px_#000] dark:shadow-[2px_2px_0px_0px_#666]">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertCircle className="w-4 h-4" style={{ color: '#FFD600' }} />
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#FFD600' }}>放弃</span>
            </div>
            <div className="text-2xl font-mono font-black" style={{ color: '#FFD600' }}>
              {skippedCount}
            </div>
          </div>

          {/* 准确率 - 荧光绿强调 */}
          <div className="py-2 px-3 rounded-none bg-[#B4F416]/10 dark:bg-[#B4F416]/5 border-[2px] border-black dark:border-gray-600 shadow-[2px_2px_0px_0px_#000] dark:shadow-[2px_2px_0px_0px_#666]">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-black dark:text-gray-200">准确率</span>
            </div>
            <div className="text-2xl font-mono font-black text-[#B4F416]">
              {accuracyRate}%
            </div>
          </div>
        </div>

        {/* 错误单词列表（如果有） */}
        {hasGhostWords && (
          <div className="px-6 pb-6">
            <div className="rounded-none bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-600 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666]">
              <h3 className="px-4 py-3 text-base font-black text-gray-900 dark:text-white uppercase tracking-wider border-b-2 border-black dark:border-gray-600">
                错误和放弃的单词
              </h3>

              {/* 自定义滚动条样式 */}
              <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                  width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                  background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                  background-color: #000;
                  border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                  background-color: #333;
                }
              `}</style>

              <div className="max-h-48 overflow-y-auto custom-scrollbar">
                {wrongWords.map((wrongWord, index) => (
                  <div
                    key={index}
                    className={`
                      flex items-center justify-between py-2 px-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0 text-sm font-mono
                      ${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-750'}
                    `}
                  >
                    {/* 左侧：位置信息 Tag */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">
                        S{String(wrongWord.sentenceIndex + 1).padStart(2, '0')}-W{String(wrongWord.wordIndex + 1).padStart(2, '0')}
                      </span>
                      {wrongWord.errorType === 'skipped' && (
                        <span className="text-[10px] px-1.5 py-0.5 font-mono font-bold uppercase tracking-wider bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                          放弃
                        </span>
                      )}
                    </div>

                    {/* 右侧：错误对比 */}
                    <div className="flex items-center gap-2">
                      {wrongWord.userInput ? (
                        <>
                          <span className="text-[#FF0000] line-through decoration-2 font-mono text-sm">
                            {wrongWord.userInput}
                          </span>
                          <span className="text-gray-400">→</span>
                          <span className="text-[#00C853] font-bold font-mono text-sm">
                            {wrongWord.correctWord}
                          </span>
                        </>
                      ) : (
                        <span className="text-[#FFD600] font-bold font-mono text-sm">
                          {wrongWord.correctWord}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* 查看生词本按钮 - 白底黑框（次级按钮） */}
              <div className="px-4 pb-4">
                <button
                  onClick={goToGhostWords}
                  className="w-full py-2 px-3 rounded-none bg-white dark:bg-gray-800 border-[2px] border-black dark:border-gray-600 text-gray-900 dark:text-white font-bold text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-all flex items-center justify-center gap-2"
                >
                  <span>雯姐说：把不会的听不懂的想办法搞清楚</span>
                  <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 底部操作按钮 */}
        <div className="px-6 py-4 border-t-[3px] border-black dark:border-gray-600 flex gap-3">
          {/* 导出全文 PDF（仅PC端显示） */}
          <button
            onClick={exportFullPDF}
            className="hidden md:flex flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-none bg-white dark:bg-gray-800 border-[2px] border-black dark:border-gray-600 text-gray-900 dark:text-white font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition-all hover:shadow-[2px_2px_0px_0px_#000] dark:hover:shadow-[2px_2px_0px_0px_#666]"
          >
            <FileText className="w-5 h-5" />
            <span>导出线下去背诵</span>
          </button>

          {/* 进入下一步按钮 - 黑底大按钮（重点） */}
          <button
            onClick={goToNextStep}
            className="flex-[2] flex items-center justify-center gap-2 px-6 py-3 rounded-none bg-black dark:bg-gray-700 border-[3px] border-black dark:border-gray-600 text-white dark:text-white font-black uppercase tracking-widest hover:bg-[#B4F416] hover:text-black hover:border-[#B4F416] hover:shadow-[6px_6px_0px_0px_#B4F416] dark:hover:shadow-[6px_6px_0px_0px_#666] transition-all"
          >
            <span>{hasGhostWords ? '去搞懂单词' : '进入跟读背诵'}</span>
            <ArrowRight className="w-5 h-5" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  )
}
