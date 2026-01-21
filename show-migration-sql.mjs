#!/usr/bin/env node

/**
 * 显示迁移SQL内容
 */

import { readFileSync } from 'fs'

try {
  const migrationFile = 'supabase/migrations/20260116_add_typing_recent_practice.sql'
  const sql = readFileSync(migrationFile, 'utf-8')

  console.log('\n' + '━'.repeat(80))
  console.log('📋 打字练习功能 - 数据库迁移SQL')
  console.log('━'.repeat(80) + '\n')
  console.log(sql)
  console.log('\n' + '━'.repeat(80))
  console.log('📝 执行步骤:')
  console.log('  1. 访问: https://snnrjnpcmdsdlyldvvps.supabase.co/project/default/sql')
  console.log('  2. 复制上面的SQL内容')
  console.log('  3. 粘贴到SQL编辑器')
  console.log('  4. 点击"Run"按钮执行')
  console.log('━'.repeat(80) + '\n')

} catch (error) {
  console.error('❌ 错误:', error.message)
  process.exit(1)
}
