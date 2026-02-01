'use client'

import { useState } from 'react'
import { BookOpen } from 'lucide-react'

interface BookCoverImageProps {
  coverUrl: string | null
  title: string
  coverColor?: string
  className?: string
}

export function BookCoverImage({ coverUrl, title, coverColor = 'from-green-400 to-green-500', className = '' }: BookCoverImageProps) {
  const [hasError, setHasError] = useState(false)

  if (!coverUrl || hasError) {
    // 回退到渐变背景 + 图标
    return (
      <div className={`w-full h-32 rounded mb-4 bg-gradient-to-br ${coverColor} flex items-center justify-center ${className}`}>
        <BookOpen className="w-12 h-12 text-white/90" />
      </div>
    )
  }

  return (
    <div className={`w-full h-32 rounded mb-4 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center ${className}`}>
      <img
        src={coverUrl}
        alt={title}
        className="w-full h-full object-cover"
        onError={() => setHasError(true)}
      />
    </div>
  )
}
