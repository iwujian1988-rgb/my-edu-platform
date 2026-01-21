#!/usr/bin/env node

/**
 * 执行打字练习数据库迁移
 * 运行方式: node run-typing-migration.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 从环境变量读取配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 错误: 缺少Supabase配置')
  console.error('请确保 .env.local 文件包含:')
  console.error('  NEXT_PUBLIC_SUPABASE_URL')
  console.error('  SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// 创建Supabase客户端（使用service role key）
const supabase = createClient(supabaseUrl, supabaseKey)

async function executeMigration() {
  console.log('🚀 开始执行打字练习功能迁移...\n')

  try {
    // 读取迁移文件
    const migrationFile = join(__dirname, 'supabase/migrations/20260116_add_typing_recent_practice.sql')
    const sql = readFileSync(migrationFile, 'utf-8')

    console.log('📄 迁移文件: 20260116_add_typing_recent_practice.sql')
    console.log(`📝 SQL内容长度: ${sql.length} 字符\n`)

    // 分割SQL语句（按分号分隔，但要忽略注释中的分号）
    const statements = sql
      .split(/\n(?=--|$)/m) // 先按注释分割
      .map(block => block.trim())
      .filter(block => block && !block.startsWith('--'))
      .join('\n')
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--'))

    console.log(`📦 共 ${statements.length} 条SQL语句\n`)

    // 逐条执行（注意：Supabase REST API不直接支持DDL）
    // 我们需要通过RPC调用或使用PostgreSQL连接
    // 这里先显示SQL，然后在Supabase Dashboard执行

    console.log('⚠️  注意: Supabase REST API无法直接执行DDL语句')
    console.log('📋 请将以下SQL复制到Supabase Dashboard的SQL编辑器中执行:\n')
    console.log('━'.repeat(80))
    console.log(sql)
    console.log('━'.repeat(80))
    console.log('\n✅ 或者访问: https://snnrjnpcmdsdlyldvvps.supabase.co/project/default/sql')
    console.log('✅ 粘贴上面的SQL并点击"Run"按钮\n')

  } catch (error) {
    console.error('❌ 迁移失败:', error.message)
    process.exit(1)
  }
}

executeMigration()
  .then(() => {
    console.log('✨ 迁移准备完成!')
    console.log('📝 下一步: 将SQL复制到Supabase Dashboard执行\n')
  })
  .catch((error) => {
    console.error('❌ 脚本执行失败:', error)
    process.exit(1)
  })
