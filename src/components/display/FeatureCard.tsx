/**
 * FeatureCard - 功能展示卡片
 *
 * 用于展示产品功能、特色等
 * 符合 Educational Platform 样式
 */

import React from 'react'

interface FeatureCardProps {
  icon: React.ReactNode
  title: string
  description: string
  color?: 'green' | 'blue' | 'orange' | 'purple'
  size?: 'sm' | 'md' | 'lg'
}

export function FeatureCard({
  icon,
  title,
  description,
  color = 'green',
  size = 'md'
}: FeatureCardProps) {
  const colorClasses = {
    green: 'text-green-600',
    blue: 'text-blue-600',
    orange: 'text-orange-600',
    purple: 'text-purple-600'
  }

  const sizeClasses = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl'
  }

  const iconSizes = {
    sm: 'w-5 h-5',
    md: 'w-7 h-7',
    lg: 'w-9 h-9'
  }

  return (
    <div className="clay-card p-8 hover:scale-105 transition-transform">
      <div className="flex items-start gap-4">
        <div className={`flex-shrink-0 w-14 h-14 clay-icon flex items-center justify-center`}>
          <span className={colorClasses[color]}>{icon}</span>
        </div>
        <div>
          <h3 className={`font-bold text-gray-900 mb-2 ${sizeClasses[size]}`}>
            {title}
          </h3>
          <p className="text-base text-gray-600 font-medium leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </div>
  )
}
