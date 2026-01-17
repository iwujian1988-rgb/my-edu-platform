import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * POST /api/words/batch-delete
 * 批量删除多个单词
 * 权限要求：词库创建者
 * 幂等性：支持（重复请求不会报错）
 */
export async function POST(request: Request) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { wordIds } = body

    // ===== 参数验证 =====
    if (!Array.isArray(wordIds) || wordIds.length === 0) {
      return NextResponse.json({ error: '单词ID列表不能为空' }, { status: 400 })
    }

    if (wordIds.length > 100) {
      return NextResponse.json({
        error: '每次最多删除100个单词',
        requested: wordIds.length,
        limit: 100
      }, { status: 400 })
    }

    const supabase = await createClient()

    // ===== 查询单词所属词库（用于权限检查） =====
    const { data: words, error } = await supabase
      .from('words')
      .select('id, book_id, chapter_id')
      .in('id', wordIds)

    if (error) {
      return NextResponse.json({ error: '查询单词失败' }, { status: 500 })
    }

    if (!words || words.length === 0) {
      return NextResponse.json({ error: '没有找到要删除的单词' }, { status: 404 })
    }

    // ===== 权限验证 =====
    const bookIds = [...new Set(words.map((w: any) => w.book_id))]

    // 检查所有单词是否属于用户创建的词库
    const { data: books } = await supabase
      .from('books')
      .select('id, created_by')
      .in('id', bookIds)

    const hasPermission = books?.every((book: any) => book.created_by === user.id)
    if (!hasPermission) {
      return NextResponse.json({ error: '您只能删除自己词库中的单词' }, { status: 403 })
    }

    // ===== 批量删除（支持部分成功） =====
    const results = {
      deleted: 0,
      failed: 0,
      errors: [] as Array<{ wordId: string; reason: string }>
    }

    // 使用 Promise.allSettled 并行删除
    const deletePromises = wordIds.map(async (wordId) => {
      try {
        // 每个单词独立事务
        const { error } = await supabase
          .from('words')
          .delete()
          .eq('id', wordId)

        if (error) {
          throw error
        }

        results.deleted++
        return { success: true, wordId }

      } catch (error: any) {
        results.failed++
        results.errors.push({
          wordId,
          reason: error.message || '删除失败'
        })
        return { success: false, wordId, error }
      }
    })

    await Promise.allSettled(deletePromises)

    // ===== 更新词库统计（异步，不阻塞） =====
    setImmediate(async () => {
      for (const bookId of bookIds) {
        // 重新统计词库单词数
        const { count } = await supabase
          .from('words')
          .select('*', { count: 'exact', head: true })
          .eq('book_id', bookId)

        await supabase
          .from('books')
          .update({
            total_words: count || 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', bookId)
      }
    })

    return NextResponse.json({
      success: true,
      data: results
    })
  } catch (error) {
    console.error('Error in POST /api/words/batch-delete:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
