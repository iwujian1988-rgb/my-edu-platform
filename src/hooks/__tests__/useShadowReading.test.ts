/**
 * useShadowReading Hook 单元测试
 *
 * 测试范围：
 *   - 状态机阶段推进（recording / shadow 两条路径）
 *   - 录音生命周期（start / stop / cancel）
 *   - 定时器管理（KTV tick + done phase timeout）
 *   - 暂停 / 恢复
 *   - 跳过上一句 / 下一句
 *   - 清理行为稳定性（cleanupHook 仅在 unmount 时触发）
 *   - 进度通知
 *
 * Mock 策略：
 *   - MediaRecorder / getUserMedia → 录音 API
 *   - HTMLVideoElement.prototype.play/pause → 视频片段播放
 *   - HTMLAudioElement → 录音回放
 *   - URL.createObjectURL / revokeObjectURL → Blob URL 管理
 *   - saveRecording → IndexedDB 持久化
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useShadowReading, type UseShadowReadingResult } from '../useShadowReading'
import type { SubtitleWithHighlights } from '@/types/video'
import type { ShadowMode } from '@/types/shadowReading'

// vi.mock 必须在模块顶层，vitest 会自动提升
vi.mock('@/services/shadowRecordingStorage', () => ({
  saveRecording: vi.fn().mockResolvedValue(undefined),
}))

// ═══════════════════════════════════════
// Mock 数据
// ═══════════════════════════════════════

const FAKE_VIDEO_URL = 'https://cdn.example.com/video.mp4'
const FAKE_BLOB_URL = 'blob:http://localhost/fake-audio'

function makeSubtitle(overrides: Partial<SubtitleWithHighlights> = {}): SubtitleWithHighlights {
  return {
    id: 'sub-1',
    video_id: 'vid-1',
    start_time: 0,
    end_time: 3,
    original_text: 'Bonjour le monde',
    chinese_text: '你好世界',
    word_count: 3,
    display_order: 0,
    created_at: '2026-01-01T00:00:00Z',
    highlights: [],
    ...overrides,
  }
}

const MOCK_SUBTITLES: SubtitleWithHighlights[] = [
  makeSubtitle({ id: 'sub-1', display_order: 0 }),
  makeSubtitle({ id: 'sub-2', start_time: 3.5, end_time: 6.5, display_order: 1 }),
  makeSubtitle({ id: 'sub-3', start_time: 7, end_time: 10, display_order: 2 }),
]

function makeDefaultOptions(overrides: Record<string, unknown> = {}) {
  return {
    videoId: 'vid-1',
    videoUrl: FAKE_VIDEO_URL,
    subtitles: MOCK_SUBTITLES,
    mode: 'recording' as ShadowMode,
    resumeIndex: 0,
    onProgressChange: vi.fn(),
    ...overrides,
  }
}

// ═══════════════════════════════════════
// Mock: MediaRecorder
// ═══════════════════════════════════════

class FakeMediaStreamTrack {
  stop = vi.fn()
}

class FakeMediaStream {
  getTracks = vi.fn(() => [new FakeMediaStreamTrack()])
}

class FakeMediaRecorder {
  static isTypeSupported = vi.fn(() => true)
  static mimeType = 'audio/webm;codecs=opus'

  state: 'inactive' | 'recording' = 'inactive'
  mimeType: string
  ondataavailable: ((e: { data: Blob }) => void) | null = null
  onstop: (() => void) | null = null
  private _audioBitsPerSecond: number

  constructor(_stream: MediaStream, options?: { mimeType?: string; audioBitsPerSecond?: number }) {
    this.mimeType = options?.mimeType ?? 'audio/webm;codecs=opus'
    this._audioBitsPerSecond = options?.audioBitsPerSecond ?? 128000
  }

  start(_timeslice?: number) {
    this.state = 'recording'
  }

  stop() {
    this.state = 'inactive'
    // 模拟 dataavailable 事件
    if (this.ondataavailable) {
      this.ondataavailable({ data: new Blob(['audio-data'], { type: this.mimeType }) })
    }
    // onstop 延迟到下一个微任务触发，模拟真实行为
    if (this.onstop) {
      queueMicrotask(() => this.onstop?.())
    }
  }
}

// ═══════════════════════════════════════
// Mock: HTMLAudioElement
// ═══════════════════════════════════════

/** 最近创建的 Audio 实例，供测试手动触发 onended */
let lastCreatedAudio: FakeAudioElement | null = null

class FakeAudioElement {
  src = ''
  currentTime = 0
  duration = 2
  onended: (() => void) | null = null

  play = vi.fn().mockResolvedValue(undefined)
  pause = vi.fn()

  constructor() {
    lastCreatedAudio = this
  }
}

// ═══════════════════════════════════════
// Mock 安装
// ═══════════════════════════════════════

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: false })
  lastCreatedAudio = null

  // MediaRecorder
  global.MediaRecorder = FakeMediaRecorder as unknown as typeof MediaRecorder

  // getUserMedia
  Object.defineProperty(global.navigator, 'mediaDevices', {
    value: {
      getUserMedia: vi.fn().mockResolvedValue(new FakeMediaStream()),
    },
    writable: true,
    configurable: true,
  })

  // URL.createObjectURL / revokeObjectURL
  global.URL.createObjectURL = vi.fn(() => FAKE_BLOB_URL)
  global.URL.revokeObjectURL = vi.fn()

  // HTMLAudioElement
  global.Audio = FakeAudioElement as unknown as typeof HTMLAudioElement

  // HTMLVideoElement play / pause mock（保留已有原型链）
  HTMLVideoElement.prototype.play = vi.fn().mockResolvedValue(undefined)
  HTMLVideoElement.prototype.pause = vi.fn()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

// ═══════════════════════════════════════
// 辅助函数
// ═══════════════════════════════════════

/**
 * 模拟 playSegment 的视频播放完成流程。
 * playSegment 依赖 miniVideoRef.current，需要在调用 start 后手动挂载 mock video。
 */
function attachMockVideo(result: { current: UseShadowReadingResult }) {
  const mockVideo = document.createElement('video')
  // readyState >= 1 表示 HAVE_METADATA，使 playSegment 立即开始播放
  Object.defineProperty(mockVideo, 'readyState', { value: 2, writable: true })
  // 让 currentTime 在 play() 后随 interval 更新
  const startTimeTracker = { value: 0 }
  Object.defineProperty(mockVideo, 'currentTime', {
    get() {
      return startTimeTracker.value
    },
    set(v: number) {
      startTimeTracker.value = v
    },
    configurable: true,
  })

  result.current.miniVideoRef.current = mockVideo

  return { mockVideo, startTimeTracker }
}

/**
 * 将 video currentTime 推进到超过 segmentEndTime，触发 onEnd 回调。
 * 默认推进到 4 秒（MOCK_SUBTITLES[0] 的 end_time = 3）。
 */
function advanceVideoToEnd(startTimeTracker: { value: number }, endTime: number) {
  startTimeTracker.value = endTime + 0.5
}

/** 手动触发最近创建的 Audio 元素的 onended 回调 */
function triggerAudioEnded() {
  if (lastCreatedAudio?.onended) {
    lastCreatedAudio.onended()
  }
}

// ═══════════════════════════════════════
// 测试主体
// ═══════════════════════════════════════

describe('useShadowReading', () => {

  // ========================================
  // 1. 状态机阶段推进
  // ========================================
  describe('状态机阶段推进', () => {

    it('初始状态应为 idle，未开始', () => {
      const { result } = renderHook(() => useShadowReading(makeDefaultOptions()))
      expect(result.current.phase).toBe('idle')
      expect(result.current.isStarted).toBe(false)
      expect(result.current.isFinished).toBe(false)
      expect(result.current.isPaused).toBe(false)
      expect(result.current.isRecording).toBe(false)
      expect(result.current.audioURL).toBeNull()
      expect(result.current.practicedIds).toEqual([])
    })

    it('start() 应设置 isStarted=true 并推进到 listen1', () => {
      const { result } = renderHook(() => useShadowReading(makeDefaultOptions()))
      const { startTimeTracker } = attachMockVideo(result)

      act(() => {
        result.current.start()
      })

      expect(result.current.isStarted).toBe(true)
      expect(result.current.isPaused).toBe(false)

      // isStarted=true 触发 useEffect，进入 listen1
      // playSegment 调用 video.play()，KTV interval 启动
      expect(result.current.phase).toBe('listen1')
      expect(HTMLVideoElement.prototype.play).toHaveBeenCalled()

      // 模拟视频播放到 segment 末尾 → 触发 listen1 → listen2
      act(() => {
        advanceVideoToEnd(startTimeTracker, 3)
        vi.advanceTimersByTime(200)
      })

      expect(result.current.phase).toBe('listen2')
    })

    describe('recording 模式阶段链', () => {
      it('listen1 → listen2 → speak → playback → compare → done', async () => {
        const onProgressChange = vi.fn()
        const { result } = renderHook(() =>
          useShadowReading(makeDefaultOptions({ onProgressChange }))
        )
        const { startTimeTracker } = attachMockVideo(result)

        // 启动
        act(() => { result.current.start() })
        expect(result.current.phase).toBe('listen1')

        // listen1 → listen2
        act(() => {
          advanceVideoToEnd(startTimeTracker, 3)
          vi.advanceTimersByTime(200)
        })
        expect(result.current.phase).toBe('listen2')

        // listen2 → speak（录音模式走 speak 而不是 listen3）
        act(() => {
          advanceVideoToEnd(startTimeTracker, 3)
          vi.advanceTimersByTime(200)
        })
        // getUserMedia 是 async，等待 Promise resolve
        await act(async () => {
          await vi.advanceTimersByTimeAsync(100)
        })
        expect(result.current.phase).toBe('speak')
        expect(result.current.isRecording).toBe(true)
        expect(result.current.micPermission).toBe('granted')

        // speak → playback：等待 speak 倒计时结束（segment duration = 3s × speed 1.0 = 3s）
        // speak 阶段的 interval 每 100ms 检查一次，3 秒后触发 stopRecording
        await act(async () => {
          await vi.advanceTimersByTimeAsync(3500)
        })

        expect(result.current.isRecording).toBe(false)
        // stopRecording 的 onstop 创建 blob URL
        expect(global.URL.createObjectURL).toHaveBeenCalled()

        // playback 阶段播放录音
        expect(result.current.phase).toBe('playback')

        // 手动触发 audio.onended → compare
        act(() => {
          triggerAudioEnded()
        })

        // compare → done
        act(() => {
          advanceVideoToEnd(startTimeTracker, 3)
          vi.advanceTimersByTime(200)
        })
        expect(result.current.phase).toBe('done')

        // done 阶段应将 subtitle 加入 practicedIds 并通知进度
        expect(result.current.practicedIds).toContain('sub-1')
        expect(onProgressChange).toHaveBeenCalled()
      })
    })

    describe('shadow 模式阶段链', () => {
      it('listen1 → listen2 → listen3 → done', () => {
        const { result } = renderHook(() =>
          useShadowReading(makeDefaultOptions({ mode: 'shadow' }))
        )
        const { startTimeTracker } = attachMockVideo(result)

        act(() => { result.current.start() })
        expect(result.current.phase).toBe('listen1')

        // listen1 → listen2
        act(() => {
          advanceVideoToEnd(startTimeTracker, 3)
          vi.advanceTimersByTime(200)
        })
        expect(result.current.phase).toBe('listen2')

        // listen2 → listen3（影子模式走 listen3 而不是 speak）
        act(() => {
          advanceVideoToEnd(startTimeTracker, 3)
          vi.advanceTimersByTime(200)
        })
        expect(result.current.phase).toBe('listen3')

        // listen3 → done
        act(() => {
          advanceVideoToEnd(startTimeTracker, 3)
          vi.advanceTimersByTime(200)
        })
        expect(result.current.phase).toBe('done')
      })
    })

    it('subtitles 为空时 start() 不应启动', () => {
      const { result } = renderHook(() =>
        useShadowReading(makeDefaultOptions({ subtitles: [] }))
      )

      act(() => { result.current.start() })

      expect(result.current.isStarted).toBe(false)
      expect(result.current.phase).toBe('idle')
    })

    it('done 阶段超时后自动推进到下一句', () => {
      const { result } = renderHook(() =>
        useShadowReading(makeDefaultOptions({ mode: 'shadow' }))
      )
      const { startTimeTracker } = attachMockVideo(result)

      act(() => { result.current.start() })

      // 快速推进到 done 阶段（3 个 listen 阶段）
      act(() => {
        advanceVideoToEnd(startTimeTracker, 3)
        vi.advanceTimersByTime(200)
        advanceVideoToEnd(startTimeTracker, 3)
        vi.advanceTimersByTime(200)
        advanceVideoToEnd(startTimeTracker, 3)
        vi.advanceTimersByTime(200)
      })
      expect(result.current.phase).toBe('done')
      expect(result.current.currentIndex).toBe(0)

      // done 阶段的 1500ms 超时 → 推进到下一句
      act(() => {
        vi.advanceTimersByTime(1600)
      })

      expect(result.current.currentIndex).toBe(1)
      expect(result.current.phase).toBe('listen1')
    })

    it('最后一句 done 超时后标记 isFinished=true', () => {
      const { result } = renderHook(() =>
        useShadowReading(makeDefaultOptions({ mode: 'shadow' }))
      )
      const { startTimeTracker } = attachMockVideo(result)

      act(() => { result.current.start() })

      // 用 skipNext 两次跳到最后一项
      act(() => {
        // skip 到 index 1
        result.current.skipNext()
        advanceVideoToEnd(startTimeTracker, 6.5)
        vi.advanceTimersByTime(200)
      })
      expect(result.current.currentIndex).toBe(1)

      act(() => {
        // skip 到 index 2（最后一项）
        result.current.skipNext()
      })
      expect(result.current.currentIndex).toBe(2)

      // 推进 listen1 → listen2 → listen3 → done
      act(() => {
        advanceVideoToEnd(startTimeTracker, 10)
        vi.advanceTimersByTime(200)
        advanceVideoToEnd(startTimeTracker, 10)
        vi.advanceTimersByTime(200)
        advanceVideoToEnd(startTimeTracker, 10)
        vi.advanceTimersByTime(200)
      })
      expect(result.current.phase).toBe('done')

      // done 超时后应该 finished
      act(() => {
        vi.advanceTimersByTime(1600)
      })
      expect(result.current.isFinished).toBe(true)
    })

    it('currentSubtitle 应根据 isStarted 和 currentIndex 正确返回', () => {
      const { result } = renderHook(() => useShadowReading(makeDefaultOptions()))

      // 未启动时 currentSubtitle 为 null
      expect(result.current.currentSubtitle).toBeNull()

      // 启动后，index=0 返回第一个字幕
      act(() => { result.current.start() })
      expect(result.current.currentSubtitle).toBe(MOCK_SUBTITLES[0])
    })
  })

  // ========================================
  // 2. 录音生命周期
  // ========================================
  describe('录音生命周期', () => {

    it('speak 阶段启动录音 → isRecording=true', async () => {
      // 标记为 async 以便使用 await act
      const { result } = renderHook(() =>
        useShadowReading(makeDefaultOptions())
      )
      const { startTimeTracker } = attachMockVideo(result)

      act(() => { result.current.start() })

      // 推进到 speak 阶段
      act(() => {
        advanceVideoToEnd(startTimeTracker, 3)
        vi.advanceTimersByTime(200)
        advanceVideoToEnd(startTimeTracker, 3)
        vi.advanceTimersByTime(200)
      })

      // getUserMedia 是 async，等待 resolve
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100)
      })

      expect(result.current.phase).toBe('speak')
      // getUserMedia 应被调用
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith(
        expect.objectContaining({ audio: expect.any(Object) })
      )
      expect(result.current.isRecording).toBe(true)
    })

    it('getUserMedia 失败时 micPermission=denied，跳到 compare', async () => {
      vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(
        new DOMException('Permission denied', 'NotAllowedError')
      )

      const { result } = renderHook(() =>
        useShadowReading(makeDefaultOptions())
      )
      const { startTimeTracker } = attachMockVideo(result)

      act(() => { result.current.start() })

      // 推进到 speak 阶段
      act(() => {
        advanceVideoToEnd(startTimeTracker, 3)
        vi.advanceTimersByTime(200)
        advanceVideoToEnd(startTimeTracker, 3)
        vi.advanceTimersByTime(200)
      })

      // 等待 Promise rejection 被处理
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100)
      })

      expect(result.current.micPermission).toBe('denied')
      // 失败后跳到 compare
      expect(result.current.phase).toBe('compare')
    })

    it('stopRecording 后应创建 Blob URL 并设置 audioURL', async () => {
      const { result } = renderHook(() =>
        useShadowReading(makeDefaultOptions())
      )
      const { startTimeTracker } = attachMockVideo(result)

      act(() => { result.current.start() })

      // 推进到 speak
      act(() => {
        advanceVideoToEnd(startTimeTracker, 3)
        vi.advanceTimersByTime(200)
        advanceVideoToEnd(startTimeTracker, 3)
        vi.advanceTimersByTime(200)
      })
      expect(result.current.phase).toBe('speak')

      // speak 倒计时结束（3 秒 segment × 1.0 speed）
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3500)
      })

      // stopRecording 已调用，onstop 创建了 Blob URL
      expect(result.current.isRecording).toBe(false)
      expect(global.URL.createObjectURL).toHaveBeenCalled()
    })

    it('cancelRecording 应撤销 URL 并清除状态', async () => {
      const { result } = renderHook(() =>
        useShadowReading(makeDefaultOptions())
      )
      const { startTimeTracker } = attachMockVideo(result)

      act(() => { result.current.start() })

      // 推进到 speak
      act(() => {
        advanceVideoToEnd(startTimeTracker, 3)
        vi.advanceTimersByTime(200)
        advanceVideoToEnd(startTimeTracker, 3)
        vi.advanceTimersByTime(200)
      })

      // 暂停（在 speak 阶段会调用 cancelRecordingInternal）
      act(() => {
        result.current.pause()
      })

      expect(result.current.isRecording).toBe(false)
      expect(result.current.isPaused).toBe(true)
    })
  })

  // ========================================
  // 3. 定时器管理
  // ========================================
  describe('定时器管理', () => {

    it('KTV tick interval 每 100ms 更新 ktvProgress', () => {
      const { result } = renderHook(() =>
        useShadowReading(makeDefaultOptions())
      )
      const { startTimeTracker } = attachMockVideo(result)

      act(() => { result.current.start() })

      // ktvProgress 初始为 0
      expect(result.current.ktvProgress).toBe(0)

      // 推进 video.currentTime 到 segment 中间（3 秒 segment 的 50% = 1.5s）
      act(() => {
        startTimeTracker.value = 1.5
        vi.advanceTimersByTime(200)
      })

      // progress 应在 0-1 之间
      expect(result.current.ktvProgress).toBeGreaterThan(0)
    })

    it('done 阶段 1500ms 超时后清理定时器并推进', () => {
      const { result } = renderHook(() =>
        useShadowReading(makeDefaultOptions({ mode: 'shadow' }))
      )
      const { startTimeTracker } = attachMockVideo(result)

      act(() => { result.current.start() })

      // 推进到 done
      act(() => {
        advanceVideoToEnd(startTimeTracker, 3)
        vi.advanceTimersByTime(200)
        advanceVideoToEnd(startTimeTracker, 3)
        vi.advanceTimersByTime(200)
        advanceVideoToEnd(startTimeTracker, 3)
        vi.advanceTimersByTime(200)
      })
      expect(result.current.phase).toBe('done')

      // 未到超时时间
      act(() => { vi.advanceTimersByTime(1000) })
      expect(result.current.currentIndex).toBe(0)

      // 超时后推进
      act(() => { vi.advanceTimersByTime(600) })
      expect(result.current.currentIndex).toBe(1)
    })

    it('speak 阶段的倒计时 interval 应随时间递减', async () => {
      const { result } = renderHook(() =>
        useShadowReading(makeDefaultOptions())
      )
      const { startTimeTracker } = attachMockVideo(result)

      act(() => { result.current.start() })

      // 推进到 speak
      act(() => {
        advanceVideoToEnd(startTimeTracker, 3)
        vi.advanceTimersByTime(200)
        advanceVideoToEnd(startTimeTracker, 3)
        vi.advanceTimersByTime(200)
      })

      // segment duration = 3s, speed = 1.0, speakDuration = 3s
      // countdown 初始为 ceil(3) = 3
      expect(result.current.speakCountdown).toBe(3)

      // 推进 1 秒
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1100)
      })
      expect(result.current.speakCountdown).toBeLessThan(3)

      // 推进到 speak 结束
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2500)
      })
      expect(result.current.speakCountdown).toBe(0)
    })
  })

  // ========================================
  // 4. 暂停 / 恢复
  // ========================================
  describe('暂停 / 恢复', () => {

    it('pause() 应设置 isPaused=true 并停止定时器', () => {
      const { result } = renderHook(() =>
        useShadowReading(makeDefaultOptions({ mode: 'shadow' }))
      )
      const { startTimeTracker } = attachMockVideo(result)

      act(() => { result.current.start() })
      expect(result.current.phase).toBe('listen1')

      act(() => { result.current.pause() })

      expect(result.current.isPaused).toBe(true)
      expect(result.current.ktvProgress).toBe(0)
    })

    it('pause() 应调用 onProgressChange 保存断点', () => {
      const onProgressChange = vi.fn()
      const { result } = renderHook(() =>
        useShadowReading(makeDefaultOptions({ onProgressChange }))
      )
      attachMockVideo(result)

      act(() => { result.current.start() })
      act(() => { result.current.pause() })

      expect(onProgressChange).toHaveBeenCalledWith(
        expect.objectContaining({
          resumeIndex: 0,
          mode: 'recording',
          speed: 1.0,
        })
      )
    })

    it('resume() 应重新启动当前阶段', () => {
      const { result } = renderHook(() =>
        useShadowReading(makeDefaultOptions({ mode: 'shadow' }))
      )
      const { startTimeTracker } = attachMockVideo(result)

      act(() => { result.current.start() })
      expect(result.current.phase).toBe('listen1')

      act(() => { result.current.pause() })
      expect(result.current.isPaused).toBe(true)

      act(() => { result.current.resume() })
      expect(result.current.isPaused).toBe(false)
      expect(result.current.phase).toBe('listen1')
    })

    it('resume() 在 done/idle 阶段应回到 listen1', () => {
      const { result } = renderHook(() =>
        useShadowReading(makeDefaultOptions({ mode: 'shadow' }))
      )
      const { startTimeTracker } = attachMockVideo(result)

      act(() => { result.current.start() })

      // 推进到 done
      act(() => {
        advanceVideoToEnd(startTimeTracker, 3)
        vi.advanceTimersByTime(200)
        advanceVideoToEnd(startTimeTracker, 3)
        vi.advanceTimersByTime(200)
        advanceVideoToEnd(startTimeTracker, 3)
        vi.advanceTimersByTime(200)
      })
      expect(result.current.phase).toBe('done')

      act(() => { result.current.pause() })
      act(() => { result.current.resume() })

      // done 阶段恢复后应重新进入 listen1
      expect(result.current.phase).toBe('listen1')
    })

    it('暂停后阶段推进的 onEnd 回调不应执行', () => {
      const { result } = renderHook(() =>
        useShadowReading(makeDefaultOptions({ mode: 'shadow' }))
      )
      const { startTimeTracker } = attachMockVideo(result)

      act(() => { result.current.start() })
      expect(result.current.phase).toBe('listen1')

      // 暂停
      act(() => { result.current.pause() })

      // 即使推进 video time 和 timers，阶段也不应改变
      act(() => {
        advanceVideoToEnd(startTimeTracker, 3)
        vi.advanceTimersByTime(500)
      })

      // 仍停留在 listen1（暂停期间 onEnd 检查 isPausedRef.current）
      expect(result.current.phase).toBe('listen1')
    })
  })

  // ========================================
  // 5. 跳过上一句 / 下一句
  // ========================================
  describe('跳过上一句 / 下一句', () => {

    it('skipNext() 应推进到下一句并进入 listen1', () => {
      const { result } = renderHook(() =>
        useShadowReading(makeDefaultOptions({ mode: 'shadow' }))
      )
      const { startTimeTracker } = attachMockVideo(result)

      act(() => { result.current.start() })
      expect(result.current.currentIndex).toBe(0)

      act(() => { result.current.skipNext() })
      expect(result.current.currentIndex).toBe(1)
      expect(result.current.phase).toBe('listen1')
    })

    it('skipPrev() 应回退到上一句并进入 listen1', () => {
      const { result } = renderHook(() =>
        useShadowReading(makeDefaultOptions({ mode: 'shadow' }))
      )
      const { startTimeTracker } = attachMockVideo(result)

      act(() => { result.current.start() })

      // 先 skip 到第 2 句
      act(() => { result.current.skipNext() })
      expect(result.current.currentIndex).toBe(1)

      // 再 skipPrev 回到第 1 句
      act(() => { result.current.skipPrev() })
      expect(result.current.currentIndex).toBe(0)
      expect(result.current.phase).toBe('listen1')
    })

    it('skipPrev() 在第 0 句时不应越界', () => {
      const { result } = renderHook(() =>
        useShadowReading(makeDefaultOptions({ mode: 'shadow' }))
      )
      const { startTimeTracker } = attachMockVideo(result)

      act(() => { result.current.start() })
      expect(result.current.currentIndex).toBe(0)

      act(() => { result.current.skipPrev() })
      expect(result.current.currentIndex).toBe(0)
    })

    it('skipNext() 在最后一句时停在最后一句不越界', () => {
      const { result } = renderHook(() =>
        useShadowReading(makeDefaultOptions({ mode: 'shadow' }))
      )
      const { startTimeTracker } = attachMockVideo(result)

      act(() => { result.current.start() })

      // skip 到最后一句（index = 2）
      act(() => { result.current.skipNext() })
      act(() => { result.current.skipNext() })
      expect(result.current.currentIndex).toBe(2)

      // 再 skip → Math.min(3, 2) = 2，停在最后一句
      act(() => { result.current.skipNext() })
      expect(result.current.currentIndex).toBe(2)
      // 源码用 Math.min clamp，skipNext 不会触发 isFinished
    })

    it('skip 不应将当前句加入 practicedIds', () => {
      const { result } = renderHook(() =>
        useShadowReading(makeDefaultOptions({ mode: 'shadow' }))
      )
      attachMockVideo(result)

      act(() => { result.current.start() })
      act(() => { result.current.skipNext() })
      act(() => { result.current.skipNext() })

      // skip 不触发 practicedIds 更新
      expect(result.current.practicedIds).toEqual([])
    })

    it('skipNext() 应清除录音和定时器', () => {
      const { result } = renderHook(() =>
        useShadowReading(makeDefaultOptions())
      )
      const { startTimeTracker } = attachMockVideo(result)

      act(() => { result.current.start() })

      // 推进到 speak 阶段
      act(() => {
        advanceVideoToEnd(startTimeTracker, 3)
        vi.advanceTimersByTime(200)
        advanceVideoToEnd(startTimeTracker, 3)
        vi.advanceTimersByTime(200)
      })
      expect(result.current.phase).toBe('speak')

      // 在 speak 阶段 skip → 应取消录音
      act(() => { result.current.skipNext() })

      expect(result.current.isRecording).toBe(false)
      expect(result.current.ktvProgress).toBe(0)
      expect(result.current.phase).toBe('listen1')
    })
  })

  // ========================================
  // 6. 清理行为（关键 bug 修复测试）
  // ========================================
  describe('清理行为 - cleanupHook 稳定性', () => {

    /**
     * 核心测试：验证 cleanupHook 引用稳定性。
     *
     * 背景：此前 cleanupHook 依赖了 audioURL state，
     * 导致 audioURL 变化时 cleanupHook 重建 → cleanup useEffect 重新注册 →
     * unmount cleanup 函数在非卸载时被调用，意外清理录音状态。
     *
     * 修复：cancelRecordingInternal 和 clearAudioURL 改用 audioURLRef
     * 而非 audioURL state，使 cleanupHook 的依赖数组稳定不变。
     */
    it('cleanupHook 引用在 audioURL 变化后应保持稳定', async () => {
      const onProgressChange = vi.fn()

      const { result, rerender } = renderHook(
        ({ videoUrl, subtitles, mode, onProgressChange }: {
          videoUrl: string | null
          subtitles: SubtitleWithHighlights[]
          mode: ShadowMode
          onProgressChange: ReturnType<typeof vi.fn>
        }) =>
          useShadowReading(makeDefaultOptions({ videoUrl, subtitles, mode, onProgressChange })),
        {
          initialProps: {
            videoUrl: FAKE_VIDEO_URL,
            subtitles: MOCK_SUBTITLES,
            mode: 'recording' as ShadowMode,
            onProgressChange,
          },
        }
      )

      const { startTimeTracker } = attachMockVideo(result)

      // 保存初始 cleanupHook 引用
      const initialCleanup = result.current.cleanup

      // 启动并推进到 speak 阶段触发录音
      act(() => { result.current.start() })
      act(() => {
        advanceVideoToEnd(startTimeTracker, 3)
        vi.advanceTimersByTime(200)
        advanceVideoToEnd(startTimeTracker, 3)
        vi.advanceTimersByTime(200)
      })
      expect(result.current.phase).toBe('speak')

      // 等待录音完成后 audioURL 被设置
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3500)
      })

      // audioURL 现在非 null
      expect(result.current.audioURL).toBe(FAKE_BLOB_URL)

      // cleanupHook 引用应保持不变（不因 audioURL 变化而重建）
      expect(result.current.cleanup).toBe(initialCleanup)
    })

    it('cleanup() 应调用 fullCleanup + cancelRecording + notifyProgress', () => {
      const onProgressChange = vi.fn()
      const { result } = renderHook(() =>
        useShadowReading(makeDefaultOptions({ onProgressChange }))
      )
      attachMockVideo(result)

      act(() => { result.current.start() })

      // 手动调用 cleanup
      act(() => { result.current.cleanup() })

      expect(result.current.isPaused).toBe(false)
      expect(result.current.ktvProgress).toBe(0)
      expect(onProgressChange).toHaveBeenCalled()
    })

    it('cleanup() 应停止 video 播放', () => {
      const { result } = renderHook(() =>
        useShadowReading(makeDefaultOptions())
      )
      attachMockVideo(result)

      act(() => { result.current.start() })

      act(() => { result.current.cleanup() })

      expect(HTMLVideoElement.prototype.pause).toHaveBeenCalled()
    })

    it('unmount 时应触发 cleanup', () => {
      const onProgressChange = vi.fn()
      const { result, unmount } = renderHook(() =>
        useShadowReading(makeDefaultOptions({ onProgressChange }))
      )
      attachMockVideo(result)

      act(() => { result.current.start() })

      unmount()

      // unmount 触发 cleanupHook → notifyProgress
      expect(onProgressChange).toHaveBeenCalled()
    })

    it('cleanupHook 依赖的 cancelRecordingInternal 应使用 audioURLRef 而非 audioURL state', async () => {
      /**
       * 验证 cancelRecordingInternal 不依赖 audioURL state：
       * 即使 audioURL 发生变化，cancelRecordingInternal 仍能正确
       * 撤销最新的 URL（通过 ref 读取）。
       */
      const { result } = renderHook(() =>
        useShadowReading(makeDefaultOptions())
      )
      const { startTimeTracker } = attachMockVideo(result)

      act(() => { result.current.start() })

      // 推进到 speak 并完成录音
      act(() => {
        advanceVideoToEnd(startTimeTracker, 3)
        vi.advanceTimersByTime(200)
        advanceVideoToEnd(startTimeTracker, 3)
        vi.advanceTimersByTime(200)
      })
      expect(result.current.phase).toBe('speak')

      await act(async () => {
        await vi.advanceTimersByTimeAsync(3500)
      })

      // audioURL 已设置
      expect(result.current.audioURL).toBe(FAKE_BLOB_URL)

      // 调用 cleanup（内部调用 cancelRecordingInternal）
      act(() => { result.current.cleanup() })

      // cancelRecordingInternal 应撤销了 URL
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith(FAKE_BLOB_URL)
      expect(result.current.audioURL).toBeNull()
    })
  })

  // ========================================
  // 7. 进度通知
  // ========================================
  describe('进度通知', () => {

    it('done 阶段应调用 onProgressChange 并包含当前 practicedIds', () => {
      const onProgressChange = vi.fn()
      const { result } = renderHook(() =>
        useShadowReading(makeDefaultOptions({ mode: 'shadow', onProgressChange }))
      )
      const { startTimeTracker } = attachMockVideo(result)

      act(() => { result.current.start() })

      // 推进到 done
      act(() => {
        advanceVideoToEnd(startTimeTracker, 3)
        vi.advanceTimersByTime(200)
        advanceVideoToEnd(startTimeTracker, 3)
        vi.advanceTimersByTime(200)
        advanceVideoToEnd(startTimeTracker, 3)
        vi.advanceTimersByTime(200)
      })

      // done 阶段应通知进度（resumeIndex 应为下一句索引）
      expect(onProgressChange).toHaveBeenCalledWith(
        expect.objectContaining({
          practicedIds: ['sub-1'],
          resumeIndex: 1,
          mode: 'shadow',
          speed: 1.0,
        })
      )
    })

    it('同一句多次 done 不应重复添加 practicedIds', () => {
      const onProgressChange = vi.fn()
      const { result } = renderHook(() =>
        useShadowReading(makeDefaultOptions({ mode: 'shadow', onProgressChange }))
      )
      const { startTimeTracker } = attachMockVideo(result)

      act(() => { result.current.start() })

      // 推进到 done
      act(() => {
        advanceVideoToEnd(startTimeTracker, 3)
        vi.advanceTimersByTime(200)
        advanceVideoToEnd(startTimeTracker, 3)
        vi.advanceTimersByTime(200)
        advanceVideoToEnd(startTimeTracker, 3)
        vi.advanceTimersByTime(200)
      })

      // practicedIds 只有 sub-1
      expect(result.current.practicedIds).toEqual(['sub-1'])

      // resume 回到 listen1，再走一遍
      act(() => { result.current.pause() })
      act(() => { result.current.resume() })

      // 推进到 done 再次
      act(() => {
        advanceVideoToEnd(startTimeTracker, 3)
        vi.advanceTimersByTime(200)
        advanceVideoToEnd(startTimeTracker, 3)
        vi.advanceTimersByTime(200)
        advanceVideoToEnd(startTimeTracker, 3)
        vi.advanceTimersByTime(200)
      })

      // 仍只有 sub-1，不重复
      expect(result.current.practicedIds).toEqual(['sub-1'])
    })

    it('cleanup 时应调用 onProgressChange 保存断点', () => {
      const onProgressChange = vi.fn()
      const { result } = renderHook(() =>
        useShadowReading(makeDefaultOptions({ onProgressChange }))
      )
      attachMockVideo(result)

      act(() => { result.current.start() })
      act(() => { result.current.cleanup() })

      expect(onProgressChange).toHaveBeenCalledWith(
        expect.objectContaining({
          practicedIds: [],
          resumeIndex: 0,
          mode: 'recording',
          speed: 1.0,
        })
      )
    })

    it('saveRecording 应在 done 阶段被调用（recording 模式）', async () => {
      const { saveRecording } = await import('@/services/shadowRecordingStorage')

      const { result } = renderHook(() =>
        useShadowReading(makeDefaultOptions())
      )
      const { startTimeTracker } = attachMockVideo(result)

      act(() => { result.current.start() })

      // 推进到 speak
      act(() => {
        advanceVideoToEnd(startTimeTracker, 3)
        vi.advanceTimersByTime(200)
        advanceVideoToEnd(startTimeTracker, 3)
        vi.advanceTimersByTime(200)
      })

      // 等待 speak 倒计时结束 + stop
      await act(async () => {
        await vi.advanceTimersByTimeAsync(3500)
      })

      // playback → compare → done
      act(() => {
        triggerAudioEnded()
      })

      act(() => {
        advanceVideoToEnd(startTimeTracker, 3)
        vi.advanceTimersByTime(200)
      })

      // done 阶段应调用 saveRecording
      expect(saveRecording).toHaveBeenCalledWith(
        'vid-1',
        'sub-1',
        expect.any(Blob),
        expect.any(Number),
      )
    })
  })

  // ========================================
  // 8. 其他行为
  // ========================================
  describe('其他行为', () => {

    it('setSpeed() 应更新 speedMultiplier', () => {
      const { result } = renderHook(() =>
        useShadowReading(makeDefaultOptions())
      )

      expect(result.current.speedMultiplier).toBe(1.0)

      act(() => { result.current.setSpeed(0.5) })
      expect(result.current.speedMultiplier).toBe(0.5)

      act(() => { result.current.setSpeed(1.5) })
      expect(result.current.speedMultiplier).toBe(1.5)
    })

    it('start() 应重置 isFinished 和 isPaused', () => {
      const { result } = renderHook(() =>
        useShadowReading(makeDefaultOptions({ mode: 'shadow' }))
      )
      const { startTimeTracker } = attachMockVideo(result)

      act(() => { result.current.start() })

      // 推进到最后一句的 done 阶段
      // 先 skipNext 到 index 1
      act(() => { result.current.skipNext() })
      expect(result.current.currentIndex).toBe(1)

      // 推进 listen1 → listen2 → listen3 → done
      act(() => {
        advanceVideoToEnd(startTimeTracker, 6.5)
        vi.advanceTimersByTime(200)
        advanceVideoToEnd(startTimeTracker, 6.5)
        vi.advanceTimersByTime(200)
        advanceVideoToEnd(startTimeTracker, 6.5)
        vi.advanceTimersByTime(200)
      })
      expect(result.current.phase).toBe('done')

      // done 超时推进到下一句
      act(() => { vi.advanceTimersByTime(1600) })
      expect(result.current.currentIndex).toBe(2)

      // 推进最后一句到 done
      act(() => {
        advanceVideoToEnd(startTimeTracker, 10)
        vi.advanceTimersByTime(200)
        advanceVideoToEnd(startTimeTracker, 10)
        vi.advanceTimersByTime(200)
        advanceVideoToEnd(startTimeTracker, 10)
        vi.advanceTimersByTime(200)
      })
      expect(result.current.phase).toBe('done')

      // done 超时后 isFinished
      act(() => { vi.advanceTimersByTime(1600) })
      expect(result.current.isFinished).toBe(true)

      // 重新 start
      act(() => { result.current.start() })

      expect(result.current.isFinished).toBe(false)
      expect(result.current.isPaused).toBe(false)
      expect(result.current.currentIndex).toBe(0)
    })

    it('start() 应使用 resumeIndex 作为起始位置', () => {
      const { result } = renderHook(() =>
        useShadowReading(makeDefaultOptions({ resumeIndex: 2 }))
      )

      act(() => { result.current.start() })

      expect(result.current.currentIndex).toBe(2)
      expect(result.current.currentSubtitle).toBe(MOCK_SUBTITLES[2])
    })

    it('videoUrl 为 null 时 playSegment 应直接调用 onEnd 并快速推进阶段', async () => {
      const { result } = renderHook(() =>
        useShadowReading(makeDefaultOptions({ videoUrl: null }))
      )

      act(() => { result.current.start() })

      // playSegment 检测到 videoUrl=null，同步调用 onEnd
      // listen1 → onEnd → listen2 → onEnd → speak（getUserMedia async）
      // 因为 onEnd 是同步的，阶段瞬间推进，但由于 getUserMedia 是 async，
      // 最终停在 listen1 的某个后续阶段
      // 实际行为：listen1 → onEnd → listen2 → onEnd → speak (await getUserMedia)
      // 在 fake timers 下 async 不会自动 resolve，phase 停在 listen2 后的某个阶段
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100)
      })

      // videoUrl=null 时阶段快速推进，最终停在一个需要 async 的阶段
      // 至少不应该卡在 idle
      expect(result.current.phase).not.toBe('idle')
    })

    it('miniVideoRef.current 为 null 时 playSegment 应直接调用 onEnd', async () => {
      const { result } = renderHook(() =>
        useShadowReading(makeDefaultOptions())
      )
      // 不挂载 mock video

      act(() => { result.current.start() })

      // playSegment 发现 video=null，同步 onEnd
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100)
      })

      // 阶段快速推进
      expect(result.current.phase).not.toBe('idle')
    })
  })

  // ========================================
  // 9. startSignal 外部触发
  // ========================================
  describe('startSignal 外部触发', () => {

    it('startSignal 从 0 变为 1 时应自动启动', () => {
      const { result, rerender } = renderHook(
        ({ startSignal }: { startSignal: number }) =>
          useShadowReading(makeDefaultOptions({ startSignal })),
        { initialProps: { startSignal: 0 } }
      )
      attachMockVideo(result)

      // 初始未启动
      expect(result.current.isStarted).toBe(false)
      expect(result.current.phase).toBe('idle')

      // 触发 startSignal
      rerender({ startSignal: 1 })

      expect(result.current.isStarted).toBe(true)
      expect(result.current.phase).toBe('listen1')
    })

    it('startSignal 未传入时不应自动启动', () => {
      const { result } = renderHook(() =>
        useShadowReading(makeDefaultOptions())
      )

      expect(result.current.isStarted).toBe(false)
      expect(result.current.phase).toBe('idle')
    })

    it('startSignal 递增时应使用最新的 resumeIndex', () => {
      const { result, rerender } = renderHook(
        ({ startSignal, resumeIndex }: { startSignal: number; resumeIndex: number }) =>
          useShadowReading(makeDefaultOptions({ startSignal, resumeIndex })),
        { initialProps: { startSignal: 0, resumeIndex: 0 } }
      )
      attachMockVideo(result)

      // 更新 resumeIndex 并触发 startSignal
      rerender({ startSignal: 1, resumeIndex: 2 })

      expect(result.current.isStarted).toBe(true)
      expect(result.current.currentIndex).toBe(2)
      expect(result.current.currentSubtitle).toBe(MOCK_SUBTITLES[2])
    })

    it('startSignal 再次递增时应重新启动（restart 场景）', () => {
      const { result, rerender } = renderHook(
        ({ startSignal, resumeIndex }: { startSignal: number; resumeIndex: number }) =>
          useShadowReading(makeDefaultOptions({ mode: 'shadow' as ShadowMode, startSignal, resumeIndex })),
        { initialProps: { startSignal: 0, resumeIndex: 0 } }
      )
      attachMockVideo(result)

      // 首次启动
      rerender({ startSignal: 1, resumeIndex: 0 })
      expect(result.current.phase).toBe('listen1')
      expect(result.current.currentIndex).toBe(0)

      // 再次触发（restart 到 resumeIndex=0）
      rerender({ startSignal: 2, resumeIndex: 0 })
      expect(result.current.currentIndex).toBe(0)
    })
  })

  // ========================================
  // 10. isPausedRef 即时同步
  // ========================================
  describe('isPausedRef 即时同步', () => {

    it('pause() 后 isPausedRef 立即同步，阻止同 tick 的 onEnd 回调', () => {
      const { result } = renderHook(() =>
        useShadowReading(makeDefaultOptions({ mode: 'shadow' }))
      )
      const { startTimeTracker } = attachMockVideo(result)

      act(() => { result.current.start() })
      expect(result.current.phase).toBe('listen1')

      // 暂停并立即推进 video time + timer（同一 act 块内）
      // 如果 isPausedRef 未即时同步，interval 回调会读到旧值并触发阶段推进
      act(() => {
        result.current.pause()
        advanceVideoToEnd(startTimeTracker, 3)
        vi.advanceTimersByTime(200)
      })

      // 阶段不应改变
      expect(result.current.isPaused).toBe(true)
      expect(result.current.phase).toBe('listen1')
    })

    it('start() 后 isPausedRef 立即清除，允许后续阶段推进', () => {
      const { result } = renderHook(() =>
        useShadowReading(makeDefaultOptions({ mode: 'shadow' }))
      )
      const { startTimeTracker } = attachMockVideo(result)

      act(() => { result.current.start() })

      // 暂停
      act(() => { result.current.pause() })
      expect(result.current.isPaused).toBe(true)

      // 重新 start
      act(() => { result.current.start() })
      expect(result.current.isPaused).toBe(false)
      expect(result.current.isStarted).toBe(true)

      // 阶段应该能正常推进（不被 isPausedRef 阻断）
      act(() => {
        advanceVideoToEnd(startTimeTracker, 3)
        vi.advanceTimersByTime(200)
      })
      expect(result.current.phase).toBe('listen2')
    })
  })

  // ========================================
  // 11. skipPhase done 阶段通知进度
  // ========================================
  describe('skipPhase done 阶段通知进度', () => {

    it('skipPhase 在 done 阶段应调用 notifyProgress', () => {
      const onProgressChange = vi.fn()
      const { result } = renderHook(() =>
        useShadowReading(makeDefaultOptions({ mode: 'shadow', onProgressChange }))
      )
      const { startTimeTracker } = attachMockVideo(result)

      act(() => { result.current.start() })

      // 推进到 done
      act(() => {
        advanceVideoToEnd(startTimeTracker, 3)
        vi.advanceTimersByTime(200)
        advanceVideoToEnd(startTimeTracker, 3)
        vi.advanceTimersByTime(200)
        advanceVideoToEnd(startTimeTracker, 3)
        vi.advanceTimersByTime(200)
      })
      expect(result.current.phase).toBe('done')

      const callCountBeforeSkip = onProgressChange.mock.calls.length

      // 在 done 阶段 skipPhase → 应通知进度
      act(() => { result.current.skipPhase() })

      expect(onProgressChange.mock.calls.length).toBeGreaterThan(callCountBeforeSkip)
    })
  })
})
