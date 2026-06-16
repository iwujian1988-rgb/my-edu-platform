/**
 * /parcours 课程进度助手。
 * 来源：MAXCLASS_V1_HANDOFF_2026-06-14/src/composables/useLessonProgress.js
 *
 * 数据存于 localStorage，与现有项目的 dictation/word 进度键不冲突。
 * 使用前缀 `parcours:` 防止撞键。
 *
 * 反应式：React 组件需自行用 useState + useEffect 监听变化；
 * 本模块只提供命令式 API。
 */

import type { Block } from '@/data/parcours-mock'

const LESSON_KEY = 'parcours:lesson_progress'
const BLOCK_KEY = 'parcours:block_progress'
const CONTINUE_KEY = 'parcours:continue_learning'

type LessonState = Record<string, number>
type BlockState = Record<string, Record<string, boolean>>
export type ContinueLearning = {
  courseSlug: string
  moduleSlug: string
  lessonIndex: number
  lessonTitle: string
  blockId?: string
  timestamp: number
} | null

function loadLessons(): LessonState {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(LESSON_KEY) || '{}') as LessonState
  } catch {
    return {}
  }
}

function loadBlocks(): BlockState {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(BLOCK_KEY) || '{}') as BlockState
  } catch {
    return {}
  }
}

function saveLessons(state: LessonState): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(LESSON_KEY, JSON.stringify(state))
}

function saveBlocks(state: BlockState): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(BLOCK_KEY, JSON.stringify(state))
}

export function getBlockId(block: Block, index: number): string {
  return block.id || String(index)
}

// ---------- Lesson 级别完成 ----------

export function isCompleted(lessonId: string): boolean {
  return !!loadLessons()[lessonId]
}

export function markComplete(lessonId: string): void {
  const state = loadLessons()
  state[lessonId] = Date.now()
  saveLessons(state)
}

export function markIncomplete(lessonId: string): void {
  const state = loadLessons()
  delete state[lessonId]
  saveLessons(state)
}

export function completedCount(lessons: { id: string }[]): number {
  if (!lessons) return 0
  return lessons.filter((l) => isCompleted(l.id)).length
}

// ---------- Block 级别完成 ----------

export function isBlockDone(lessonId: string, blockId: string): boolean {
  return !!loadBlocks()[lessonId]?.[blockId]
}

export function markBlockDone(lessonId: string, blockId: string): void {
  const state = loadBlocks()
  if (!state[lessonId]) state[lessonId] = {}
  state[lessonId][blockId] = true
  saveBlocks(state)
}

export function markBlockUndone(lessonId: string, blockId: string): void {
  const state = loadBlocks()
  if (state[lessonId]) {
    delete state[lessonId][blockId]
    saveBlocks(state)
  }
}

export function toggleBlock(lessonId: string, blockId: string): void {
  if (isBlockDone(lessonId, blockId)) {
    markBlockUndone(lessonId, blockId)
  } else {
    markBlockDone(lessonId, blockId)
  }
}

export function completedBlockCount(lessonId: string, blocks: Block[]): number {
  const state = loadBlocks()[lessonId]
  if (!state || !blocks) return 0
  let count = 0
  for (let i = 0; i < blocks.length; i++) {
    if (state[getBlockId(blocks[i], i)]) count++
  }
  return count
}

export function blockProgressPercent(lessonId: string, blocks: Block[]): number {
  if (!blocks?.length) return 0
  return Math.round((completedBlockCount(lessonId, blocks) / blocks.length) * 100)
}

export function isLessonAllDone(lessonId: string, blocks: Block[]): boolean {
  return blocks?.length > 0 && completedBlockCount(lessonId, blocks) >= blocks.length
}

/**
 * 旧版本以 block 索引为 key，迁移到 block.id。
 * Phase 1 mock 数据不会触发，预留 Phase 2 数据升级用。
 */
export function migrateBlockProgress(lessonId: string, blocks: Block[]): void {
  const state = loadBlocks()
  const data = state[lessonId]
  if (!data) return

  let changed = false
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]
    if (!block.id) continue
    const oldKey = String(i)
    if (data[oldKey] && !data[block.id]) {
      data[block.id] = true
      changed = true
    }
  }
  if (changed) saveBlocks(state)
}

// ---------- Continue Learning ----------

export function getContinueLearning(): ContinueLearning {
  if (typeof window === 'undefined') return null
  try {
    return JSON.parse(localStorage.getItem(CONTINUE_KEY) || 'null') as ContinueLearning
  } catch {
    return null
  }
}

export function setContinueLearning(data: {
  courseSlug: string
  moduleSlug: string
  lessonIndex: number
  lessonTitle: string
  blockId?: string
}): void {
  if (typeof window === 'undefined') return
  const payload: ContinueLearning = { ...data, timestamp: Date.now() }
  localStorage.setItem(CONTINUE_KEY, JSON.stringify(payload))
}
