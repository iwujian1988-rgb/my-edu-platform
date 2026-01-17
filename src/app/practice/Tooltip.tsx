/**
 * Tooltip 组件 - Qwerty Learner 风格
 *
 * 为按钮提供悬停提示，显示功能说明和快捷键
 * 支持智能边界检测，自动调整位置防止超出屏幕
 */

"use client"

import React, { useState, useRef, useEffect } from 'react'

interface TooltipProps {
  content: string
  shortcut?: string
  children: React.ReactElement
  position?: 'top' | 'bottom' | 'left' | 'right'
}

export function Tooltip({ content, shortcut, children, position = 'top' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [alignment, setAlignment] = useState<'center' | 'left' | 'right'>('center')
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  const handleMouseEnter = () => {
    // 延迟显示，避免快速划过时触发
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true)
    }, 200)
  }

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsVisible(false)
  }

  // 检测边界并调整对齐方式
  useEffect(() => {
    if (isVisible && containerRef.current && tooltipRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect()
      const tooltipRect = tooltipRef.current.getBoundingClientRect()
      const windowWidth = window.innerWidth

      // 检测是否超出右边界
      if (containerRect.right + tooltipRect.width / 2 > windowWidth - 20) {
        setAlignment('right')
      }
      // 检测是否超出左边界
      else if (containerRect.left - tooltipRect.width / 2 < 20) {
        setAlignment('left')
      }
      // 默认居中
      else {
        setAlignment('center')
      }
    }
  }, [isVisible])

  const getPositionClasses = () => {
    // 根据对齐方式返回不同的类
    switch (alignment) {
      case 'left':
        return 'bottom-full left-0 mb-2'
      case 'right':
        return 'bottom-full right-0 mb-2'
      case 'center':
      default:
        return 'bottom-full left-1/2 -translate-x-1/2 mb-2'
    }
  }

  const getArrowClasses = () => {
    switch (alignment) {
      case 'left':
        return 'left-4'
      case 'right':
        return 'right-4'
      case 'center':
      default:
        return 'left-1/2 -translate-x-1/2'
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}

      {isVisible && (
        <div
          ref={tooltipRef}
          className={`absolute z-50 ${getPositionClasses()} px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-xl whitespace-nowrap`}
        >
          <div className="flex items-center gap-2">
            <span>{content}</span>
            {shortcut && (
              <>
                <span className="text-gray-400">•</span>
                <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-xs font-mono">{shortcut}</kbd>
              </>
            )}
          </div>

          {/* 箭头 */}
          {position === 'top' && (
            <div className={`absolute top-full ${getArrowClasses()} -mt-1`}>
              <div className="border-4 border-transparent border-t-gray-900" />
            </div>
          )}
          {position === 'bottom' && (
            <div className={`absolute bottom-full ${getArrowClasses()} -mb-1`}>
              <div className="border-4 border-transparent border-b-gray-900" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
