// 重新分析词库质量（使用正确的字段名）
const fs = require('fs')
const path = require('path')

const wordlistsDir = path.join(__dirname, 'wordlists_v1/wordlists_final')

function analyzeWordlist(fileName) {
  const filePath = path.join(wordlistsDir, fileName)

  if (!fs.existsSync(filePath)) {
    return null
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8')
    const data = JSON.parse(content)

    const words = data.words || []
    const totalWords = words.length

    // 字段统计（使用实际存在的字段名）
    const stats = {
      uk_phonetic: 0,
      us_phonetic: 0,
      definition_cn: 0,
      definition_en: 0,
      examples: 0,
      phrases: 0,
      synonyms: 0,
      related_words: 0,
      memory_method: 0,
      derived_words: 0,
      part_of_speech: 0
    }

    // 统计字段完整度
    words.forEach(w => {
      if (w.uk_phonetic) stats.uk_phonetic++
      if (w.us_phonetic) stats.us_phonetic++
      if (w.definition_cn) stats.definition_cn++
      if (w.definition_en) stats.definition_en++
      if (w.examples && w.examples.length > 0) stats.examples++
      if (w.phrases && w.phrases.length > 0) stats.phrases++
      if (w.synonyms && w.synonyms.length > 0) stats.synonyms++
      if (w.related_words && w.related_words.length > 0) stats.related_words++
      if (w.memory_method) stats.memory_method++
      if (w.derived_words && w.derived_words.length > 0) stats.derived_words++
      if (w.part_of_speech) stats.part_of_speech++
    })

    return {
      title: data.title || fileName.replace('.json', ''),
      totalWords,
      stats,
      percentages: {
        uk_phonetic: ((stats.uk_phonetic / totalWords) * 100).toFixed(1),
        us_phonetic: ((stats.us_phonetic / totalWords) * 100).toFixed(1),
        definition_cn: ((stats.definition_cn / totalWords) * 100).toFixed(1),
        definition_en: ((stats.definition_en / totalWords) * 100).toFixed(1),
        examples: ((stats.examples / totalWords) * 100).toFixed(1),
        phrases: ((stats.phrases / totalWords) * 100).toFixed(1),
        synonyms: ((stats.synonyms / totalWords) * 100).toFixed(1),
        related_words: ((stats.related_words / totalWords) * 100).toFixed(1),
        memory_method: ((stats.memory_method / totalWords) * 100).toFixed(1),
        derived_words: ((stats.derived_words / totalWords) * 100).toFixed(1)
      },
      qualityScore: calculateQualityScore(totalWords, stats)
    }
  } catch (error) {
    console.error(`  ❌ 解析失败: ${error.message}`)
    return null
  }
}

function calculateQualityScore(totalWords, stats) {
  // 调整权重，基于实际字段
  const weights = {
    definition_cn: 25,    // 中文释义最重要
    examples: 20,         // 例句
    phrases: 10,          // 搭配
    uk_phonetic: 10,      // 英式音标
    us_phonetic: 10,      // 美式音标
    synonyms: 8,         // 同义词
    related_words: 5,     // 相关词
    derived_words: 5,     // 派生词
    memory_method: 5,     // 记忆方法
    part_of_speech: 2     // 词性
  }

  const score =
    (stats.definition_cn / totalWords) * weights.definition_cn +
    (stats.examples / totalWords) * weights.examples +
    (stats.phrases / totalWords) * weights.phrases +
    (stats.uk_phonetic / totalWords) * weights.uk_phonetic +
    (stats.us_phonetic / totalWords) * weights.us_phonetic +
    (stats.synonyms / totalWords) * weights.synonyms +
    (stats.related_words / totalWords) * weights.related_words +
    (stats.derived_words / totalWords) * weights.derived_words +
    (stats.memory_method / totalWords) * weights.memory_method +
    (stats.part_of_speech / totalWords) * weights.part_of_speech

  return score.toFixed(1)
}

async function main() {
  console.log('\n📊 词库质量分析报告（正确字段版本）')
  console.log('='.repeat(80))
  console.log('\n数据来源: 20260112v1.tar.gz\n')

  const files = fs.readdirSync(wordlistsDir).filter(f => f.endsWith('.json'))

  const results = []

  console.log('正在分析词库...\n')

  for (const file of files) {
    const result = analyzeWordlist(file)
    if (result) {
      results.push(result)
    }
  }

  // 按单词数排序
  results.sort((a, b) => b.totalWords - a.totalWords)

  console.log('='.repeat(80))
  console.log('📊 分析结果（按单词数排序）')
  console.log('='.repeat(80))

  results.forEach((r, i) => {
    console.log(`\n${i + 1}. ${r.title}`)
    console.log(`   单词数: ${r.totalWords.toLocaleString()}`)
    console.log(`   质量评分: ${r.qualityScore}/100`)
    console.log(`   字段完整度:`)
    console.log(`     definition_cn:     ${r.percentages.definition_cn}%`)
    console.log(`     uk_phonetic:       ${r.percentages.uk_phonetic}%`)
    console.log(`     us_phonetic:       ${r.percentages.us_phonetic}%`)
    console.log(`     examples:          ${r.percentages.examples}%`)
    console.log(`     phrases:           ${r.percentages.phrases}%`)
    console.log(`     synonyms:          ${r.percentages.synonyms}%`)
    console.log(`     related_words:     ${r.percentages.related_words}%`)
    console.log(`     derived_words:     ${r.percentages.derived_words}%`)
    console.log(`     memory_method:     ${r.percentages.memory_method}%`)
  })

  // 汇总统计
  const totalWords = results.reduce((sum, r) => sum + r.totalWords, 0)
  const avgQuality = (results.reduce((sum, r) => sum + parseFloat(r.qualityScore), 0) / results.length).toFixed(1)

  console.log('\n' + '='.repeat(80))
  console.log('📈 汇总统计')
  console.log('='.repeat(80))
  console.log(`\n总词库数: ${results.length}`)
  console.log(`总单词数: ${totalWords.toLocaleString()}`)
  console.log(`平均质量评分: ${avgQuality}/100`)

  // 质量分级
  const highQuality = results.filter(r => parseFloat(r.qualityScore) >= 80).length
  const mediumQuality = results.filter(r => parseFloat(r.qualityScore) >= 60 && parseFloat(r.qualityScore) < 80).length
  const lowQuality = results.filter(r => parseFloat(r.qualityScore) < 60).length

  console.log(`\n质量分布:`)
  console.log(`  高质量 (≥80分): ${highQuality} 个`)
  console.log(`  中等质量 (60-79分): ${mediumQuality} 个`)
  console.log(`  低质量 (<60分): ${lowQuality} 个`)

  // TOP 10 高质量词库
  console.log(`\n🏆 TOP 10 高质量词库:`)
  results
    .sort((a, b) => parseFloat(b.qualityScore) - parseFloat(a.qualityScore))
    .slice(0, 10)
    .forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.title.padEnd(25)} ${r.qualityScore}分 (${r.totalWords.toLocaleString()}词)`)
    })

  console.log('\n' + '='.repeat(80))
  console.log('✅ 分析完成！')
  console.log('='.repeat(80) + '\n')
}

main().catch(console.error)
