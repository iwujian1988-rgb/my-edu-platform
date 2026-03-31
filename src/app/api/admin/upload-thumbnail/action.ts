'use server'

/**
 * 视频封面图片上传 Server Action
 *
 * 使用 STS Token 临时凭证上传到 OSS（与前端直传相同的机制）
 */

import OSS from 'ali-oss'
import { STS } from 'ali-oss'
import { randomUUID } from 'crypto'
import { checkAdminForAPI } from '@/lib/admin-auth'
import { getCacheHeaders } from '@/lib/oss'

interface UploadThumbnailParams {
  fileName: string
  imageData: string // base64 编码（不含 data:image/xxx;base64, 前缀）
}

interface UploadThumbnailResult {
  success: boolean
  url?: string
  error?: string
}

export async function uploadThumbnail(
  params: UploadThumbnailParams
): Promise<UploadThumbnailResult> {
  try {
    // 1. 验证管理员权限
    const adminCheck = await checkAdminForAPI()
    if (!adminCheck.success) {
      return {
        success: false,
        error: adminCheck.error || '未授权'
      }
    }

    const { fileName, imageData } = params

    if (!fileName || !imageData) {
      return { success: false, error: '缺少 fileName 或 imageData' }
    }

    console.log('[Upload Thumbnail] 收到封面上传请求:', fileName)

    // 2. 将 base64 转换为 Buffer
    const buffer = Buffer.from(imageData, 'base64')

    // 3. 验证图片大小（限制 2MB）
    const MAX_SIZE = 2 * 1024 * 1024
    if (buffer.length > MAX_SIZE) {
      return { success: false, error: '图片大小超过 2MB 限制' }
    }

    console.log('[Upload Thumbnail] 📁 图片大小:', (buffer.length / 1024).toFixed(1), 'KB')

    // 4. 获取 STS Token（与前端直传相同的机制）
    const stsConfig = {
      accessKeyId: process.env.ALIYUN_OSS_ACCESS_KEY_ID!,
      accessKeySecret: process.env.ALIYUN_OSS_ACCESS_KEY_SECRET!,
      roleArn: process.env.OSS_STS_ROLE_ARN!
    }

    if (!stsConfig.roleArn) {
      return { success: false, error: 'OSS STS Role ARN 未配置' }
    }

    const sts = new STS({
      accessKeyId: stsConfig.accessKeyId,
      accessKeySecret: stsConfig.accessKeySecret,
    })

    // 生成临时凭证，有效期 1小时
    const stsResult = await sts.assumeRole(
      stsConfig.roleArn,
      '', // policy 留空表示继承角色所有权限
      3600,
      'thumbnail-upload-session'
    )

    console.log('[Upload Thumbnail] 🔑 STS Token 获取成功')

    // 5. 使用临时凭证创建 OSS 客户端
    const client = new OSS({
      region: process.env.ALIYUN_OSS_REGION || 'oss-cn-hongkong',
      accessKeyId: stsResult.credentials.AccessKeyId,
      accessKeySecret: stsResult.credentials.AccessKeySecret,
      stsToken: stsResult.credentials.SecurityToken,
      bucket: process.env.ALIYUN_OSS_BUCKET,
      secure: true,
    })

    // 6. 生成 OSS 文件名
    const uuid = randomUUID().split('-')[0]
    const timestamp = Date.now()
    const objectKey = `speaker-covers/thumb-${timestamp}-${uuid}-${fileName}`

    console.log('[Upload Thumbnail] 📤 开始上传到 OSS:', objectKey)

    // 7. 上传到 OSS
    await client.put(objectKey, buffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        ...getCacheHeaders('image'),
      }
    })

    // 8. 构建公开访问 URL
    const publicUrl = `https://${client.options.bucket}.${client.options.region}.aliyuncs.com/${objectKey}`

    console.log('[Upload Thumbnail] ✅ 上传成功:', publicUrl)

    return {
      success: true,
      url: publicUrl,
    }

  } catch (error: any) {
    console.error('[Upload Thumbnail] ❌ 上传失败:', error)
    return {
      success: false,
      error: error.message || '上传失败',
    }
  }
}
