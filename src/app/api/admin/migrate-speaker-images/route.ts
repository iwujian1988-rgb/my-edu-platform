/**
 * Speaker 封面图片迁移到 OSS
 *
 * 功能：将 lorempflickr.com 的图片下载并上传到阿里云 OSS
 * 使用：GET /api/admin/migrate-speaker-images
 *
 * 注意：本地开发环境需要开启代理才能访问 lorempflickr.com
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getOSSClient } from '@/lib/oss'

// 开发环境代理 fetch
async function getProxyFetch() {
  if (process.env.NODE_ENV !== 'development') {
    return fetch
  }

  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || 'http://127.0.0.1:7890'

  try {
    const { ProxyAgent, fetch: undiciFetch } = await import('undici')
    const proxyAgent = new ProxyAgent(proxyUrl)

    return async (url: string, init?: RequestInit) => {
      return undiciFetch(url, {
        ...init,
        dispatcher: proxyAgent,
      })
    }
  } catch (error) {
    console.error('[迁移] 配置代理失败:', error)
    return fetch
  }
}

export async function GET(request: NextRequest) {
  try {
    // 验证授权（简单验证，生产环境应该更严格）
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.ADMIN_MIGRATION_KEY || 'migrate-images-2026'}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createAdminClient()
    const ossClient = getOSSClient()
    const proxyFetch = await getProxyFetch()

    // 获取所有使用 lorempflickr 图片的文章
    const { data: articles, error: fetchError } = await supabase
      .from('speaker_articles')
      .select('id, title, image_url')
      .like('image_url', '%loremflickr%')

    if (fetchError) {
      throw new Error(`获取文章失败: ${fetchError.message}`)
    }

    if (!articles || articles.length === 0) {
      return NextResponse.json({
        success: true,
        message: '没有需要迁移的图片',
        migrated: 0
      })
    }

    console.log(`[迁移] 找到 ${articles.length} 篇文章需要迁移图片`)

    const results = []
    let successCount = 0
    let failCount = 0

    for (const article of articles) {
      try {
        console.log(`[迁移] 处理文章: ${article.title}`)

        // 下载图片（使用代理）
        const imageResponse = await proxyFetch(article.image_url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        })

        if (!imageResponse.ok) {
          throw new Error(`下载图片失败: ${imageResponse.status}`)
        }

        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer())

        // 生成 OSS 文件名
        const safeTitle = article.title
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .substring(0, 50)
        const timestamp = Date.now()
        const objectKey = `speaker-covers/${safeTitle}-${timestamp}.jpg`

        // 上传到 OSS
        await ossClient.put(objectKey, imageBuffer, {
          headers: {
            'Content-Type': 'image/jpeg'
          }
        })

        // 构建公开访问 URL
        const ossUrl = `https://${ossClient.options.bucket}.${ossClient.options.region}.aliyuncs.com/${objectKey}`

        // 更新数据库
        const { error: updateError } = await supabase
          .from('speaker_articles')
          .update({ image_url: ossUrl })
          .eq('id', article.id)

        if (updateError) {
          throw new Error(`更新数据库失败: ${updateError.message}`)
        }

        console.log(`[迁移] ✅ 成功: ${article.title} -> ${ossUrl}`)
        results.push({ id: article.id, title: article.title, status: 'success', newUrl: ossUrl })
        successCount++

      } catch (err: any) {
        console.error(`[迁移] ❌ 失败: ${article.title}`, err.message)
        results.push({ id: article.id, title: article.title, status: 'failed', error: err.message })
        failCount++
      }
    }

    return NextResponse.json({
      success: true,
      message: `迁移完成: 成功 ${successCount}, 失败 ${failCount}`,
      total: articles.length,
      migrated: successCount,
      failed: failCount,
      results
    })

  } catch (error: any) {
    console.error('[迁移] 错误:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
