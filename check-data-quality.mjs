/**
 * 数据质量检查脚本
 * 检查所有词库文件的数据完整性和一致性
 */

import { readFileSync, readdirSync } from 'fs'
import { resolve } from 'path'

const WORDLIST_DIR = './wordlists_final'

function checkWordlist(filename) {
  const filePath = resolve(WORDLIST_DIR, filename)
  const jsonContent = readFileSync(filePath, 'utf-8')
  const data = JSON.parse(jsonContent)

  const issues = []
  const stats = {
    total: data.words.length,
    withChapter: 0,
    withoutChapter: 0,
    withPhonetic: 0,
    withExamples: 0,
    withPhrases: 0,
    uniqueChapters: new Set(),
    definitionTypes: new Set(),
    emptyDefinitions: 0,
    emptyWords: 0
  }

  for (const word of data.words) {
    // 检查单词是否为空
    if (!word.word || word.word.trim() === '') {
      stats.emptyWords++
      issues.push(`空单词: ${JSON.stringify(word).slice(0, 100)}`)
    }

    // 检查definition_cn类型
    if (Array.isArray(word.definition_cn)) {
      stats.definitionTypes.add('array')
    } else if (typeof word.definition_cn === 'string') {
      stats.definitionTypes.add('string')
    }

    // 检查definition是否为空
    let hasDef = false
    if (Array.isArray(word.definition_cn) && word.definition_cn.length > 0) {
      if (word.definition_cn[0].definition_cn) hasDef = true
    } else if (typeof word.definition_cn === 'string' && word.definition_cn.trim()) {
      hasDef = true
    }
    if (!hasDef) stats.emptyDefinitions++

    // 检查章节
    if (word.chapter && Array.isArray(word.chapter) && word.chapter.length > 0) {
      stats.withChapter++
      word.chapter.forEach(ch => stats.uniqueChapters.add(ch))
    } else {
      stats.withoutChapter++
    }

    // 检查音标
    if (word.uk_phonetic || word.us_phonetic) {
      stats.withPhonetic++
    }

    // 检查例句
    if (word.examples && Array.isArray(word.examples) && word.examples.length > 0) {
      stats.withExamples++
    }

    // 检查短语
    if (word.phrases && Array.isArray(word.phrases) && word.phrases.length > 0) {
      stats.withPhrases++
    }
  }

  return {
    filename,
    title: data.title,
    totalWords: data.total_words,
    actualWords: stats.total,
    issues,
    stats: {
      ...stats,
      uniqueChapters: stats.uniqueChapters.size,
      definitionTypes: Array.from(stats.definitionTypes)
    }
  }
}

function main() {
  console.log('🔍 开始数据质量检查...\n')
  console.log('='.repeat(80))

  const files = readdirSync(WORDLIST_DIR)
    .filter(f => f.endsWith('.json') && f !== 'final_statistics.json' && f !== 'README.md')

  const results = []
  let totalIssues = 0

  for (const file of files) {
    const result = checkWordlist(file)
    results.push(result)
    totalIssues += result.issues.length

    // 输出检查结果
    console.log(`\n📚 ${result.title}`)
    console.log(`   文件: ${result.filename}`)
    console.log(`   声明词数: ${result.totalWords} | 实际词数: ${result.actualWords}`)
    console.log(`   章节覆盖: ${result.stats.withChapter}/${result.stats.total} (${Math.round(result.stats.withChapter/result.stats.total*100)}%)`)
    console.log(`   章节总数: ${result.stats.uniqueChapters}`)
    console.log(`   音标覆盖: ${result.stats.withPhonetic}/${result.stats.total} (${Math.round(result.stats.withPhonetic/result.stats.total*100)}%)`)
    console.log(`   例句覆盖: ${result.stats.withExamples}/${result.stats.total} (${Math.round(result.stats.withExamples/result.stats.total*100)}%)`)
    console.log(`   短语覆盖: ${result.stats.withPhrases}/${result.stats.total} (${Math.round(result.stats.withPhrases/result.stats.total*100)}%)`)
    console.log(`   释义类型: ${result.stats.definitionTypes.join(', ')}`)
    console.log(`   空单词: ${result.stats.emptyWords}`)
    console.log(`   空释义: ${result.stats.emptyDefinitions}`)

    if (result.issues.length > 0) {
      console.log(`   ⚠️  发现问题:`)
      result.issues.slice(0, 5).forEach(issue => console.log(`      - ${issue}`))
      if (result.issues.length > 5) {
        console.log(`      ... 还有 ${result.issues.length - 5} 个问题`)
      }
    }
  }

  console.log('\n' + '='.repeat(80))
  console.log('📊 总体统计')
  console.log('='.repeat(80))

  const totalWords = results.reduce((sum, r) => sum + r.actualWords, 0)
  const totalWithChapter = results.reduce((sum, r) => sum + r.stats.withChapter, 0)
  const totalWithPhonetic = results.reduce((sum, r) => sum + r.stats.withPhonetic, 0)
  const totalWithExamples = results.reduce((sum, r) => sum + r.stats.withExamples, 0)
  const totalEmptyWords = results.reduce((sum, r) => sum + r.stats.emptyWords, 0)
  const totalEmptyDefs = results.reduce((sum, r) => sum + r.stats.emptyDefinitions, 0)

  console.log(`词库数量: ${results.length}`)
  console.log(`总词汇量: ${totalWords}`)
  console.log(`章节覆盖率: ${Math.round(totalWithChapter/totalWords*100)}%`)
  console.log(`音标覆盖率: ${Math.round(totalWithPhonetic/totalWords*100)}%`)
  console.log(`例句覆盖率: ${Math.round(totalWithExamples/totalWords*100)}%`)
  console.log(`空单词数量: ${totalEmptyWords}`)
  console.log(`空释义数量: ${totalEmptyDefs}`)
  console.log(`发现问题: ${totalIssues}`)

  if (totalIssues === 0 && totalEmptyWords === 0 && totalEmptyDefs === 0) {
    console.log('\n✅ 数据质量检查通过！可以安全导入。')
  } else {
    console.log('\n⚠️  发现数据质量问题，建议修复后再导入。')
  }

  console.log('='.repeat(80))
}

main()
