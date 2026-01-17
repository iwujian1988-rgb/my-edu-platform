import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * PUT /api/books/{bookId}/chapters/{chapterId}
 * 更新章节标题或排序位置
 * 权限要求：词库创建者
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ bookId: string; chapterId: string }> }
) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { bookId, chapterId } = await params
    const body = await request.json()
    const { title, order_index } = body

    const supabase = await createClient()

    // ===== 权限检查 =====
    const { data: book } = await supabase
      .from('books')
      .select('id, created_by, is_official')
      .eq('id', bookId)
      .single()

    if (!book || (book as any).created_by !== user.id) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 })
    }

    // ===== 参数验证 =====
    const updateData: any = {}

    // 验证title参数
    if (title !== undefined) {
      // 显式检查null值
      if (title === null) {
        return NextResponse.json({ error: '章节标题不能为null' }, { status: 400 })
      }
      if (typeof title !== 'string') {
        return NextResponse.json({ error: '章节标题必须是字符串' }, { status: 400 })
      }
      if (title.trim().length === 0) {
        return NextResponse.json({ error: '章节标题不能为空' }, { status: 400 })
      }
      if (title.length > 50) {
        return NextResponse.json({ error: '章节标题不能超过50个字符' }, { status: 400 })
      }

      // 检查标题重复（排除自己）
      const { data: existingChapter } = await supabase
        .from('chapters')
        .select('id')
        .eq('book_id', bookId)
        .eq('title', title.trim())
        .neq('id', chapterId)
        .maybeSingle()

      if (existingChapter) {
        return NextResponse.json({ error: '章节标题已存在' }, { status: 400 })
      }

      updateData.title = title.trim()
    }

    // 验证order_index参数
    if (order_index !== undefined) {
      // 显式检查null值
      if (order_index === null) {
        return NextResponse.json({ error: '排序位置不能为null' }, { status: 400 })
      }
      if (typeof order_index !== 'number') {
        return NextResponse.json({ error: '排序位置必须是数字' }, { status: 400 })
      }
      // 验证：必须是非负整数
      if (!Number.isInteger(order_index) || order_index < 0) {
        return NextResponse.json({ error: '排序位置必须是非负整数' }, { status: 400 })
      }
      updateData.order_index = order_index
    }

    // ===== 更新章节 =====
    const { data: updatedChapter, error } = await supabase
      .from('chapters')
      .update(updateData)
      .eq('id', chapterId)
      .eq('book_id', bookId)
      .select()
      .single()

    if (error || !updatedChapter) {
      console.error('Error updating chapter:', error)
      return NextResponse.json({ error: '更新章节失败' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: updatedChapter
    })
  } catch (error) {
    console.error('Error in PUT /api/books/[bookId]/chapters/[chapterId]:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

/**
 * DELETE /api/books/{bookId}/chapters/{chapterId}
 * 删除指定章节
 * 权限要求：词库创建者
 * 约束：默认章节不能删除
 * 行为：删除章节后，该章节的单词自动移到默认章节
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ bookId: string; chapterId: string }> }
) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { bookId, chapterId } = await params
    const supabase = await createClient()

    // ===== 权限检查 =====
    const { data: book } = await supabase
      .from('books')
      .select('id, created_by, is_official')
      .eq('id', bookId)
      .single()

    if (!book || (book as any).created_by !== user.id) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 })
    }

    // ===== 查询章节信息 =====
    const { data: chapter, error: chapterError } = await supabase
      .from('chapters')
      .select('id, title, is_default')
      .eq('id', chapterId)
      .eq('book_id', bookId)
      .single()

    if (chapterError || !chapter) {
      return NextResponse.json({ error: '章节不存在' }, { status: 404 })
    }

    // ===== 检查是否为默认章节 =====
    if ((chapter as any).is_default === true) {
      return NextResponse.json({ error: '默认章节不能删除' }, { status: 400 })
    }

    // ===== 查找或创建默认章节 =====
    let defaultChapterId

    const { data: existingDefault } = await supabase
      .from('chapters')
      .select('id')
      .eq('book_id', bookId)
      .eq('is_default', true)
      .maybeSingle()

    if (existingDefault) {
      defaultChapterId = existingDefault.id
    } else {
      // 创建默认章节
      const { data: newDefault } = await supabase
        .from('chapters')
        .insert({
          book_id: bookId,
          title: '默认章节',
          order_index: 0,
          word_count: 0,
          is_default: true
        } as any)
        .select()
        .single()

      if (!newDefault) {
        return NextResponse.json({ error: '创建默认章节失败' }, { status: 500 })
      }

      defaultChapterId = newDefault.id
    }

    // ===== 统计要移动的单词数量 =====
    const { count: wordCount } = await supabase
      .from('words')
      .select('*', { count: 'exact', head: true })
      .eq('chapter_id', chapterId)

    // ===== 移动单词到默认章节 =====
    if (wordCount && wordCount > 0) {
      await supabase
        .from('words')
        .update({ chapter_id: defaultChapterId })
        .eq('chapter_id', chapterId)

      // 更新默认章节的单词计数
      await supabase.rpc('increment_chapter_word_count', {
        chapter_uuid: defaultChapterId,
        increment_by: wordCount
      })
    }

    // ===== 删除章节 =====
    const { error: deleteError } = await supabase
      .from('chapters')
      .delete()
      .eq('id', chapterId)

    if (deleteError) {
      console.error('Error deleting chapter:', deleteError)
      return NextResponse.json({ error: '删除章节失败' }, { status: 500 })
    }

    // ===== 重新排序剩余章节 =====
    const { data: remainingChapters } = await supabase
      .from('chapters')
      .select('id')
      .eq('book_id', bookId)
      .order('order_index', { ascending: true })

    if (remainingChapters && remainingChapters.length > 0) {
      for (let i = 0; i < remainingChapters.length; i++) {
        await supabase
          .from('chapters')
          .update({ order_index: i + 1 })
          .eq('id', remainingChapters[i].id)
      }
    }

    return NextResponse.json({
      success: true,
      message: `章节已删除，${wordCount || 0}个单词已移到默认章节`,
      data: {
        movedWords: wordCount || 0
      }
    })
  } catch (error) {
    console.error('Error in DELETE /api/books/[bookId]/chapters/[chapterId]:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
