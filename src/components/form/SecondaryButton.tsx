/**
 * SecondaryButton - 副按钮组件（蓝色）
 *
 * 符合 iPad First 规范的副按钮
 * 最小高度 64px，适合触摸操作
 */

import React from 'react'
import { Loader2 } from 'lucide-react'

interface SecondaryButtonProps {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  type?: 'button' | 'submit'
  fullWidth?: boolean
  icon?: React.ReactNode
}

export function SecondaryButton({
  children,
  onClick,
  disabled = false,
  loading = false,
  type = 'button',
  fullWidth = true,
  icon
}: SecondaryButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${fullWidth ? 'w-full' : ''} clay-button-secondary
                 text-lg py-5 shadow-lg hover:shadow-xl
                 transition-all duration-300
                 disabled:opacity-60 disabled:cursor-not-allowed
                 flex items-center justify-center gap-2`}
      style={{ minHeight: '64px' }}
    >
      {loading ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>加载中...</span>
        </>
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </button>
  )
}
