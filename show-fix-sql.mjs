#!/usr/bin/env node

import { readFileSync } from 'fs'

try {
  const migrationFile = 'supabase/migrations/20260116_fix_typing_recent_book_field.sql'
  const sql = readFileSync(migrationFile, 'utf-8')

  console.log('\n' + '━'.repeat(80))
  console.log('📋 修复Book字段错误 - 数据库迁移SQL')
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
