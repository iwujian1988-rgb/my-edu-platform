/**
 * 错误日志接收 API
 * 用于接收前端上报的错误日志
 */

import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

interface ErrorLog {
  type: 'javascript' | 'network' | 'hydration' | 'performance'
  message: string
  stack?: string
  url: string
  userAgent: string
  userId?: string
  timestamp: number
  environment: string
  extra?: Record<string, any>
}

export async function POST(request: NextRequest) {
  try {
    const { logs } = await request.json()

    if (!Array.isArray(logs) || logs.length === 0) {
      return NextResponse.json({ error: '无效的日志数据' }, { status: 400 })
    }

    // 方案1：存储到数据库（Supabase）
    const supabase = createRouteHandlerClient({ cookies })

    // 批量插入日志
    const { data, error } = await supabase
      .from('error_logs')
      .insert(
        logs.map((log: ErrorLog) => ({
          log_type: log.type,
          message: log.message.substring(0, 1000), // 限制长度
          stack: log.stack?.substring(0, 5000), // 限制长度
          url: log.url.substring(0, 500),
          user_agent: log.userAgent.substring(0, 500),
          user_id: log.userId || null,
          timestamp: new Date(log.timestamp).toISOString(),
          environment: log.environment,
          extra: log.extra ? JSON.stringify(log.extra).substring(0, 1000) : null,
          created_at: new Date().toISOString(),
        }))
      )
      .select()

    if (error) {
      console.error('[Error Logs API] 存储失败:', error)
      // 即使数据库失败，也记录到文件日志
      console.error('[Error Logs API] 日志内容:', logs)
    }

    // 方案2：同时发送通知（可选）
    // 如果是严重错误，发送邮件/钉钉/企业微信通知
    const criticalErrors = logs.filter((log: ErrorLog) =>
      log.type === 'javascript' && log.stack ||
      log.type === 'hydration'
    )

    if (criticalErrors.length > 0) {
      // TODO: 实现通知逻辑
      // await sendNotification(criticalErrors)
    }

    return NextResponse.json({
      success: true,
      received: logs.length,
      stored: data?.length || 0,
    })
  } catch (error) {
    console.error('[Error Logs API] 处理失败:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}

// GET 方法：查询日志（管理员专用）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')
    const type = searchParams.get('type')
    const userId = searchParams.get('userId')

    const supabase = createRouteHandlerClient({ cookies })

    let query = supabase
      .from('error_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // 可选过滤条件
    if (type) {
      query = query.eq('log_type', type)
    }
    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      logs: data,
      count: data?.length || 0,
    })
  } catch (error) {
    console.error('[Error Logs API] 查询失败:', error)
    return NextResponse.json(
      { error: '查询失败' },
      { status: 500 }
    )
  }
}
