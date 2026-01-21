'use client'

import { useEffect, useRef } from 'react'

/**
 * 全局音效系统
 * 使用 Web Audio API，无网络请求，性能优异
 */
export function SoundEffects() {
  const audioContextRef = useRef<AudioContext | null>(null)
  const isEnabledRef = useRef(true)
  const lastPlayTimeRef = useRef(0)
  const soundEnabledRef = useRef(true)
  const lastPlayedElementRef = useRef<HTMLElement | null>(null)  // 记录上次播放的元素

  useEffect(() => {
    // 从 localStorage 读取用户设置
    const savedSetting = localStorage.getItem('soundEffectsEnabled')
    if (savedSetting !== null) {
      soundEnabledRef.current = savedSetting === 'true'
    }

    // 初始化 AudioContext（需要用户交互后才能启动）
    const initAudioContext = () => {
      if (!audioContextRef.current) {
        try {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
        } catch (error) {
          console.warn('[SoundEffects] Web Audio API not supported:', error)
          isEnabledRef.current = false
        }
      }

      // 恢复 AudioContext（如果被暂停）
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(err => {
          console.warn('[SoundEffects] Failed to resume AudioContext:', err)
        })
      }
    }

    // 监听第一次用户交互来初始化音频
    const handleUserInteraction = () => {
      initAudioContext()
      // 移除监听器，只需初始化一次
      document.removeEventListener('click', handleUserInteraction)
      document.removeEventListener('keydown', handleUserInteraction)
      document.removeEventListener('touchstart', handleUserInteraction)
    }

    document.addEventListener('click', handleUserInteraction, { once: true })
    document.addEventListener('keydown', handleUserInteraction, { once: true })
    document.addEventListener('touchstart', handleUserInteraction, { once: true })

    // 播放 hover 音效
    const playHoverSound = (event: Event) => {
      // 检查音效是否启用
      if (!soundEnabledRef.current || !isEnabledRef.current) {
        return
      }

      const target = event.target as HTMLElement
      if (!target) return

      // 确保 target 是 DOM 元素
      if (!(target instanceof HTMLElement)) {
        return
      }

      // 只对可交互元素播放音效
      const isInteractive =
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.closest('button') ||
        target.closest('a') ||
        target.closest('[role="button"]') ||
        target.classList.contains('cursor-pointer')

      if (!isInteractive) return

      // 跳过已禁用的元素
      if (target instanceof HTMLButtonElement && target.disabled) {
        return
      }

      // 智能节流：
      // 1. 全局时间间隔：200ms
      // 2. 同一元素：500ms 内不重复播放
      const now = Date.now()
      const timeSinceLastPlay = now - lastPlayTimeRef.current

      // 检查是否是同一个元素
      const isSameElement = lastPlayedElementRef.current === target

      // 节流判断
      if (isSameElement && timeSinceLastPlay < 500) {
        // 同一元素，500ms 内不重复播放
        return
      }

      if (timeSinceLastPlay < 200) {
        // 不同元素，200ms 内不播放
        return
      }

      // 更新记录
      lastPlayTimeRef.current = now
      lastPlayedElementRef.current = target

      // 确保 AudioContext 已初始化
      if (!audioContextRef.current) {
        try {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()

          // 如果 AudioContext 处于 suspended 状态，恢复它
          if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume().catch(err => {
              console.warn('[SoundEffects] Failed to resume AudioContext:', err)
            })
          }
        } catch (error) {
          console.warn('[SoundEffects] Failed to create AudioContext:', error)
          isEnabledRef.current = false
          return
        }
      }

      const ctx = audioContextRef.current
      if (!ctx || ctx.state === 'closed') {
        return
      }

      try {
        const oscillator = ctx.createOscillator()
        const gainNode = ctx.createGain()

        oscillator.connect(gainNode)
        gainNode.connect(ctx.destination)

        // 音效参数：短促的轻柔音
        oscillator.frequency.value = 700  // 音调：700Hz（平衡的清脆感）
        oscillator.type = 'sine'  // 波形：正弦波（柔和）

        // 音量包络：快速淡入淡出
        const audioNow = ctx.currentTime
        gainNode.gain.setValueAtTime(0, audioNow)
        gainNode.gain.linearRampToValueAtTime(0.015, audioNow + 0.01)  // 淡入到 1.5% 音量（轻柔）
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioNow + 0.04)  // 淡出

        oscillator.start(audioNow)
        oscillator.stop(audioNow + 0.045)  // 持续 45ms

        console.log('[SoundEffects] ✓ Playing hover sound') // 调试日志
      } catch (error) {
        // 静默失败，不影响用户体验
        console.error('[SoundEffects] Play error:', error)
      }
    }

    // 使用事件委托，减少监听器数量
    // 只监听 mouseenter，避免 click 等其他事件
    const handleMouseEnter = (event: Event) => {
      playHoverSound(event)
    }

    // 使用捕获阶段，减少事件冒泡开销
    document.addEventListener('mouseenter', handleMouseEnter, { capture: true, passive: true })

    // 清理函数
    return () => {
      document.removeEventListener('mouseenter', handleMouseEnter, { capture: true } as any)

      // 关闭 AudioContext
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(err => {
          console.debug('[SoundEffects] Close error:', err)
        })
      }
    }
  }, [])

  // 这个组件不渲染任何内容
  return null
}

/**
 * 音效控制 Hook
 */
export function useSoundEffects() {
  const toggleSoundEffects = (enabled: boolean) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('soundEffectsEnabled', String(enabled))
      // 重新加载页面以应用更改
      window.location.reload()
    }
  }

  const isSoundEnabled = () => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('soundEffectsEnabled')
      return saved === null ? true : saved === 'true'
    }
    return true
  }

  return { toggleSoundEffects, isSoundEnabled }
}
