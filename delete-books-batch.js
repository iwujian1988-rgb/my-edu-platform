const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const envPath = path.join(__dirname, '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=')
    if (valueParts.length > 0) {
      let value = valueParts.join('=').trim()
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      if (key && value) {
        process.env[key.trim()] = value
      }
    }
  })
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function deleteAllBooksBatch() {
  console.log('\n🗑️  分批删除所有书籍...\n')

  let deleted = 0
  let hasError = false

  while (!hasError) {
    // 每次删除10本书
    const { data: books, error } = await supabase
      .from('books')
      .select('id, title')
      .limit(10)

    if (error) {
      console.error('查询失败:', error.message)
      hasError = true
      break
    }

    if (!books || books.length === 0) {
      console.log('✅ 所有书籍已删除')
      break
    }

    console.log(`删除 ${books.length} 本书...`)

    for (const book of books) {
      const { error: deleteError } = await supabase
        .from('books')
        .delete()
        .eq('id', book.id)

      if (deleteError) {
        console.error(`  ❌ 删除 ${book.title} 失败: ${deleteError.message}`)
        hasError = true
      } else {
        console.log(`  ✅ 删除: ${book.title}`)
        deleted++
      }
    }

    // 短暂等待
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  console.log(`\n总共删除了 ${deleted} 本书\n`)
}

deleteAllBooksBatch().catch(console.error)
