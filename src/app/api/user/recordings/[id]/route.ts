/**
 * 用户录音 API - 单个录音操作
 *
 * DELETE /api/user/recordings/[id] - 删除录音
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/** DELETE 请求：删除录音 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const recordingId = params.id

    // 删除录音（RLS 会确保只能删除自己的录音）
    const { error } = await supabase
      .from('user_recordings')
      .delete()
      .eq('id', recordingId)
      .eq('user_id', user.id)

    if (error) {
      console.error('[recordings DELETE] Error:', error)
      return NextResponse.json({ error: 'Failed to delete recording' }, { status: 500 })
    }

    console.log('[recordings DELETE] Success:', recordingId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[recordings DELETE] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
