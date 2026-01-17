import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * POST /api/words/batch-move
 * 批量移动单词到指定章节
 * 权限要求：词库创建者
 * 事务性：全部成功或全部失败
 */
export async function POST(request: Request) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { wordIds, targetChapterId } = body

    // ===== 参数验证 =====
    if (!Array.isArray(wordIds) || wordIds.length === 0) {
      return NextResponse.json({ error: '单词ID列表不能为空' }, { status: 400 })
    }

    if (wordIds.length > 100) {
      return NextResponse.json({
        error: '每次最多移动100个单词',
        requested: wordIds.length,
        limit: 100
      }, { status: 400 })
    }

    const supabase = await createClient()

    // ===== 查询单词和词库信息 =====
    const { data: words, error: wordsError } = await supabase
      .from('words')
      .select('id, book_id, chapter_id')
      .in('id', wordIds)

    if (wordsError || !words || words.length === 0) {
      return NextResponse.json({ error: '单词不存在' }, { status: 404 })
    }

    // 检查所有单词是否属于同一词库
    const bookIds = [...new Set(words.map((w: any) => w.book_id))]
    if (bookIds.length > 1) {
      return NextResponse.json({ error: '所有单词必须属于同一词库' }, { status: 400 })
    }

    const bookId = bookIds[0]

    // ===== 权限验证 =====
    const { data: book } = await supabase
      .from('books')
      .select('id, created_by')
      .eq('id', bookId)
      .single()

    if (!book || (book as any).created_by !== user.id) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 })
    }

    // ===== 验证目标章节 =====
    if (targetChapterId !== null && targetChapterId !== undefined) {
      const { data: targetChapter } = await supabase
        .from('chapters')
        .select('id, book_id')
        .eq('id', targetChapterId)
        .single()

      if (!targetChapter || targetChapter.book_id !== bookId) {
        return NextResponse.json({ error: '目标章节不存在' }, { status: 404 })
      }
    }

    // ===== 批量更新单词的章节 =====
    const { data: updatedWords, error: updateError } = await supabase
      .from('words')
      .update({
        chapter_id: targetChapterId || null,
        updated_at: new Date().toISOString()
      })
      .in('id', wordIds)
      .select()

    if (updateError) {
      console.error('Error moving words:', updateError)
      return NextResponse.json({ error: '移动单词失败' }, { status: 500 })
    }

    // ===== 更新章节的单词计数 =====

    // 收集原章节ID（需要减少计数）
    const sourceChapterIds = [...new Set(
      words
        .map((w: any) => w.chapter_id)
        .filter((id: string | null) => id !== null)
    )]

    // 更新所有受影响章节的计数
    const affectedChapterIds = [...sourceChapterIds]
    if (targetChapterId) {
      affectedChapterIds.push(targetChapterId)
    }

    for (const chapterId of affectedChapterIds) {
      const { count } = await supabase
        .from('words')
        .select('*', { count: 'exact', head: true })
        .eq('chapter_id', chapterId)

      await supabase
        .from('chapters')
        .update({ word_count: count || 0 })
        .eq('id', chapterId)
    }

    // ===== 获取章节标题（用于返回消息） =====
    let targetChapterTitle = '默认章节'
    if (targetChapterId) {
      const { data: chapter } = await supabase
        .from('chapters')
        .select('title')
        .eq('id', targetChapterId)
        .single()

      targetChapterTitle = chapter?.title || '默认章节'
    }

    return NextResponse.json({
      success: true,
      data: {
        moved: updatedWords?.length || 0,
        message: `已移动${updatedWords?.length || 0}个单词到「${targetChapterTitle}」`
      }
    })
  } catch (error) {
    console.error('Error in POST /api/words/batch-move:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
