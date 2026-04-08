import sharp from 'sharp'
import { NextRequest, NextResponse } from 'next/server'

const SAMPLE_SIZE = 64
const MAX_COLORS = 5
const SATURATION_FLOOR = 30
const LUM_FLOOR = 15
const LUM_CEIL = 230
const MERGE_THRESHOLD = 75
const FALLBACK = ['#886644', '#664422', '#443322']

interface Bucket { r: number; g: number; b: number; n: number }

export async function GET(request: NextRequest) {
  const imageUrl = request.nextUrl.searchParams.get('url')
  if (!imageUrl) {
    return NextResponse.json({ colors: FALLBACK }, { status: 400 })
  }

  try {
    const res = await fetch(imageUrl, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return NextResponse.json({ colors: FALLBACK })

    const buffer = Buffer.from(await res.arrayBuffer())
    const { data, info } = await sharp(buffer)
      .resize(SAMPLE_SIZE, SAMPLE_SIZE, { fit: 'cover' })
      .raw()
      .toBuffer({ resolveWithObject: true })

    // 只采有色差的像素，白色/灰色/黑色全部跳过
    const buckets: Map<string, Bucket> = new Map()
    const pixelCount = info.width * info.height
    for (let i = 0; i < pixelCount; i++) {
      const o = i * info.channels
      const r = data[o], g = data[o + 1], b = data[o + 2]
      const max = Math.max(r, g, b), min = Math.min(r, g, b)
      if (max - min < SATURATION_FLOOR) continue
      const lum = (r + g + b) / 3
      if (lum < LUM_FLOOR || lum > LUM_CEIL) continue
      const key = `${r >> 3}-${g >> 3}-${b >> 3}`
      const ex = buckets.get(key)
      if (ex) {
        const t = ex.n + 1
        ex.r = (ex.r * ex.n + r) / t; ex.g = (ex.g * ex.n + g) / t
        ex.b = (ex.b * ex.n + b) / t; ex.n = t
      } else {
        buckets.set(key, { r, g, b, n: 1 })
      }
    }

    const merged = mergeNearby([...buckets.values()])
    const sorted = merged.sort((a, b) => b.n - a.n).slice(0, MAX_COLORS)
    const colors = sorted.map(c =>
      `rgb(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)})`
    )
    const result = colors.length >= 2 ? colors : [...colors, ...FALLBACK].slice(0, 3)

    return NextResponse.json({ colors: result }, {
      headers: { 'Cache-Control': 'public, max-age=86400' },
    })
  } catch {
    return NextResponse.json({ colors: FALLBACK })
  }
}

function mergeNearby(buckets: Bucket[]): Bucket[] {
  if (buckets.length <= MAX_COLORS) return buckets
  const sorted = [...buckets].sort((a, b) => b.n - a.n)
  const absorbed = new Set<number>()
  const result: Bucket[] = []
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
