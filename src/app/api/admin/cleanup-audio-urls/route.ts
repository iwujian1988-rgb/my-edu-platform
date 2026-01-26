import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * POST /api/admin/cleanup-audio-urls
 * 清理数据库中错误的有道API URL
 *
 * 这个API会批量清空所有包含 "dict.youdao.com" 的 audio_url
 * 清空后，TTS API会自动从有道获取并上传到OSS
 */
export async function POST() {
  try {
    const supabase = await createAdminClient()

    console.error('🔄 开始清理错误的有道API URL（使用原生SQL）...')

    // 使用原生SQL直接执行（速度快，不会超时）
    const { data: updateResult, error: updateError } = await supabase.rpc('exec_sql', {
      sql: `UPDATE words SET audio_url = NULL WHERE audio_url LIKE '%dict.youdao.com%'`
    })

    // 如果 RPC 不可用，使用普通查询（但会慢）
    if (updateError) {
      console.warn('⚠️  RPC不可用，使用普通查询...')
      console.error('❌ 清理失败:', updateError)
      return NextResponse.json(
        { error: '清理失败', details: updateError.message, hint: '建议直接在数据库中执行SQL' },
        { status: 500 }
      )
    }

    console.error('✅ 清理完成')

    // 查询剩余的错误URL数量
    const { count, error: countError } = await supabase
      .from('words')
      .select('id', { count: 'exact', head: true })
      .like('audio_url', '%dict.youdao.com%')

    const remainingCount = countError ? 0 : (count || 0)

    return NextResponse.json({
      success: true,
      message: `清理完成，剩余 ${remainingCount} 条错误URL`,
      remainingCount
    })

  } catch (error) {
    console.error('❌ 清理audio_url失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/cleanup-audio-urls
 * 预览：统计有多少条错误URL需要清理
 */
export async function GET() {
  try {
    const supabase = await createAdminClient()

    const { count, error } = await supabase
      .from('words')
      .select('id', { count: 'exact', head: true })
      .like('audio_url', '%dict.youdao.com%')

    if (error) {
      return NextResponse.json(
        { error: '查询失败', details: error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      wrongUrlCount: count || 0,
      message: `数据库中有 ${count || 0} 条错误的有道API URL需要清理`
    })

  } catch (error) {
    console.error('❌ 查询失败:', error)
    return NextResponse.json(
      { error: '服务器内部错误', details: error.message },
      { status: 500 }
    )
  }
}
