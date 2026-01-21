/**
 * 测试状态筛选（认识/不认识/模糊）是否正常工作
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const envContent = readFileSync(join(__dirname, '.env.local'), 'utf-8')
const envVars = Object.fromEntries(
  envContent
    .split('\n')
    .filter(line => line.trim() && !line.startsWith('#'))
    .map(line => line.split('='))
    .map(([key, ...valueParts]) => [key, valueParts.join('=').replace(/"/g, '')])
)

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY
)

console.log('\n🧪 测试状态筛选功能（认识/不认识/模糊）')
console.log('='.repeat(80))

// 获取一本书
const { data: books } = await supabase
  .from('books')
  .select('id, title')
  .limit(1)

if (!books || books.length === 0) {
  console.log('❌ 没有找到书籍')
  process.exit(1)
}

const testBookId = books[0].id
console.log(`\n使用测试书籍: ${books[0].title} (${testBookId})`)

// 获取一个用户
const { data: { users } } = await supabase.auth.admin.listUsers()
if (!users || users.length === 0) {
  console.log('❌ 没有找到用户')
  process.exit(1)
}

const testUserId = users[0].id
console.log(`使用测试用户: ${testUserId}`)

// 检查该用户的单词进度
console.log('\n📋 测试1: 检查word_progress表')
console.log('-'.repeat(80))

const { data: progressData, error: progressError } = await supabase
  .from('word_progress')
  .select('word_id, status')
  .eq('user_id', testUserId)
  .eq('book_id', testBookId)
  .limit(10)

if (progressError) {
  console.log(`❌ 查询word_progress失败: ${progressError.message}`)
} else {
  console.log(`✅ 查询成功，找到 ${progressData?.length || 0} 条进度记录`)
  if (progressData && progressData.length > 0) {
    console.log('示例进度记录:')
    progressData.slice(0, 3).forEach(p => {
      console.log(`  - word_id: ${p.word_id}, status: ${p.status}`)
    })

    // 统计各状态的数量
    const statusCounts = { known: 0, fuzzy: 0, unknown: 0, new: 0 }
    progressData.forEach(p => {
      if (statusCounts[p.status] !== undefined) {
        statusCounts[p.status]++
      }
    })
    console.log('\n状态统计:')
    console.log(`  - known (认识): ${statusCounts.known}`)
    console.log(`  - fuzzy (模糊): ${statusCounts.fuzzy}`)
    console.log(`  - unknown (不认识): ${statusCounts.unknown}`)
    console.log(`  - new (未标注): ${statusCounts.new}`)
  }
}

// 检查API代码是否正确处理status参数
console.log('\n📋 测试2: 检查API代码逻辑')
console.log('-'.repeat(80))

const apiContent = readFileSync(join(__dirname, 'src/app/api/words/route.ts'), 'utf-8')

const hasStatusFilter = apiContent.includes('if (status !== \'all\')')
const hasKnownFilter = apiContent.includes('status === \'known\'') || apiContent.includes('status === "known"')
const hasFuzzyFilter = apiContent.includes('status === \'fuzzy\'') || apiContent.includes('status === "fuzzy"')
const hasUnknownFilter = apiContent.includes('status === \'unknown\'') || apiContent.includes('status === "unknown"')
const hasNewFilter = apiContent.includes('status === \'new\'') || apiContent.includes('status === "new"')

console.log('✅ API代码检查:')
console.log(`  - 有status筛选逻辑: ${hasStatusFilter ? '✅' : '❌'}`)
console.log(`  - 处理known状态: ${hasKnownFilter ? '✅' : '❌'}`)
console.log(`  - 处理fuzzy状态: ${hasFuzzyFilter ? '✅' : '❌'}`)
console.log(`  - 处理unknown状态: ${hasUnknownFilter ? '✅' : '❌'}`)
console.log(`  - 处理new状态: ${hasNewFilter ? '✅' : '❌'}`)

const statusFilterPass = hasStatusFilter && hasKnownFilter && hasFuzzyFilter && hasUnknownFilter && hasNewFilter
console.log(`\n结果: ${statusFilterPass ? '✅ PASS' : '❌ FAIL'}`)

// 检查API是否正确查询progress数据
console.log('\n📋 测试3: 检查API是否查询word_progress')
console.log('-'.repeat(80))

const queriesProgress = apiContent.includes('.from(\'word_progress\')') || apiContent.includes('.from("word_progress")')
const selectsWithStatus = apiContent.includes('select(\'word_id, status\')') || apiContent.includes('select("word_id, status")')

console.log('✅ word_progress查询检查:')
console.log(`  - 查询word_progress表: ${queriesProgress ? '✅' : '❌'}`)
console.log(`  - 选择word_id和status: ${selectsWithStatus ? '✅' : '❌'}`)

const progressQueryPass = queriesProgress && selectsWithStatus
console.log(`\n结果: ${progressQueryPass ? '✅ PASS' : '❌ FAIL'}`)

// 总结
console.log('\n' + '='.repeat(80))
console.log('📊 测试总结:')
console.log(`  测试1 (word_progress数据): ${progressData ? '✅ 有数据' : '⚠️ 无数据'}`)
console.log(`  测试2 (API代码逻辑): ${statusFilterPass ? '✅ PASS' : '❌ FAIL'}`)
console.log(`  测试3 (progress查询): ${progressQueryPass ? '✅ PASS' : '❌ FAIL'}`)

if (statusFilterPass && progressQueryPass) {
  console.log('\n✅ 状态筛选功能代码完整')
  if (!progressData || progressData.length === 0) {
    console.log('⚠️ 但当前用户该书没有进度数据，无法实际测试筛选效果')
    console.log('💡 建议: 在浏览器中学习一些单词（标记为认识/不认识/模糊），然后再测试筛选')
  } else {
    console.log('✅ 用户有进度数据，可以在浏览器中测试筛选功能')
  }
} else {
  console.log('\n❌ 状态筛选功能存在问题')
}

console.log('='.repeat(80) + '\n')
