// 合并重复词库并删除冗余版本
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load .env file
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

// 标准化书名
function normalizeBookName(title) {
  return title
    .replace(/\s*\(Enhanced\)\s*$/gi, '')
    .replace(/\s*\(Merged\)\s*$/gi, '')
    .replace(/\s*\(Standard\)\s*$/gi, '')
    .trim()
}

async function mergeDuplicateBooks() {
  console.log('\n🔄 开始合并重复词库...\n')

  // 1. 获取所有书籍
  const { data: books, error: booksError } = await supabase
    .from('books')
    .select('id, title, total_words, total_chapters, category, created_at')
    .order('total_words', { ascending: false })

  if (booksError) {
    console.error('❌ 查询书籍失败:', booksError.message)
    return
  }

  // 2. 按标准化名称分组
  const groups = new Map()

  books.forEach(book => {
    const normalizedName = normalizeBookName(book.title)
    const isEnhanced = book.title.includes('Enhanced')

    if (!groups.has(normalizedName)) {
      groups.set(normalizedName, {
        name: normalizedName,
        books: []
      })
    }

    groups.get(normalizedName).books.push({
      ...book,
      isEnhanced: isEnhanced
    })
  })

  // 3. 确定每个组保留哪个版本
  const toDelete = []
  const toKeep = []

  groups.forEach((group, name) => {
    if (group.books.length > 1) {
      // 找出单词数最多的书
      const maxWords = Math.max(...group.books.map(b => b.total_words || 0))
      const candidates = group.books.filter(b => b.total_words === maxWords)

      // 如果有多个相同单词数的，优先选Enhanced
      const keepBook = candidates.find(b => b.isEnhanced) || candidates[0]

      toKeep.push(keepBook)

      // 其他书标记为删除
      group.books.forEach(book => {
        if (book.id !== keepBook.id) {
          toDelete.push(book)
        }
      })
    } else {
      toKeep.push(group.books[0])
    }
  })

  console.log(`📊 统计:`)
  console.log(`   保留书籍: ${toKeep.length} 本`)
  console.log(`   删除书籍: ${toDelete.length} 本`)

  const savedWords = toDelete.reduce((sum, b) => sum + (b.total_words || 0), 0)
  console.log(`   节省单词数: ${savedWords.toLocaleString()} 个`)

  // 4. 删除冗余书籍
  console.log(`\n🗑️  开始删除冗余书籍...`)

  let deletedCount = 0
  let deletedWords = 0

  for (const book of toDelete) {
    console.log(`   删除: ${book.title} (${book.total_words} 词)`)

    // 由于外键CASCADE，删除书籍会自动删除章节和单词
    const { error: deleteError } = await supabase
      .from('books')
      .delete()
      .eq('id', book.id)

    if (deleteError) {
      console.error(`      ❌ 删除失败: ${deleteError.message}`)
    } else {
      deletedCount++
      deletedWords += book.total_words || 0
    }
  }

  console.log(`\n✅ 删除完成!`)
  console.log(`   成功删除: ${deletedCount} 本`)
  console.log(`   释放单词数: ${deletedWords.toLocaleString()} 个`)

  // 5. 验证结果
  console.log(`\n📈 验证结果...`)

  const { data: remainingBooks, error: remainingError } = await supabase
    .from('books')
    .select('id, title, total_words')

  if (remainingError) {
    console.error('❌ 验证失败:', remainingError.message)
  } else {
    const remainingWords = remainingBooks.reduce((sum, b) => sum + (b.total_words || 0), 0)
    console.log(`   剩余书籍: ${remainingBooks.length} 本`)
    console.log(`   剩余单词: ${remainingWords.toLocaleString()} 个`)

    console.log(`\n✨ 合并完成!`)
    console.log(`   原有书籍: ${books.length} 本`)
    console.log(`   删除书籍: ${deletedCount} 本`)
    console.log(`   保留书籍: ${remainingBooks.length} 本`)
    console.log(`   优化比例: ${((deletedCount / books.length) * 100).toFixed(1)}%`)
  }

  console.log('\n' + '='.repeat(80) + '\n')
}

// 执行合并
mergeDuplicateBooks().catch(console.error)
