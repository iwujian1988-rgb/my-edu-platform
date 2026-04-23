'use client'

/**
 * iOS Audio Seek 诊断客户端组件
 */

import { useState, useRef, useCallback } from 'react'

interface LogEntry {
  timestamp: string
  event: string
  detail: string
  currentTime?: number
  readyState?: number
  src?: string
}

export function DebugIOSSeekClient() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [audioLoaded, setAudioLoaded] = useState(false)
  const logIdRef = useRef(0)

  const TEST_AUDIO_URL = 'https://dingjian-oss.oss-cn-hangzhou.aliyuncs.com/podcast_audio/20250416_037_The_power_of_solitude.mp3'
  const SUBTITLE_INTERVAL = 10
  const subtitles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    start_time: i * SUBTITLE_INTERVAL,
    text: `字幕 #${i} (${i * SUBTITLE_INTERVAL}s)`,
  }))

  const addLog = useCallback((event: string, detail: string, extra?: Partial<LogEntry>) => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString().split('T')[1],
      event,
      detail,
      ...extra,
    }
    setLogs(prev => [...prev.slice(-200), entry])
  }, [])

  const startDiag = useCallback(() => {
    setIsRunning(true)
    setLogs([])

    const el = audioRef.current!
    const id = ++logIdRef.current

    // 注册全部事件
    const events = [
      'loadstart', 'suspend', 'abort', 'error',
      'emptied', 'stalled', 'loadedmetadata', 'loadeddata',
      'canplay', 'canplaythrough', 'playing', 'waiting',
      'seeking', 'seeked', 'ended', 'durationchange',
      'timeupdate', 'play', 'pause', 'ratechange',
    ]

    for (const evt of events) {
      const handler = () => {
        if (logIdRef.current !== id) return
        const ct = Math.round(el.currentTime * 100) / 100
        const rs = el.readyState
        const srcShort = el.src.length > 60 ? el.src.substring(0, 57) + '...' : el.src

        if (evt === 'timeupdate') {
          addLog(evt, `currentTime=${ct} readyState=${rs}`, { currentTime: ct, readyState: rs, src: srcShort })
        } else {
          addLog(evt, `currentTime=${ct} readyState=${rs} src=${srcShort}`, { currentTime: ct, readyState: rs, src: srcShort })
        }
      }
      el.addEventListener(evt, handler)
    }

    el.src = TEST_AUDIO_URL
    el.load()
    addLog('INIT', '诊断开始，音频 URL: ' + TEST_AUDIO_URL)
  }, [addLog])

  const handleSubtitleClick = useCallback((startTime: number) => {
    const el = audioRef.current
    if (!el) return

    addLog('=== SUBTITLE CLICK ===', `目标时间: ${startTime}s`, { currentTime: el.currentTime })

    // 测试：直接设 currentTime（当前生产代码的方式）
    addLog('BEFORE-SEEK', `el.currentTime = ${el.currentTime}, 即将设为 ${startTime}`)
    el.currentTime = startTime
    addLog('AFTER-SET', `el.currentTime = ${el.currentTime}（期望 ${startTime}，差 ${Math.round((el.currentTime - startTime) * 1000)}ms）`, { currentTime: el.currentTime })
    if (el.paused) el.play().catch(() => {})
  }, [addLog])

  const handlePlay = useCallback(() => {
    const el = audioRef.current
    if (!el) return
    el.play().then(() => {
      setAudioLoaded(true)
    }).catch(() => {})
  }, [])

  const handlePause = useCallback(() => {
    audioRef.current?.pause()
  }, [])

  const exportLogs = useCallback(() => {
    const text = logs.map(l =>
      `[${l.timestamp}] ${l.event}: ${l.detail}`
    ).join('\n')
    navigator.clipboard.writeText(text).then(() => {
      alert('日志已复制到剪贴板！请发送给我。')
    }).catch(() => {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      alert('日志已复制到剪贴板！')
    })
  }, [logs])

  return (
    <div className="p-4 max-w-2xl mx-auto text-sm font-mono">
      <h1 className="text-lg font-bold mb-4">iOS Audio Seek 诊断</h1>

      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={startDiag} className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-bold">
          1. 运行诊断
        </button>
        <button onClick={handlePlay} disabled={!isRunning} className="px-3 py-1.5 bg-green-600 text-white rounded text-sm font-bold disabled:opacity-50">
          2. 播放音频
        </button>
        <button onClick={handlePause} className="px-3 py-1.5 bg-yellow-600 text-white rounded text-sm font-bold">
          暂停
        </button>
        <button onClick={exportLogs} className="px-3 py-1.5 bg-purple-600 text-white rounded text-sm font-bold">
          复制日志
        </button>
      </div>

      <div className="mb-4 p-3 bg-gray-100 rounded text-xs">
        <div>UA: {typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 100) : 'N/A'}</div>
        <div>Platform: {typeof navigator !== 'undefined' ? navigator.platform : 'N/A'}</div>
        <div>Touch: {typeof navigator !== 'undefined' ? navigator.maxTouchPoints : 'N/A'}</div>
      </div>

      <div className="mb-4">
        <h2 className="font-bold mb-2">3. 等音频播放几秒后，点击下方字幕测试 seek：</h2>
        <div className="space-y-1">
          {subtitles.map(sub => (
            <button
              key={sub.id}
              onClick={() => handleSubtitleClick(sub.start_time)}
              disabled={!audioLoaded}
              className="block w-full text-left p-2 border rounded hover:bg-yellow-100 disabled:opacity-50 text-xs"
            >
              [{sub.start_time}s] {sub.text}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <h2 className="font-bold mb-2">日志（{logs.length} 条）：</h2>
        <div className="h-80 overflow-y-auto border p-2 bg-black text-green-400 text-[10px] rounded">
          {logs.length === 0 && <div className="text-gray-500">等待操作...</div>}
          {logs.map((l, i) => (
            <div key={i} className={
              l.event === '=== SUBTITLE CLICK ===' ? 'text-yellow-400 font-bold' :
              l.event.startsWith('BEFORE') || l.event.startsWith('AFTER') ? 'text-cyan-400 font-bold' :
              l.event === 'seeking' || l.event === 'seeked' ? 'text-red-400 font-bold' :
              l.event === 'timeupdate' ? 'text-green-600' :
              'text-green-400'
            }>
              [{l.timestamp}] {l.event}: {l.detail}
            </div>
          ))}
        </div>
      </div>

      <audio ref={audioRef} preload="auto" />

      <div className="p-3 bg-yellow-50 rounded text-xs">
        <h3 className="font-bold mb-1">操作步骤：</h3>
        <ol className="list-decimal pl-4 space-y-1">
          <li>点击「运行诊断」</li>
          <li>点击「播放音频」，等 3-5 秒</li>
          <li>点击下方字幕（如 [60s] 或 [90s]）</li>
          <li>听音频实际播放位置是否对应该字幕</li>
          <li>点击「复制日志」发给我分析</li>
        </ol>
      </div>
    </div>
  )
}
