/**
 * GET /api/words
 *
 * 获取单词列表 API - 重构版
 *
 * @description 统一数据流，所有 status、shuffle 组合都走同一逻辑
 * @see docs/DICTATION_MODULE_DESIGN.md
 * @see docs/AI_CODING_GUARDRAILS.md
 */

import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { PAGINATION, ERROR_CODES } from './constants'
import { getWordsPaginated } from './words-service'
import type { GetWordsResponse, ErrorResponse, ScopeType } from './types'

// 强制动态渲染
export const dynamic = 'force-dynamic'

/**
 * GET /api/words?bookId=xxx&status=xxx&shuffle=true&page=1&pageSize=50
 *
 * 参数说明:
 * - bookId: 必填，词书 ID
 * - status: 可选，筛选状态 (all|unknown|fuzzy|known|new)，默认 'all'
 * - shuffle: 可选，是否乱序（默认 false）
 * - page: 可选，页码（从 1 开始），默认 1
 * - pageSize: 可选，每页数量，默认 50
 * - chapterId: 可选，章节筛选
 */
export async function GET(request: NextRequest) {
  // ========================================
  // Step 1: 用户认证
  // ========================================
  let user = await getCurrentUser()

  // 备选：从 Authorization header 获取
  if (!user) {
    try {
      const authHeader = request.headers.get('authorization')
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7)
        const supabase = await createClient()
        const { data: { user: userFromToken }, error } = await supabase.auth.getUser(token)
        if (!error && userFromToken) {
          user = userFromToken
        }
      }
    } catch (e) {
      // 忽略认证错误，继续检查
    }
  }

  if (!user) {
    return NextResponse.json({
      success: false,
      error: '请先登录',
      code: ERROR_CODES.UNAUTHORIZED,
    }, { status: 401 })
  }

  // ========================================
  // Step 2: 参数解析与验证
  // ========================================
  const searchParams = request.nextUrl.searchParams
  const bookId = searchParams.get('bookId')
  const status = (searchParams.get('status') || 'all') as ScopeType
  const shuffle = searchParams.get('shuffle') === 'true'
  const page = parseInt(searchParams.get('page') || '1', 10)
  const pageSize = parseInt(searchParams.get('pageSize') || String(PAGINATION.DEFAULT_PAGE_SIZE), 10)
  const chapterId = searchParams.get('chapterId') || undefined

  // 必填参数校验
  if (!bookId) {
    return NextResponse.json({
      success: false,
      error: 'bookId 是必填参数',
      code: ERROR_CODES.INVALID_PARAMS,
    }, { status: 400 })
  }

  // status 枚举校验
  const validStatuses: ScopeType[] = ['all', 'unknown', 'fuzzy', 'known', 'new']
  if (!validStatuses.includes(status)) {
    return NextResponse.json({
      success: false,
      error: `status 必须是 ${validStatuses.join(', ')} 之一`,
      code: ERROR_CODES.INVALID_PARAMS,
      details: { received: status },
    }, { status: 400 })
  }

  // ========================================
  // Step 3: 调用统一服务
  // ========================================
  const result = await getWordsPaginated({
    bookId,
    status,
    shuffle,
    page,
    pageSize,
    chapterId,
  })

  // ========================================
  // Step 4: 返回响应
  // ========================================
  if (!result.success) {
    const errorResponse = result as ErrorResponse
    const statusCode = errorResponse.code === ERROR_CODES.UNAUTHORIZED ? 401 :
                       errorResponse.code === ERROR_CODES.BOOK_NOT_FOUND ? 404 :
                       errorResponse.code === ERROR_CODES.INVALID_PARAMS ? 400 : 500

    return NextResponse.json(errorResponse, { status: statusCode })
  }

  const successResponse = result as GetWordsResponse

  return NextResponse.json(successResponse, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  })
}
