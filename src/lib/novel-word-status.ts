import type { NovelWordStatus } from '@/types/database'

export const NOVEL_WORD_STATUS_LABELS: Record<NovelWordStatus, string> = {
  new: '未标记',
  unknown: '没记住',
  vague: '待巩固',
  known: '记住了',
}

export const NOVEL_WORD_STATUS_ORDER: ReadonlyArray<NovelWordStatus> = ['new', 'unknown', 'vague', 'known']
