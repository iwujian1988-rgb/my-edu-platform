/**
 * Speaker JSON 文件上传 API
 *
 * 功能：
 * - POST: 上传并解析 JSON 文件，预览文章数据
 * - 支持批量上传多个 JSON 文件
 * - 自动分析：分类、难度（1-5级）、图片匹配
 */

import { NextRequest, NextResponse } from 'next/server'
import { analyzeArticle } from '@/lib/speaker-auto-analysis'

// ========================================
// POST - 上传并解析 JSON 文件
// ========================================
export async function POST(request: NextRequest) {
  try {
    // 调试日志
    const contentType = request.headers.get('content-type')
    console.log('[UPLOAD-JSON] Content-Type:', contentType)
    console.log('[UPLOAD-JSON] Headers:', Object.fromEntries(request.headers.entries()))

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: '未找到文件' },
        { status: 400 }
      )
    }

    const parsedArticles: any[] = []
    const errors: Array<{ fileName: string; error: string }> = []

    // 处理每个文件
    for (const file of files) {
      try {
        // 验证文件类型
        if (!file.type.includes('application/json') && !file.name.endsWith('.json')) {
          errors.push({
            fileName: file.name,
            error: '文件格式错误，请上传 JSON 文件'
          })
          continue
        }

        // 验证文件大小（限制 50MB）
        const maxSize = 50 * 1024 * 1024 // 50MB
        if (file.size > maxSize) {
          errors.push({
            fileName: file.name,
            error: '文件大小超过限制（最大 5MB）'
          })
          continue
        }

        // 读取并解析 JSON
        const text = await file.text()
        const jsonData = JSON.parse(text)

        // 验证 JSON 结构
        const validationResult = validateJsonData(jsonData)
        if (!validationResult.valid) {
          errors.push({
            fileName: file.name,
            error: validationResult.error
          })
          continue
        }

        // 提取元数据
        const meta = jsonData.meta || {}
        const sentences = jsonData.sentences || []

        // 计算时长
        let durationSeconds = null
        if (sentences.length > 0) {
          const lastSentence = sentences[sentences.length - 1]
          if (lastSentence.end_time) {
            durationSeconds = lastSentence.end_time
          }
        }

        // 计算单词数（简单统计所有句子的单词数）
        let wordCount = 0
        sentences.forEach((s: any) => {
          if (s.text) {
            wordCount += s.text.split(/\s+/).length
          }
        })

        // 自动分析（分类、难度、图片）
        // 标题处理：优先使用 meta.title，否则使用文件名，并自动去除下划线
        let title = meta.title || file.name.replace('.json', '')
        title = title
          .replace(/_/g, ' ')           // 下划线转空格
          .replace(/\s+/g, ' ')         // 多个空格合并为一个
          .trim()                        // 去除首尾空格

        const language = meta.language || 'en'

        console.log(`[JSON解析] 文件: ${file.name}, 标题: ${title}, 句子数: ${sentences.length}`)

        const analysis = await analyzeArticle(
          title,
          sentences,
          language as any,
          durationSeconds
        )

        console.log(`[JSON解析] 分析结果 - 难度: ${analysis.level}, 分类: ${analysis.category}, 图片: ${analysis.suggestedImage}`)

        // 添加到解析结果
        parsedArticles.push({
          fileName: file.name,
          meta: {
            level: meta.level || analysis.level,  // 使用 AI 建议的难度
            language: meta.language || language,
            category: meta.category || analysis.category,  // 使用 AI 建议的分类
            title: title,
            source_url: meta.source_url || null,
            audio_filename: meta.audio_filename || null,
            image_filename: meta.image_filename || analysis.suggestedImage,  // 使用 AI 建议的图片
            has_preroll_ad: meta.has_preroll_ad || false,
            status: meta.status || 'ready'
          },
          stats: {
            total_sentences: sentences.length,
            duration_seconds: durationSeconds,
            word_count: wordCount
          },
          // AI 分析结果
          analysis: {
            category: analysis.category,
            categoryConfidence: analysis.categoryConfidence,
            level: analysis.level,
            levelConfidence: analysis.levelConfidence,
            suggestedImage: analysis.suggestedImage,
            imageKeywords: analysis.imageKeywords,
            metrics: analysis.metrics,
            details: analysis.details
          },
          jsonData: jsonData
        })
      } catch (error: any) {
        errors.push({
          fileName: file.name,
          error: error.message || '解析文件失败'
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        articles: parsedArticles,
        errors: errors,
        total: files.length,
        successCount: parsedArticles.length,
        errorCount: errors.length
      },
      message: `成功解析 ${parsedArticles.length} 个文件${errors.length > 0 ? `，${errors.length} 个文件失败` : ''}`
    })
  } catch (error: any) {
    console.error('[API] 上传 JSON 异常:', error)
    return NextResponse.json(
      { error: '服务器错误', details: error.message },
      { status: 500 }
    )
  }
}

// ========================================
// 验证 JSON 数据结构
// ========================================
function validateJsonData(jsonData: any): { valid: boolean; error?: string } {
  // 检查是否有 sentences 字段
  if (!jsonData.sentences || !Array.isArray(jsonData.sentences)) {
    return { valid: false, error: '缺少 sentences 字段或格式错误' }
  }

  // 检查 sentences 是否为空
  if (jsonData.sentences.length === 0) {
    return { valid: false, error: 'sentences 不能为空' }
  }

  // 检查每个句子的结构
  for (let i = 0; i < jsonData.sentences.length; i++) {
    const sentence = jsonData.sentences[i]

    if (!sentence.text) {
      return { valid: false, error: `第 ${i + 1} 个句子缺少 text 字段` }
    }

    // 检查时间戳格式（可选）
    if (sentence.start_time !== undefined && typeof sentence.start_time !== 'number') {
      return { valid: false, error: `第 ${i + 1} 个句子的 start_time 格式错误` }
    }

    if (sentence.end_time !== undefined && typeof sentence.end_time !== 'number') {
      return { valid: false, error: `第 ${i + 1} 个句子的 end_time 格式错误` }
    }
  }

  // 检查 meta 字段（可选但推荐）
  if (jsonData.meta) {
    const meta = jsonData.meta

    // 验证 level（如果存在）
    if (meta.level !== undefined && ![1, 2, 3, 4, 5].includes(meta.level)) {
      return { valid: false, error: 'meta.level 必须是 1、2、3、4 或 5' }
    }

    // 验证 language（如果存在）
    const validLanguages = ['en', 'pl', 'es', 'fr', 'de', 'ja']
    if (meta.language && !validLanguages.includes(meta.language)) {
      return { valid: false, error: `meta.language 必须是以下值之一: ${validLanguages.join(', ')}` }
    }

    // 验证 category（如果存在）
    const validCategories = ['健康', '心理', '成长', '学习', '社交', '生活']
    if (meta.category && !validCategories.includes(meta.category)) {
      return { valid: false, error: `meta.category 必须是以下值之一: ${validCategories.join(', ')}` }
    }
  }

  return { valid: true }
}
