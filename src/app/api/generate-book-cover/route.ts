import { NextRequest, NextResponse } from 'next/server'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

// API 配置
const API_TIMEOUT = 30000 // 30秒超时

/**
 * 验证管理员权限
 */
async function checkAdminPermission() {
  const user = await getCurrentUser()
  if (!user) {
    return { authorized: false, error: '未登录' }
  }

  // TODO: 添加更严格的管理员权限检查
  // 这里可以检查用户是否有管理员角色
  return { authorized: true, user }
}

/**
 * 生成书籍封面图片
 * POST /api/generate-book-cover
 * Body: { bookId: string, bookName: string }
 */
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const authCheck = await checkAdminPermission()
    if (!authCheck.authorized) {
      return NextResponse.json(
        { success: false, error: authCheck.error },
        { status: 401 }
      )
    }

    // 验证 API Key
    const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY
    if (!GOOGLE_AI_API_KEY) {
      console.error('❌ Google AI API Key 未配置')
      return NextResponse.json(
        { success: false, error: 'AI 封面功能未启用，请联系管理员配置 API Key' },
        { status: 503 }
      )
    }

    const { bookId, bookName } = await request.json()

    if (!bookId || !bookName) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      )
    }

    console.log(`🎨 生成封面开始: ${bookName}`)

    // 构建 Google Gemini API 提示词
    const prompt = `Flat vector illustration, Memphis design style, vibrant colors, patterns of squiggles and dots, simple icons representing ${bookName}, joyful atmosphere, clean lines, white background, trending on Dribbble. Book cover design, horizontal layout, modern and clean aesthetic.`

    console.log(`📝 Prompt: ${prompt}`)

    // 使用 Gemini 2.0 Flash Image Generation 模型
    const imageUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${GOOGLE_AI_API_KEY}`

    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 1,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192
      }
    }

    // 创建超时控制器
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT)

    try {
      const response = await fetch(imageUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Gemini API 错误:', response.status, errorText)
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
      }

      const imageData = await response.json()

      console.log('🔍 Gemini API Response:', JSON.stringify(imageData, null, 2))

      // 检查返回的图片数据
      if (!imageData.candidates || imageData.candidates.length === 0) {
        throw new Error('No content generated from Gemini API')
      }

      // 获取图片数据 (从 parts 中提取)
      const parts = imageData.candidates[0].content.parts
      const imagePart = parts.find((part: any) => part.inlineData)

      if (!imagePart || !imagePart.inlineData) {
        console.error('Available parts:', JSON.stringify(parts, null, 2))
        throw new Error('No image data found in response')
      }

      const base64Image = imagePart.inlineData.data
      const mimeType = imagePart.inlineData.mimeType || 'image/png'

      // 构建 data URL
      const dataUrl = `data:${mimeType};base64,${base64Image}`

      console.log(`✅ Gemini 图片生成成功: ${dataUrl.substring(0, 100)}...`)

      // 更新数据库
      const supabase = await createClient()
      const { error: upsertError } = await supabase
        .from('books')
        .upsert({
          id: bookId,
          cover_url: dataUrl
        } as any, {
          onConflict: 'id',
          ignoreDuplicates: false
        })

      if (upsertError) {
        console.error('❌ 更新数据库失败:', upsertError)
      }

      return NextResponse.json({
        success: true,
        data: {
          coverUrl: dataUrl,
          bookId,
          bookName,
          prompt
        }
      })
    } catch (fetchError: any) {
      clearTimeout(timeoutId)

      // 处理超时错误
      if (fetchError.name === 'AbortError') {
        console.error('❌ Gemini API 请求超时')
        throw new Error('AI 生成超时，请稍后重试')
      }

      throw fetchError
    }

  } catch (error) {
    console.error('❌ 生成封面错误:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '服务器内部错误'
      },
      { status: 500 }
    )
  }
}

/**
 * 批量生成所有书籍封面
 * PATCH /api/generate-book-cover
 */
export async function PATCH(request: NextRequest) {
  try {
    // 验证管理员权限
    const authCheck = await checkAdminPermission()
    if (!authCheck.authorized) {
      return NextResponse.json(
        { success: false, error: authCheck.error },
        { status: 401 }
      )
    }

    // 验证 API Key
    const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY
    if (!GOOGLE_AI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'AI 封面功能未启用，请联系管理员配置 API Key' },
        { status: 503 }
      )
    }

    const supabase = await createClient()

    // 获取所有没有封面或需要重新生成的书籍
    const { data: books, error } = await supabase
      .from('books')
      .select('id, title')
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    if (!books || books.length === 0) {
      return NextResponse.json({
        success: true,
        message: '没有需要生成封面的书籍',
        data: []
      })
    }

    console.log(`📚 开始批量生成 ${books.length} 本书封面`)

    const results: any[] = []

    // 逐个生成封面，API 调用之间添加延迟以避免速率限制
    for (let i = 0; i < books.length; i++) {
      const book = books[i] as any

      try {
        console.log(`📖 [${i + 1}/${books.length}] 生成: ${book.title}`)

        // 调用生成接口
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/generate-book-cover`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookId: book.id,
            bookName: book.title
          })
        })

        const result = await response.json()

        if (result.success) {
          console.log(`✅ [${i + 1}/${books.length}] ${book.title} 生成成功`)
          results.push({
            bookId: book.id,
            bookName: book.title,
            success: true,
            coverUrl: result.data?.coverUrl || null
          })
        } else {
          console.error(`❌ [${i + 1}/${books.length}] ${book.title} 生成失败:`, result.error)
          results.push({
            bookId: book.id,
            bookName: book.title,
            success: false,
            error: result.error || '生成失败'
          })
        }

        // 添加延迟以避免 API 速率限制（除了最后一个）
        if (i < books.length - 1) {
          // 等待 2 秒再处理下一本书
          await new Promise(resolve => setTimeout(resolve, 2000))
        }

      } catch (error) {
        console.error(`❌ [${i + 1}/${books.length}] ${book.title} 生成失败:`, error)
        results.push({
          bookId: book.id,
          bookName: book.title,
          success: false,
          error: error instanceof Error ? error.message : '生成失败'
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    console.log(`✅ 批量生成完成: ${successCount}/${books.length} 成功`)

    return NextResponse.json({
      success: true,
      message: `成功生成 ${successCount}/${books.length} 本书封面`,
      data: results
    })

  } catch (error) {
    console.error('❌ 批量生成错误:', error)
    return NextResponse.json(
      { success: false, error: '批量生成失败' },
      { status: 500 }
    )
  }
}
