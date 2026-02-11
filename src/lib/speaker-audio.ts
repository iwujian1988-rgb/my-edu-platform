/**
 * 演说家模块 - 音频文件管理工具
 *
 * 功能：
 * 1. 生成音频/图片 URL（自动适配开发/生产环境）
 * 2. 检查音频文件是否存在
 * 3. 预加载音频文件
 *
 * 参考：
 * - speak/README.md（音频文件结构）
 * - TECHNICAL_MODIFICATION_PLAN.md（环境变量配置）
 */

import type { SpeakerLevel } from '../types/speaker'

/**
 * 获取音频文件的完整 URL
 * @param filename - 音频文件名（如：bbc_01_Why_are_billionaires_building_bunkers.mp3）
 * @param level - 难度等级（2 或 3）
 * @returns 完整的音频 URL
 * @example
 * const audioUrl = getSpeakerAudioUrl('bbc_01_Why_are_billionaires_building_bunkers.mp3', 2)
 * // 开发环境：/audio/speaker/level2/bbc_01_Why_are_billionaires_building_bunkers.mp3
 * // 生产环境：https://your-bucket.oss-cn-hongkong.aliyuncs.com/audio/speaker/level2/bbc_01_Why_are_billionaires_building_bunkers.mp3
 */
export function getSpeakerAudioUrl(filename: string, level: SpeakerLevel): string {
  const baseUrl = process.env.NEXT_PUBLIC_SPEAKER_AUDIO_URL || '/audio/speaker'

  console.log('[Speaker Audio] 生成音频 URL:', {
    filename,
    level,
    baseUrl,
    url: `${baseUrl}/level${level}/${filename}`
  })

  // 开发环境：从 public/audio/speaker/{level}/ 读取
  // 生产环境：从 OSS URL 读取
  return `${baseUrl}/level${level}/${filename}`
}

/**
 * 获取封面图片的完整 URL
 * @param filename - 图片文件名（如：bbc_01_Why_are_billionaires_building_bunkers.jpg）
 * @param level - 难度等级
 * @returns 完整的图片 URL，如果没有则返回默认占位图
 * @example
 * const imageUrl = getSpeakerImageUrl('bbc_01_Why_are_billionaires_building_bunkers.jpg', 2)
 * // 返回：/audio/speaker/level2/bbc_01_Why_are_billionaires_building_bunkers.jpg
 */
export function getSpeakerImageUrl(filename: string | null, level: SpeakerLevel): string {
  // 如果没有图片，返回默认占位图
  if (!filename) {
    console.log('[Speaker Audio] 未提供图片文件名，使用占位图')
    return '/images/speaker-placeholder.jpg'
  }

  const baseUrl = process.env.NEXT_PUBLIC_SPEAKER_AUDIO_URL || '/audio/speaker'
  const url = `${baseUrl}/level${level}/${filename}`

  console.log('[Speaker Audio] 生成图片 URL:', { filename, level, url })

  return url
}

/**
 * 检查音频文件是否已存在（用于开发阶段调试）
 * @param filename - 音频文件名
 * @param level - 难度等级
 * @returns Promise<AudioCheckResult> 检查结果
 */
export async function checkAudioFileExists(
  filename: string,
  level: SpeakerLevel
): Promise<{ exists: boolean; url: string; error?: string }> {
  console.log('[Speaker Audio] 检查音频文件是否存在:', { filename, level })

  try {
    const url = getSpeakerAudioUrl(filename, level)
    const response = await fetch(url, { method: 'HEAD' })

    if (response.ok) {
      console.log('[Speaker Audio] ✅ 音频文件存在:', url)
      return { exists: true, url }
    } else {
      console.warn('[Speaker Audio] ⚠️ 音频文件不存在:', url, { status: response.status })
      return { exists: false, url, error: `HTTP ${response.status}` }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Speaker Audio] ❌ 检查音频文件失败:', { filename, level, error: errorMessage })
    return { exists: false, url: '', error: errorMessage }
  }
}

/**
 * 预加载音频文件（用于优化用户体验）
 * @param filenames - 要预加载的音频文件列表
 * @param level - 难度等级
 * @returns Promise<{ loaded: number; total: number; failed: string[] }> 预加载结果统计
 */
export async function preloadAudioFiles(
  filenames: string[],
  level: SpeakerLevel
): Promise<{ loaded: number; total: number; failed: string[] }> {
  console.log('[Speaker Audio] 开始预加载音频文件:', { count: filenames.length, level })

  const results = await Promise.allSettled(
    filenames.map(async (filename) => {
      try {
        const url = getSpeakerAudioUrl(filename, level)
        const response = await fetch(url)

        if (response.ok) {
          console.log('[Speaker Audio] ✅ 预加载成功:', filename)
          return { filename, success: true }
        } else {
          console.warn('[Speaker Audio] ⚠️ 预加载失败:', filename, { status: response.status })
          return { filename, success: false }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error('[Speaker Audio] ❌ 预加载异常:', filename, { error: errorMessage })
        return { filename, success: false }
      }
    })
  )

  const loaded = results.filter(r => r.status === 'fulfilled' && r.value.success).length
  const failed = results
    .filter(r => r.status === 'fulfilled' && !r.value.success)
    .map(r => (r.status === 'fulfilled' ? r.value.filename : 'unknown'))

  console.log('[Speaker Audio] 预加载完成:', {
    total: filenames.length,
    loaded,
    failed: failed.length
  })

  return { loaded, total: filenames.length, failed }
}
