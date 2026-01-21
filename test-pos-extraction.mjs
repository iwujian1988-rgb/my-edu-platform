/**
 * 测试词性提取逻辑
 */

const testCases = [
  { input: "n. 炸土豆条；小木片", expectedPos: "n.", expectedDef: "炸土豆条；小木片" },
  { input: "vt. 废除，废止；取消", expectedPos: "vt.", expectedDef: "废除，废止；取消" },
  { input: "adj. 能； 有能力的；能干的", expectedPos: "adj.", expectedDef: "能； 有能力的；能干的" },
  { input: "vi. 突然发生；爆发", expectedPos: "vi.", expectedDef: "突然发生；爆发" },
  { input: "num. 第一百；一百（个）", expectedPos: "num.", expectedDef: "第一百；一百（个）" },
  { input: "adv. 很；非常", expectedPos: "adv.", expectedDef: "很；非常" },
  { input: "prep. 在...期间", expectedPos: "prep.", expectedDef: "在...期间" },
  { input: "纯中文释义没有词性", expectedPos: null, expectedDef: "纯中文释义没有词性" }
]

console.log('🧪 测试词性提取逻辑\n')
console.log('='.repeat(80))

let passCount = 0
let failCount = 0

testCases.forEach((test, i) => {
  const posMatch = test.input.match(/^([a-z]{1,4}\.)\s*/)
  let partOfSpeech = ''
  let definition = ''

  if (posMatch) {
    partOfSpeech = posMatch[1]
    definition = test.input.substring(posMatch[0].length).trim()
  } else {
    definition = test.input
  }

  const posMatched = partOfSpeech === test.expectedPos
  const defMatched = definition === test.expectedDef
  const passed = posMatched && defMatched

  if (passed) {
    passCount++
    console.log(`✅ 测试 ${i+1}: 通过`)
  } else {
    failCount++
    console.log(`❌ 测试 ${i+1}: 失败`)
  }

  console.log(`   输入: "${test.input}"`)
  console.log(`   期望: pos="${test.expectedPos}", def="${test.expectedDef}"`)
  console.log(`   实际: pos="${partOfSpeech}", def="${definition}"`)
  if (!passed) {
    console.log(`   差异: pos=${posMatched ? '✓' : '✗'}, def=${defMatched ? '✓' : '✗'}`)
  }
  console.log()
})

console.log('='.repeat(80))
console.log(`结果: ${passCount} 通过, ${failCount} 失败`)

if (failCount === 0) {
  console.log('\n🎉 所有测试通过！词性提取逻辑正常。')
} else {
  console.log('\n⚠️  部分测试失败，需要调整逻辑。')
}
