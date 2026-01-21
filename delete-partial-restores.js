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

async function deletePartialRestores() {
  console.log('\n删除部分恢复的书籍...\n')

  const booksToDelete = ['TOEFL', 'GRE', 'IELTS', 'SAT', 'CET-4', 'CET-6', 'GMAT', 'BEC', '考研', '高中', '初中']

  for (const bookName of booksToDelete) {
    const { data: books } = await supabase
      .from('books')
      .select('id, title, total_words')
      .eq('title', bookName)

    if (books && books.length > 0) {
      console.log(`删除: ${bookName} (${books[0].total_words} 词)`)
      await supabase.from('books').delete().eq('id', books[0].id)
    }
  }

  console.log('\n✅ 删除完成\n')
}

deletePartialRestores().catch(console.error)
