// 分析词库质量
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

    // 字段统计
    const stats = {
      phonetic: 0,
      uk_phonetic: 0,
      us_phonetic: 0,
      definition: 0,
      definition_en: 0,
      definition_cn: 0,
      collocation: 0,
      collocation_en: 0,
      example_sentence: 0,
      example_sentence_en: 0,
      part_of_speech: 0,
      audio_url: 0
    }

    // 统计字段完整度
    words.forEach(w => {
      if (w.phonetic) stats.phonetic++
      if (w.uk_phonetic) stats.uk_phonetic++
      if (w.us_phonetic) stats.us_phonetic++
      if (w.definition) stats.definition++
      if (w.definition_en) stats.definition_en++
      if (w.definition_cn) stats.definition_cn++
      if (w.collocation) stats.collocation++
      if (w.collocation_en) stats.collocation_en++
      if (w.example_sentence) stats.example_sentence++
      if (w.example_sentence_en) stats.example_sentence_en++
      if (w.part_of_speech) stats.part_of_speech++
      if (w.audio_url) stats.audio_url++
    })

    return {
      title: data.title || fileName.replace('.json', ''),
      totalWords,
      stats,
      percentages: {
        phonetic: ((stats.phonetic / totalWords) * 100).toFixed(1),
        uk_phonetic: ((stats.uk_phonetic / totalWords) * 100).toFixed(1),
        us_phonetic: ((stats.us_phonetic / totalWords) * 100).toFixed(1),
        definition: ((stats.definition / totalWords) * 100).toFixed(1),
        definition_en: ((stats.definition_en / totalWords) * 100).toFixed(1),
        collocation: ((stats.collocation / totalWords) * 100).toFixed(1),
        example_sentence_en: ((stats.example_sentence_en / totalWords) * 100).toFixed(1),
        part_of_speech: ((stats.part_of_speech / totalWords) * 100).toFixed(1)
      },
      // 数据质量评分（0-100）
      qualityScore: calculateQualityScore(totalWords, stats)
    }
  } catch (error) {
    console.error(`  ❌ 解析失败: ${error.message}`)
    return null
  }
}

function calculateQualityScore(totalWords, stats) {
  // 权重分配
  const weights = {
    definition: 30,      // 中文释义最重要
    phonetic: 15,        // 音标很重要
    example_sentence_en: 20,  // 英文例句
    collocation: 10,     // 搭配
    part_of_speech: 10,  // 词性
    definition_en: 10,   // 英文释义
    uk_phonetic: 2.5,    // 英式音标
    us_phonetic: 2.5     // 美式音标
  }

  const score =
    (stats.definition / totalWords) * weights.definition +
    (stats.phonetic / totalWords) * weights.phonetic +
    (stats.example_sentence_en / totalWords) * weights.example_sentence_en +
    (stats.collocation / totalWords) * weights.collocation +
    (stats.part_of_speech / totalWords) * weights.part_of_speech +
    (stats.definition_en / totalWords) * weights.definition_en +
    (stats.uk_phonetic / totalWords) * weights.uk_phonetic +
    (stats.us_phonetic / totalWords) * weights.us_phonetic

  return score.toFixed(1)
}

async function main() {
  console.log('\n📊 词库质量分析报告')
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
    console.log(`     definition:        ${r.percentages.definition}%`)
    console.log(`     phonetic:          ${r.percentages.phonetic}%`)
    console.log(`     uk_phonetic:       ${r.percentages.uk_phonetic}%`)
    console.log(`     us_phonetic:       ${r.percentages.us_phonetic}%`)
    console.log(`     example_sentence_en: ${r.percentages.example_sentence_en}%`)
    console.log(`     collocation:       ${r.percentages.collocation}%`)
    console.log(`     part_of_speech:    ${r.percentages.part_of_speech}%`)
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

  // TOP 5 高质量词库
  console.log(`\n🏆 TOP 5 高质量词库:`)
  results
    .sort((a, b) => parseFloat(b.qualityScore) - parseFloat(a.qualityScore))
    .slice(0, 5)
    .forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.title.padEnd(25)} ${r.qualityScore}分 (${r.totalWords.toLocaleString()}词)`)
    })

  console.log('\n' + '='.repeat(80))
  console.log('✅ 分析完成！')
  console.log('='.repeat(80) + '\n')
}

main().catch(console.error)
