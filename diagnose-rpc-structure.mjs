import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function diagnose() {
  console.log('🔍 诊断 RPC 函数结构...\n')

  // 1. 检查函数是否存在
  console.log('1️⃣ 检查函数是否存在...')
  const { data: functions, error: funcError } = await supabase
    .rpc('get_user_progress_cards', { p_user_id: '00000000-0000-0000-0000-000000000000' })

  if (funcError) {
    console.log('   函数存在但执行出错:')
    console.log('   错误代码:', funcError.code)
    console.log('   错误信息:', funcError.message)
    console.log('   错误详情:', funcError.hint)
  } else {
    console.log('   ✅ 函数存在')
  }

  // 2. 测试查询结构（不通过函数，直接执行 SELECT）
  console.log('\n2️⃣ 测试 SELECT 查询结构...')
  const { data: userData, error: userError } = await supabase
    .from('user_book_preferences')
    .select('user_id')
    .limit(1)

  if (userError || !userData || userData.length === 0) {
    console.log('   ❌ 无法获取测试用户')
    return
  }

  const testUserId = userData[0].user_id
  console.log('   使用测试用户:', testUserId)

  // 3. 执行原始查询（使用 PostgREST 的 /rpc 端点）
  console.log('\n3️⃣ 测试原始 SQL 查询...')
  const { data: rawData, error: rawError } = await supabase
    .rpc('get_user_progress_cards', { p_user_id: testUserId })

  if (rawError) {
    console.log('   ❌ RPC 调用失败')
    console.log('   错误代码:', rawError.code)
    console.log('   错误信息:', rawError.message)
    console.log('   错误提示:', rawError.hint)

    // 分析错误
    if (rawError.code === '42804') {
      console.log('\n   📊 错误分析: 返回类型不匹配')
      console.log('   可能原因:')
      console.log('   1. RETURNS TABLE 定义的字段数量与 SELECT 不一致')
      console.log('   2. RETURNS TABLE 定义的字段类型与 SELECT 不一致')
      console.log('   3. 某个字段的数据类型转换失败')
    }
  } else {
    console.log('   ✅ RPC 调用成功')
    console.log('   返回条数:', rawData?.length || 0)
    if (rawData && rawData.length > 0) {
      console.log('   示例数据:', JSON.stringify(rawData[0], null, 2))
    }
  }

  // 4. 检查表结构
  console.log('\n4️⃣ 检查表结构...')
  const { data: tables, error: tableError } = await supabase
    .from('user_book_preferences')
    .select('*')
    .limit(1)

  if (tableError) {
    console.log('   ❌ 无法访问 user_book_preferences 表')
  } else {
    console.log('   ✅ user_book_preferences 表可访问')
    if (tables && tables.length > 0) {
      console.log('   字段列表:', Object.keys(tables[0]).join(', '))
    }
  }

  const { data: books, error: booksError } = await supabase
    .from('books')
    .select('id, title')
    .limit(1)

  if (booksError) {
    console.log('   ❌ 无法访问 books 表')
  } else {
    console.log('   ✅ books 表可访问')
  }
}

diagnose().catch(console.error)
