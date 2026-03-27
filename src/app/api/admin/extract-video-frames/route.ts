/**
 * 服务端提取视频帧 API
 *
 * POST /api/admin/extract-video-frames
 *
 * 使用 ffmpeg 提取视频帧，绕过浏览器 CORS 限制
 */

import { NextRequest, NextResponse } from 'next/server'
import { checkAdminForAPI } from '@/lib/admin-auth'
import { spawn } from 'child_process'
import { writeFile, unlink, mkdir } from 'fs/promises'
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
}

interface FrameResult {
  dataUrl: string
  time: number
}

const FRAME_COUNT = 12
const TEMP_DIR = path.join(os.tmpdir(), 'video-frames')

export async function POST(request: NextRequest) {
  try {
    // 1. 验证管理员权限
    const adminCheck = await checkAdminForAPI()
    if (!adminCheck.success) {
      return NextResponse.json(
        { success: false, error: adminCheck.error || '未授权' },
        { status: adminCheck.status || 401 }
      )
    }

    // 2. 解析请求
    const body: ExtractRequest = await request.json()
    const { videoUrl, frameCount = FRAME_COUNT } = body

    if (!videoUrl) {
      return NextResponse.json(
        { success: false, error: '缺少 videoUrl' },
        { status: 400 }
      )
    }

    // 3. 确保临时目录存在
    if (!existsSync(TEMP_DIR)) {
      await mkdir(TEMP_DIR, { recursive: true })
    }

    // 4. 生成唯一的临时文件名
    const sessionId = Date.now().toString(36) + Math.random().toString(36).slice(2)
    const videoFile = path.join(TEMP_DIR, `video_${sessionId}.mp4`)
    const outputPattern = path.join(TEMP_DIR, `frame_${sessionId}_%03d.jpg`)

    console.log(`[提取帧] 开始处理: ${videoUrl}`)

    // 5. 下载视频到临时文件
    const videoResponse = await fetch(videoUrl)
    if (!videoResponse.ok) {
      throw new Error(`下载视频失败: ${videoResponse.status}`)
    }

    const videoBuffer = Buffer.from(await videoResponse.arrayBuffer())
    await writeFile(videoFile, videoBuffer)

    console.log(`[提取帧] 视频已下载: ${videoBuffer.length} bytes`)

    // 6. 使用 ffmpeg 提取帧
    const frames: FrameResult[] = []

    // 先获取视频时长
    const duration = await getVideoDuration(videoFile)
    console.log(`[提取帧] 视频时长: ${duration}s`)

    if (duration < 5) {
      throw new Error(`视频时长太短（${duration.toFixed(1)}秒）`)
    }

    // 计算帧时间点
    const startTime = duration * 0.05
    const endTime = duration * 0.95
    const interval = (endTime - startTime) / (frameCount - 1)

    for (let i = 0; i < frameCount; i++) {
      const time = startTime + interval * i
      const outputFile = path.join(TEMP_DIR, `frame_${sessionId}_${i.toString().padStart(3, '0')}.jpg`)

      // 使用 ffmpeg 提取单帧
      await extractSingleFrame(videoFile, outputFile, time)

      // 读取文件并转换为 base64
      const { readFile } = await import('fs/promises')
      const frameBuffer = await readFile(outputFile)
      const base64 = frameBuffer.toString('base64')
      const dataUrl = `data:image/jpeg;base64,${base64}`

      frames.push({ dataUrl, time })

      // 删除临时帧文件
      await unlink(outputFile).catch(() => {})
    }

    // 7. 清理临时视频文件
    await unlink(videoFile).catch(() => {})

    console.log(`[提取帧] 成功提取 ${frames.length} 帧`)

    return NextResponse.json({
      success: true,
      frames,
      duration,
    })

  } catch (error) {
    console.error('[提取帧] 失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '提取帧失败',
      },
      { status: 500 }
    )
  }
}

/**
 * 获取视频时长
 */
async function getVideoDuration(videoFile: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn(FFPROBE, [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      videoFile,
    ])

    let output = ''

    ffprobe.stdout.on('data', (data) => {
      output += data.toString()
    })

    ffprobe.on('close', (code) => {
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
      reject(new Error('ffprobe 未安装或不可用'))
    })
  })
}

/**
 * 提取单帧
 */
async function extractSingleFrame(
  videoFile: string,
  outputFile: string,
  time: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn(FFMPEG, [
      '-ss', time.toString(),
      '-i', videoFile,
      '-frames:v', '1',
      '-q:v', '2',
      '-vf', 'scale=640:-1',
      '-y',
      outputFile,
    ])

    let errorOutput = ''

    ffmpeg.stderr.on('data', (data) => {
      errorOutput += data.toString()
    })

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`ffmpeg 提取帧失败: ${errorOutput.slice(0, 200)}`))
      }
    })

    ffmpeg.on('error', () => {
      reject(new Error('ffmpeg 未安装或不可用'))
    })
  })
}
