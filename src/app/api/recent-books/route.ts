import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET - 获取用户最近访问的词库（最多6个）
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // 第一步：获取用户最近访问的6个词库ID
    const { data: recentPrefs, error: prefsError } = await supabase
      .from('user_book_preferences')
      .select('book_id, last_accessed_at')
      .eq('user_id', user.id)
      .not('last_accessed_at', 'is', null)
      .order('last_accessed_at', { ascending: false })
      .limit(6)

    if (prefsError) throw prefsError

    // 如果没有访问记录，返回空数组
    if (!recentPrefs || recentPrefs.length === 0) {
      return NextResponse.json({ books: [] })
    }

    // 第二步：根据book_id查询书籍信息
    const bookIds = recentPrefs.map((pref: any) => pref.book_id)
    const { data: booksData, error: booksError } = await supabase
      .from('books')
      .select('id, title, description, total_words, cover_url, cover_color, created_by, is_official')
      .in('id', bookIds)

    if (booksError) throw booksError

    // 合并数据，保持最近访问的顺序
    const booksMap = new Map((booksData || []).map((book: any) => [book.id, book]))
    const books = recentPrefs
      .map((pref: any) => {
        const book = booksMap.get(pref.book_id)
        return book ? {
          ...book,
          last_accessed_at: pref.last_accessed_at
        } : null
      })
      .filter((book: any) => book !== null)

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
