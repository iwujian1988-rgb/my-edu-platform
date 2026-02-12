/**
 * 演说家模块 - 数据访问层
 *
 * 功能：
 * 1. 封装所有 Supabase 查询操作
 * 2. 处理 RLS 权限检查
 * 3. 统一错误处理和日志记录
 *
 * 参考：
 * - shangwenjie.md 第 6 节（数据库表结构）
 * - TECHNICAL_MODIFICATION_PLAN.md 第 2.2 节（数据访问层隔离）
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  SpeakerArticle,
  SpeakerLevel,
  SpeakerArticleStatus,
  SpeakerProgress,
  SpeakerDictationSubmission,
  SpeakerGhostWord,
  ProgressStatus,
  Step2Draft,
  GetArticlesParams,
  SupportedLanguage,
  ArticleCategory,
} from '../types/speaker'

// ========================================
// 1. 文章相关查询
// ========================================

/**
 * 获取文章列表
 * @param supabase - Supabase 客户端实例
 * @param params - 查询参数（可选的过滤条件）
 * @returns Promise<SpeakerArticle[]> 文章列表
 *
 * @example
 * const articles = await getSpeakerArticles(supabase, { level: 2, limit: 10 })
 */
export async function getSpeakerArticles(
  supabase: SupabaseClient,
  params?: GetArticlesParams
): Promise<SpeakerArticle[]> {
  console.log('[Speaker Data] 获取文章列表:', params)

  try {
    let query = supabase
      .from('speaker_articles')
      .select('*')

    // 状态过滤：如果未指定，默认查询 published 和 active
    const statusFilter = params?.status
    if (statusFilter) {
      query = query.eq('status', statusFilter as SpeakerArticleStatus)
    } else {
      // 默认显示已发布（published）和活跃（active）的文章
      query = query.in('status', ['published', 'active'] as SpeakerArticleStatus[])
    }

    // 可选：按难度等级过滤
    if (params?.level) {
      query = query.eq('level', params.level)
    }

    // ✅ 新增：按语种过滤
    if (params?.language) {
      query = query.eq('language', params.language)
    }

    // ✅ 新增：按分类过滤
    if (params?.category) {
      query = query.eq('category', params.category)
    }

    // 可选：限制返回数量
    if (params?.limit) {
      query = query.limit(params.limit)
    }

    // TODO: 分页偏移（Supabase 版本可能不支持，暂不实现）
    // if (params?.offset) {
    //   query = query.range(params.offset, params.offset + params.limit! - 1)
    // }

    // 排序：按创建时间倒序
    query = query.order('created_at', { ascending: false })

    const { data, error, status } = await query

    if (error) {
      // 检查是否为 RLS 权限问题
      if (status === 401 || error.code === '42501') {
        console.error('[Speaker Data] ❌ 权限不足，用户可能未登录:', error)
        throw new Error('PERMISSION_DENIED: 请先登录')
      }

      console.error('[Speaker Data] ❌ 查询文章列表失败:', error)
      throw error
    }

    if (!data || data.length === 0) {
      console.log('[Speaker Data] ℹ️ 未找到文章')
      return []
    }

    // 处理每篇文章的 sentences 字段（从 json_data.sentences 提取到顶层）
    const articles = data.map((item: any) => {
      const sentences = (item.json_data?.sentences || []).map((s: any) => ({
        ...s,
        text_en: s.text || s.text_en || ''
      }))

      return {
        ...item,
        sentences
      } as SpeakerArticle
    })

    console.log('[Speaker Data] ✅ 成功获取文章列表:', { count: articles.length })
    return articles
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Speaker Data] ❌ 获取文章列表异常:', { error: errorMessage, params })

    // 重新抛出错误，让调用方处理
    throw error
  }
}

/**
 * 获取单篇文章详情（包含句子列表）
 * @param supabase - Supabase 客户端实例
 * @param articleId - 文章 ID
 * @returns Promise<SpeakerArticle | null> 文章详情，不存在则返回 null
 *
 * @example
 * const article = await getSpeakerArticleById(supabase, 'uuid-xxx')
 */
export async function getSpeakerArticleById(
  supabase: SupabaseClient,
  articleId: string
): Promise<SpeakerArticle | null> {
  console.log('[Speaker Data] 获取文章详情:', { articleId })

  try {
    const { data, error, status } = await supabase
      .from('speaker_articles')
      .select('*')
      .eq('id', articleId)
      .single()

    if (error) {
      // 检查是否为 RLS 权限问题
      if (status === 401 || error.code === '42501') {
        console.error('[Speaker Data] ❌ 权限不足:', error)
        throw new Error('PERMISSION_DENIED: 请先登录')
      }

      // 文章不存在
      if (error.code === 'PGRST116') {
        console.log('[Speaker Data] ℹ️ 文章不存在:', articleId)
        return null
      }

      console.error('[Speaker Data] ❌ 查询文章详情失败:', error)
      throw error
    }

    if (!data) {
      console.log('[Speaker Data] ℹ️ 文章不存在:', articleId)
      return null
    }

    console.log('[Speaker Data] ✅ 成功获取文章详情:', { title: data.title })

    // 将 json_data.sentences 提取到顶层，方便组件使用
    // 同时确保每个句子都有 text_en 字段（从 text 复制）
    const sentences = (data.json_data?.sentences || []).map((s: any) => ({
      ...s,
      text_en: s.text || s.text_en || ''  // 确保 text_en 存在
    }))

    const article: SpeakerArticle = {
      ...data,
      sentences
    }

    return article
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Speaker Data] ❌ 获取文章详情异常:', { error: errorMessage, articleId })

    // 重新抛出错误
    throw error
  }
}

// ========================================
// 2. 学习进度相关查询
// ========================================

/**
 * 获取用户学习进度
 * @param supabase - Supabase 客户端实例
 * @param userId - 用户 ID
 * @param articleId - 文章 ID
 * @returns Promise<SpeakerProgress | null> 学习进度，不存在则返回 null
 *
 * @example
 * const progress = await getSpeakerProgress(supabase, 'user-uuid', 'article-uuid')
 */
export async function getSpeakerProgress(
  supabase: SupabaseClient,
  userId: string,
  articleId: string
): Promise<SpeakerProgress | null> {
  console.log('[Speaker Data] 获取学习进度:', { userId, articleId })

  try {
    const { data, error, status } = await supabase
      .from('speaker_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('article_id', articleId)
      .single()

    if (error) {
      // 检查是否为 RLS 权限问题
      if (status === 401 || error.code === '42501') {
        console.error('[Speaker Data] ❌ 权限不足:', error)
        throw new Error('PERMISSION_DENIED: 请先登录')
      }

      // 进度记录不存在（用户还未开始学习这篇文章）
      if (error.code === 'PGRST116') {
        console.log('[Speaker Data] ℹ️ 学习进度不存在（未开始学习）')
        return null
      }

      console.error('[Speaker Data] ❌ 查询学习进度失败:', error)
      throw error
    }

    if (!data) {
      console.log('[Speaker Data] ℹ️ 学习进度不存在')
      return null
    }

    console.log('[Speaker Data] ✅ 成功获取学习进度:', {
      status: data.status,
      step1: data.step1_completed,
      step2: data.step2_completed,
      step3: data.step3_completed,
      step4: data.step4_completed
    })

    return data as SpeakerProgress
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Speaker Data] ❌ 获取学习进度异常:', { error: errorMessage, userId, articleId })

    // 重新抛出错误
    throw error
  }
}

/**
 * 创建或更新学习进度（使用 upsert）
 * @param supabase - Supabase 客户端实例（需要 service role 权限）
 * @param progress - 进度数据
 * @returns Promise<SpeakerProgress> 更新后的进度数据
 *
 * @example
 * const progress = await upsertSpeakerProgress(supabase, {
 *   user_id: 'user-uuid',
 *   article_id: 'article-uuid',
 *   step1_completed: true,
 *   step1_last_position: 45.5
 * })
 */
export async function upsertSpeakerProgress(
  supabase: SupabaseClient,
  progress: Partial<SpeakerProgress> & { user_id: string; article_id: string }
): Promise<SpeakerProgress> {
  console.log('[Speaker Data] 更新学习进度:', {
    userId: progress.user_id,
    articleId: progress.article_id,
    step1: progress.step1_completed,
    step2: progress.step2_completed,
    step3: progress.step3_completed,
    step4: progress.step4_completed
  })

  try {
    // 设置更新时间
    const progressWithTimestamp = {
      ...progress,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('speaker_progress')
      .upsert(progressWithTimestamp)
      .select()
      .single()

    if (error) {
      // 检查是否为 RLS 权限问题
      if (error.code === '42501') {
        console.error('[Speaker Data] ❌ 权限不足，可能需要 service role key:', error)
        throw new Error('PERMISSION_DENIED: 权限不足')
      }

      console.error('[Speaker Data] ❌ 更新学习进度失败:', error)
      throw error
    }

    if (!data) {
      console.error('[Speaker Data] ❌ 更新学习进度失败：未返回数据')
      throw new Error('FAILED_TO_UPSERT: 更新失败')
    }

    console.log('[Speaker Data] ✅ 成功更新学习进度')
    return data as SpeakerProgress
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Speaker Data] ❌ 更新学习进度异常:', { error: errorMessage })

    // 重新抛出错误
    throw error
  }
}

/**
 * 保存 Step 2 听写草稿
 * @param supabase - Supabase 客户端实例
 * @param userId - 用户 ID
 * @param articleId - 文章 ID
 * @param draft - 草稿数据
 * @returns Promise<void>
 *
 * @example
 * await saveStep2Draft(supabase, 'user-uuid', 'article-uuid', {
 *   currentSentenceIndex: 3,
 *   answers: { 0: 'Hello world', 1: 'How are you' },
 *   skippedWords: [],
 *   lastSavedAt: new Date().toISOString()
 * })
 */
export async function saveStep2Draft(
  supabase: SupabaseClient,
  userId: string,
  articleId: string,
  draft: Step2Draft
): Promise<void> {
  console.log('[Speaker Data] 保存听写草稿:', { userId, articleId, draft })

  try {
    // 先查询是否已有进度记录
    const existingProgress = await getSpeakerProgress(supabase, userId, articleId)

    if (existingProgress) {
      // 更新现有记录
      await supabase
        .from('speaker_progress')
        .update({
          step2_draft: draft,
          step2_last_sentence_index: draft.currentSentenceIndex,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('article_id', articleId)
    } else {
      // 创建新记录
      await supabase
        .from('speaker_progress')
        .insert({
          user_id: userId,
          article_id: articleId,
          step2_draft: draft,
          step2_last_sentence_index: draft.currentSentenceIndex,
          status: 'in_progress' as ProgressStatus
        })
    }

    console.log('[Speaker Data] ✅ 成功保存听写草稿')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Speaker Data] ❌ 保存听写草稿失败:', { error: errorMessage })

    // 重新抛出错误
    throw error
  }
}

// ========================================
// 3. 听写提交记录相关查询
// ========================================

/**
 * 提交听写结果
 * @param supabase - Supabase 客户端实例
 * @param submission - 听写提交数据
 * @returns Promise<SpeakerDictationSubmission> 提交记录
 *
 * @example
 * const submission = await submitDictation(supabase, {
 *   user_id: 'user-uuid',
 *   article_id: 'article-uuid',
 *   answers: { 0: 'Hello world', 1: 'How are you' },
 *   total_sentences: 2,
 *   correct_count: 1,
 *   wrong_count: 1,
 *   skipped_count: 0,
 *   accuracy_rate: 50.0,
 *   time_spent_seconds: 120
 * })
 */
export async function submitDictation(
  supabase: SupabaseClient,
  submission: Omit<SpeakerDictationSubmission, 'id' | 'created_at'>
): Promise<SpeakerDictationSubmission> {
  console.log('[Speaker Data] 提交听写结果:', {
    userId: submission.user_id,
    articleId: submission.article_id,
    totalSentences: submission.total_sentences,
    correctCount: submission.correct_count,
    wrongCount: submission.wrong_count,
    accuracy: submission.accuracy_rate
  })

  try {
    const { data, error } = await supabase
      .from('speaker_dictation_submissions')
      .insert(submission)
      .select()
      .single()

    if (error) {
      console.error('[Speaker Data] ❌ 提交听写结果失败:', error)
      throw error
    }

    if (!data) {
      console.error('[Speaker Data] ❌ 提交听写结果失败：未返回数据')
      throw new Error('FAILED_TO_SUBMIT: 提交失败')
    }

    console.log('[Speaker Data] ✅ 成功提交听写结果')
    return data as SpeakerDictationSubmission
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Speaker Data] ❌ 提交听写结果异常:', { error: errorMessage })

    // 重新抛出错误
    throw error
  }
}

// ========================================
// 4. 魔鬼生词本相关查询
// ========================================

/**
 * 添加错误单词到生词本
 * @param supabase - Supabase 客户端实例
 * @param ghostWord - 生词数据
 * @returns Promise<SpeakerGhostWord> 添加的生词记录
 *
 * @example
 * const ghostWord = await addGhostWord(supabase, {
 *   user_id: 'user-uuid',
 *   word: 'hello',
 *   article_id: 'article-uuid',
 *   sentence_id: 0,
 *   sentence_text: 'Hello world',
 *   start_time: 0.5,
 *   error_type: 'wrong'
 * })
 */
export async function addGhostWord(
  supabase: SupabaseClient,
  ghostWord: Omit<SpeakerGhostWord, 'id' | 'created_at' | 'is_mastered' | 'mastered_at'>
): Promise<SpeakerGhostWord> {
  console.log('[Speaker Data] 添加错误单词到生词本:', {
    userId: ghostWord.user_id,
    word: ghostWord.word,
    errorType: ghostWord.error_type
  })

  try {
    const { data, error } = await supabase
      .from('speaker_ghost_words')
      .insert(ghostWord)
      .select()
      .single()

    if (error) {
      // 如果是唯一约束冲突（单词已存在），忽略错误
      if (error.code === '23505') {
        console.log('[Speaker Data] ℹ️ 单词已在生词本中，跳过')
        // 查询已存在的记录并返回
        const existing = await supabase
          .from('speaker_ghost_words')
          .select('*')
          .eq('user_id', ghostWord.user_id)
          .eq('word', ghostWord.word)
          .eq('article_id', ghostWord.article_id)
          .eq('sentence_id', ghostWord.sentence_id)
          .single()

        return existing.data as SpeakerGhostWord
      }

      console.error('[Speaker Data] ❌ 添加生词失败:', error)
      throw error
    }

    if (!data) {
      console.error('[Speaker Data] ❌ 添加生词失败：未返回数据')
      throw new Error('FAILED_TO_ADD: 添加失败')
    }

    console.log('[Speaker Data] ✅ 成功添加生词')
    return data as SpeakerGhostWord
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Speaker Data] ❌ 添加生词异常:', { error: errorMessage })

    // 重新抛出错误
    throw error
  }
}

/**
 * 获取用户的生词本列表
 * @param supabase - Supabase 客户端实例
 * @param userId - 用户 ID
 * @param options - 查询选项
 * @returns Promise<SpeakerGhostWord[]> 生词列表
 *
 * @example
 * const ghostWords = await getGhostWords(supabase, 'user-uuid', { isMastered: false })
 */
export async function getGhostWords(
  supabase: SupabaseClient,
  userId: string,
  options?: { isMastered?: boolean; limit?: number }
): Promise<SpeakerGhostWord[]> {
  console.log('[Speaker Data] 获取生词本列表:', { userId, options })

  try {
    let query = supabase
      .from('speaker_ghost_words')
      .select('*')
      .eq('user_id', userId)

    // 可选：按掌握状态过滤
    if (options?.isMastered !== undefined) {
      query = query.eq('is_mastered', options.isMastered)
    }

    // 排序：按创建时间倒序
    query = query.order('created_at', { ascending: false })

    // 可选：限制返回数量
    if (options?.limit) {
      query = query.limit(options.limit)
    }

    const { data, error } = await query

    if (error) {
      console.error('[Speaker Data] ❌ 查询生词本失败:', error)
      throw error
    }

    if (!data || data.length === 0) {
      console.log('[Speaker Data] ℹ️ 生词本为空')
      return []
    }

    console.log('[Speaker Data] ✅ 成功获取生词本列表:', { count: data.length })
    return data as SpeakerGhostWord[]
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Speaker Data] ❌ 获取生词本异常:', { error: errorMessage })

    // 重新抛出错误
    throw error
  }
}

/**
 * 标记生词为已掌握
 * @param supabase - Supabase 客户端实例
 * @param ghostWordId - 生词 ID
 * @returns Promise<void>
 *
 * @example
 * await markGhostWordAsMastered(supabase, 'ghost-word-uuid')
 */
export async function markGhostWordAsMastered(
  supabase: SupabaseClient,
  ghostWordId: string
): Promise<void> {
  console.log('[Speaker Data] 标记生词为已掌握:', { ghostWordId })

  try {
    const { error } = await supabase
      .from('speaker_ghost_words')
      .update({
        is_mastered: true,
        mastered_at: new Date().toISOString()
      })
      .eq('id', ghostWordId)

    if (error) {
      console.error('[Speaker Data] ❌ 标记生词失败:', error)
      throw error
    }

    console.log('[Speaker Data] ✅ 成功标记生词为已掌握')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Speaker Data] ❌ 标记生词异常:', { error: errorMessage })

    // 重新抛出错误
    throw error
  }
}
