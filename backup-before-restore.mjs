import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'fs'

function loadEnv() {
  try {
    const envContent = readFileSync('.env.local', 'utf-8')
    const lines = envContent.split('\n')
    for (const line of lines) {
      const trimmedLine = line.trim()
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=')
        let value = valueParts.join('=').trim()
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1)
        }
        if (key && value) {
          process.env[key] = value
        }
      }
    }
  } catch (error) {
    console.error('Failed to load .env.local:', error.message)
  }
}

loadEnv()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function backup() {
  console.log('💾 开始备份数据库...\n')

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19)
  console.log(`📅 备份时间: ${timestamp}\n`)

  // 1. 备份 words 表
  console.log('1️⃣ 备份 words 表...')

  let allWords = []
  let offset = 0
  const limit = 1000
  let hasMore = true

  while (hasMore) {
    const { data, error } = await supabase
      .from('words')
      .select('*')
      .range(offset, offset + limit - 1)

    if (error) {
      console.log('❌ 备份 words 失败:', error)
      return
    }

    if (data && data.length > 0) {
      allWords = allWords.concat(data)
      offset += limit
      console.log(`   已获取 ${allWords.length} 条记录...`)

      if (data.length < limit) {
        hasMore = false
      }
    } else {
      hasMore = false
    }
  }

  console.log(`   ✅ words 表: ${allWords.length} 条记录`)

  // 2. 备份 books 表
  console.log('\n2️⃣ 备份 books 表...')

  const { data: books, error: booksError } = await supabase
    .from('books')
    .select('*')

  if (booksError) {
    console.log('❌ 备份 books 失败:', booksError)
    return
  }

  console.log(`   ✅ books 表: ${books.length} 条记录`)

  // 3. 备份 chapters 表
  console.log('\n3️⃣ 备份 chapters 表...')

  const { data: chapters, error: chaptersError } = await supabase
    .from('chapters')
    .select('*')

  if (chaptersError) {
    console.log('❌ 备份 chapters 失败:', chaptersError)
    return
  }

  console.log(`   ✅ chapters 表: ${chapters.length} 条记录`)

  // 4. 保存备份文件
  console.log('\n4️⃣ 保存备份文件...')

  const backup = {
    timestamp: new Date().toISOString(),
    tables: {
      words: allWords,
      books: books,
      chapters: chapters
    },
    stats: {
      words_count: allWords.length,
      books_count: books.length,
      chapters_count: chapters.length
    }
  }

  const backupFilename = `backup-before-restore-${timestamp}.json`
  writeFileSync(backupFilename, JSON.stringify(backup, null, 2))

  console.log(`   ✅ 备份文件: ${backupFilename}`)
  console.log(`   📊 文件大小: ${(Buffer.byteLength(JSON.stringify(backup)) / 1024 / 1024).toFixed(2)} MB`)

  // 5. 统计 NULL book_id 的记录
  console.log('\n5️⃣ 备份前状态统计...')

  const nullBookIdWords = allWords.filter(w => !w.book_id)
  const validBookIdWords = allWords.filter(w => w.book_id)

  console.log(`   - NULL book_id: ${nullBookIdWords.length} 条`)
  console.log(`   - 有效 book_id: ${validBookIdWords.length} 条`)
  console.log(`   - 总记录: ${allWords.length} 条`)

  console.log('\n✅ 备份完成！')
  console.log(`\n📁 备份文件: ${backupFilename}`)
  console.log('⚠️  请妥善保管此备份文件\n')
}

backup().catch(console.error)
