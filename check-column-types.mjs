/**
 * 检查words表的列类型
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function loadEnvFile() {
  try {
    const envPath = join(__dirname, '.env.local')
    const envContent = readFileSync(envPath, 'utf-8')

    const envVars = {}
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=')
      const value = valueParts.join('=').trim()
      const cleanValue = value.replace(/^[\"']|[\"']$/g, '')
      if (key && cleanValue) {
        envVars[key.trim()] = cleanValue
      }
    })

    return envVars
  } catch (error) {
    return {}
  }
}

const env = loadEnvFile()
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

async function checkColumnTypes() {
  console.log('🔍 检查words表的列类型...\n')

  try {
    // 使用 information_schema 查询列类型
    const { data, error } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT
            column_name,
            data_type,
            character_maximum_length,
            is_nullable
          FROM information_schema.columns
          WHERE table_name = 'words'
            AND table_schema = 'public'
          ORDER BY ordinal_position;
        `
      })

    if (error) {
      console.log('❌ 无法查询information_schema')
      console.log('尝试使用PostgreSQL直接查询...')

      // 尝试使用\d命令（通过psql）
      console.log('\n请手动在Supabase SQL编辑器执行:')
      console.log('\\d words')
    } else {
      console.log('✅ words表的列类型:')
      data.forEach(col => {
        console.log(`  ${col.column_name}: ${col.data_type}(${col.character_maximum_length || 'no limit'})`)
      })
    }

    // 查询chapters.title, themes.name, scenes.name的类型
    console.log('\n🔍 检查相关表的字段类型...')
    console.log('请在Supabase SQL编辑器执行:')
    console.log(`
SELECT
  table_name,
  column_name,
  data_type,
  character_maximum_length
FROM information_schema.columns
WHERE table_name IN ('chapters', 'themes', 'scenes')
  AND column_name IN ('title', 'name')
ORDER BY table_name, column_name;
    `)

  } catch (error) {
    console.error('\n❌ 操作失败:', error)
  }
}

checkColumnTypes()
