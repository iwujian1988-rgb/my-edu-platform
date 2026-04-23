/**
 * 阿里云 OSS 客户端工具
 * 用于上传和管理 TTS 音频文件
 */

import OSS from 'ali-oss'

// OSS 客户端单例
let ossClient: OSS | null = null

/**
 * 获取 OSS 客户端实例（单例模式）
 */
export function getOSSClient(): OSS {
  if (!ossClient) {
    const config = {
      region: process.env.ALIYUN_OSS_REGION,
      accessKeyId: process.env.ALIYUN_OSS_ACCESS_KEY_ID,
      accessKeySecret: process.env.ALIYUN_OSS_ACCESS_KEY_SECRET,
      bucket: process.env.ALIYUN_OSS_BUCKET,
    }

    // 验证必需配置
    if (!config.region || !config.accessKeyId || !config.accessKeySecret || !config.bucket) {
      throw new Error('OSS 配置不完整，请检查环境变量')
    }

    ossClient = new OSS(config)
  }

  return ossClient
}

/**
 * 生成安全的文件名（移除特殊字符）
 * @param text - 原始文本
 * @param type - 发音类型 (1=英音, 2=美音)
 * @returns 安全的文件名
 */
export function generateSafeFileName(text: string, type: string): string {
  // 移除特殊字符，只保留字母、数字、连字符和空格
  let safeName = text.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '_')  // 特殊字符替换为下划线
    .replace(/\s+/g, '_')            // 空格替换为下划线
    .substring(0, 100)                // 限制长度为100字符

  // 添加类型后缀
  const typeSuffix = type === '1' ? 'uk' : 'us'

  return `${safeName}_${typeSuffix}.mp3`
}

/**
 * 上传音频到 OSS
 * @param buffer - 音频数据 Buffer
 * @param fileName - 文件名
 * @returns OSS 文件公开访问的完整 URL
 */
export async function uploadAudioToOSS(
  buffer: Buffer,
  fileName: string
): Promise<string> {
  try {
    const client = getOSSClient()

    // 上传到 /audio/ 目录
    const objectKey = `audio/${fileName}`

    console.log(`📤 [OSS] 上传音频: ${objectKey} (${buffer.length} bytes)`)

    const result = await client.put(objectKey, buffer, {
      headers: getCacheHeaders('audio'),
      timeout: 300000, // 5分钟超时（支持大文件上传）
    })

    console.log(`✅ [OSS] 上传成功: ${result.url}`)

    // 构建完整的公开访问 URL
    // 格式: https://{bucket}.{region}.aliyuncs.com/{objectKey}
    const publicUrl = `https://${client.options.bucket}.${client.options.region}.aliyuncs.com/${objectKey}`

    console.log(`✅ [OSS] 公开 URL: ${publicUrl}`)

    return publicUrl
  } catch (error) {
    console.error('❌ [OSS] 上传失败:', error)
    throw error
  }
}

/**
 * 上传视频到 OSS（使用分片上传支持大文件）
 * @param buffer - 视频数据 Buffer
 * @param fileName - 文件名
 * @returns OSS 文件公开访问的完整 URL
 */
export async function uploadVideoToOSS(
  buffer: Buffer,
  fileName: string
): Promise<string> {
  try {
    const client = getOSSClient()

    // 上传到 /videos/ 目录
    const objectKey = `videos/${fileName}`

    const fileSizeMB = (buffer.length / 1024 / 1024).toFixed(1)
    console.log(`📤 [OSS] 上传视频: ${objectKey} (${fileSizeMB}MB)`)

    // 大于10MB使用分片上传
    const useMultipart = buffer.length > 10 * 1024 * 1024

    let result
    if (useMultipart) {
      console.log(`📤 [OSS] 使用分片上传模式`)

      // 使用分片上传
      result = await client.multipartUpload(objectKey, buffer, {
        headers: getCacheHeaders('video'),
        partSize: 1024 * 1024, // 1MB 每片
        progress: (p: number) => {
          const percent = Math.round(p * 100)
          if (percent % 20 === 0) { // 每20%打印一次，减少日志
            console.log(`📊 [OSS] 上传进度: ${percent}%`)
          }
        }
      })
    } else {
      console.log(`📤 [OSS] 使用普通上传模式`)

      // 小文件直接上传
      result = await client.put(objectKey, buffer, {
        headers: getCacheHeaders('video'),
        timeout: 300000, // 5分钟超时
      })
    }

    console.log(`✅ [OSS] 上传成功`)

    // 构建完整的公开访问 URL
    const publicUrl = `https://${client.options.bucket}.${client.options.region}.aliyuncs.com/${objectKey}`

    console.log(`✅ [OSS] URL: ${publicUrl}`)

    return publicUrl
  } catch (error) {
    console.error('❌ [OSS] 上传失败:', error)
    throw error
  }
}

/**
 * 异步上传音频（不阻塞响应）
 * @param buffer - 音频数据
 * @param fileName - 文件名
 * @returns Promise<string> OSS URL
 */
export async function uploadAudioAsync(
  buffer: Buffer,
  fileName: string
): Promise<string> {
  return uploadAudioToOSS(buffer, fileName)
}

/**
 * 确保音频目录存在（OSS 不需要预先创建目录）
 */
export function ensureAudioDirectory(): void {
  // OSS 不需要预先创建目录，直接上传即可
  console.log('✅ [OSS] 音频目录准备就绪: /audio/')
}

/**
 * 上传图片到 OSS
 * @param buffer - 图片数据 Buffer
 * @param fileName - 文件名
 * @returns OSS 文件公开访问的完整 URL
 */
export async function uploadImageToOSS(
  buffer: Buffer,
  fileName: string
): Promise<string> {
  try {
    const client = getOSSClient()

    // 上传到 /speaker-covers/ 目录（与其他图片上传保持一致，避免 ACL 问题）
    const objectKey = `speaker-covers/${fileName}`

    console.log(`📤 [OSS] 上传图片: ${objectKey} (${buffer.length} bytes)`)

    const result = await client.put(objectKey, buffer, {
      headers: {
        'Content-Type': 'image/jpeg',
        ...getCacheHeaders('image'),
      },
    })

    console.log(`✅ [OSS] 上传成功: ${result.url}`)

    // 构建完整的公开访问 URL
    const publicUrl = `https://${client.options.bucket}.${client.options.region}.aliyuncs.com/${objectKey}`

    console.log(`✅ [OSS] 公开 URL: ${publicUrl}`)

    return publicUrl
  } catch (error) {
    console.error('❌ [OSS] 上传图片失败:', error)
    throw error
  }
}

// ─── OSS 缓存头管理 ─────────────────────────────────────────────

type CacheType = 'video' | 'audio' | 'image' | 'recording'

/** 长期缓存（1年）用于不可变的静态资源 */
const CACHE_MAX_AGE_IMMUTABLE = 'public, max-age=31536000, immutable'
/** 短期缓存（1天）用于用户录音等可能变更的资源 */
const CACHE_MAX_AGE_SHORT = 'public, max-age=86400'

const CACHE_HEADERS: Record<CacheType, Record<string, string>> = {
  video:     { 'Cache-Control': CACHE_MAX_AGE_IMMUTABLE, 'Content-Disposition': 'inline' },
  audio:     { 'Cache-Control': CACHE_MAX_AGE_IMMUTABLE, 'Content-Disposition': 'inline' },
  image:     { 'Cache-Control': CACHE_MAX_AGE_IMMUTABLE, 'Content-Disposition': 'inline' },
  recording: { 'Cache-Control': CACHE_MAX_AGE_SHORT, 'Content-Disposition': 'inline' },
}

/**
 * 获取 OSS 对象的缓存响应头
 * 纯函数，无 Node.js 依赖，前后端通用
 */
export function getCacheHeaders(type: CacheType): Record<string, string> {
  return CACHE_HEADERS[type]
}
