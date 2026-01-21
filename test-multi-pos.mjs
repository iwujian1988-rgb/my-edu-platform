/**
 * 测试多词性提取逻辑
 */

const testCases = [
  { input: "n. 烤肉；吃烤肉的野宴\nvt. 烧烤；烤肉", desc: "barbecue - 两个词性换行分隔" },
  { input: "n. 放任；狂热\nvt. 遗弃；放弃", desc: "abandon - 两个词性换行分隔" },
  { input: "adj. 能； 有能力的；能干的", desc: "able - 单个词性" },
  { input: "n. 炸土豆条；小木片", desc: "chips - 单个词性" },
  { input: "n. 屑片， 碎片； 炸土豆条", desc: "chip - 单个词性（CET-4格式）" },
  { input: "vt. 废除，废止；取消", desc: "abolish - 单个词性" },
]

function processMultiplePos(inputDef) {
  if (typeof inputDef !== 'string') {
    return { partOfSpeech: '', definition: '' }
  }

  // 按换行符分割
  const parts = inputDef.split('\n').filter(p => p.trim())

  if (parts.length === 0) {
    return { partOfSpeech: '', definition: inputDef }
  }

  // 如果只有一部分，尝试提取词性
  if (parts.length === 1) {
    const match = parts[0].match(/^([a-z]{1,4}\.)\s*/)
    if (match) {
      return {
        partOfSpeech: match[1],
        definition: parts[0].substring(match[0].length).trim()
      }
    }
    return { partOfSpeech: '', definition: parts[0] }
  }

  // 多个词性
  const posList = []
  const defList = []

  for (const part of parts) {
    const match = part.match(/^([a-z]{1,4}\.)\s*/)
    if (match) {
      posList.push(match[1])
      defList.push(part.substring(match[0].length).trim())
    } else {
      // 没有词性标记，添加到上一个词性的释义中
      if (defList.length > 0) {
        defList[defList.length - 1] += '；' + part.trim()
      } else {
        defList.push(part.trim())
      }
    }
  }

  // 组合格式
  const partOfSpeech = posList.join(', ')
  const formattedDef = defList.map((def, i) => `【${posList[i]}】${def}`).join('')

  return { partOfSpeech, definition: formattedDef }
}

console.log('🧪 测试多词性提取逻辑\n')
console.log('='.repeat(100))

testCases.forEach((test, i) => {
  console.log(`\n测试 ${i + 1}: ${test.desc}`)
  console.log('─'.repeat(100))
  console.log(`输入: "${test.input}"`)

  const result = processMultiplePos(test.input)

  console.log(`\n输出:`)
  console.log(`  词性: "${result.partOfSpeech}"`)
  console.log(`  释义: "${result.definition}"`)

  // 验证
  const hasPosMarkers = result.definition.includes('n. ') || result.definition.includes('vt. ') || result.definition.includes('adj. ')
  const hasFormatted = result.definition.includes('【n.')

  if (!hasPosMarkers && hasFormatted) {
    console.log(`  ✅ 正确：词性已提取并格式化`)
  } else if (hasPosMarkers) {
    console.log(`  ⚠️  警告：释义中仍包含词性标记`)
  } else {
    console.log(`  ℹ️  信息：单词性或格式化`)
  }
})

console.log('\n' + '='.repeat(100))

// 额外测试：前端如何解析格式化的释义
console.log('\n📱 前端解析示例：\n')

const formattedDef = "【n.】烤肉；吃烤肉的野宴【vt.】烧烤；烤肉"
const regex = /【([a-z]{1,4}\.)】([^【]+)/g
let match
let parsed = []

while ((match = regex.exec(formattedDef)) !== null) {
  parsed.push({
    pos: match[1],
    def: match[2].trim()
  })
}

console.log('格式化释义:', formattedDef)
console.log('解析结果:')
parsed.forEach((p, i) => {
  console.log(`  ${i + 1}. 词性: ${p.pos}, 释义: ${p.def}`)
})
