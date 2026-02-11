import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.production' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function getWordsStructure() {
  const { data, error } = await supabase
    .from('words')
    .select('*')
    .limit(1)

  if (error) {
    console.error('Error:', error)
    process.exit(1)
  }

  console.log('\n=== words 表结构 ===\n')
  const columns = Object.keys(data[0])
  columns.forEach(col => {
    const value = data[0][col]
    const type = value === null ? 'NULL' : typeof value
    const sample = value === null ? 'null' : (typeof value === 'string' && value.length > 50 ? `"${value.substring(0, 50)}..."` : (typeof value === 'string' ? `"${value}"` : String(value)))
    console.log(`${col.padEnd(25)} | 类型: ${type.padEnd(10)} | 示例: ${sample}`)
  })

  console.log('\n=== 完整示例数据 ===')
  console.log(JSON.stringify(data[0], null, 2))
}

getWordsStructure()
