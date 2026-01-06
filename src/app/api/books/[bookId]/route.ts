import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/books/[bookId]
 * 获取单词书详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const { bookId } = await params
    const supabase = await createClient()

    const { data: book, error } = await supabase
      .from('books')
      .select('*')
      .eq('id', bookId)
      .single()

    if (error) {
      console.error('Error fetching book:', error)
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: book
    })
  } catch (error) {
    console.error('Error in GET /api/books/[bookId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
