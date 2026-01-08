/**
 * Signup API Route
 * REST API endpoint for user registration
 * Used by external clients and testing scripts
 */

import { NextRequest, NextResponse } from 'next/server'
import { signup } from '@/app/login/actions'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone, password, invitationCode } = body

    // Validate required fields
    if (!phone || !password || !invitationCode) {
      return NextResponse.json(
        { error: '缺少必填字段' },
        { status: 400 }
      )
    }

    // Call the signup server action
    const result = await signup({ phone, password, invitationCode })

    // Return the result
    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Signup API error:', error)
    return NextResponse.json(
      { error: error.message || '注册失败，请重试' },
      { status: 500 }
    )
  }
}
