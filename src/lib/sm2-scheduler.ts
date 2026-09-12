/**
 * SM-2 间隔重复调度（纯函数）
 *
 * 从 video-cards review 路由提取，video 与小说词卡复习共用。
 * quality 三档（客户端约定，两处 UI 一致）：
 *   1 = 忘记 / 不认识 → 1 天后重来，EF -0.2
 *   2 = 一般 / 模糊   → 按复习次数减半，EF -0.1
 *   3 = 简单 / 认识   → 1 → 6 → n×EF 递增，EF +0.1
 */

export interface Sm2Input {
  easeFactor: number
  reviewCount: number
  quality: number
}

export interface Sm2Result {
  intervalDays: number
  easeFactor: number
  nextReviewAt: string
}

export function scheduleSm2Review({ easeFactor, reviewCount, quality }: Sm2Input): Sm2Result {
  const ef = easeFactor ?? 2.5
  const count = reviewCount || 0

  let interval = 1
  let newEaseFactor = ef

  if (quality >= 3) {
    if (count === 0) {
      interval = 1
    } else if (count === 1) {
      interval = 6
    } else {
      interval = Math.round(count * ef)
    }
    newEaseFactor = Math.max(1.3, ef + 0.1)
  } else if (quality >= 2) {
    interval = Math.max(1, Math.round(count * 0.5))
    newEaseFactor = Math.max(1.3, ef - 0.1)
  } else {
    interval = 1
    newEaseFactor = Math.max(1.3, ef - 0.2)
  }

  const nextReviewAt = new Date()
  nextReviewAt.setDate(nextReviewAt.getDate() + interval)

  return {
    intervalDays: interval,
    easeFactor: newEaseFactor,
    nextReviewAt: nextReviewAt.toISOString(),
  }
}
