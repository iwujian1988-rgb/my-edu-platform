'use client'

import { useState } from 'react'

/**
 * 颜色提取Hook - 简化版
 *
 * 不再用于背景生成，保留用于其他可能需要颜色的场景
 * 返回简单的默认颜色，避免复杂的Canvas处理
 */

const FALLBACK_COLORS = ['#1a1a2e', '#16213e', '#0f3460']

export function useDominantColors(imageUrl: string | undefined): string[] {
  // 直接返回默认颜色，不再进行复杂的颜色提取
  return FALLBACK_COLORS
}

export { FALLBACK_COLORS }
