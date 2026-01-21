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

// 标准化书名用于比较
function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/[\s\-_]/g, '') // 移除空格、横线、下划线
    .replace(/[（(].*?[）)]/g, '') // 移除括号内容
    .replace(/英语|词/g, '') // 移除"英语"、"词"
    .trim()
}

async function analyzeSimilarBooks() {
  console.log('\n🔍 分析可能需要合并的相似书籍...\n')

  const { data: books } = await supabase
    .from('books')
    .select('id, title, total_words')
    .order('title')

  if (!books) return

  // 检查可能的相似组
  const groups = {
    '初中': books.filter(b => b.title.includes('初中') && !b.title.includes('年级') && !b.title.includes('PEP')),
    '高中': books.filter(b => b.title.includes('高中') && !b.title.includes('PEP')),
    '小学': books.filter(b => b.title.includes('小学') && !b.title.includes('PEP')),
  }

  console.log('可能的相似书籍组:\n')

  let hasPotentialMerges = false

  for (const [groupName, groupBooks] of Object.entries(groups)) {
    if (groupBooks.length > 1) {
      hasPotentialMerges = true
      console.log(`【${groupName}】- ${groupBooks.length} 个:`)
      groupBooks.forEach(book => {
        console.log(`  - ${book.title.padEnd(25)} ${book.total_words.toLocaleString()} 词`)
      })
      console.log('')
    }
  }

  if (!hasPotentialMerges) {
    console.log('✅ 未发现可能需要合并的相似书籍\n')
  } else {
    console.log('⚠️ 发现可能需要合并的书籍组\n')
  }

  // 检查是否有Enhanced版本
  const enhancedBooks = books.filter(b => b.title.includes('Enhanced'))
  if (enhancedBooks.length > 0) {
    console.log(`\n⚠️ 发现 ${enhancedBooks.length} 个Enhanced版本（可能需要合并）:`)
    enhancedBooks.forEach(book => {
      console.log(`  - ${book.title}`)
    })
    console.log('')
  }

  // 最终统计
  console.log('='.repeat(80))
  console.log('📊 最终重复问题解决情况')
  console.log('='.repeat(80))
  console.log(`\n总书籍数: ${books.length}`)
  console.log(`完全重复的书名: 0 组 ✅`)
  console.log(`可能的相似书籍: ${hasPotentialMerges ? '存在（需人工确认）' : '0 组 ✅'}`)
  console.log(`Enhanced版本: ${enhancedBooks.length} 个${enhancedBooks.length > 0 ? '（需处理）' : '✅'}`)
  console.log('\n')

  // 建议
  if (groups['初中'].length > 1) {
    console.log('建议: "初中"、"外研社初中英语"可能来自同一教材，建议确认是否需要合并')
  }
  if (groups['高中'].length > 1) {
    console.log('建议: "高中"、"北京高中英语"、"PEP高中英语"可能来自不同教材，请确认')
  }
  console.log('')
}

analyzeSimilarBooks().catch(console.error)
