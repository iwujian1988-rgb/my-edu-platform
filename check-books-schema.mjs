import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const envContent = readFileSync(join(__dirname, '.env.local'), 'utf-8')
const envVars = Object.fromEntries(
  envContent.split('\n')
    .filter(line => line.trim() && !line.startsWith('#'))
    .map(line => line.split('='))
    .map(([key, ...valueParts]) => [key, valueParts.join('=').replace(/"/g, '')])
)

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY
)

console.log('\n🔍 检查books表的schema\n')

// 获取一个样本记录
const { data: sampleBook, error } = await supabase
  .from('books')
  .select('*')
  .limit(1)
  .single()

if (error || !sampleBook) {
  console.log('❌ 查询失败:', error)
  process.exit(1)
}

console.log('📋 books表字段列表:')
console.log(Object.keys(sampleBook).join('\n'))

console.log('\n🔍 检查是否有category字段:')
console.log(`category字段存在: ${sampleBook.category !== undefined ? '✅ 是' : '❌ 否'}`)

if (sampleBook.category !== undefined) {
  console.log(`category值: "${sampleBook.category}"`)
} else {
  console.log('\n⚠️ books表没有category字段！')
  console.log('这会导致第61行代码访问undefined而报错')
}
