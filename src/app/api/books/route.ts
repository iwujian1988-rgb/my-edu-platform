import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { title, description, cover_color } = body

    // 验证必填字段
    if (!title || title.trim().length === 0) {
      return NextResponse.json({ error: '词库名称不能为空' }, { status: 400 })
    }

    const supabase = await createClient()

    // 生成封面颜色（随机）
    const colors = [
      'from-green-400 to-green-500',
      'from-blue-400 to-blue-500',
      'from-purple-400 to-purple-500',
      'from-orange-400 to-orange-500',
      'from-pink-400 to-pink-500',
      'from-teal-400 to-teal-500'
    ]
    const selectedColor = cover_color || colors[Math.floor(Math.random() * colors.length)]

    // 创建词库
    const { data: book, error } = await supabase
      .from('books')
      .insert({
        title: title.trim(),
        description: description?.trim() || '',
        cover_color: selectedColor,
        category: 'custom', // 自定义词库的category
        is_official: false, // 标记为非官方词库
        total_words: 0,
        total_chapters: 0,
        created_by: user.id
      } as any)
      .select()
      .single()

    if (error) {
      console.error('Error creating book:', error)
      return NextResponse.json({ error: '创建词库失败' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      book
    })
  } catch (error) {
    console.error('Error in POST /api/books:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
