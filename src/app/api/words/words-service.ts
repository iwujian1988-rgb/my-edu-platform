/**
 * 单词查询服务 - 统一数据流实现
 *
 * @description 所有 status、shuffle 组合都走同一逻辑，确保行为一致
 * @see docs/DICTATION_MODULE_DESIGN.md
 * @see docs/AI_CODING_GUARDRAILS.md
 */

import { createClient } from '@/lib/supabase/server'
import { PAGINATION, SHUFFLE, ERROR_CODES } from './constants'
import type {
  Word,
  ScopeType,
  GetWordsParams,
  GetWordsResponse,
  ErrorResponse,
  WordIdListResult,
  ChapterInfo,
} from './types'

// ============================================
// 类型定义（Supabase 查询结果）
// ============================================

interface WordIdRow {
  id: string
}

interface WordDetailRow {
  id: string
  word: string
  phonetic: string | null
  uk_phonetic: string | null
  us_phonetic: string | null
  definition: string
  definition_en: string | null
  example_sentence: string | null
  example_sentence_en: string | null
  collocation: string | null
  collocation_en: string | null
  part_of_speech: string | null
  chapter_id: string
  audio_url: string | null
  order_index: number
}

interface ChapterRow {
  id: string
  theme_id: string | null
  scene_id: string | null
}

interface ProgressRow {
  word_id: string
  status: string
}

interface BookRow {
  id: string
  title: string
  total_words: number
}

// ============================================
// 辅助函数
// ============================================

/**
 * 错误响应生成器
 */
function createErrorResponse(
  error: string,
  code: typeof ERROR_CODES[keyof typeof ERROR_CODES],
  details?: Record<string, unknown>
): ErrorResponse {
  return { success: false, error, code, details }
}

/**
 * 种子随机打乱数组（Fisher-Yates 算法）
 */
function seededShuffle<T>(array: T[], seed: string): T[] {
  const result = [...array]
  const numericSeed = hashCode(seed)
  let random = mulberry32(numericSeed)

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }

  return result
}

/**
 * 字符串转哈希值
 */
function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

/**
 * Mulberry32 随机数生成器
 */
function mulberry32(a: number) {
  return function() {
    let t = a += 0x6D2B79F5
    t = Math.imul(t ^ t >>> 15, t | 1)
    t ^= t + Math.imul(t ^ t >>> 7, t | 61)
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

// ============================================
// 核心查询函数
// ============================================

/**
 * Step 1: 获取所有匹配的 word_id 列表
 */
async function getMatchingWordIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bookId: string,
  status: ScopeType,
  chapterIds: string[],
  progressMap: Map<string, string>
): Promise<WordIdListResult> {
  let ids: string[] = []

  // 边界检查：没有章节
  if (chapterIds.length === 0) {
    return { ids: [], count: 0 }
  }

  if (status === 'all') {
    // 获取所有单词 ID
    const { data, error } = await supabase
      .from('words')
      .select('id')
      .in('chapter_id', chapterIds)
      .order('order_index', { ascending: true })

    if (error) {
      console.error('[getMatchingWordIds] Failed to fetch all word IDs:', error)
      throw new Error('获取单词列表失败')
    }

    ids = (data as WordIdRow[] | null)?.map(w => w.id) || []

  } else if (status === 'new') {
    // 获取没有进度记录的单词 ID
    const allProgressIds = new Set(progressMap.keys())

    const { data, error } = await supabase
      .from('words')
      .select('id')
      .in('chapter_id', chapterIds)
      .order('order_index', { ascending: true })

    if (error) {
      console.error('[getMatchingWordIds] Failed to fetch word IDs for new status:', error)
      throw new Error('获取单词列表失败')
    }

    // 筛选没有进度记录的 + status='new' 的
    const wordsData = data as WordIdRow[] | null
    ids = (wordsData || [])
      .filter(w => !allProgressIds.has(w.id) || progressMap.get(w.id) === 'new')
      .map(w => w.id)

  } else {
    // unknown / fuzzy / known: 从进度表筛选
    ids = Array.from(progressMap.entries())
      .filter(([, s]) => s === status)
      .map(([id]) => id)

    // 需要按 order_index 排序，并过滤到当前章节范围
    if (ids.length > 0) {
      const { data, error } = await supabase
        .from('words')
        .select('id')
        .in('id', ids)
        .in('chapter_id', chapterIds)
        .order('order_index', { ascending: true })

      if (error) {
        console.error('[getMatchingWordIds] Failed to sort word IDs:', error)
      } else {
        ids = (data as WordIdRow[] | null)?.map(w => w.id) || []
      }
    }
  }

  return { ids, count: ids.length }
}

/**
 * Step 4: 根据 ID 列表获取完整单词数据
 */
async function getWordsByIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  wordIds: string[],
  chaptersMap: Map<string, ChapterInfo>,
  progressMap: Map<string, string>,
  defaultStatus: string = 'new'
): Promise<Word[]> {
  if (wordIds.length === 0) {
    return []
  }

  const { data, error } = await supabase
    .from('words')
    .select(`
      id,
      word,
      phonetic,
      uk_phonetic,
      us_phonetic,
      definition,
      definition_en,
      example_sentence,
      example_sentence_en,
      collocation,
      collocation_en,
      part_of_speech,
      chapter_id,
      audio_url,
      order_index
    `)
    .in('id', wordIds)

  if (error) {
    console.error('[getWordsByIds] Failed to fetch words:', error)
    throw new Error('获取单词详情失败')
  }

  const wordsData = data as WordDetailRow[] | null

  // 附加 chapter 信息和 status
  const words = (wordsData || []).map(word => {
    const chapterInfo = chaptersMap.get(word.chapter_id)
    return {
      ...word,
      theme: chapterInfo?.theme_id || null,
      scene: chapterInfo?.scene_id || null,
      status: progressMap.get(word.id) || defaultStatus,
    } as Word
  })

  // 保持原始顺序（按传入的 wordIds 顺序）
  const wordOrderMap = new Map(words.map(w => [w.id, w]))
  return wordIds.map(id => wordOrderMap.get(id)).filter(Boolean) as Word[]
}

// ============================================
// 主函数
// ============================================

/**
 * 获取单词列表（统一数据流）
 *
 * 算法流程:
 * 1. 获取所有匹配的 word_id 列表
 * 2. 可选乱序（固定种子）
 * 3. 分页切片
 * 4. 获取当前页完整数据
 */
export async function getWordsPaginated(
  params: GetWordsParams
): Promise<GetWordsResponse | ErrorResponse> {
  const { bookId, status, shuffle, page, pageSize, chapterId } = params

  // 参数校验
  const validatedPage = Math.max(1, page)
  const validatedPageSize = Math.min(
    Math.max(PAGINATION.MIN_PAGE_SIZE, pageSize),
    PAGINATION.MAX_PAGE_SIZE
  )

  try {
    const supabase = await createClient()

    // 并行获取：书籍信息 + 章节信息 + 用户进度
    const chaptersQuery = supabase
      .from('chapters')
      .select('id, theme_id, scene_id')
      .eq('book_id', bookId)

    if (chapterId && chapterId !== 'all') {
      chaptersQuery.eq('id', chapterId)
    }

    const [bookResult, chaptersResult, progressResult] = await Promise.all([
      supabase
        .from('books')
        .select('id, title, total_words')
        .eq('id', bookId)
        .single(),
      chaptersQuery,
      supabase
        .from('word_progress')
        .select('word_id, status')
        .eq('book_id', bookId),
    ])

    // 检查书籍是否存在
    if (bookResult.error || !bookResult.data) {
      return createErrorResponse('词书不存在', ERROR_CODES.BOOK_NOT_FOUND, { bookId })
    }

    // TypeScript 类型断言：Supabase 查询结果需要手动断言类型
    const bookData = (bookResult as { data: BookRow }).data
    const bookTitle = bookData.title || 'Unknown Book'
    const totalWordsFromBook = bookData.total_words || 0

    // 构建章节映射
    const chaptersData = (chaptersResult.data || []) as ChapterRow[]
    const chaptersMap = new Map<string, ChapterInfo>(
      chaptersData.map(c => [c.id, { id: c.id, theme_id: c.theme_id, scene_id: c.scene_id }])
    )
    const chapterIds = chaptersData.map(c => c.id)

    // 检查 theme/scene 数据
    const hasThemeData = chaptersData.some(c => c.theme_id !== null)
    const hasSceneData = chaptersData.some(c => c.scene_id !== null)

    // 构建进度映射
    const progressData = (progressResult.data || []) as ProgressRow[]
    const progressMap = new Map<string, string>(
      progressData.map(p => [p.word_id, p.status])
    )

    console.log(`[getWordsPaginated] Book: ${bookId}, Status: ${status}, Shuffle: ${shuffle}, Page: ${validatedPage}`)

    // Step 1: 获取所有匹配的 word_id 列表
    const { ids: allIds, count } = await getMatchingWordIds(
      supabase,
      bookId,
      status,
      chapterIds,
      progressMap
    )

    console.log(`[getWordsPaginated] Total matching IDs: ${count}`)

    // 边界检查：空数据
    if (allIds.length === 0) {
      return {
        success: true,
        data: [],
        page: validatedPage,
        pageSize: validatedPageSize,
        count: 0,
        total: totalWordsFromBook,
        bookTitle,
        hasThemeData,
        hasSceneData,
      }
    }

    // Step 2: 可选乱序（固定种子）
    let orderedIds = allIds
    if (shuffle) {
      const seed = SHUFFLE.SEED_FORMAT(bookId, status)
      orderedIds = seededShuffle(allIds, seed)
      console.log(`[getWordsPaginated] Shuffled with seed: ${seed}`)
    }

    // Step 3: 分页切片
    const startIndex = (validatedPage - 1) * validatedPageSize
    const endIndex = startIndex + validatedPageSize
    const pageIds = orderedIds.slice(startIndex, endIndex)

    console.log(`[getWordsPaginated] Page ${validatedPage}: IDs ${startIndex}-${Math.min(endIndex, orderedIds.length)} of ${orderedIds.length}`)

    // Step 4: 获取当前页完整数据
    const words = await getWordsByIds(supabase, pageIds, chaptersMap, progressMap)

    console.log(`[getWordsPaginated] Returning ${words.length} words`)

    // Step 5: 返回响应
    return {
      success: true,
      data: words,
      page: validatedPage,
      pageSize: validatedPageSize,
      count,
      total: totalWordsFromBook,
      bookTitle,
      hasThemeData,
      hasSceneData,
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[getWordsPaginated] Error:', errorMessage, error)

    return createErrorResponse(
      '获取单词列表失败，请稍后重试',
      ERROR_CODES.WORDS_FETCH_ERROR,
      { bookId, status, error: errorMessage }
    )
  }
}
