/**
 * 演说家模块 - PDF 导出工具
 *
 * 严格按照三个文档实现：
 * - shangwenjie.md 第 2.4 节 F（训练结果页 - 导出 PDF）
 * - TECHNICAL_MODIFICATION_PLAN.md（技术方案）
 * - AI_DEVELOPMENT_GUIDE.md（开发指南）
 *
 * 功能：
 * 1. 导出全文 PDF（包含统计数据和错词列表）
 * 2. 导出错词 PDF（包含音标、释义、例句等详细信息）
 *
 * 实现方式：使用浏览器打印API，用户可选择"另存为 PDF"
 */

import { getBatchDictEntries } from '@/lib/dict-service'

/**
 * 导出文章全文为 PDF（标题+文章内容）
 *
 * @param params - 文章内容参数
 */
export function exportArticleAsPDF(params: {
  title: string
  content: string
  totalSentences: number
  totalWords: number
  correctCount: number
  wrongCount: number
  skippedCount: number
  accuracyRate: number
  submissionDate: string
}) {
  console.log('[Speaker PDF] 开始生成文章全文 PDF', params)

  // 创建一个隐藏的打印窗口
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    alert('无法打开打印窗口，请检查浏览器弹窗设置')
    return
  }

  // 生成 HTML 内容
  const html = generateArticlePrintHTML(params)

  // 写入内容并打印
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()

  // 等待内容加载完成后打印
  setTimeout(() => {
    printWindow.print()
  }, 500)
}

/**
 * 生成文章全文打印用的 HTML 内容
 */
function generateArticlePrintHTML(params: {
  title: string
  content: string
  totalSentences: number
  totalWords: number
  correctCount: number
  wrongCount: number
  skippedCount: number
  accuracyRate: number
  submissionDate: string
}): string {
  const {
    title,
    content,
    totalSentences,
    totalWords,
    correctCount,
    wrongCount,
    skippedCount,
    accuracyRate,
    submissionDate
  } = params

  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - 文章全文</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.8;
      color: #333;
      padding: 40px;
      background: white;
    }

    .header {
      text-align: center;
      margin-bottom: 40px;
      border-bottom: 2px solid #333;
      padding-bottom: 20px;
    }

    .header h1 {
      font-size: 32px;
      margin-bottom: 10px;
      color: #1f2937;
    }

    .header .meta {
      font-size: 14px;
      color: #666;
      margin-bottom: 20px;
    }

    .stats-summary {
      background: #f9fafb;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 30px;
      display: flex;
      justify-content: center;
      gap: 32px;
      font-size: 14px;
    }

    .stats-summary span {
      color: #6b7280;
    }

    .stats-summary strong {
      color: #1f2937;
      font-weight: 600;
    }

    .content {
      max-width: 800px;
      margin: 0 auto;
      text-align: justify;
    }

    .content p {
      margin-bottom: 1.5em;
      text-indent: 2em;
      font-size: 16px;
      line-height: 1.8;
    }

    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid #ccc;
      text-align: center;
      font-size: 12px;
      color: #999;
    }

    @media print {
      body {
        padding: 20px;
      }

      .content p {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <!-- 头部 -->
  <div class="header">
    <h1>${title}</h1>
    <p class="meta">听写训练 · ${submissionDate}</p>

    <!-- 统计概览 -->
    <div class="stats-summary">
      <span>总词数: <strong>${totalWords}</strong></span>
      <span>正确: <strong style="color: #10b981;">${correctCount}</strong></span>
      <span>错误: <strong style="color: #ef4444;">${wrongCount}</strong></span>
      <span>放弃: <strong style="color: #f59e0b;">${skippedCount}</strong></span>
      <span>准确率: <strong style="color: #3b82f6;">${accuracyRate}%</strong></span>
    </div>
  </div>

  <!-- 文章内容 -->
  <div class="content">
    ${content.split('\n').map(para => para.trim() ? `<p>${para}</p>` : '').join('')}
  </div>

  <!-- 页脚 -->
  <div class="footer">
    <p>本文章由演说家 (The Speaker) 听写训练模块生成</p>
    <p>生成时间：${new Date().toLocaleString('zh-CN')}</p>
  </div>
</body>
</html>
  `
}

export function exportDictationResultAsPDF(params: {
  articleTitle: string
  totalSentences: number
  totalWords: number
  correctCount: number
  wrongCount: number
  skippedCount: number
  accuracyRate: number
  wrongWords: Array<{
    sentenceIndex: number
    wordIndex: number
    userInput: string | null
    correctWord: string
    errorType: 'wrong' | 'skipped'
  }>
  userName?: string
  submissionDate?: string
}) {
  console.log('[Speaker PDF] 开始生成 PDF', params)

  // 创建一个隐藏的打印窗口
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    alert('无法打开打印窗口，请检查浏览器弹窗设置')
    return
  }

  // 生成 HTML 内容
  const html = generatePrintHTML(params)

  // 写入内容并打印
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()

  // 等待内容加载完成后打印
  setTimeout(() => {
    printWindow.print()
  }, 500)
}

/**
 * 生成打印用的 HTML 内容
 */
function generatePrintHTML(params: {
  articleTitle: string
  totalSentences: number
  totalWords: number
  correctCount: number
  wrongCount: number
  skippedCount: number
  accuracyRate: number
  wrongWords: Array<{
    sentenceIndex: number
    wordIndex: number
    userInput: string | null
    correctWord: string
    errorType: 'wrong' | 'skipped'
  }>
  userName?: string
  submissionDate?: string
}): string {
  const {
    articleTitle,
    totalSentences,
    totalWords,
    correctCount,
    wrongCount,
    skippedCount,
    accuracyRate,
    wrongWords,
    userName = '学员',
    submissionDate = new Date().toLocaleString('zh-CN')
  } = params

  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>听写训练结果 - ${articleTitle}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      padding: 40px;
      background: white;
    }

    .header {
      text-align: center;
      margin-bottom: 40px;
      border-bottom: 2px solid #333;
      padding-bottom: 20px;
    }

    .header h1 {
      font-size: 28px;
      margin-bottom: 10px;
    }

    .header .meta {
      font-size: 14px;
      color: #666;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      margin-bottom: 40px;
    }

    .stat-card {
      border: 2px solid #333;
      border-radius: 8px;
      padding: 15px;
      text-align: center;
    }

    .stat-card .label {
      font-size: 14px;
      color: #666;
      margin-bottom: 5px;
    }

    .stat-card .value {
      font-size: 32px;
      font-weight: bold;
    }

    .stat-card.correct .value { color: #10b981; }
    .stat-card.wrong .value { color: #ef4444; }
    .stat-card.skipped .value { color: #f59e0b; }
    .stat-card.accuracy .value { color: #3b82f6; }

    .wrong-words-section {
      margin-bottom: 40px;
    }

    .wrong-words-section h2 {
      font-size: 20px;
      margin-bottom: 20px;
      border-bottom: 1px solid #ccc;
      padding-bottom: 10px;
    }

    .wrong-word-item {
      padding: 12px;
      margin-bottom: 10px;
      border-left: 4px solid #ef4444;
      background: #fef2f2;
      page-break-inside: avoid;
    }

    .wrong-word-item.skipped {
      border-left-color: #f59e0b;
      background: #fffbeb;
    }

    .wrong-word-item .location {
      font-size: 12px;
      color: #666;
      margin-bottom: 5px;
    }

    .wrong-word-item .words {
      font-size: 14px;
    }

    .wrong-word-item .correct {
      color: #10b981;
      font-weight: bold;
    }

    .wrong-word-item .user-input {
      color: #ef4444;
      text-decoration: line-through;
      margin-left: 10px;
    }

    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid #ccc;
      text-align: center;
      font-size: 12px;
      color: #999;
    }

    @media print {
      body {
        padding: 20px;
      }

      .stat-card {
        break-inside: avoid;
      }

      .wrong-word-item {
        break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <!-- 头部 -->
  <div class="header">
    <h1>听写训练结果报告</h1>
    <p class="meta">
      文章：${articleTitle}<br>
      学员：${userName}<br>
      提交时间：${submissionDate}
    </p>
  </div>

  <!-- 统计数据 -->
  <div class="stats-grid">
    <div class="stat-card correct">
      <div class="label">正确</div>
      <div class="value">${correctCount}</div>
    </div>
    <div class="stat-card wrong">
      <div class="label">错误</div>
      <div class="value">${wrongCount}</div>
    </div>
    <div class="stat-card skipped">
      <div class="label">放弃</div>
      <div class="value">${skippedCount}</div>
    </div>
    <div class="stat-card accuracy">
      <div class="label">准确率</div>
      <div class="value">${accuracyRate}%</div>
    </div>
  </div>

  ${wrongWords.length > 0 ? `
  <!-- 错误和放弃的单词 -->
  <div class="wrong-words-section">
    <h2>错误和放弃的单词 (${wrongWords.length})</h2>
    ${wrongWords.map(word => `
      <div class="wrong-word-item ${word.errorType === 'skipped' ? 'skipped' : ''}">
        <div class="location">
          句子 ${word.sentenceIndex + 1} - 单词 ${word.wordIndex + 1}
          ${word.errorType === 'skipped' ? ' [放弃]' : ''}
        </div>
        <div class="words">
          <span class="correct">✓ ${word.correctWord}</span>
          ${word.userInput ? `<span class="user-input">✗ ${word.userInput}</span>` : ''}
        </div>
      </div>
    `).join('')}
  </div>
  ` : ''}

  <!-- 页脚 -->
  <div class="footer">
    <p>本报告由演说家 (The Speaker) 自动生成</p>
    <p>生成时间：${new Date().toLocaleString('zh-CN')}</p>
  </div>
</body>
</html>
  `
}

/**
 * 导出错词本为 PDF（包含详细的词典信息）
 *
 * @param words - 错词列表
 */
export async function exportWrongWordsAsPDF(words: string[]) {
  console.log('[Speaker PDF] 开始生成错词本 PDF', words)

  // 批量获取词典信息
  const dictEntries = await getBatchDictEntries(words)

  // 创建一个隐藏的打印窗口
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    alert('无法打开打印窗口，请检查浏览器弹窗设置')
    return
  }

  // 生成 HTML 内容
  const html = generateWrongWordsPrintHTML(words, dictEntries)

  // 写入内容并打印
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()

  // 等待内容加载完成后打印
  setTimeout(() => {
    printWindow.print()
  }, 500)
}

/**
 * 生成错词本打印用的 HTML 内容（使用有道API数据）
 */
function generateWrongWordsPrintHTML(words: string[], dictEntries: Array<{
  word: string
  phonetic?: string
  uk_phonetic?: string
  us_phonetic?: string
  definition?: string
  definition_en?: string
  collocation?: string
  collocation_en?: string
  example_sentence?: string
  example_sentence_en?: string
  part_of_speech?: string
}>): string {
  // 创建单词到词典信息的映射
  const dictMap = new Map(dictEntries.map(entry => [entry.word, entry]))

  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>错词本 - ${words.length}个单词</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      padding: 40px;
      background: white;
    }

    .header {
      text-align: center;
      margin-bottom: 40px;
      border-bottom: 2px solid #3b82f6;
      padding-bottom: 20px;
    }

    .header h1 {
      font-size: 32px;
      color: #3b82f6;
      margin-bottom: 10px;
    }

    .header .meta {
      font-size: 14px;
      color: #666;
    }

    .word-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 24px;
      margin-bottom: 40px;
    }

    .word-card {
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      padding: 20px;
      background: #fafafa;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .word-card .word-header {
      display: flex;
      align-items: baseline;
      gap: 12px;
      margin-bottom: 12px;
    }

    .word-card .word {
      font-size: 28px;
      font-weight: bold;
      color: #1f2937;
    }

    .word-card .part-of-speech {
      font-size: 14px;
      color: #6b7280;
      font-style: italic;
      background: #e5e7eb;
      padding: 2px 8px;
      border-radius: 4px;
    }

    .word-card .phonetics {
      display: flex;
      gap: 16px;
      margin-bottom: 12px;
      font-size: 14px;
      color: #6b7280;
    }

    .word-card .phonetic {
      font-style: italic;
    }

    .word-card .phonetic-label {
      font-weight: 600;
      color: #4b5563;
    }

    .word-card .definition {
      font-size: 16px;
      color: #374151;
      margin-bottom: 12px;
      line-height: 1.5;
    }

    .word-card .definition-label {
      font-weight: 600;
      color: #3b82f6;
    }

    .word-card .example {
      font-size: 14px;
      color: #6b7280;
      padding: 12px;
      background: #e5e7eb;
      border-radius: 8px;
      border-left: 4px solid #3b82f6;
      margin-bottom: 12px;
    }

    .word-card .example-label {
      font-weight: bold;
      color: #3b82f6;
      margin-bottom: 4px;
      font-size: 12px;
    }

    .word-card .collocation {
      font-size: 14px;
      color: #4b5563;
      padding: 10px;
      background: #fef3c7;
      border-radius: 6px;
      border-left: 3px solid #f59e0b;
    }

    .word-card .collocation-label {
      font-weight: bold;
      color: #d97706;
      margin-bottom: 4px;
      font-size: 12px;
    }

    .footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid #ccc;
      text-align: center;
      font-size: 12px;
      color: #999;
    }

    @media print {
      body {
        padding: 20px;
      }

      .word-card {
        break-inside: avoid;
        page-break-inside: avoid;
      }
    }

    @media (max-width: 768px) {
      .word-grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <!-- 头部 -->
  <div class="header">
    <h1>📖 错词本</h1>
    <p class="meta">
      共 ${words.length} 个单词需要复习<br>
      生成时间：${new Date().toLocaleString('zh-CN')}
    </p>
  </div>

  <!-- 单词列表 -->
  <div class="word-grid">
    ${words.map(word => {
      const entry = dictMap.get(word)
      if (!entry) {
        return `
      <div class="word-card">
        <div class="word">${word}</div>
        <p style="color: #9ca3af; font-size: 14px;">暂无词典数据</p>
      </div>
        `
      }

      return `
      <div class="word-card">
        <!-- 单词和词性 -->
        <div class="word-header">
          <div class="word">${word}</div>
          ${entry.part_of_speech ? `<div class="part-of-speech">${entry.part_of_speech}</div>` : ''}
        </div>

        <!-- 音标（英音和美音） -->
        ${entry.uk_phonetic || entry.us_phonetic ? `
          <div class="phonetics">
            ${entry.uk_phonetic ? `<span><span class="phonetic-label">英:</span> <span class="phonetic">[${entry.uk_phonetic}]</span></span>` : ''}
            ${entry.us_phonetic ? `<span><span class="phonetic-label">美:</span> <span class="phonetic">[${entry.us_phonetic}]</span></span>` : ''}
          </div>
        ` : ''}

        <!-- 中文释义 -->
        ${entry.definition ? `
          <div class="definition">
            <span class="definition-label">释义：</span>${entry.definition}
          </div>
        ` : ''}

        <!-- 英文释义 -->
        ${entry.definition_en ? `
          <div class="definition">
            <span class="definition-label">英义：</span>${entry.definition_en}
          </div>
        ` : ''}

        <!-- 例句 -->
        ${entry.example_sentence || entry.example_sentence_en ? `
          <div class="example">
            <div class="example-label">例句：</div>
            ${entry.example_sentence_en ? `<div style="color: #1f2937; margin-bottom: 4px;">"${entry.example_sentence_en}"</div>` : ''}
            ${entry.example_sentence ? `<div style="font-style: italic;">${entry.example_sentence}</div>` : ''}
          </div>
        ` : ''}

        <!-- 搭配 -->
        ${entry.collocation || entry.collocation_en ? `
          <div class="collocation">
            <div class="collocation-label">📝 搭配：</div>
            ${entry.collocation_en ? `<div style="color: #1f2937; margin-bottom: 4px;">${entry.collocation_en}</div>` : ''}
            ${entry.collocation ? `<div style="font-style: italic;">${entry.collocation}</div>` : ''}
          </div>
        ` : ''}
      </div>
      `
    }).join('')}
  </div>

  <!-- 页脚 -->
  <div class="footer">
    <p>💡 学习建议：每天复习错词本，直到掌握所有单词</p>
    <p>本错词本由演说家 (The Speaker) 自动生成 · 数据来源：有道词典</p>
    <p>生成时间：${new Date().toLocaleString('zh-CN')}</p>
  </div>
</body>
</html>
  `
}
