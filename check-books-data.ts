/**
 * 检查数据库中书籍数据的完整性
 * 找出可能导致 SSR 崩溃的异常数据
 */

import { createClient } from './src/lib/supabase/server'

async function checkBooksData() {
  console.log('🔍 检查数据库书籍数据...\n')

  const supabase = await createClient()

  // 检查所有书籍
  const { data: books, error } = await supabase
    .from('books')
    .select('*')

  if (error) {
    console.error('❌ 数据库查询失败:', error)
    return
  }

  console.log(`✅ 找到 ${books.length} 本书\n`)

  // 检查每本书的字段完整性
  let issuesFound = 0

  books.forEach((book, index) => {
    let hasIssue = false
    const issues = []

    // 检查必需字段
    if (!book.id) {
      issues.push('❌ 缺少 id')
      hasIssue = true
    }

    if (!book.title) {
      issues.push('❌ 缺少 title')
      hasIssue = true
    }

    // 检查可能导致序列化问题的字段
    if (book.title === 'undefined' || book.title === 'null') {
      issues.push('⚠️  title 是字符串 "undefined" 或 "null"')
      hasIssue = true
    }

    // 检查 total_words 类型
    if (typeof book.total_words !== 'number') {
      issues.push(`⚠️  total_words 不是数字: ${typeof book.total_words} (${book.total_words})`)
      hasIssue = true
    }

    // 检查描述字段
    if (book.description && typeof book.description !== 'string') {
      issues.push(`⚠️  description 类型异常: ${typeof book.description}`)
      hasIssue = true
    }

    if (hasIssue) {
      issuesFound++
      console.log(`\n📕 书籍 ${index + 1} (ID: ${book.id}) 发现问题:`)
      issues.forEach(issue => console.log(`   ${issue}`))
      console.log(`   完整数据:`, JSON.stringify(book, null, 2))
    }
  })

  if (issuesFound === 0) {
    console.log('✅ 所有书籍数据完整，没有发现问题')
  } else {
    console.log(`\n⚠️  共发现 ${issuesFound} 本书有问题`)
  }

  // 测试序列化
  console.log('\n🧪 测试数据序列化...')
  try {
    const json = JSON.stringify(books)
    console.log(`✅ 序列化成功 (${json.length} 字节)`)

    // 反序列化测试
    const parsed = JSON.parse(json)
    console.log(`✅ 反序列化成功 (${parsed.length} 本书)`)
  } catch (error) {
    console.error('❌ 序列化失败:', error.message)
  }
}

checkBooksData()
