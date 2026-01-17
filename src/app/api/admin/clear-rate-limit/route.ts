import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/admin/clear-rate-limit
 * 清空注册频率限制
 * 用法: { "ipAddress": "可选：指定IP，不传则清空所有" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ipAddress } = body

    const supabase = await createAdminClient()

    let deletedCount = 0
    let message = ''

    if (ipAddress) {
      // 清空指定IP的限制
      const { data: regData, error: regError } = await supabase
        .from('registration_attempts')
        .delete()
        .eq('ip_address', ipAddress)
        .select()

      const { data: invData, error: invError } = await supabase
        .from('invitation_code_attempts')
        .delete()
        .eq('ip_address', ipAddress)
        .select()

      if (regError) console.error('Error deleting registration_attempts:', regError)
      if (invError) console.error('Error deleting invitation_code_attempts:', invError)

      const regCount = regData?.length || 0
      const invCount = invData?.length || 0
      deletedCount = regCount + invCount

      message = `已清空 IP ${ipAddress} 的限制（注册记录: ${regCount}条，邀请码记录: ${invCount}条）`
    } else {
      // 清空所有限制
      const { count: regCount } = await supabase
        .from('registration_attempts')
        .delete()
        .neq('ip_address', '000000000000')

      const { count: invCount } = await supabase
        .from('invitation_code_attempts')
        .delete()
        .neq('code', '000000000000')

      deletedCount = (regCount || 0) + (invCount || 0)
      message = `已清空所有注册限制（注册记录: ${regCount}条，邀请码记录: ${invCount}条）`
    }

    return NextResponse.json({
      success: true,
      message,
      deletedCount
    })
  } catch (error: any) {
    console.error('Error in POST /api/admin/clear-rate-limit:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
