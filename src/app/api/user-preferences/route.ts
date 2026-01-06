import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/user-preferences?book_id=xxx
// 获取用户对某本书的偏好设置
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const bookId = request.nextUrl.searchParams.get('book_id')
    if (!bookId) {
      return NextResponse.json({ error: 'book_id is required' }, { status: 400 })
    }

    // 获取用户对这本书的偏好设置
    const { data: preferences } = await supabase
      .from('user_book_preferences')
      .select('hide_chinese')
      .eq('user_id', user.id)
      .eq('book_id', bookId)
      .maybeSingle()

    return NextResponse.json({
      success: true,
      data: {
        hide_chinese: preferences?.hide_chinese || false
      }
    })
  } catch (error) {
    console.error('Error fetching user preferences:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/user-preferences
// 保存用户对某本书的偏好设置
export async function POST(request: NextRequest) {
  try {
    console.log('=== POST /api/user-preferences ===')

    const supabase = await createClient()

    // 调试：检查是否能获取到用户
    const { data: userData, error: userError } = await supabase.auth.getUser()

    console.log('Auth result:', {
      hasUser: !!userData.user,
      userError: userError?.message,
      userId: userData.user?.id,
      userEmail: userData.user?.email
    })

    if (!userData.user) {
      console.error('POST /api/user-preferences: No user found')
      // 尝试 getSession 作为备选
      const { data: { session } } = await supabase.auth.getSession()
      console.log('Session fallback:', {
        hasSession: !!session,
        sessionUserId: session?.user?.id
      })
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'Please login first',
          debug: {
            hasUser: !!userData.user,
            hasSession: !!session
          }
        },
        { status: 401 }
      )
    }

    const user = userData.user

    const body = await request.json()
    const { book_id, hide_chinese } = body

    console.log('Request body:', { book_id, hide_chinese })

    if (!book_id || typeof hide_chinese !== 'boolean') {
      console.error('POST /api/user-preferences: Invalid request body', body)
      return NextResponse.json(
        { error: 'book_id and hide_chinese (boolean) are required' },
        { status: 400 }
      )
    }

    console.log('Saving preferences for user:', user.email, { book_id, hide_chinese })

    // 使用 UPSERT 保存或更新偏好设置
    const { data: preferencesData, error } = await supabase
      .from('user_book_preferences')
      .upsert(
        {
          user_id: user.id,
          book_id,
          hide_chinese,
          updated_at: new Date().toISOString()
        },
        {
          onConflict: 'user_id,book_id',
          ignoreDuplicates: false
        }
      )
      .select()
      .single()

    if (error) {
      console.error('❌ Database error saving preferences:', error)
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      return NextResponse.json(
        {
          error: 'Failed to save preferences',
          details: error.message,
          code: error.code
        },
        { status: 500 }
      )
    }

    console.log('✅ Preferences saved successfully:', preferencesData)

    return NextResponse.json({
      success: true,
      data: preferencesData
    })
  } catch (error) {
    console.error('❌ Exception in POST /api/user-preferences:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
