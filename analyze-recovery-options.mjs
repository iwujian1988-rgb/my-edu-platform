import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

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

async function analyzeRecoveryOptions() {
  console.log('🔍 分析数据恢复选项\n')

  // 1. 检查 words 表是否有其他字段可以帮助恢复
  console.log('1️⃣ 检查 words 表结构（查看可用字段）...')
  const { data: nullWords, error: nullError } = await supabase
    .from('words')
    .select('*')
    .is('book_id', null)
    .limit(5)

  if (nullError) {
    console.log('❌ 查询失败:', nullError)
  } else if (nullWords && nullWords.length > 0) {
    console.log('✅ NULL book_id 单词的字段:')
    const fields = Object.keys(nullWords[0])
    fields.forEach(field => {
      console.log(`   - ${field}`)
    })

    console.log('\n   样例数据（第一个单词）:')
    const sample = nullWords[0]
    Object.entries(sample).forEach(([key, value]) => {
      const displayValue = value ? (typeof value === 'string' && value.length > 50
        ? value.substring(0, 50) + '...'
        : value) : 'null/undefined'
      console.log(`     ${key}: ${displayValue}`)
    })
  }
  console.log('')

  // 2. 检查是否有章节表 (chapters) 可能有关联信息
  console.log('2️⃣ 检查 chapters 表...')
  try {
    const { data: chapters, error: chapterError } = await supabase
      .from('chapters')
      .select('*')
      .limit(1)

    if (chapterError) {
      console.log('   ⚠️  chapters 表查询失败:', chapterError.message)
    } else if (chapters && chapters.length > 0) {
      console.log('✅ chapters 表存在，字段:', Object.keys(chapters[0]).join(', '))

      // 统计章节数
      const { count: chapterCount } = await supabase
        .from('chapters')
        .select('*', { count: 'exact', head: true })

      console.log(`   总章节数: ${chapterCount}`)
    }
  } catch (e) {
    console.log('   ⚠️  chapters 表可能不存在')
  }
  console.log('')

  // 3. 检查是否有 word_progress 表可能保留历史
  console.log('3️⃣ 检查 word_progress 表...')
  try {
    const { data: progress, error: progressError } = await supabase
      .from('word_progress')
      .select('word_id, book_id')
      .limit(5)

    if (progressError) {
      console.log('   ⚠️  word_progress 表查询失败:', progressError.message)
    } else if (progress && progress.length > 0) {
      console.log('✅ word_progress 表存在，可能保留了 book_id 关联')

      // 检查是否有 word_id 指向 NULL book_id 的单词
      const nullWordIds = nullWords.slice(0, 100).map(w => w.id)

      const { data: relatedProgress } = await supabase
        .from('word_progress')
        .select('word_id, book_id')
        .in('word_id', nullWordIds)
        .not('book_id', 'is', null)
        .limit(10)

      if (relatedProgress && relatedProgress.length > 0) {
        console.log(`\n   🎉 发现 ${relatedProgress.length} 条关联记录可以用于恢复！`)
        relatedProgress.forEach(p => {
          console.log(`     word_id: ${p.word_id.substring(0, 8)}... -> book_id: ${p.book_id.substring(0, 8)}...`)
        })
      } else {
        console.log('   ⚠️  word_progress 中没有找到可恢复的关联')
      }
    }
  } catch (e) {
    console.log('   ⚠️  word_progress 表可能不存在或无关联数据')
  }
  console.log('')

  // 4. 统计各词书应该有多少单词
  console.log('4️⃣ 检查各词书的预期单词数...')
  const { data: books } = await supabase
    .from('books')
    .select('id, title, total_words')
    .order('title')

  console.log('   各词书的预期单词数:')
  books.forEach(book => {
    console.log(`     ${book.title}: ${book.total_words} 个单词`)
  })
  console.log('')

  // 5. 检查是否有导入日志
  console.log('5️⃣ 检查项目中是否有数据导入脚本...')
  const fs = await import('fs')
  const importScripts = [
    'import-wordbooks-fixed.js',
    'import-wordbooks-full.js',
    'import-v1-data.js',
    'import-wordlists-v2.mjs',
    'import-wordlists.mjs'
  ]

  importScripts.forEach(script => {
    const exists = fs.existsSync(script)
    if (exists) {
      console.log(`   ✅ ${script} - 存在`)
    } else {
      console.log(`   - ${script} - 不存在`)
    }
  })
  console.log('')

  // 6. 计算恢复所需的 book_id 分布
  console.log('6️⃣ 分析恢复策略...')
  const totalExpected = books.reduce((sum, b) => sum + (b.total_words || 0), 0)
  const totalNull = 93334
  const totalValid = 5862

  console.log(`   预期总单词数: ${totalExpected}`)
  console.log(`   当前 NULL book_id: ${totalNull}`)
  console.log(`   当前有效 book_id: ${totalValid}`)
  console.log(`   实际总记录: ${totalNull + totalValid}`)

  if (totalNull >= totalExpected) {
    console.log('   ✅ NULL book_id 的记录数 ≥ 预期总数，可能包含所有丢失的数据')
  } else {
    console.log('   ⚠️  NULL book_id 的记录数 < 预期总数，数据可能不完整')
  }
  console.log('')

  // 总结
  console.log('📋 恢复方案总结:')
  console.log('')
  console.log('方案A: 如果 word_progress 表保留了 book_id 关联')
  console.log('   - 优先级: ⭐⭐⭐⭐⭐')
  console.log('   - 从 word_progress 恢复 book_id')
  console.log('   - 安全性: 高（使用系统保留的关联）')
  console.log('')
  console.log('方案B: 如果有原始导入脚本和数据文件')
  console.log('   - 优先级: ⭐⭐⭐⭐')
  console.log('   - 重新运行导入，但只恢复 book_id 字段')
  console.log('   - 安全性: 中（需要确保数据匹配）')
  console.log('')
  console.log('方案C: 如果有数据库备份')
  console.log('   - 优先级: ⭐⭐⭐⭐⭐')
  console.log('   - 从备份恢复 book_id 字段')
  console.log('   - 安全性: 最高（完整恢复）')
  console.log('')
  console.log('方案D: 基于单词内容和词书特征匹配')
  console.log('   - 优先级: ⭐⭐')
  console.log('   - 通过词汇表匹配推断 book_id')
  console.log('   - 安全性: 低（可能不准确）')
}

analyzeRecoveryOptions().catch(console.error)
