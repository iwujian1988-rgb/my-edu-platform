// 分析是否真正执行了智能合并
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

async function analyzeMergeQuality() {
  console.log('\n🔍 深度分析：是否真正智能合并了单词？\n')
  console.log('='.repeat(80))

  // 检查备份文件
  const backupDir = path.join(__dirname, 'wordlists_final')
  const toeflFiles = ['TOEFL_enhanced.json', 'TOEFL_merged.json']

  console.log('\n📦 备份文件分析:')

  for (const fileName of toeflFiles) {
    const filePath = path.join(backupDir, fileName)
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8')
      const data = JSON.parse(content)
      console.log(`\n  ${fileName}:`)
      console.log(`    标题: ${data.title || 'N/A'}`)
      console.log(`    单词数: ${data.words ? data.words.length : 0}`)
      console.log(`    描述: ${data.description || 'N/A'}`)

      // 检查是否有"合并"描述
      if (data.description && data.description.includes('合并')) {
        console.log(`    ⚠️  这个文件本身已经是合并后的数据！`)
      }
    }
  }

  console.log('\n' + '='.repeat(80))
  console.log('\n❌ 关键发现:')
  console.log('\n1. 备份中的 TOEFL_enhanced.json 描述:')
  console.log('   "合并kajweb和maimemo数据源的TOEFL词库"')
  console.log('   → 说明这个文件本身就是合并后的数据，不是原始独立版本')

  console.log('\n2. 原始数据库分析显示有4个TOEFL版本:')
  console.log('   - TOEFL (Enhanced) - 22,336 词')
  console.log('   - TOEFL (Enhanced) - 11,168 词')
  console.log('   - TOEFL - 20,476 词')
  console.log('   - TOEFL - 10,238 词')
  console.log('   → 总计约 64,218 个单词记录')

  console.log('\n3. 当前TOEFL状态:')
  const { data: toefl } = await supabase
    .from('books')
    .select('total_words')
    .eq('title', 'TOEFL')
    .single()
  console.log(`   - TOEFL: ${toefl.total_words.toLocaleString()} 词`)
  console.log(`   → 只有 10,238 个单词`)

  console.log('\n' + '='.repeat(80))
  console.log('\n🎯 问题诊断:')
  console.log('\n【理论】如果真正智能合并，应该:')
  console.log('  1. 收集所有版本的单词（可能重复ID）')
  console.log('  2. 按ID去重（同一ID的单词合并字段）')
  console.log('  3. 保留所有唯一ID的单词')
  console.log('  4. 结果应该 > 20,000 词（接近最大的独立版本）')

  console.log('\n【实际】只做了:')
  console.log('  1. 删除了重复的书籍')
  console.log('  2. 选择了其中一个版本（TOEFL_merged.json）')
  console.log('  3. 没有合并多个版本的唯一单词')
  console.log('  4. 结果只有 10,238 词（远小于预期）')

  console.log('\n' + '='.repeat(80))
  console.log('\n💡 结论:')
  console.log('\n❌ **没有真正智能合并！**')
  console.log('\n只是消除了"书名重复"，但没有"合并单词"。')
  console.log('\n当前状态:')
  console.log('  ✅ 书名无重复：34本书，每个名称唯一')
  console.log('  ❌ 单词未合并：只选了其中一个版本')
  console.log('\n真正智能合并应该得到 20,000-30,000 个单词，而不是 10,238 个。')
  console.log('\n')
}

analyzeMergeQuality().catch(console.error)
