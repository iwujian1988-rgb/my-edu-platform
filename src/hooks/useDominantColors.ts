'use client'

import { useState, useEffect } from 'react'

const FALLBACK_COLORS = ['#886644', '#664422', '#443322']

const colorCache = new Map<string, string[]>()

const QUANTIZE_SHIFT = 3
const MAX_COLORS = 5
const SAMPLE_SIZE = 64

/** 饱和度下限：max(r,g,b) - min(r,g,b) 必须大于此值才采入 */
const SATURATION_FLOOR = 30
/** 亮度下限和上限：跳过太暗和太亮的像素 */
const LUM_FLOOR = 15
const LUM_CEIL = 230

interface ColorBucket { r: number; g: number; b: number; n: number }

function extractFromCanvas(imageUrl: string): Promise<string[]> {
  const cached = colorCache.get(imageUrl)
  if (cached) return Promise.resolve(cached)

  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    const separator = imageUrl.includes('?') ? '&' : '?'

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = SAMPLE_SIZE
        canvas.height = SAMPLE_SIZE
        const ctx = canvas.getContext('2d')
        if (!ctx) { resolve(FALLBACK_COLORS); return }
        ctx.drawImage(img, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE)
        const data = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data

        // 第一步：只采有色差的像素，白色/灰色/黑色全部跳过
        const buckets: Map<string, ColorBucket> = new Map()
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3]
          if (a < 128) continue
          const max = Math.max(r, g, b), min = Math.min(r, g, b)
          // 跳过低饱和（白/灰/黑）
          if (max - min < SATURATION_FLOOR) continue
          // 跳过太暗或太亮
          const lum = (r + g + b) / 3
          if (lum < LUM_FLOOR || lum > LUM_CEIL) continue

          const key = `${r >> QUANTIZE_SHIFT}-${g >> QUANTIZE_SHIFT}-${b >> QUANTIZE_SHIFT}`
          const ex = buckets.get(key)
          if (ex) {
            const t = ex.n + 1
            ex.r = (ex.r * ex.n + r) / t
            ex.g = (ex.g * ex.n + g) / t
            ex.b = (ex.b * ex.n + b) / t
            ex.n = t
          } else {
            buckets.set(key, { r, g, b, n: 1 })
          }
        }

        // 第二步：合并近色
        const merged = mergeNearby([...buckets.values()])

        // 第三步：按频率排序取 top N
        const sorted = merged.sort((a, b) => b.n - a.n).slice(0, MAX_COLORS)

        const result = sorted.map(c =>
          `rgb(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)})`
        )
        const final = result.length >= 2 ? result : [...result, ...FALLBACK_COLORS].slice(0, 3)
        colorCache.set(imageUrl, final)
        resolve(final)
      } catch {
        resolve(FALLBACK_COLORS)
      }
    }
    img.onerror = () => resolve(FALLBACK_COLORS)
    img.src = `${imageUrl}${separator}_c=${Date.now()}`
  })
}

export function useDominantColors(imageUrl: string | undefined): string[] {
  const [colors, setColors] = useState<string[]>(FALLBACK_COLORS)

  useEffect(() => {
    if (!imageUrl) return
    let cancelled = false
    extractFromCanvas(imageUrl).then(c => { if (!cancelled) setColors(c) })
    return () => { cancelled = true }
  }, [imageUrl])

  return colors
}

function mergeNearby(buckets: ColorBucket[]): ColorBucket[] {
  const MERGE_THRESHOLD = 75
  if (buckets.length <= MAX_COLORS) return buckets
  const sorted = [...buckets].sort((a, b) => b.n - a.n)
  const absorbed = new Set<number>()
  const result: ColorBucket[] = []
  for (let i = 0; i < sorted.length; i++) {
    if (absorbed.has(i)) continue
    const t = { ...sorted[i] }
    for (let j = i + 1; j < sorted.length; j++) {
      if (absorbed.has(j)) continue
      const c = sorted[j]
      if ((t.r - c.r) ** 2 + (t.g - c.g) ** 2 + (t.b - c.b) ** 2 < MERGE_THRESHOLD ** 2) {
        const total = t.n + c.n
        t.r = (t.r * t.n + c.r * c.n) / total
        t.g = (t.g * t.n + c.g * c.n) / total
        t.b = (t.b * t.n + c.b * c.n) / total
        t.n = total
        absorbed.add(j)
      }
    }
    result.push(t)
  }
  return result
}

export { FALLBACK_COLORS }
