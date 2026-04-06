'use client'

import { useState, useEffect } from 'react'

/** 模块级颜色缓存，同一张图只提取一次 */
const colorCache = new Map<string, string[]>()

const FALLBACK_COLORS = ['#555', '#333', '#222']

/** 色桶粒度：每通道量化级数（>>3 = 32级） */
const QUANTIZE_SHIFT = 3
/** 最大提取色数 */
const MAX_COLORS = 5
/** 采样画布尺寸 */
const SAMPLE_SIZE = 64
/** 合并阈值：RGB 欧氏距离低于此值的桶会被合并 */
const MERGE_THRESHOLD = 75
/** 低饱和度过滤阈值：max(r,g,b) - min(r,g,b) < 此值视为灰色，跳过 */
const SATURATION_MIN = 15

interface ColorBucket {
  r: number
  g: number
  b: number
  n: number
}

/**
 * 从封面图提取主色调（canvas 全量采样 + 近色合并 + 饱和度过滤 + 贪心多样性选色）
 */
function extractDominantColors(imageUrl: string): Promise<string[]> {
  const cached = colorCache.get(imageUrl)
  if (cached) return Promise.resolve(cached)

  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = SAMPLE_SIZE
        canvas.height = SAMPLE_SIZE
        const ctx = canvas.getContext('2d')
        if (!ctx) { resolve(FALLBACK_COLORS); return }
        ctx.drawImage(img, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE)
        const data = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data

        // 第一步：量化分桶
        const buckets: Map<string, ColorBucket> = new Map()
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3]
          if (a < 128) continue
          const lum = (r + g + b) / 3
          if (lum < 10 || lum > 245) continue
          const key = `${r >> QUANTIZE_SHIFT}-${g >> QUANTIZE_SHIFT}-${b >> QUANTIZE_SHIFT}`
          const ex = buckets.get(key)
          if (ex) {
            const totalN = ex.n + 1
            ex.r = (ex.r * ex.n + r) / totalN
            ex.g = (ex.g * ex.n + g) / totalN
            ex.b = (ex.b * ex.n + b) / totalN
            ex.n = totalN
          } else {
            buckets.set(key, { r, g, b, n: 1 })
          }
        }

        // 第二步：合并近色桶
        const merged = mergeNearbyBuckets([...buckets.values()])

        // 第三步：贪心选色（优先高饱和度颜色）
        const selected = greedySelect(merged, MAX_COLORS)

        const result = selected.map(c => `rgb(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)})`)
        const final = result.length >= 3 ? result : [...result, '#444', '#222'].slice(0, 3)
        colorCache.set(imageUrl, final)
        resolve(final)
      } catch {
        resolve(FALLBACK_COLORS)
      }
    }
    img.onerror = () => resolve(FALLBACK_COLORS)
    img.src = imageUrl
  })
}

/** 判断颜色饱和度是否足够（非灰色） */
function isChromatic(c: ColorBucket): boolean {
  const max = Math.max(c.r, c.g, c.b)
  const min = Math.min(c.r, c.g, c.b)
  return (max - min) >= SATURATION_MIN
}

/**
 * 贪心选色：优先选有色彩的颜色，再考虑多样性
 *
 * 策略：
 * 1. 从有色彩(高饱和度)的桶中选频率最高的作为第一个色
 * 2. 后续在所有桶中按"色差 × sqrt(频率)"选最远的
 * 3. 如果有色彩桶不足 3 个，再从灰色桶中补充
 */
function greedySelect(buckets: ColorBucket[], maxColors: number): ColorBucket[] {
  if (buckets.length === 0) return []

  const chromatic = buckets.filter(isChromatic)
  const achromatic = buckets.filter(c => !isChromatic(c))

  // 优先从有色彩桶中选
  const pool = chromatic.length >= 3 ? chromatic : [...chromatic, ...achromatic]

  const selected: ColorBucket[] = []
  const used = new Set<number>()

  // 第一个色：频率最高的有色彩色
  if (pool.length > 0) {
    let firstIdx = 0
    let firstN = 0
    for (let i = 0; i < pool.length; i++) {
      if (pool[i].n > firstN) { firstN = pool[i].n; firstIdx = i }
    }
    selected.push(pool[firstIdx])
    used.add(firstIdx)
  }

  // 后续：综合色差和频率贪心选
  while (selected.length < maxColors && used.size < pool.length) {
    let bestScore = -1
    let bestIdx = -1

    for (let i = 0; i < pool.length; i++) {
      if (used.has(i)) continue
      const c = pool[i]
      let minDist = Infinity
      for (const s of selected) {
        const dr = c.r - s.r, dg = c.g - s.g, db = c.b - s.b
        const dist = dr * dr + dg * dg + db * db
        if (dist < minDist) minDist = dist
      }
      // 有色彩颜色加权 ×2，鼓励选彩色
      const saturationBonus = isChromatic(c) ? 2 : 1
      const score = minDist * Math.sqrt(c.n) * saturationBonus
      if (score > bestScore) { bestScore = score; bestIdx = i }
    }

    if (bestIdx === -1) break
    selected.push(pool[bestIdx])
    used.add(bestIdx)
  }

  return selected
}

/**
 * 合并 RGB 空间距离 < MERGE_THRESHOLD 的近色桶
 */
function mergeNearbyBuckets(buckets: ColorBucket[]): ColorBucket[] {
  if (buckets.length <= MAX_COLORS) return buckets

  const sorted = [...buckets].sort((a, b) => b.n - a.n)
  const absorbed = new Set<number>()
  const result: ColorBucket[] = []

  for (let i = 0; i < sorted.length; i++) {
    if (absorbed.has(i)) continue
    const target = { ...sorted[i] }

    for (let j = i + 1; j < sorted.length; j++) {
      if (absorbed.has(j)) continue
      const candidate = sorted[j]
      const dr = target.r - candidate.r
      const dg = target.g - candidate.g
      const db = target.b - candidate.b
      const distSq = dr * dr + dg * dg + db * db

      if (distSq < MERGE_THRESHOLD * MERGE_THRESHOLD) {
        const totalN = target.n + candidate.n
        target.r = (target.r * target.n + candidate.r * candidate.n) / totalN
        target.g = (target.g * target.n + candidate.g * candidate.n) / totalN
        target.b = (target.b * target.n + candidate.b * candidate.n) / totalN
        target.n = totalN
        absorbed.add(j)
      }
    }

    result.push(target)
  }

  return result
}

/**
 * 从封面图提取主色调的 Hook
 */
export function useDominantColors(imageUrl: string | undefined): string[] {
  const [colors, setColors] = useState<string[]>(FALLBACK_COLORS)

  useEffect(() => {
    if (!imageUrl) return
    let cancelled = false
    extractDominantColors(imageUrl).then(c => { if (!cancelled) setColors(c) })
    return () => { cancelled = true }
  }, [imageUrl])

  return colors
}

export { extractDominantColors, FALLBACK_COLORS }
