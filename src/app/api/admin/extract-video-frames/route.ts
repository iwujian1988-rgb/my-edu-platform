/**
 * 服务端提取视频帧 API
 *
 * POST /api/admin/extract-video-frames
 *
 * 优化策略：
 * 1. OSS 视频：使用阿里云 OSS 视频截帧 ?x-oss-process=video/snapshot（~1-2s）
 * 2. 非 OSS 视频：fallback 到 ffmpeg 从 URL 提取
 */

import { NextRequest, NextResponse } from 'next/server'
import { checkAdminForAPI } from '@/lib/admin-auth'
import { spawn } from 'child_process'
import { readdir, readFile, unlink, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import os from 'os'

// 动态获取 ffmpeg/ffprobe 路径（避免 webpack 打包问题）
function getFfmpegPath(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@ffmpeg-installer/ffmpeg').path
  } catch {
    return 'ffmpeg'
  }
}

function getFfprobePath(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@ffprobe-installer/ffprobe').path
  } catch {
    return 'ffprobe'
  }
}

const FFMPEG = getFfmpegPath()
const FFPROBE = getFfprobePath()

interface ExtractRequest {
  videoUrl: string
  frameCount?: number
  duration?: number
}

interface FrameResult {
  dataUrl: string
  time: number
}

const FRAME_COUNT = 3
const TEMP_DIR = path.join(os.tmpdir(), 'video-frames')

export async function POST(request: NextRequest) {
  let sessionPrefix = ''
  try {
    const adminCheck = await checkAdminForAPI()
    if (!adminCheck.success) {
      return NextResponse.json(
        { success: false, error: adminCheck.error || '未授权' },
        { status: adminCheck.status || 401 }
      )
    }

    const body: ExtractRequest = await request.json()
    const { videoUrl, frameCount = FRAME_COUNT, duration: clientDuration } = body

    if (!videoUrl) {
      return NextResponse.json(
        { success: false, error: '缺少 videoUrl' },
        { status: 400 }
      )
    }

    console.log(`[提取帧] 开始: ${videoUrl}`)

    // 判断是否为 OSS URL
    const isOssUrl = videoUrl.includes('aliyuncs.com')

    if (isOssUrl) {
      // ===== OSS 快速路径：用 OSS 视频截帧 API，不走 ffmpeg =====
      const result = await extractFramesViaOss(videoUrl, frameCount, clientDuration)
      return NextResponse.json(result)
    } else {
      // ===== 非 OSS：fallback 到 ffmpeg =====
      if (!existsSync(TEMP_DIR)) {
        await mkdir(TEMP_DIR, { recursive: true })
      }

      const sessionId = Date.now().toString(36) + Math.random().toString(36).slice(2)
      sessionPrefix = `frame_${sessionId}`

      const duration = await getVideoDurationFromUrl(videoUrl)
      console.log(`[提取帧] 视频时长: ${duration}s`)

      if (duration < 5) {
        throw new Error(`视频时长太短（${duration.toFixed(1)}秒）`)
      }

      const startTime = duration * 0.05
      const endTime = duration * 0.95
      const segmentDuration = endTime - startTime

      // 并发提取：每个时间点一个 ffmpeg 进程
      const timestamps: number[] = []
      for (let i = 0; i < frameCount; i++) {
        timestamps.push(startTime + (segmentDuration / (frameCount - 1)) * i)
      }

      const extractPromises = timestamps.map((time, i) => {
        const outputFile = path.join(TEMP_DIR, `${sessionPrefix}_${i.toString().padStart(3, '0')}.jpg`)
        return extractSingleFrame(videoUrl, outputFile, time)
          .then(async () => {
            const frameBuffer = await readFile(outputFile)
            await unlink(outputFile).catch(() => {})
            return {
              dataUrl: `data:image/jpeg;base64,${frameBuffer.toString('base64')}`,
              time: Math.round(time * 100) / 100,
            }
          })
      })

      const settled = await Promise.allSettled(extractPromises)
      const frames: FrameResult[] = []
      for (const result of settled) {
        if (result.status === 'fulfilled') {
          frames.push(result.value)
        }
      }

      frames.sort((a, b) => a.time - b.time)

      if (frames.length === 0) {
        throw new Error('未能提取到任何画面')
      }

      console.log(`[提取帧] ffmpeg 成功: ${frames.length} 帧`)
      return NextResponse.json({ success: true, frames, duration })
    }

  } catch (error) {
    console.error('[提取帧] 失败:', error)

    if (sessionPrefix) {
      try {
        const files = await readdir(TEMP_DIR)
        for (const f of files) {
          if (f.startsWith(sessionPrefix)) {
            await unlink(path.join(TEMP_DIR, f)).catch(() => {})
          }
        }
      } catch { /* noop */ }
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '提取帧失败',
      },
      { status: 500 }
    )
  }
}

// ============================================
// OSS 快速截帧：利用 ?x-oss-process=video/snapshot
// ============================================

const OSS_SNAPSHOT_TIMEOUT = 15000 // 单帧超时 15s

async function extractFramesViaOss(
  videoUrl: string,
  frameCount: number,
  clientDuration?: number
): Promise<{ success: boolean; frames: FrameResult[]; duration: number }> {
  let duration: number

  // 优先使用前端传入的时长，避免 ffprobe 网络请求
  if (clientDuration && clientDuration > 5) {
    duration = clientDuration
    console.log(`[OSS截帧] 使用前端传入时长: ${duration}s`)
  } else {
    // 前端没传时长，用 ffprobe 从 URL 获取
    try {
      duration = await getVideoDurationFromUrl(videoUrl)
    } catch {
      throw new Error('无法获取视频时长')
    }
  }

  if (duration < 5) {
    throw new Error(`视频时长太短（${duration.toFixed(1)}秒）`)
  }

  // 2. 计算时间点
  const startTime = duration * 0.15
  const endTime = duration * 0.85
  const segmentDuration = endTime - startTime
  const timestamps: number[] = []
  for (let i = 0; i < frameCount; i++) {
    timestamps.push(startTime + (segmentDuration / (frameCount - 1)) * i)
  }

  // 3. 并发请求 OSS 截帧（每个请求只返回 ~50KB JPEG）
  const framePromises = timestamps.map(async (time): Promise<FrameResult> => {
    const snapshotUrl = buildOssSnapshotUrl(videoUrl, Math.round(time * 1000), 640)
    console.log(`[OSS截帧] t=${time.toFixed(1)}s`)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), OSS_SNAPSHOT_TIMEOUT)

    try {
      const response = await fetch(snapshotUrl, { signal: controller.signal })
      clearTimeout(timeout)

      if (!response.ok) {
        throw new Error(`OSS 截帧返回 ${response.status}`)
      }

      const buffer = Buffer.from(await response.arrayBuffer())
      const base64 = buffer.toString('base64')

      return {
        dataUrl: `data:image/jpeg;base64,${base64}`,
        time: Math.round(time * 100) / 100,
      }
    } catch (err) {
      clearTimeout(timeout)
      throw err
    }
  })

  const settled = await Promise.allSettled(framePromises)
  const frames: FrameResult[] = []
  for (const result of settled) {
    if (result.status === 'fulfilled') {
      frames.push(result.value)
    }
  }

  frames.sort((a, b) => a.time - b.time)

  if (frames.length === 0) {
    throw new Error('OSS 截帧全部失败，请检查 OSS 视频处理是否已开启')
  }

  console.log(`[OSS截帧] 成功: ${frames.length}/${frameCount} 帧`)
  return { success: true, frames, duration }
}

/**
 * 构建 OSS 视频截帧 URL
 *
 * 格式: video.mp4?x-oss-process=video/snapshot,t_TIME_MS,m_fast,w_WIDTH,f_jpg
 * - t: 截帧时间点（毫秒）
 * - m_fast: 快速模式
 * - w: 输出宽度
 * - f: 输出格式
 */
function buildOssSnapshotUrl(videoUrl: string, timeMs: number, width: number): string {
  // 保留 URL 中已有的查询参数
  const url = new URL(videoUrl)
  // OSS 视频截帧参数
  url.searchParams.set('x-oss-process', `video/snapshot,t_${timeMs},m_fast,w_${width},f_jpg`)
  return url.toString()
}

// ============================================
// ffmpeg fallback（非 OSS 视频）
// ============================================

async function getVideoDurationFromUrl(videoUrl: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn(FFPROBE, [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      videoUrl,
    ])

    let output = ''
    const timeout = setTimeout(() => {
      ffprobe.kill()
      reject(new Error('ffprobe 超时'))
    }, 30000)

    ffprobe.stdout.on('data', (data) => {
      output += data.toString()
    })

    ffprobe.on('close', (code) => {
      clearTimeout(timeout)
      if (code === 0) {
        const duration = parseFloat(output.trim())
        if (!isNaN(duration)) {
          resolve(duration)
        } else {
          reject(new Error('无法解析视频时长'))
        }
      } else {
        reject(new Error('ffprobe 执行失败'))
      }
    })

    ffprobe.on('error', () => {
      clearTimeout(timeout)
      reject(new Error('ffprobe 未安装或不可用'))
    })
  })
}

async function extractSingleFrame(
  videoUrl: string,
  outputFile: string,
  time: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn(FFMPEG, [
      '-ss', time.toString(),
      '-i', videoUrl,
      '-frames:v', '1',
      '-q:v', '4',
      '-vf', 'scale=640:-1',
      '-y',
      outputFile,
    ])

    let errorOutput = ''
    const timeout = setTimeout(() => {
      ffmpeg.kill()
      reject(new Error(`ffmpeg 超时 @ ${time.toFixed(1)}s`))
    }, 30000)

    ffmpeg.stderr.on('data', (data) => {
      errorOutput += data.toString()
    })

    ffmpeg.on('close', (code) => {
      clearTimeout(timeout)
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`ffmpeg 失败: ${errorOutput.slice(0, 200)}`))
      }
    })

    ffmpeg.on('error', () => {
      clearTimeout(timeout)
      reject(new Error('ffmpeg 未安装'))
    })
  })
}
