/**
 * 测试多词性处理函数
 */

// 复制要测试的函数（修复版）
function processMultiplePosArray(definitionArray) {
  if (!Array.isArray(definitionArray) || definitionArray.length === 0) {
    return { partOfSpeech: '', definition: '', definitionEn: '' }
  }

  const posList = []
  const defList = []
  const defEnList = []

  for (const item of definitionArray) {
    if (item && item.part_of_speech) {
      posList.push(item.part_of_speech)
      defList.push(item.definition_cn || '')
      // 保持数组长度一致，即使没有definition_en也要添加空字符串
      defEnList.push(item.definition_en || '')
    }
  }

  // 如果没有词性信息，返回第一个
  if (posList.length === 0) {
    const first = definitionArray[0]
    return {
      partOfSpeech: first?.part_of_speech || '',
      definition: first?.definition_cn || '',
      definitionEn: first?.definition_en || ''
    }
  }

  // 如果只有一个词性，直接返回（不添加标记）
  if (posList.length === 1) {
    const first = definitionArray.find(item => item?.part_of_speech) || definitionArray[0]
    return {
      partOfSpeech: first.part_of_speech || '',
      definition: first.definition_cn || '',
      definitionEn: first.definition_en || ''
    }
  }

  // 多个词性：组合格式
  const partOfSpeech = posList.join(', ')
  const formattedDef = defList.map((def, i) => `【${posList[i]}】${def}`).join('')
  const hasAnyDefEn = defEnList.some(def => def !== '')
  const formattedDefEn = hasAnyDefEn
    ? defEnList.map((def, i) => def ? `【${posList[i]}】${def}` : '').join('')
    : ''

  return { partOfSpeech, definition: formattedDef, definitionEn: formattedDefEn }
}

// 测试用例
const testCases = [
  {
    name: '✅ 单词性 - book',
    input: [
      { part_of_speech: "n", definition_cn: "书本", definition_en: "a written work" }
    ],
    expected: {
      partOfSpeech: "n",
      definition: "书本",
      definitionEn: "a written work"
    }
  },
  {
    name: '✅ 多词性 - book',
    input: [
      { part_of_speech: "n", definition_cn: "书本", definition_en: "a written work" },
      { part_of_speech: "v", definition_cn: "预订", definition_en: "to reserve" }
    ],
    expected: {
      partOfSpeech: "n, v",
      definition: "【n】书本【v】预订",
      definitionEn: "【n】a written work【v】to reserve"
    }
  },
  {
    name: '✅ 三词性 - address',
    input: [
      { part_of_speech: "n", definition_cn: "地址", definition_en: "address" },
      { part_of_speech: "v", definition_cn: "致辞", definition_en: "to speak to" },
      { part_of_speech: "v", definition_cn: "处理", definition_en: "to deal with" }
    ],
    expected: {
      partOfSpeech: "n, v, v",
      definition: "【n】地址【v】致辞【v】处理",
      definitionEn: "【n】address【v】to speak to【v】to deal with"
    }
  },
  {
    name: '⚠️ 无词性标记',
    input: [
      { definition_cn: "书本" }
    ],
    expected: {
      partOfSpeech: "",
      definition: "书本",
      definitionEn: ""
    }
  },
  {
    name: '⚠️ 缺少英文释义',
    input: [
      { part_of_speech: "n", definition_cn: "书本" },
      { part_of_speech: "v", definition_cn: "预订", definition_en: "to reserve" }
    ],
    expected: {
      partOfSpeech: "n, v",
      definition: "【n】书本【v】预订",
      definitionEn: "【v】to reserve"
    }
  },
  {
    name: '⚠️ 空数组',
    input: [],
    expected: {
      partOfSpeech: "",
      definition: "",
      definitionEn: ""
    }
  }
]

// 运行测试
console.log('🧪 开始测试多词性处理函数\n')
console.log('='.repeat(80))

let passed = 0
let failed = 0

for (const testCase of testCases) {
  const result = processMultiplePosArray(testCase.input)

  const success =
    result.partOfSpeech === testCase.expected.partOfSpeech &&
    result.definition === testCase.expected.definition &&
    result.definitionEn === testCase.expected.definitionEn

  if (success) {
    passed++
    console.log(`✅ ${testCase.name}`)
    console.log(`   输入: ${JSON.stringify(testCase.input)}`)
    console.log(`   输出:`, result)
  } else {
    failed++
    console.log(`\n❌ ${testCase.name}`)
    console.log(`   输入: ${JSON.stringify(testCase.input)}`)
    console.log(`   期望:`, testCase.expected)
    console.log(`   实际:`, result)
    console.log(`   差异:`)
    if (result.partOfSpeech !== testCase.expected.partOfSpeech) {
      console.log(`     partOfSpeech: "${result.partOfSpeech}" !== "${testCase.expected.partOfSpeech}"`)
    }
    if (result.definition !== testCase.expected.definition) {
      console.log(`     definition: "${result.definition}" !== "${testCase.expected.definition}"`)
    }
    if (result.definitionEn !== testCase.expected.definitionEn) {
      console.log(`     definitionEn: "${result.definitionEn}" !== "${testCase.expected.definitionEn}"`)
    }
  }
  console.log()
}

console.log('='.repeat(80))
console.log(`\n📊 测试结果: ${passed} 通过, ${failed} 失败\n`)

if (failed > 0) {
  console.log('❌ 存在失败的测试用例，需要修复代码！\n')
  process.exit(1)
} else {
  console.log('✅ 所有测试通过！\n')
}
