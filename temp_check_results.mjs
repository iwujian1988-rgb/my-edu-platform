import fs from 'fs'

// 读取生成的结果
const data = JSON.parse(fs.readFileSync('./temp/generated_examples_v3.json', 'utf-8'))

console.log('============ generated_examples_v3.json 统计 ============')
console.log('统计:', JSON.stringify(data.stats, null, 2))

// 检查成功的例句
const successCount = data.results?.filter(r => r.status === 'success').length || 0
const needsReviewCount = data.results?.filter(r => r.status === 'needs_review').length || 0
const failedCount = data.results?.filter(r => r.status === 'failed').length || 0

console.log('\n结果统计:')
console.log(`  成功: ${successCount}`)
console.log(`  需审核: ${needsReviewCount}`)
console.log(`  失败: ${failedCount}`)
console.log(`  总计: ${data.results?.length || 0}`)

// 检查成功例句的质量
const successSamples = data.results?.filter(r => r.status === 'success').slice(0, 3)
console.log('\n成功样本:')
successSamples?.forEach(r => {
  console.log(`\n  单词: ${r.word}`)
  r.new_sentences?.forEach((s, i) => {
    console.log(`  例句${i+1}: ${s.en?.substring(0, 80)}...`)
    console.log(`  翻译${i+1}: ${s.cn?.substring(0, 50)}...`)
  })
})

console.log('\n============ 脏数据统计 ============')
console.log(`脏数据数量: ${data.dirty_words?.length || 0}`)
