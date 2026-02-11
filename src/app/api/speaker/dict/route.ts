/**
 * 演说家模块 - 词典查询 API
 *
 * 路由：POST /api/speaker/dict
 * 功能：实时调用有道API获取单词释义
 */

import { NextResponse } from 'next/server'
import { getDictEntry } from '@/lib/dict-service'

export async function POST(request: Request) {
  console.log('[Speaker Dict API] 收到词典查询请求')

  try {
    const body = await request.json()
    const { word } = body

    if (!word) {
      return NextResponse.json(
        { error: 'MISSING_WORD', message: '缺少单词参数' },
        { status: 400 }
      )
    }

    console.log('[Speaker Dict API] 查询单词:', word)

    // 调用有道API
    const entry = await getDictEntry(word)

    if (entry.success === false) {
      return NextResponse.json(
        { error: 'DICT_API_FAILED', message: '词典查询失败' },
        { status: 500 }
      )
    }

    console.log('[Speaker Dict API] ✅ 查询成功')

    return NextResponse.json({
      success: true,
      entry
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Speaker Dict API] ❌ 查询失败:', { error: errorMessage })

    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: '服务器内部错误' },
      { status: 500 }
    )
  }
}
