// 执行打字练习功能的数据库迁移
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://snnrjnpcmdsdlyldvvps.supabase.co"
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq22hc"

const supabase = createClient(supabaseUrl, supabaseKey)

async function executeMigration() {
  console.log('🚀 开始执行数据库迁移...\n')

  try {
    // 读取 SQL 文件
    const sqlFile = join(process.cwd(), 'supabase', 'migrations', '20260116005439_add_typing_practice_support.sql')
    const sql = readFileSync(sqlFile, 'utf-8')

    // 将 SQL 按语句分割（跳过注释和空行）
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--') && !s.startsWith('/*'))

    console.log(`📝 找到 ${statements.length} 条 SQL 语句\n`)

    // 执行每条语句
    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]

      // 跳过验证语句（以 SELECT 开头）
      if (statement.toUpperCase().startsWith('SELECT')) {
        console.log(`⏭️  [${i + 1}/${statements.length}] 跳过验证语句`)
        continue
      }

      try {
        // 使用 rpc 执行 SQL（需要 Supabase 有执行 SQL 的权限）
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: statement })

        if (error) {
          // 如果 rpc 不存在，尝试其他方法
          console.log(`⚠️  [${i + 1}/${statements.length}] 无法通过 RPC 执行，这可能需要手动操作`)
          console.log(`   语句: ${statement.substring(0, 50)}...`)
          errorCount++
        } else {
          console.log(`✅ [${i + 1}/${statements.length}] 执行成功`)
          successCount++
        }
      } catch (err: any) {
        console.log(`❌ [${i + 1}/${statements.length}] 执行失败: ${err.message}`)
        errorCount++
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log(`✅ 成功: ${successCount} 条`)
    console.log(`❌ 失败: ${errorCount} 条`)
    console.log('='.repeat(60))

    if (errorCount > 0) {
      console.log('\n⚠️  部分语句执行失败，这可能是因为：')
      console.log('   1. Supabase JS 客户端不支持直接执行 DDL 语句')
      console.log('   2. 需要使用 Supabase Dashboard 或 psql 手动执行\n')
      console.log('📋 建议操作：')
      console.log('   方法 1: 访问 Supabase Dashboard')
      console.log('         → Database → SQL Editor')
      console.log('         → 粘贴迁移文件内容并执行\n')
      console.log('   方法 2: 使用 psql 命令行')
      console.log('         psql -h db.snnrjnpcmdsdlyldvvps.supabase.co -U postgres -d postgres < supabase/migrations/20260116005439_add_typing_practice_support.sql')
    } else {
      console.log('\n🎉 迁移执行成功！')
    }

  } catch (error: any) {
    console.error('\n💥 迁移执行失败:', error.message)
  }
}

executeMigration()
  .then(() => {
    console.log('\n✨ 迁移流程完成')
    process.exit(0)
  })
  .catch(err => {
    console.error('\n💥 脚本执行失败:', err)
    process.exit(1)
  })
