'use server'

/**
 * 音频上传 Server Action
 *
 * 使用 Server Action 绕过 API Route 的 10MB body size 限制
 */

import { getOSSClient, getCacheHeaders } from '@/lib/oss'
import { randomUUID } from 'crypto'

export async function uploadAudio(formData: FormData) {
  try {
    console.log('[Action] 收到音频上传请求')

    const file = formData.get('file') as File

    if (!file) {
      return { success: false, error: '未找到文件' }
    }

    console.log('[Action] 📁 文件信息:', {
      name: file.name,
      size: file.size,
      type: file.type
    })

    // 验证文件大小
    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      return { success: false, error: '文件过大（最大50MB）' }
    }

    // 上传到 OSS
    const extension = file.name.split('.').pop() || 'mp3'
    const uuid = randomUUID().split('-')[0]
    const safeFileName = `${uuid}.${extension}`
    const objectKey = `speaker/audio/${safeFileName}`

    console.log('[Action] 📤 开始上传到 OSS:', objectKey)

    const buffer = Buffer.from(await file.arrayBuffer())
    const client = getOSSClient()
    const result = await client.put(objectKey, buffer, {
      headers: getCacheHeaders('audio'),
    })

    const publicUrl = `https://${client.options.bucket}.${client.options.region}.aliyuncs.com/${objectKey}`

    console.log('[Action] ✅ 上传成功:', publicUrl)

    return {
      success: true,
      data: { url: publicUrl },
      message: '上传成功'
    }
  } catch (error: any) {
    console.error('[Action] ❌ 上传失败:', error)
    return {
      success: false,
      error: '上传失败',
      details: error.message
    }
  }
}
