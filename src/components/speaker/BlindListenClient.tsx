/**
 * Step 1 盲听 - 客户端组件
 *
 * 核心功能：
 * 1. 沉浸式音频播放
 * 2. 语速调节（0.5x - 1.5x）
 * 3. 断点续播
 * 4. 鼓励语句滚动显示
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Play, Pause, SkipForward } from 'lucide-react'
import type { SpeakerArticle } from '@/types/speaker'
import { SpeakerSubPageLayout } from '@/components/speaker/SpeakerSubPageLayout'

interface BlindListenClientProps {
  article: SpeakerArticle
  lastPosition: number | null
  userId?: string
}

const ENCOURAGEMENT_MESSAGES = [
  '首次听不出没关系，认真听能听多少就算多少',
  '放松心情，专注聆听语调和节奏',
  '不需要听懂每一个词，抓住大意就好',
  '可以多听几遍，每次都会有新的发现',
  '相信自己，坚持就是胜利！',
  '雯姐说：能听多少就多少，反复听',
  '雯姐说：听到实在有的词听不出来就进入下一步'
]

export function BlindListenClient({ article, lastPosition, userId }: BlindListenClientProps) {
  const router = useRouter()
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1.0)
  const [showResumePrompt, setShowResumePrompt] = useState(false)
  const [encouragementIndex, setEncouragementIndex] = useState(0)

  // 格式化时间显示
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // 初始化音频
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const audioUrl = article.audio_url
    audio.src = audioUrl
    audio.playbackRate = playbackRate

    // 检查是否有断点
    if (lastPosition && lastPosition > 0) {
      setShowResumePrompt(true)
    }

    // 音频加载完成后
    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration)
    })

    // 监听播放进度
    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime)
    })

    // 监听播放结束
    audio.addEventListener('ended', () => {
      setIsPlaying(false)
      // 保存进度（完成）
      saveProgress(audio.duration)
    })

    return () => {
      audio.pause()
      audio.removeEventListener('loadedmetadata', () => {})
      audio.removeEventListener('timeupdate', () => {})
      audio.removeEventListener('ended', () => {})
    }
  }, [article.audio_url, lastPosition])

  // 鼓励语句轮播 - 字幕式淡入淡出
  useEffect(() => {
    if (!isPlaying) return

    const interval = setInterval(() => {
      setEncouragementIndex(prev => (prev + 1) % ENCOURAGEMENT_MESSAGES.length)
    }, 6000) // 每6秒切换一次（留出淡入淡出时间）

    return () => clearInterval(interval)
  }, [isPlaying])

  // 添加淡入淡出动画样式
  useEffect(() => {
    if (typeof document === 'undefined') return

    const style = document.createElement('style')
    style.textContent = `
      @keyframes subtitleFadeIn {
        0% { opacity: 0; transform: translateY(10px); }
        15% { opacity: 1; transform: translateY(0); }
        85% { opacity: 1; transform: translateY(0); }
        100% { opacity: 0; transform: translateY(-10px); }
      }
      .animate-subtitle {
        animation: subtitleFadeIn 6s ease-in-out infinite;
      }
    `
    document.head.appendChild(style)

    return () => {
      document.head.removeChild(style)
    }
  }, [])

  // 播放/暂停切换
  const togglePlayPause = async () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
      // 保存当前播放位置
      saveProgress(audio.currentTime)
    } else {
      await audio.play()
      setIsPlaying(true)
    }
  }

  // 语速调节
  const changePlaybackRate = (rate: number) => {
    const audio = audioRef.current
    if (!audio) return

    audio.playbackRate = rate
    setPlaybackRate(rate)
  }

  // 跳转到断点继续播放
  const resumeFromBreakpoint = async () => {
    const audio = audioRef.current
    if (!audio || !lastPosition) return

    audio.currentTime = lastPosition
    setShowResumePrompt(false)
    await audio.play()
    setIsPlaying(true)
  }

  // 从头开始
  const startFromBeginning = async () => {
    const audio = audioRef.current
    if (!audio) return

    audio.currentTime = 0
    setShowResumePrompt(false)
    await audio.play()
    setIsPlaying(true)
  }

  // 保存播放进度
  const saveProgress = async (position: number) => {
    try {
      await fetch('/api/speaker/progress', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId: article.id,
          step1_last_position: position,
          step1_completed: position >= duration - 5 // 播放到最后5秒内视为完成
        })
      })
      console.log('[Step 1] 已保存播放位置:', formatTime(position))
    } catch (error) {
      console.error('[Step 1] 保存进度失败:', error)
    }
  }

  // 跳转到 Step 2
  const goToNextStep = () => {
    const audio = audioRef.current
    if (audio) {
      audio.pause()
      saveProgress(audio.currentTime)
    }
    router.push(`/speaker/steps/step2?id=${article.id}`)
  }

  return (
    <SpeakerSubPageLayout userId={userId}>
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* 背景网格装饰 */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="w-full h-full" style={{
          backgroundImage: `
            linear-gradient(to right, #333 1px, transparent 1px),
            linear-gradient(to bottom, #333 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }} />
      </div>

      {/* 鼓励语句 - 电影字幕式淡入淡出 */}
      {isPlaying && (
        <div className="absolute top-6 left-0 right-0 z-10 flex items-center justify-center px-4">
          <div className="animate-subtitle text-center max-w-2xl">
            <p className="text-[#B4F416] text-base md:text-lg font-bold tracking-wide" style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }}>
              {ENCOURAGEMENT_MESSAGES[encouragementIndex]}
            </p>
          </div>
        </div>
      )}

      {/* 主内容区 */}
      <div className="text-center max-w-2xl w-full z-10">
        {/* 步骤标识 */}
        <div className="mb-6">
          <div className="inline-block px-4 py-2 bg-[#1a1a1a] border-2 border-[#B4F416]">
            <span className="text-[#B4F416] font-mono text-sm font-black tracking-widest">
              STEP 01 - BLIND LISTENING
            </span>
          </div>
        </div>

        {/* 文章标题 */}
        <h1 className="text-3xl md:text-4xl font-black text-white mb-12 leading-tight">
          {article.title}
        </h1>

        {/* 进度条 - 粗线条工业风 */}
        <div className="mb-10">
          <div className="relative w-full h-6 bg-[#111] border-2 border-[#333] overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-[#B4F416] transition-all duration-150"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-3 font-mono text-sm">
            <span className="text-gray-500">{formatTime(currentTime)}</span>
            <span className="text-gray-500">{formatTime(duration)}</span>
          </div>
        </div>

        {/* 语速调节 - 紧凑矩形按钮 */}
        <div className="flex items-center justify-center gap-3 mb-12">
          <span className="text-gray-500 font-mono text-sm mr-2">SPEED</span>
          {[0.5, 0.8, 1.0, 1.2, 1.5].map((rate) => (
            <button
              key={rate}
              onClick={() => changePlaybackRate(rate)}
              className={`
                px-4 py-2 text-sm font-mono font-black tracking-tight border-2 transition-all duration-150
                ${playbackRate === rate
                  ? 'bg-[#B4F416] text-black border-[#B4F416] shadow-[0_0_15px_rgba(180,244,22,0.4)]'
                  : 'bg-[#1a1a1a] text-gray-500 border-[#333] hover:border-[#B4F416] hover:text-white'
                }
              `}
            >
              {rate}x
            </button>
          ))}
        </div>

        {/* 大播放/暂停按钮 - 线框风格 */}
        <div className="flex items-center justify-center gap-8 mb-16">
          <button
            onClick={togglePlayPause}
            className="
              w-32 h-32 rounded-none bg-black border-4 border-[#B4F416]
              text-[#B4F416] flex items-center justify-center
              hover:bg-[#B4F416] hover:text-black hover:shadow-[0_0_30px_#B4F416]
              hover:drop-shadow-[0_0_10px_rgba(180,244,22,0.8)]
              transition-all duration-300
            "
          >
            {isPlaying ? (
              <Pause className="w-16 h-16" strokeWidth={2.5} style={{ fill: '#B4F416' }} />
            ) : (
              <Play className="w-16 h-16 ml-2" strokeWidth={2.5} style={{ fill: '#B4F416' }} />
            )}
          </button>
        </div>

        {/* 下一步按钮 - 深灰底 + 粗边框 */}
        <button
          onClick={goToNextStep}
          className="
            group inline-flex items-center gap-3 px-10 py-4
            bg-[#1a1a1a] border border-white/20 border-3
            text-white font-mono font-black text-sm tracking-widest uppercase
            hover:border-[#B4F416] hover:shadow-[6px_6px_0px_0px_#B4F416]
            transition-all duration-150
          "
        >
          <span>进入下一步</span>
          <SkipForward className="w-5 h-5 text-white transition-colors" strokeWidth={2.5} />
        </button>
      </div>

      {/* 断点续播提示 - 工业风弹窗 */}
      {showResumePrompt && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-[#0a0a0a] border-3 border-[#B4F416] p-8 max-w-md w-full shadow-[0_0_50px_rgba(180,244,22,0.2)]">
            <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-wider">
              检测到播放记录
            </h3>
            <div className="w-full h-px bg-[#B4F416]/30 my-4"></div>
            <p className="text-gray-400 mb-8 font-mono text-sm">
              上次播放位置：<span className="text-[#B4F416] font-bold">{formatTime(lastPosition || 0)}</span>
            </p>
            <div className="flex gap-4">
              <button
                onClick={resumeFromBreakpoint}
                className="flex-1 px-6 py-4 bg-[#B4F416] text-black font-black font-mono text-sm uppercase tracking-wider border-2 border-[#B4F416] hover:shadow-[0_0_20px_#B4F416] transition-all"
              >
                继续播放
              </button>
              <button
                onClick={startFromBeginning}
                className="flex-1 px-6 py-4 bg-[#1a1a1a] text-gray-400 font-black font-mono text-sm uppercase tracking-wider border-2 border-[#333] hover:border-white hover:text-white transition-all"
              >
                从头开始
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 隐藏的音频元素 */}
      <audio ref={audioRef} />
      </div>
    </SpeakerSubPageLayout>
  )
}
