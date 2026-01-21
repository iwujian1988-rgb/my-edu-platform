// 智能合并重复词库（方案2）
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
    'PEP': 'PEP',
    '专升本': '专升本',
    '专业英语': '专业英语'
  }

  for (const [key, value] of Object.entries(types)) {
    if (title.includes(key)) {
      return value
    }
  }
  return '其他'
}

// 智能合并字段
function mergeWordFields(wordsWithSameId) {
  // wordsWithSameId 是同一ID的多个版本
  // 优先级：Enhanced版 > 普通版（部分字段相反）

  const merged = {
    id: wordsWithSameId[0].id,
    word: wordsWithSameId[0].word,
    chapter_id: wordsWithSameId[0].chapter_id // 暂时保留，后面会更新
  }

  // 字段合并规则：优先取非空值
  const pickNonEmpty = (field) => {
    for (const w of wordsWithSameId) {
      if (w[field] && w[field].trim() !== '') {
        return w[field]
      }
    }
    return null
  }

  // 普通版优先的字段（Enhanced版通常为空）
  const normalFirst = ['phonetic', 'collocation', 'example_sentence', 'example_sentence_en']

  // Enhanced版优先的字段
  const enhancedFirst = ['definition_en', 'uk_phonetic', 'us_phonetic']

  // 其他字段（取任意非空值）
  const otherFields = ['part_of_speech', 'audio_url', 'difficulty_score']

  // 合并字段
  for (const field of normalFirst) {
    merged[field] = pickNonEmpty(field)
  }

  for (const field of enhancedFirst) {
    merged[field] = pickNonEmpty(field)
  }

  for (const field of otherFields) {
    merged[field] = pickNonEmpty(field)
  }

  // definition 特殊处理：确保非空
  merged.definition = pickNonEmpty('definition')
  if (!merged.definition || merged.definition.trim() === '') {
    // 如果没有中文释义，尝试使用英文释义
    merged.definition = pickNonEmpty('definition_en')
    if (!merged.definition) {
      // 如果都没有，使用单词本身
      merged.definition = merged.word
    }
  }

  // order_index 取最小值
  merged.order_index = Math.min(...wordsWithSameId.map(w => w.order_index || 0))

  return merged
}

async function mergeDuplicateBooks(testBookName = null) {
  console.log('\n🔄 开始智能合并重复词库...\n')

  // 1. 获取所有书籍
  const { data: books, error: booksError } = await supabase
    .from('books')
    .select('id, title, total_words, total_chapters, category, description')
    .order('title', { ascending: true })

  if (booksError) {
    console.error('❌ 查询书籍失败:', booksError.message)
    return
  }

  console.log(`✅ 找到 ${books.length} 个书籍记录\n`)

  // 2. 按标准化名称分组
  const groups = new Map()

  books.forEach(book => {
    const normalizedName = normalizeBookName(book.title)
    const isEnhanced = book.title.includes('Enhanced')

    if (!groups.has(normalizedName)) {
      groups.set(normalizedName, {
        name: normalizedName,
        type: getBookType(book.title),
        books: []
      })
    }

    groups.get(normalizedName).books.push({
      ...book,
      isEnhanced: isEnhanced
    })
  })

  // 3. 过滤出需要合并的组（重复的）
  const duplicateGroups = Array.from(groups.values())
    .filter(g => g.books.length > 1)
    .sort((a, b) => b.books.length - a.books.length) // 按重复数量排序

  console.log(`📊 找到 ${duplicateGroups.length} 组重复书籍\n`)

  // 如果指定了测试书名，只处理该组
  if (testBookName) {
    const testIndex = duplicateGroups.findIndex(g => g.name.includes(testBookName))
    if (testIndex !== -1) {
      console.log(`🧪 测试模式：只处理 "${testBookName}"\n`)
      duplicateGroups.splice(0, duplicateGroups.length, duplicateGroups[testIndex])
    } else {
      console.log(`❌ 未找到包含 "${testBookName}" 的词库\n`)
      return
    }
  }

  // 4. 处理每个重复组
  const results = {
    processed: 0,
    skipped: 0,
    failed: 0,
    totalWordsBefore: 0,
    totalWordsAfter: 0
  }

  for (const group of duplicateGroups) {
    console.log('\n' + '='.repeat(80))
    console.log(`📚 处理组: 【${group.type}】${group.name}`)
    console.log('='.repeat(80))

    group.books.forEach(book => {
      const enhanced = book.isEnhanced ? ' [Enhanced]' : ''
      console.log(`   - ${book.title}${enhanced}: ${book.total_words} 词`)
    })

    try {
      // 4.1 创建新的合并版书籍
      const newBookTitle = `${group.name}`
      const totalWords = group.books.reduce((sum, b) => sum + (b.total_words || 0), 0)
      const totalChapters = Math.max(...group.books.map(b => b.total_chapters || 0))

      console.log(`\n   ✨ 创建合并版书籍: ${newBookTitle}`)
      console.log(`      原始单词总数: ${totalWords}`)

      const { data: newBook, error: newBookError } = await supabase
        .from('books')
        .insert({
          title: newBookTitle,
          description: `智能合并版（合并了${group.books.length}个版本的优点）`,
          category: group.books[0].category,
          is_official: true,
          total_words: 0, // 稍后更新
          total_chapters: 0 // 稍后更新
        })
        .select()
        .single()

      if (newBookError) {
        throw new Error(`创建书籍失败: ${newBookError.message}`)
      }

      console.log(`      新书籍ID: ${newBook.id}`)

      // 4.2 获取所有版本的章节
      console.log(`\n   📖 处理章节...`)

      const allChapters = []
      for (const book of group.books) {
        const { data: chapters } = await supabase
          .from('chapters')
          .select('*')
          .eq('book_id', book.id)

        if (chapters) {
          allChapters.push(...chapters.map(c => ({ ...c, source_book_id: book.id })))
        }
      }

      // 去重章节（按标题）
      const uniqueChaptersMap = new Map()
      allChapters.forEach(ch => {
        const key = `${ch.title}_${ch.order_index}`
        if (!uniqueChaptersMap.has(key)) {
          uniqueChaptersMap.set(key, ch)
        }
      })

      const uniqueChapters = Array.from(uniqueChaptersMap.values())
      console.log(`      找到 ${allChapters.length} 个章节，去重后 ${uniqueChapters.length} 个`)

      // 创建新章节
      const chapterIdMap = new Map() // 旧章节ID -> 新章节ID
      const chapterTitleMap = new Map() // 章节标题 -> 新章节ID

      for (const chapter of uniqueChapters) {
        const { data: newChapter } = await supabase
          .from('chapters')
          .insert({
            book_id: newBook.id,
            title: chapter.title,
            order_index: chapter.order_index
          })
          .select()
          .single()

        if (newChapter) {
          chapterIdMap.set(chapter.id, newChapter.id)
          chapterTitleMap.set(chapter.title, newChapter.id)
        }
      }

      console.log(`      创建了 ${chapterIdMap.size} 个新章节`)
      console.log(`      新章节ID列表: ${Array.from(chapterIdMap.values()).join(', ')}`)

      // 4.3 获取所有版本的单词
      console.log(`\n   📝 处理单词...`)

      const allWords = []

      // 首先获取每个旧书籍的章节ID列表
      for (const book of group.books) {
        console.log(`      从 ${book.title} 获取章节...`)
        const { data: bookChapters } = await supabase
          .from('chapters')
          .select('id')
          .eq('book_id', book.id)

        if (!bookChapters || bookChapters.length === 0) {
          console.log(`         跳过（无章节）`)
          continue
        }

        const chapterIds = bookChapters.map(ch => ch.id)
        console.log(`         找到 ${chapterIds.length} 个章节，获取单词...`)

        // 使用分页查询获取所有单词（避免Supabase默认1000行限制）
        let allWordsForBook = []
        let start = 0
        const pageSize = 1000

        while (true) {
          const { data: wordsPage, error } = await supabase
            .from('words')
            .select('*')
            .in('chapter_id', chapterIds)
            .range(start, start + pageSize - 1)

          if (error) {
            console.error(`         ❌ 查询失败: ${error.message}`)
            break
          }

          if (!wordsPage || wordsPage.length === 0) {
            break
          }

          allWordsForBook.push(...wordsPage)
          start += pageSize

          if (wordsPage.length < pageSize) {
            // 最后一页
            break
          }

          // 显示进度
          if (allWordsForBook.length % 5000 === 0) {
            console.log(`         已获取 ${allWordsForBook.length} 个单词...`)
          }
        }

        console.log(`         获取了 ${allWordsForBook.length} 个单词`)
        allWords.push(...allWordsForBook.map(w => ({ ...w, source_book_id: book.id, old_chapter_id: w.chapter_id })))
      }

      console.log(`      总共获取了 ${allWords.length} 个单词`)

      // 按单词ID分组
      const wordsMap = new Map()
      allWords.forEach(w => {
        if (!wordsMap.has(w.id)) {
          wordsMap.set(w.id, [])
        }
        wordsMap.get(w.id).push(w)
      })

      console.log(`      去重前单词ID数: ${wordsMap.size}`)

      // 4.4 智能合并单词字段
      console.log(`      智能合并字段...`)

      const wordsToInsert = []
      let mergedCount = 0

      for (const [wordId, wordVersions] of wordsMap) {
        const mergedWord = mergeWordFields(wordVersions)

        // 更新章节ID（智能查找）
        let newChapterId = null

        // 方法1: 直接映射
        if (wordVersions[0].old_chapter_id && chapterIdMap.has(wordVersions[0].old_chapter_id)) {
          newChapterId = chapterIdMap.get(wordVersions[0].old_chapter_id)
        }
        // 方法2: 如果只有一个章节，直接使用
        else if (chapterIdMap.size === 1) {
          newChapterId = Array.from(chapterIdMap.values())[0]
        }
        // 方法3: 使用第一个章节作为默认值
        else {
          newChapterId = Array.from(chapterIdMap.values())[0]
        }

        mergedWord.chapter_id = newChapterId

        wordsToInsert.push(mergedWord)

        if (wordVersions.length > 1) {
          mergedCount++
        }
      }

      console.log(`      合并了 ${mergedCount} 个重复单词`)

      // 4.5 先删除旧版本（避免重复键冲突）
      console.log(`\n   🗑️  删除旧版本（避免ID冲突）...`)

      for (const book of group.books) {
        console.log(`      删除: ${book.title}`)
        const { error: deleteError } = await supabase
          .from('books')
          .delete()
          .eq('id', book.id)

        if (deleteError) {
          console.error(`         ❌ 删除失败: ${deleteError.message}`)
        }
      }

      // 4.6 批量插入单词（每批500个）
      console.log(`\n   📝 插入单词到数据库...`)

      const batchSize = 500
      let insertedCount = 0

      for (let i = 0; i < wordsToInsert.length; i += batchSize) {
        const batch = wordsToInsert.slice(i, i + batchSize)
        const { error: insertError } = await supabase
          .from('words')
          .insert(batch)

        if (insertError) {
          console.error(`         ⚠️ 批次 ${i / batchSize + 1} 插入失败: ${insertError.message}`)
        } else {
          insertedCount += batch.length
        }
      }

      console.log(`      成功插入 ${insertedCount} 个单词`)

      // 4.7 更新书籍统计
      await supabase
        .from('books')
        .update({
          total_words: insertedCount,
          total_chapters: chapterIdMap.size
        })
        .eq('id', newBook.id)

      // 统计
      results.processed++
      results.totalWordsBefore += totalWords
      results.totalWordsAfter += insertedCount

      console.log(`\n   ✅ 成功合并!`)
      console.log(`      合并前: ${totalWords} 词`)
      console.log(`      合并后: ${insertedCount} 词`)
      console.log(`      节省: ${totalWords - insertedCount} 词 (${((totalWords - insertedCount) / totalWords * 100).toFixed(1)}%)`)

    } catch (error) {
      console.error(`\n   ❌ 处理失败: ${error.message}`)
      results.failed++
    }
  }

  // 5. 输出最终统计
  console.log('\n' + '='.repeat(80))
  console.log('📊 合并完成统计')
  console.log('='.repeat(80))

  console.log(`\n处理结果:`)
  console.log(`   成功处理: ${results.processed} 组`)
  console.log(`   失败: ${results.failed} 组`)

  if (results.totalWordsBefore > 0) {
    console.log(`\n单词统计:`)
    console.log(`   合并前总数: ${results.totalWordsBefore.toLocaleString()} 个`)
    console.log(`   合并后总数: ${results.totalWordsAfter.toLocaleString()} 个`)
    console.log(`   节省单词数: ${(results.totalWordsBefore - results.totalWordsAfter).toLocaleString()} 个`)
    console.log(`   节省比例: ${((results.totalWordsBefore - results.totalWordsAfter) / results.totalWordsBefore * 100).toFixed(1)}%`)
  }

  console.log('\n' + '='.repeat(80) + '\n')
}

// 检查命令行参数
const args = process.argv.slice(2)
const testMode = args.includes('--test')
const testBookName = args.find(arg => arg.startsWith('--book='))?.replace('--book=', '')

// 如果是测试模式，指定测试的词库名称
if (testMode) {
  console.log('🧪 测试模式已启用')
  if (testBookName) {
    console.log(`📖 测试词库: ${testBookName}`)
    mergeDuplicateBooks(testBookName)
  } else {
    console.log('📖 默认测试词库: TOEFL')
    mergeDuplicateBooks('TOEFL')
  }
} else {
  console.log('🚀 生产模式：处理所有重复词库')
  mergeDuplicateBooks()
}
