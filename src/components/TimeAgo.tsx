"use client"

import { useEffect, useState } from 'react'
import { formatTimeAgo } from '@/lib/timeUtils'

interface TimeAgoProps {
  timestamp: number
  className?: string
}

/**
 * 客户端时间显示组件
 * 解决 SSR hydration 不匹配问题
 *
 * @example
 * <TimeAgo timestamp={Date.now() - 3600000} />
 * // 首次渲染：加载中...
 * // 客户端挂载后：1小时前
 */
export function TimeAgo({ timestamp, className = '' }: TimeAgoProps) {
  const [timeString, setTimeString] = useState<string>('加载中...')

  useEffect(() => {
    // 只在客户端运行，避免 SSR 不匹配
    setTimeString(formatTimeAgo(timestamp))

    // 每分钟更新一次
    const interval = setInterval(() => {
      setTimeString(formatTimeAgo(timestamp))
    }, 60000) // 60秒

    return () => clearInterval(interval)
  }, [timestamp])

  return <span className={className}>{timeString}</span>
}
