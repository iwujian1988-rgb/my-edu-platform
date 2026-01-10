import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET - 获取用户最近访问的词库（最多8个）
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // 获取用户最近访问的8个词库
    const { data: recentPrefs, error } = await supabase
      .from('user_book_preferences')
      .select(`
        book_id,
        last_accessed_at,
        books (
          id,
          title,
          description,
          total_words,
          cover_url,
          cover_color
        )
      `)
      .eq('user_id', user.id)
      .not('last_accessed_at', 'is', null)
      .order('last_accessed_at', { ascending: false })
      .limit(8)

    if (error) throw error

    const books = recentPrefs?.map((pref: any) => ({
      ...pref.books,
      last_accessed_at: pref.last_accessed_at
    })) || []

    return NextResponse.json({ books })
  } catch (error: any) {
    console.error('Error fetching recent books:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recent books', details: error.message },
      { status: 500 }
    )
  }
}

// POST - 记录词库访问
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { bookId } = await request.json()
    if (!bookId) {
      return NextResponse.json({ error: 'bookId is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // 使用 upsert 来更新或创建记录
    const { error } = await supabase
      .from('user_book_preferences')
      .upsert({
        user_id: user.id,
        book_id: bookId,
        last_accessed_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,book_id',
        ignoreDuplicates: false
      })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error recording book access:', error)
    return NextResponse.json(
      { error: 'Failed to record book access', details: error.message },
      { status: 500 }
    )
  }
}
