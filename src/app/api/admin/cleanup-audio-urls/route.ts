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

    // 1. 查询所有包含错误URL的记录
    const { data: wrongUrls, error: queryError } = await supabase
      .from('words')
      .select('id, word, audio_url')
      .like('audio_url', '%dict.youdao.com%')
      .limit(10)  // 先查询10条，看看有多少

    if (queryError) {
      console.error('❌ 查询失败:', queryError)
      return NextResponse.json(
        { error: '查询失败', details: queryError },
        { status: 500 }
      )
    }

    if (!wrongUrls || wrongUrls.length === 0) {
      return NextResponse.json({
        success: true,
        message: '没有找到错误的有道API URL',
        count: 0
      })
    }

    console.error(`🔍 找到 ${wrongUrls.length} 条错误URL记录（仅显示前10条）`)

    // 2. 批量清空所有错误URL
    const { data: updateResult, error: updateError } = await supabase
      .from('words')
      .update({ audio_url: null })
      .like('audio_url', '%dict.youdao.com%')
      .select('id')

    if (updateError) {
      console.error('❌ 清理失败:', updateError)
      return NextResponse.json(
        { error: '清理失败', details: updateError },
        { status: 500 }
      )
    }

    const cleanedCount = updateResult?.length || 0

    console.error(`✅ 成功清理 ${cleanedCount} 条错误URL记录`)

    return NextResponse.json({
      success: true,
      message: `成功清理 ${cleanedCount} 条错误URL`,
      cleanedCount,
      examples: wrongUrls.slice(0, 5)  // 返回前5条作为示例
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
