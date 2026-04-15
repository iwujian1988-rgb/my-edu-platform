/**
 * 测试 cleanWord 修复效果
 *
 * 验证修复后的 cleanWord 函数能够正确处理：
 * 1. 法语复合词（连字符）
 * 2. 法语缩合词（撇号）
 * 3. 首尾标点
 * 4. 空字符串和无效输入
 */

// 模拟 cleanWord 函数（修复后的版本）
function cleanWord(word) {
  if (!word || typeof word !== 'string') {
    return ''
  }

  const trimmed = word.trim()

  // 如果是空字符串，直接返回
  if (!trimmed) {
    return ''
  }

  // 法语单词可能包含的合法字符：
  // - 字母 (a-z, A-Z, À-ÿ)
  // - 连字符 (用于复合词，如 vis-à-vis)
  // - 撇号 (用于缩合，如 c'est, d'eau)
  // 只去除首尾的**纯标点符号**（保留单词内部的合法字符）
  const cleaned = trimmed.replace(/^[^\wÀ-ÿ'-]+|[^\wÀ-ÿ'-]+$/g, '')

  // 确保清理后至少包含一个字母
  const hasLetter = /[a-zA-ZÀ-ÿ]/.test(cleaned)

  return hasLetter ? cleaned : ''
}

// 测试用例
const testCases = [
  // 法语复合词（连字符）
  { input: "vis-à-vis", expected: "vis-à-vis", description: "复合词（连字符）" },
  { input: "peut-être", expected: "peut-être", description: "复合词（连字符）" },
  { input: "avant-hier", expected: "avant-hier", description: "复合词（连字符）" },

  // 法语缩合词（撇号）
  { input: "c'est", expected: "c'est", description: "缩合词（撇号）" },
  { input: "d'eau", expected: "d'eau", description: "缩合词（撇号）" },
  { input: "j'ai", expected: "j'ai", description: "缩合词（撇号）" },
  { input: "qu'est-ce", expected: "qu'est-ce", description: "缩合词+连字符" },
  { input: "aujourd'hui", expected: "aujourd'hui", description: "缩合词（撇号）" },

  // 首尾标点
  { input: ".le", expected: "le", description: "去除首部句号" },
  { input: "le.", expected: "le", description: "去除尾部句号" },
  { input: ",le,", expected: "le", description: "去除首尾逗号" },
  { input: "\"le\"", expected: "le", description: "去除首尾引号" },

  // 无效输入
  { input: "", expected: "", description: "空字符串" },
  { input: "   ", expected: "", description: "纯空格" },
  { input: "...", expected: "", description: "纯标点" },
  { input: null, expected: "", description: "null 输入" },
  { input: undefined, expected: "", description: "undefined 输入" },

  // 边界情况
  { input: "a", expected: "a", description: "单字母" },
  { input: "é", expected: "é", description: "单字母（重音）" },
  { input: "œuvre", expected: "œuvre", description: "特殊字符" },
  { input: "français", expected: "français", description: "重音字母" },

  // 混合情况
  { input: "\"c'est\"", expected: "c'est", description: "缩合词+引号" },
  { input: "...vis-à-vis...", expected: "vis-à-vis", description: "复合词+省略号" },
]

console.log('🧪 测试 cleanWord 修复效果\n')
console.log('='.repeat(80))

let passed = 0
let failed = 0

testCases.forEach(({ input, expected, description }, index) => {
  const result = cleanWord(input)
  const status = result === expected ? '✅ PASS' : '❌ FAIL'

  if (result === expected) {
    passed++
  } else {
    failed++
  }

  console.log(`Test ${index + 1}: ${description}`)
  console.log(`  Input:    "${JSON.stringify(input)}"`)
  console.log(`  Expected: "${expected}"`)
  console.log(`  Got:      "${result}"`)
  console.log(`  Status:   ${status}`)
  console.log()
})

console.log('='.repeat(80))
console.log(`\n📊 测试结果: ${passed}/${testCases.length} 通过`)

if (failed > 0) {
  console.log(`\n⚠️  ${failed} 个测试失败！`)
  process.exit(1)
} else {
  console.log('\n✅ 所有测试通过！')
  process.exit(0)
}
