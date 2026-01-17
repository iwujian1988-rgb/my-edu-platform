/**
 * Popover 组件 - 增强版悬浮弹出层
 *
 * 支持复杂内容的下拉弹出层，可替代 Tooltip 使用
 * 支持 Hover 和 Click 两种触发方式
 */

"use client"

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface PopoverProps {
  trigger: React.ReactElement
  content: React.ReactNode
  triggerType?: 'hover' | 'click'
  position?: 'bottom' | 'bottom-left' | 'bottom-right'
  width?: string
  offset?: number
}

export function Popover({
  trigger,
  content,
  trigger: triggerType = 'hover',
  position = 'bottom',
  width = 'auto',
  offset = 8,
}: PopoverProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleMouseEnter = () => {
    if (triggerType === 'hover') {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      setIsOpen(true)
    }
  }

  const handleMouseLeave = () => {
    if (triggerType === 'hover') {
      timeoutRef.current = setTimeout(() => {
        setIsOpen(false)
      }, 150)
    }
  }

  const handleClick = () => {
    if (triggerType === 'click') {
      setIsOpen(!isOpen)
    }
  }

  // 点击外部关闭
  useEffect(() => {
    if (isOpen && triggerType === 'click') {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false)
        }
      }

      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isOpen, triggerType])

  const getPositionClasses = () => {
    switch (position) {
      case 'bottom-left':
        return 'left-0 top-full'
      case 'bottom-right':
        return 'right-0 top-full'
      case 'bottom':
      default:
        return 'left-1/2 top-full -translate-x-1/2'
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        onClick={handleClick}
        className="bg-transparent border-0 p-0 cursor-pointer"
        style={{ background: 'transparent' }}
      >
        {trigger}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`absolute z-50 ${getPositionClasses()} mt-${offset}`}
            style={{ marginTop: `${offset}px`, width, minWidth: 'fit-content' }}
          >
            <div className="bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden">
              {content}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
