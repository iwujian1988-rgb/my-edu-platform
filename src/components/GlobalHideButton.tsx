'use client'

import { useEffect, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface GlobalHideButtonProps {
  bookId: string
  onHideChange?: (hideChinese: boolean) => void
}

export function GlobalHideButton({ bookId, onHideChange }: GlobalHideButtonProps) {
  const [hideChinese, setHideChinese] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // 组件加载时获取用户偏好
  useEffect(() => {
    async function fetchPreferences() {
      try {
        const response = await fetch(`/api/user-preferences?book_id=${bookId}`)
        if (response.ok) {
          const { data } = await response.json()
          const prefHideChinese = data.hide_chinese || false
          setHideChinese(prefHideChinese)
          onHideChange?.(prefHideChinese)
        }
      } catch (error) {
        console.error('Failed to fetch preferences:', error)
      }
    }

    fetchPreferences()
  }, [bookId, onHideChange])

  // 切换隐藏状态并保存
  const handleToggle = async () => {
    setIsLoading(true)
    const newHideChinese = !hideChinese

    try {
      const response = await fetch('/api/user-preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          book_id: bookId,
          hide_chinese: newHideChinese
        })
      })

      if (response.ok) {
        setHideChinese(newHideChinese)
        onHideChange?.(newHideChinese)
        console.log(`✅ 全局隐藏中文设置已${newHideChinese ? '开启' : '关闭'}`)
      } else {
        // 处理 401 未登录
        if (response.status === 401) {
          console.error('❌ 未登录，请先登录后再使用全局隐藏功能')
          alert('请先登录后再使用全局隐藏功能')
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          console.error('❌ Failed to save preferences:', errorData)
          console.error('HTTP Status:', response.status)
        }
      }
    } catch (error) {
      console.error('❌ Error saving preferences:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${
        hideChinese
          ? 'bg-purple-50 border-purple-400 text-purple-700'
          : 'border-gray-200 text-gray-700 hover:border-purple-300 hover:text-purple-600'
      } disabled:opacity-50`}
    >
      {hideChinese ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      {isLoading ? '保存中...' : hideChinese ? '显示中文' : '隐藏中文'}
      {hideChinese && (
        <span className="ml-1 px-2 py-0.5 text-xs bg-purple-200 rounded-full">
          全局生效
        </span>
      )}
    </button>
  )
}
