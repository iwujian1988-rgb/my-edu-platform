/**
 * 阅读进度管理
 *
 * 功能：
 * 1. 保存用户的阅读进度（页码、筛选条件）
 * 2. 恢复用户的阅读进度
 * 3. 检查是否有保存的进度
 */

import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

export interface ReadingProgress {
  bookId: string
  page: number
  theme: string
  scenario: string
  chapter: string
  status: string
}

/**
 * 保存阅读进度到数据库
 */
export async function saveReadingProgress(progress: ReadingProgress): Promise<void> {
  console.log('🔥 [saveReadingProgress] Starting save for book:', progress.bookId, 'page:', progress.page)

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.log('❌ [saveReadingProgress] No user logged in')
      return
    }

    console.log('✅ [saveReadingProgress] User authenticated:', user.id)

    // 先尝试更新，如果记录不存在则插入
    console.log('🔄 [saveReadingProgress] Attempting update...')
    const { error: updateError } = await (supabase
      .from('user_book_preferences') as any)
      .update({
        last_reading_progress: progress,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .eq('book_id', progress.bookId)

    // 如果更新失败（记录不存在），则插入新记录
    if (updateError) {
      console.log('⚠️ [saveReadingProgress] Update failed, trying insert. Error:', updateError)
      const { error: insertError } = await supabase
        .from('user_book_preferences')
        .insert({
          user_id: user.id,
          book_id: progress.bookId,
          last_reading_progress: progress
        })

      if (insertError) {
        // 只在有实质错误时打印（忽略空对象和权限错误）
        const hasErrorDetails = insertError.message || insertError.code || insertError.hint
        const isEmptyError = Object.keys(insertError).length === 0
        if (hasErrorDetails && !isEmptyError) {
          console.error('❌ [saveReadingProgress] Failed to insert:', insertError)
        }
      } else {
        console.log('✅ [saveReadingProgress] Inserted successfully:', progress)
      }
    } else {
      console.log('✅ [saveReadingProgress] Updated successfully:', progress)
    }
  } catch (error) {
    // 捕获异常，静默处理
    console.error('❌ [saveReadingProgress] Exception:', error)
  }
}

/**
 * 获取阅读进度
 */
export async function getReadingProgress(bookId: string): Promise<ReadingProgress | null> {
  console.log('🔍 [getReadingProgress] Fetching progress for book:', bookId)

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.log('❌ [getReadingProgress] No user logged in')
      // 用户未登录，静默返回
      return null
    }

    console.log('✅ [getReadingProgress] User authenticated:', user.id)

    const { data, error } = await supabase
      .from('user_book_preferences')
      .select('last_reading_progress')
      .eq('user_id', user.id)
      .eq('book_id', bookId)
      .maybeSingle()

    // 只在有实质错误时打印（忽略空对象、"找不到记录"和权限错误）
    if (error) {
      const hasErrorDetails = error.message || error.code || error.hint
      const isNotFoundError = error.code === 'PGRST116'
      const isPermissionError = error.code === '42501' // RLS permission error

      // 检查是否是空对象（没有属性）
      const isEmptyError = Object.keys(error).length === 0

      if (hasErrorDetails && !isNotFoundError && !isPermissionError && !isEmptyError) {
        console.error('❌ [getReadingProgress] Query error:', error)
      }
      console.log('⚠️ [getReadingProgress] Query returned error (ignoring):', error.code)
      // 如果是空对象、PGRST116 或权限错误，静默处理
    }

    console.log('📦 [getReadingProgress] Query result:', data)

    const savedProgress = (data as any)?.last_reading_progress
    if (!savedProgress) {
      console.log('ℹ️ [getReadingProgress] No saved progress found')
      // 没有保存的进度，静默返回
      return null
    }

    // 检查是否是当前词书的进度
    if (savedProgress.bookId !== bookId) {
      console.log('⚠️ [getReadingProgress] Progress bookId mismatch:', savedProgress.bookId, 'vs', bookId)
      // 其他书的进度，静默返回
      return null
    }

    console.log('✅ [getReadingProgress] Found valid progress:', savedProgress)
    return savedProgress
  } catch (error) {
    // 捕获异常，静默处理
    console.error('❌ [getReadingProgress] Exception:', error)
    return null
  }
}

/**
 * 清除阅读进度
 */
export async function clearReadingProgress(bookId: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await (supabase
      .from('user_book_preferences') as any)
      .update({
        last_reading_progress: null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)

    if (error) {
      // 只在有实质错误时打印（忽略空对象和权限错误）
      const hasErrorDetails = error.message || error.code || error.hint
      const isEmptyError = Object.keys(error).length === 0
      if (hasErrorDetails && !isEmptyError) {
        console.error('Failed to clear reading progress:', error)
      }
    } else {
      console.log('✅ Reading progress cleared')
    }
  } catch (error) {
    // 捕获异常，静默处理
    console.error('Exception in clearReadingProgress:', error)
  }
}
