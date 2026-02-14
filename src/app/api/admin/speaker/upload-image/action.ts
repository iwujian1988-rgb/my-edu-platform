'use server'

/**
 * Speaker 封面图片上传 Server Action
 *
 * 将封面图片上传到阿里云 OSS，返回公开访问 URL
 */

import { getOSSClient } from '@/lib/oss'
import { randomUUID } from 'crypto'

export async function uploadSpeakerImage(formData: FormData) {
  try {
    console.log('[Upload Image] 收到图片上传请求')

    const file = formData.get('file') as File

    if (!file) {
      return { success: false, error: '未找到文件' }
    }

    console.log('[Upload Image] 📁 文件信息:', {
      name: file.name,
      size: file.size,
      type: file.type
    })

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: '只支持 JPG、PNG、WebP、GIF 格式的图片' }
    }

    // 验证文件大小（最大 5MB）
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return { success: false, error: '图片过大（最大5MB）' }
    }

    // 生成 OSS 文件名
    const extension = file.name.split('.').pop() || 'jpg'
    const uuid = randomUUID().split('-')[0]
    const timestamp = Date.now()
    const objectKey = `speaker-covers/${timestamp}-${uuid}.${extension}`

    console.log('[Upload Image] 📤 开始上传到 OSS:', objectKey)

    // 上传到 OSS
    const buffer = Buffer.from(await file.arrayBuffer())
    const client = getOSSClient()
    await client.put(objectKey, buffer, {
      headers: {
        'Content-Type': file.type
      }
    })

    // 构建公开访问 URL
    const publicUrl = `https://${client.options.bucket}.${client.options.region}.aliyuncs.com/${objectKey}`

    console.log('[Upload Image] ✅ 上传成功:', publicUrl)

    return {
      success: true,
      data: { url: publicUrl },
      message: '上传成功'
    }
  } catch (error: any) {
    console.error('[Upload Image] ❌ 上传失败:', error)
    return {
      success: false,
      error: '上传失败',
      details: error.message
    }
  }
}
