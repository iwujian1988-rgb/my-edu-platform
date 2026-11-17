import { FEATURE_PERMISSIONS } from './permission-constants'
import { WORK_ENGLISH_PATH } from './work-english/constants'

export interface ProductEntry {
  id: string
  kind: 'maxnote' | 'video' | 'novel' | 'work-english' | 'french-atlas'
  title: string
  description: string
  href: string
  coverUrl?: string | null
}

export interface ProductPermissions {
  has_video: boolean
  has_books: boolean
  has_maxnote: boolean
  has_work_english: boolean
  has_french_atlas: boolean
  entries: ProductEntry[]
}

// 独立产品的权限不能让 MAX笔记入口误出现；主站旧版功能也需要兼容。
const MAXNOTE_FEATURES: readonly string[] = [
  ...Object.values(FEATURE_PERMISSIONS).filter(feature => feature !== FEATURE_PERMISSIONS.VIDEO_LEARNING && feature !== FEATURE_PERMISSIONS.FRENCH_ATLAS),
  'review_mode',
  'speaker',
]

const NOVEL_DESCRIPTIONS: Readonly<Record<string, string>> = {
  '9a1f0d3e-7c4b-4f2a-8e6d-5b3c1a9f2e7d': 'TCF 核心词 · 近 3000 词条',
  'd28a2239-b8da-4f1b-b6d0-a27676b90035': 'TCF 备考 · 1000 词剧情入门',
}

export function hasMaxnoteAccess(features: readonly string[], books: readonly string[]): boolean {
  return books.length > 0 || features.some(feature => MAXNOTE_FEATURES.includes(feature))
}

export function buildProductEntries(permissions: {
  has_maxnote: boolean
  has_video: boolean
  has_work_english: boolean
  has_french_atlas?: boolean
  novels: readonly { id: string; title: string; cover_url?: string | null }[]
}): ProductEntry[] {
  const entries: ProductEntry[] = []
  if (permissions.has_maxnote) {
    entries.push({ id: 'maxnote', kind: 'maxnote', title: 'MAX笔记', description: '单词书与学习工具', href: '/' })
  }
  if (permissions.has_video) {
    entries.push({ id: 'video', kind: 'video', title: 'MAXTube', description: '视频学习平台', href: '/videos' })
  }
  if (permissions.has_work_english) {
    entries.push({ id: 'work-english', kind: 'work-english', title: '名企职场英语', description: '职场英语学习', href: WORK_ENGLISH_PATH })
  }
  if (permissions.has_french_atlas) {
    entries.push({ id: 'french-atlas', kind: 'french-atlas', title: '法语图鉴', description: 'TCF Canada 备考词汇与间隔复习', href: 'https://fr.maxnote.top/' })
  }
  for (const novel of permissions.novels) {
    entries.push({ id: `novel:${novel.id}`, kind: 'novel', title: novel.title, description: NOVEL_DESCRIPTIONS[novel.id] || '小说阅读与学习', href: `/read/${encodeURIComponent(novel.id)}`, coverUrl: novel.cover_url })
  }
  return entries
}
