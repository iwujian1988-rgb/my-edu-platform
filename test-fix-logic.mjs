/**
 * 测试 normalizeBookData 修复逻辑
 * 验证中英文标题兼容性
 */

// 模拟 normalizeBookData 的 code 提取逻辑
function extractCode(abbreviation, title) {
  let code = 'BK'

  if (abbreviation) {
    const match = abbreviation.match(/^([A-Z]+-?[A-Z]*)/)
    if (match) {
      code = match[1].replace('-', '').substring(0, 3).toUpperCase()
    } else {
      code = abbreviation.substring(0, 3).toUpperCase()
    }
  } else if (title) {
    const titlePrefix = title.substring(0, 3).toUpperCase()
    if (/^[A-Z-]+$/.test(titlePrefix)) {
      code = titlePrefix.replace('-', '')
    }
  }

  return code
}

// 测试用例
const testCases = [
  // 中文标题 + abbreviation（新数据）
  { title: '四级', abbreviation: 'CET-4', expected: 'CET' },
  { title: '六级', abbreviation: 'CET-6', expected: 'CET' },
  { title: '雅思', abbreviation: 'IELTS', expected: 'IEL' },
  { title: '托福', abbreviation: 'TOEFL', expected: 'TOE' },
  { title: '考研', abbreviation: null, expected: 'BK' }, // 无 abbreviation

  // 英文标题 + abbreviation（兼容旧数据）
  { title: 'CET-4', abbreviation: 'CET-4', expected: 'CET' },
  { title: 'IELTS', abbreviation: 'IELTS', expected: 'IEL' },

  // 英文标题无 abbreviation（旧数据，后备方案）
  { title: 'TOEFL', abbreviation: null, expected: 'TOE' },
  { title: 'GRE-Test', abbreviation: null, expected: 'GRE' },
  { title: 'PETS3', abbreviation: null, expected: 'PET' },
]

console.log('🧪 测试代码提取逻辑\n')

let passed = 0
let failed = 0

testCases.forEach(({ title, abbreviation, expected }) => {
  const result = extractCode(abbreviation, title)
  const status = result === expected ? '✅' : '❌'

  if (result === expected) {
    passed++
  } else {
    failed++
  }

  console.log(`${status} title="${title}" abbreviation="${abbreviation}" → "${result}" ${result === expected ? '' : `(期望: "${expected}")`}`)
})

console.log(`\n${'='.repeat(60)}`)
console.log(`总计: ${testCases.length} | 通过: ${passed} | 失败: ${failed}`)

if (failed === 0) {
  console.log('✅ 所有测试通过！')
  process.exit(0)
} else {
  console.log('❌ 部分测试失败')
  process.exit(1)
}
