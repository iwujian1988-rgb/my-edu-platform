/**
 * 修复视频单词数据 API
 *
 * 暂时禁用：引用了不存在的模块 (@/lib/dict/lookup)
 * 待补回依赖模块后可重新启用
 * 原始代码保留在 git 历史中 (commit 5d57415)
 */

import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    { error: '此接口已暂时禁用，待依赖模块恢复后重新启用', code: 'DISABLED' },
    { status: 503 }
  )
}
