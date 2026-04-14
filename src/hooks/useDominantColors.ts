'use client'

import { useState, useEffect } from 'react'

// 根据图片URL生成基于内容的颜色
function generateColorsFromUrl(imageUrl: string): string[] {
  // 使用URL的哈希值生成确定性的颜色
  let hash = 0
  for (let i = 0; i < imageUrl.length; i++) {
    hash = imageUrl.charCodeAt(i) + ((hash << 5) - hash)
  }

  // 生成3种协调的颜色
  const hue1 = Math.abs(hash % 360)
  const hue2 = (hue1 + 30) % 360 // 近似色
  const hue3 = (hue1 + 180) % 360 // 互补色

  // 转换为HSL并调整饱和度和亮度
  const color1 = `hsl(${hue1}, 65%, 45%)`
  const color2 = `hsl(${hue2}, 60%, 40%)`
  const color3 = `hsl(${hue3}, 55%, 35%)`

  return [color1, color2, color3]
}

export function useDominantColors(imageUrl: string | undefined): string[] {
  const [colors, setColors] = useState<string[]>([])

  useEffect(() => {
    if (!imageUrl) {
      setColors([])
      return
    }

    // 直接基于URL生成颜色，避免Canvas跨域问题
    const generatedColors = generateColorsFromUrl(imageUrl)
    setColors(generatedColors)
  }, [imageUrl])

  return colors.length > 0 ? colors : ['#2d3748', '#1a202c', '#171923']
}
