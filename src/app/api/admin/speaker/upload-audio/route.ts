/**
 * Speaker 音频文件上传 API
 *
 * 功能：
 * - POST: 上传音频文件到阿里云 OSS
 */

import { NextRequest, NextResponse } from 'next/server'
import { getOSSClient, getCacheHeaders } from '@/lib/oss'
import { randomUUID } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    console.log('[API] 收到音频上传请求')
    console.log('[API] Content-Type:', request.headers.get('content-type'))

    const formData = await request.formData()
    console.log('[API] ✅ FormData 解析成功')

    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: '未找到文件' }, { status: 400 })
    }

    console.log('[API] 📁 文件信息:', {
      name: file.name,
      size: file.size,
      type: file.type
    })

    // 验证文件大小
    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: '文件过大（最大50MB）' },
        { status: 400 }
      )
    }

    // 上传到 OSS
    const extension = file.name.split('.').pop() || 'mp3'
    const uuid = randomUUID().split('-')[0]
    const safeFileName = `${uuid}.${extension}`
    const objectKey = `speaker/audio/${safeFileName}`

    console.log('[API] 📤 开始上传到 OSS:', objectKey)

    const buffer = Buffer.from(await file.arrayBuffer())
    const client = getOSSClient()
    const result = await client.put(objectKey, buffer, {
      headers: getCacheHeaders('audio'),
    })

    const publicUrl = `https://${client.options.bucket}.${client.options.region}.aliyuncs.com/${objectKey}`

    console.log('[API] ✅ 上传成功:', publicUrl)

    return NextResponse.json({
      success: true,
      data: { url: publicUrl },
      message: '上传成功'
    })
  } catch (error: any) {
    console.error('[API] ❌ 上传失败:', error)
    return NextResponse.json(
      { error: '上传失败', details: error.message },
      { status: 500 }
    )
  }
}
