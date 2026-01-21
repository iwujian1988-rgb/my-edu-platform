// 分析数据库中的重复书籍
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
      // Remove quotes if present
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

// 标准化书名函数（移除 "(Enhanced)" 等后缀）
function normalizeBookName(title) {
  return title
    .replace(/\s*\(Enhanced\)\s*$/gi, '')
    .replace(/\s*\(Merged\)\s*$/gi, '')
    .replace(/\s*\(Standard\)\s*$/gi, '')
    .trim()
}

// 获取书籍类型
function getBookType(title) {
  const types = {
    'IELTS': 'IELTS',
    'TOEFL': 'TOEFL',
    'GRE': 'GRE',
    'SAT': 'SAT',
    'GMAT': 'GMAT',
    '考研': '考研',
    'CET-4': 'CET-4',
    'CET-6': 'CET-6',
    'KET': 'KET',
    'PET': 'PET',
    'FCE': 'FCE',
    'PETS': 'PETS',
    'PTE': 'PTE',
    'BEC': 'BEC',
    '高中': '高中',
    '初中': '初中',
    'PEP': 'PEP'
  }

  for (const [key, value] of Object.entries(types)) {
    if (title.includes(key)) {
      return value
    }
  }
  return '其他'
}

async function analyzeDuplicates() {
  console.log('\n🔍 分析数据库中的重复书籍...\n')

  // 1. 获取所有书籍
  const { data: books, error: booksError } = await supabase
    .from('books')
    .select('id, title, total_words, total_chapters, category, created_at')
    .order('created_at', { ascending: true })

  if (booksError) {
    console.error('❌ 查询书籍失败:', booksError.message)
    return
  }

  console.log(`✅ 找到 ${books.length} 个书籍记录\n`)

  // 2. 按标准化名称分组
  const groups = new Map()

  books.forEach(book => {
    const normalizedName = normalizeBookName(book.title)
    const bookType = getBookType(book.title)
    const isEnhanced = book.title.includes('Enhanced')

    if (!groups.has(normalizedName)) {
      groups.set(normalizedName, {
        name: normalizedName,
        type: bookType,
        books: [],
        totalUniqueWords: 0,
        totalWords: 0
      })
    }

    groups.get(normalizedName).books.push({
      ...book,
      isEnhanced: isEnhanced
    })
    groups.get(normalizedName).totalWords += book.total_words || 0
  })

  // 3. 分析每个组
  const duplicateGroups = []
  const singleBooks = []

  groups.forEach((group, name) => {
    if (group.books.length > 1) {
      duplicateGroups.push(group)
    } else {
      singleBooks.push(group)
    }
  })

  // 4. 输出重复组
  console.log('='.repeat(80))
  console.log(`📊 重复书籍分析 (共 ${duplicateGroups.length} 组重复)`)
  console.log('='.repeat(80))

  // 按类型排序
  duplicateGroups.sort((a, b) => a.type.localeCompare(b.type))

  let totalDuplicateWords = 0
  let totalWastedWords = 0

  duplicateGroups.forEach((group, index) => {
    const totalWordsInGroup = group.books.reduce((sum, b) => sum + (b.total_words || 0), 0)
    const maxWordsInGroup = Math.max(...group.books.map(b => b.total_words || 0))
    const wastedWords = totalWordsInGroup - maxWordsInGroup

    totalDuplicateWords += totalWordsInGroup
    totalWastedWords += wastedWords

    console.log(`\n${index + 1}. 【${group.type}】${group.name}`)
    console.log(`   重复版本数: ${group.books.length}`)
    console.log(`   总单词数: ${totalWordsInGroup}`)
    console.log(`   冗余单词数: ${wastedWords} (${((wastedWords / totalWordsInGroup) * 100).toFixed(1)}%)`)

    group.books.forEach(book => {
      const enhanced = book.isEnhanced ? ' [Enhanced]' : ''
      console.log(`      - ${book.title}${enhanced}: ${book.total_words} 词, ${book.total_chapters} 章`)
    })
  })

  // 5. 输出统计摘要
  console.log('\n' + '='.repeat(80))
  console.log('📈 统计摘要')
  console.log('='.repeat(80))

  const uniqueGroups = singleBooks.length
  const totalGroups = groups.size

  console.log(`\n✅ 单本书籍: ${uniqueGroups} 本`)
  console.log(`⚠️  重复书籍组: ${duplicateGroups.length} 组`)
  console.log(`📚 总书籍数: ${books.length} 本`)

  console.log(`\n💾 存储占用统计:`)
  console.log(`   当前存储单词总数: ${books.reduce((sum, b) => sum + (b.total_words || 0), 0).toLocaleString()}`)
  console.log(`   重复单词总数: ${totalDuplicateWords.toLocaleString()}`)
  console.log(`   冗余单词总数: ${totalWastedWords.toLocaleString()} (可节省)`)
  console.log(`   冗余比例: ${((totalWastedWords / totalDuplicateWords) * 100).toFixed(1)}%`)

  // 6. 按类型统计重复
  console.log(`\n📊 按类型统计重复情况:`)
  const typeStats = new Map()

  duplicateGroups.forEach(group => {
    if (!typeStats.has(group.type)) {
      typeStats.set(group.type, {
        groups: 0,
        books: 0,
        totalWords: 0,
        wastedWords: 0
      })
    }

    const stats = typeStats.get(group.type)
    stats.groups++
    stats.books += group.books.length

    const totalWordsInGroup = group.books.reduce((sum, b) => sum + (b.total_words || 0), 0)
    const maxWordsInGroup = Math.max(...group.books.map(b => b.total_words || 0))
    stats.totalWords += totalWordsInGroup
    stats.wastedWords += (totalWordsInGroup - maxWordsInGroup)
  })

  // 按冗余单词数排序
  const sortedTypes = Array.from(typeStats.entries())
    .sort((a, b) => b[1].wastedWords - a[1].wastedWords)

  sortedTypes.forEach(([type, stats]) => {
    console.log(`   【${type}】`)
    console.log(`      重复组数: ${stats.groups}`)
    console.log(`      书籍总数: ${stats.books}`)
    console.log(`      冗余单词: ${stats.wastedWords.toLocaleString()} (${((stats.wastedWords / stats.totalWords) * 100).toFixed(1)}%)`)
  })

  // 7. 生成去重建议
  console.log('\n' + '='.repeat(80))
  console.log('💡 去重建议')
  console.log('='.repeat(80))

  console.log('\n推荐策略:')
  console.log(`1. 对每个重复组，保留单词数最多的版本`)
  console.log(`2. 如果两个版本单词数相近，优先保留 Enhanced 版本（英文释义更丰富）`)
  console.log(`3. 删除其他版本，节省存储空间`)

  console.log('\n可删除的书籍列表:')
  let deleteCount = 0
  duplicateGroups.forEach(group => {
    // 找出单词数最多的书
    const maxWords = Math.max(...group.books.map(b => b.total_words || 0))
    const candidates = group.books.filter(b => b.total_words === maxWords)

    // 如果有多个相同单词数的，优先选Enhanced
    const keepBook = candidates.find(b => b.isEnhanced) || candidates[0]

    group.books.forEach(book => {
      if (book.id !== keepBook.id) {
        deleteCount++
        console.log(`   ${deleteCount}. ${book.title} (ID: ${book.id}) - ${book.total_words} 词`)
      }
    })
  })

  console.log(`\n可删除书籍总数: ${deleteCount} 本`)
  console.log(`可节省单词数: ${totalWastedWords.toLocaleString()} 个`)

  console.log('\n' + '='.repeat(80) + '\n')
}

analyzeDuplicates().catch(console.error)
