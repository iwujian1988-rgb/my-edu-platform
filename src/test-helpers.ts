/**
 * 测试辅助函数 - 用于数据库集成测试
 *
 * 使用说明:
 * 1. 在beforeAll中创建测试用户和词库
 * 2. 在beforeEach中清理测试数据
 * 3. 在afterAll中清理所有数据
 */

import { vi } from 'vitest'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * 创建测试用户
 * @returns 用户ID
 */
export async function createTestUser() {
  const supabase = await createAdminClient()

  const { data: userData, error } = await supabase.auth.signUp({
    email: `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`,
    password: 'test123456',
  })

  if (error || !userData.user) {
    throw new Error(`Failed to create test user: ${error?.message}`)
  }

  return userData.user.id
}

/**
 * 创建测试词库
 * @param userId 用户ID
 * @param bookData 词库数据（可选）
 * @returns 词库ID
 */
export async function createTestBook(userId: string, bookData: any = {}) {
  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from('books')
    .insert({
      title: bookData.title || 'Test Book',
      description: bookData.description || 'Test Description',
      created_by: userId,
      is_official: false,
      total_words: 0,
      total_chapters: 0,
      category: bookData.category || 'custom', // 添加必填字段
      ...bookData,
    })
    .select()
    .single()

  if (error || !data) {
    throw new Error(`Failed to create test book: ${error?.message}`)
  }

  return data.id
}

/**
 * 创建测试章节
 * @param bookId 词库ID
 * @param chapterData 章节数据（可选）
 * @returns 章节ID
 */
export async function createTestChapter(bookId: string, chapterData: any = {}) {
  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from('chapters')
    .insert({
      book_id: bookId,
      title: chapterData.title || 'Test Chapter',
      order_index: chapterData.order_index || 1,
      word_count: 0,
      is_default: chapterData.is_default || false,
      ...chapterData,
    })
    .select()
    .single()

  if (error || !data) {
    throw new Error(`Failed to create test chapter: ${error?.message}`)
  }

  return data.id
}

/**
 * 创建测试单词
 * @param bookId 词库ID
 * @param chapterId 章节ID
 * @param wordData 单词数据（可选）
 * @returns 单词ID
 */
export async function createTestWord(bookId: string, chapterId: string | null, wordData: any = {}) {
  const supabase = await createAdminClient()

  const { data, error } = await supabase
    .from('words')
    .insert({
      book_id: bookId,
      chapter_id: chapterId,
      word: wordData.word || 'test',
      phonetic: wordData.phonetic || '/test/',
      definition: wordData.definition || 'Test definition',
      ...wordData,
    })
    .select()
    .single()

  if (error || !data) {
    throw new Error(`Failed to create test word: ${error?.message}`)
  }

  return data.id
}

/**
 * 清理测试用户及其所有数据
 * @param userId 用户ID
 */
export async function cleanupTestData(userId: string) {
  const supabase = await createAdminClient()

  // 注意：由于外键约束，需要按照特定顺序删除
  // 先获取用户的所有词库
  const { data: books } = await supabase
    .from('books')
    .select('id')
    .eq('created_by', userId)

  if (books && books.length > 0) {
    const bookIds = books.map(b => b.id)

    // 1. 删除单词
    await supabase.from('words').delete().in('book_id', bookIds)

    // 2. 删除章节
    await supabase.from('chapters').delete().in('book_id', bookIds)

    // 3. 删除词库
    await supabase.from('books').delete().eq('created_by', userId)
  }

  // 4. 删除用户
  try {
    await supabase.auth.admin.deleteUser(userId)
  } catch (error) {
    // 用户可能已经被删除
    console.warn('User already deleted or does not exist:', error)
  }
}

/**
 * 快速清理词库的所有数据（保留词库）
 * @param bookId 词库ID
 */
export async function cleanupBookData(bookId: string) {
  const supabase = await createAdminClient()

  // 删除所有章节（会级联删除单词）
  await supabase.from('chapters').delete().eq('book_id', bookId)
}

/**
 * 删除测试用户的所有词库
 * @param userId 用户ID
 */
export async function cleanupUserBooks(userId: string) {
  const supabase = await createAdminClient()

  const { data: books } = await supabase
    .from('books')
    .select('id')
    .eq('created_by', userId)

  if (books) {
    for (const book of books) {
      await cleanupBookData(book.id)
    }
  }
}

/**
 * 创建完整的Supabase mock对象
 * 用于测试中模拟数据库操作
 */
export function createMockSupabase() {
  const mockData: any = {
    books: [],
    chapters: [],
    words: [],
  }

  const createQueryBuilder = () => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    limit: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    exists: vi.fn().mockResolvedValue({ data: null, error: null }),
  })

  const fromMock = vi.fn().mockReturnValue(createQueryBuilder())

  return {
    from: fromMock,
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      admin: {
        deleteUser: vi.fn().mockResolvedValue({ error: null }),
      },
    },
  }
}

/**
 * 创建词库mock对象
 */
export function createMockBook(overrides: any = {}) {
  return {
    id: 'test-book-id',
    title: 'Test Book',
    description: 'Test Description',
    created_by: 'test-user-id',
    is_official: false,
    total_words: 0,
    total_chapters: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * 创建章节mock对象
 */
export function createMockChapter(overrides: any = {}) {
  return {
    id: 'test-chapter-id',
    book_id: 'test-book-id',
    title: 'Test Chapter',
    order_index: 1,
    word_count: 0,
    is_default: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * 创建单词mock对象
 */
export function createMockWord(overrides: any = {}) {
  return {
    id: 'test-word-id',
    book_id: 'test-book-id',
    chapter_id: 'test-chapter-id',
    word: 'test',
    phonetic: '/test/',
    definition: 'Test definition',
    part_of_speech: 'n.',
    difficulty_level: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}
