import fs from 'fs'
import path from 'path'

const files = [
  { name: 'IELTS_enhanced.json', expected: 3427 },
  { name: 'TOEFL_enhanced.json', expected: 10241 },
  { name: '考研_enhanced.json', expected: 5864 },
  { name: 'CET-4_enhanced.json', expected: 2607 },
  { name: 'CET-6_enhanced.json', expected: 2345 },
  { name: 'GRE_enhanced.json', expected: 7427 },
  { name: 'SAT_enhanced.json', expected: 6445 },
  { name: 'GMAT_enhanced.json', expected: 3883 },
  { name: 'BEC_enhanced.json', expected: 3644 },
  { name: '高中_enhanced.json', expected: 3753 },
  { name: '初中_enhanced.json', expected: 2085 },
  { name: '2022年专升本英语核心词汇.json', expected: 3421 },
  { name: '14天攻克KET核心词汇.json', expected: 520 },
  { name: '2022 PETS第五级教材.json', expected: 520 },
  { name: 'FCE核心词 巧记速练.json', expected: 3864 },
  { name: '2022PETS第三级教材.json', expected: 938 },
  { name: '2022PETS第四级教材.json', expected: 649 }
]

console.log('========================================')
console.log('   Chapter 字段覆盖度检查')
console.log('========================================\n')

const results = []

files.forEach(file => {
  const filePath = path.join('wordlists_final', file.name)

  try {
    const content = fs.readFileSync(filePath, 'utf8')
    const data = JSON.parse(content)

    const words = data.words || []
    const totalWords = words.length

    // 统计有chapter的单词数
    let wordsWithChapter = 0
    let wordsWithoutChapter = 0

    // 收集所有不同的chapter值
    const chapters = new Set()

    words.forEach(word => {
      if (word.chapter && word.chapter.length > 0) {
        wordsWithChapter++
        word.chapter.forEach(c => chapters.add(c))
      } else {
        wordsWithoutChapter++
      }
    })

    const coverage = ((wordsWithChapter / totalWords) * 100).toFixed(1)

    results.push({
      name: file.name,
      total: totalWords,
      withChapter: wordsWithChapter,
      withoutChapter: wordsWithoutChapter,
      coverage: coverage,
      uniqueChapters: chapters.size
    })

    console.log(`【${file.name}】`)
    console.log(`  总单词数: ${totalWords}`)
    console.log(`  有chapter: ${wordsWithChapter} (${coverage}%)`)
    console.log(`  无chapter: ${wordsWithoutChapter}`)
    console.log(`  章节种类: ${chapters.size}个`)

    if (chapters.size > 0 && chapters.size <= 20) {
      console.log(`  章节示例: ${Array.from(chapters).slice(0, 5).join(', ')}`)
    }

    const status = wordsWithChapter > 0 ? '✓' : '❌'
    console.log(`  导入策略: ${wordsWithChapter > 0 ? '使用源章节' : '自动生成章节(每100词)'}`)
    console.log('')
  } catch (err) {
    console.log(`【${file.name}】`)
    console.log(`  ❌ 解析失败: ${err.message}`)
    console.log('')
  }
})

console.log('========================================')
console.log('   总结')
console.log('========================================\n')

const totalWords = results.reduce((sum, r) => sum + r.total, 0)
const totalWithChapter = results.reduce((sum, r) => sum + r.withChapter, 0)
const totalWithoutChapter = results.reduce((sum, r) => sum + r.withoutChapter, 0)
const overallCoverage = ((totalWithChapter / totalWords) * 100).toFixed(1)

const filesWithChapter = results.filter(r => r.withChapter > 0).length
const filesWithoutChapter = results.filter(r => r.withChapter === 0).length

console.log(`总单词数: ${totalWords}`)
console.log(`有chapter字段: ${totalWithChapter} (${overallCoverage}%)`)
console.log(`无chapter字段: ${totalWithoutChapter}`)
console.log('')
console.log(`有chapter的词库: ${filesWithChapter}/16`)
console.log(`无chapter的词库: ${filesWithoutChapter}/16`)
console.log('')

console.log('========================================')
console.log('   详细分类')
console.log('========================================\n')

console.log('【A类: 有完整章节信息】')
results.filter(r => r.withChapter > 0).forEach(r => {
  console.log(`  ✓ ${r.name} (${r.coverage}%) - ${r.uniqueChapters}个章节`)
})

console.log('')
console.log('【B类: 无章节信息】')
results.filter(r => r.withChapter === 0).forEach(r => {
  console.log(`  ❌ ${r.name} (0%) - 需要自动生成章节`)
})
