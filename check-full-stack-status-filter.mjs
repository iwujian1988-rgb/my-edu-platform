/**
 * 全栈检查：从UI点击到API调用的完整数据流
 */
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

console.log('\n🔬 全栈研发总监级别的完整检查\n')
console.log('='.repeat(80))

// 1. 检查前端状态筛选按钮的点击事件
console.log('\n📋 第1层：UI组件 - 状态筛选按钮')
console.log('-'.repeat(80))

const componentCode = readFileSync(join(__dirname, 'src/components/BookDetailPageClient.tsx'), 'utf-8')

// 查找状态筛选按钮的点击处理
const statusButtonClickMatch = componentCode.match(/onClick=\{\(\) => setStatus\(['`](.*?)['`]\)}/g)
const statusSelectMatch = componentCode.match(/status.*select.*onChange/gi)

console.log('状态筛选按钮检查:')
console.log(`  - 有setStatus调用: ${statusButtonClickMatch ? '✅' : '❌'}`)
console.log(`  - 有select下拉: ${statusSelectMatch ? '✅' : '❌'}`)

if (statusButtonClickMatch) {
  console.log('  找到的setStatus调用:', statusButtonClickMatch)
}

// 2. 检查useBookFilters的setStatus实现
console.log('\n📋 第2层：Hook - useBookFilters.setStatus')
console.log('-'.repeat(80))

const filterHookCode = readFileSync(join(__dirname, 'src/hooks/useBookFilters.ts'), 'utf-8')

const setStatusImpl = filterHookCode.match(/setStatus:.*=>/s)
console.log('setStatus实现:', setStatusImpl ? setStatusImpl[0].substring(0, 100) + '...' : '❌ 未找到')

// 检查updateFilter是否正确触发state更新
const hasUpdateFilter = filterHookCode.includes('setFilters(prev => ({ ...prev, [key]: value }))')
const hasUpdateURL = filterHookCode.includes('updateURL({')

console.log(`  - 更新filters state: ${hasUpdateFilter ? '✅' : '❌'}`)
console.log(`  - 更新URL: ${hasUpdateURL ? '✅' : '❌'}`)

// 3. 检查useWordData是否订阅filters.status变化
console.log('\n📋 第3层：Hook - useWordData.useEffect依赖')
console.log('-'.repeat(80))

const wordDataHookCode = readFileSync(join(__dirname, 'src/hooks/useWordData.ts'), 'utf-8')

// 查找useEffect的依赖数组
const useEffectMatches = wordDataHookCode.match(/useEffect\(\(\) => \{[\s\S]*?\}, \[.*?\]\)/g)

console.log('useEffect依赖数组:')
if (useEffectMatches) {
  useEffectMatches.forEach((match, idx) => {
    const deps = match.match(/\[(.*?)\]/)[1]
    console.log(`  useEffect #${idx + 1}: [${deps}]`)

    // 检查是否包含filters.status
    if (deps.includes('filters.status')) {
      console.log(`    ✅ 包含filters.status - 会触发重新获取`)
    } else if (deps.includes('filters.page')) {
      console.log(`    ⚠️  包含filters.page但不包含filters.status - 可能有问题`)
    }
  })
} else {
  console.log('  ❌ 未找到useEffect')
}

// 4. 检查API调用时是否传递status参数
console.log('\n📋 第4层：API调用 - 传递status参数')
console.log('-'.repeat(80))

const hasStatusParam = wordDataHookCode.includes('status: filters.status')
const hasSearchParams = wordDataHookCode.includes('URLSearchParams')

console.log(`  - 使用URLSearchParams: ${hasSearchParams ? '✅' : '❌'}`)
console.log(`  - 传递status参数: ${hasStatusParam ? '✅' : '❌'}`)

if (hasStatusParam) {
  // 提取URLSearchParams构建代码
  const paramsMatch = wordDataHookCode.match(/const params = new URLSearchParams\(\{[\s\S]*?\}\)/)
  if (paramsMatch) {
    console.log('  参数构建代码:')
    console.log('  ' + paramsMatch[0].split('\n').map(l => '  ' + l).join('\n'))
  }
}

// 5. 检查API是否处理status参数
console.log('\n📋 第5层：API - 处理status参数')
console.log('-'.repeat(80))

const apiCode = readFileSync(join(__dirname, 'src/app/api/words/route.ts'), 'utf-8')

const getsStatusParam = apiCode.includes("const status = searchParams.get('status')") ||
                        apiCode.includes('const status = searchParams.get("status")')
const hasStatusCheck = apiCode.includes('if (status !== \'all\')')
const filtersByStatus = apiCode.includes('p.status === status')

console.log(`  - 获取status参数: ${getsStatusParam ? '✅' : '❌'}`)
console.log(`  - 有status筛选逻辑: ${hasStatusCheck ? '✅' : '❌'}`)
console.log(`  - 按status过滤: ${filtersByStatus ? '✅' : '❌'}`)

// 6. 关键检查：filters对象是否正确传递
console.log('\n📋 第6层：关键检查 - filters对象传递')
console.log('-'.repeat(80))

// 检查useWordData是否正确解构filters
const destructuringFilters = wordDataHookCode.match(/const \{ filters \} = useBookFilters\(\)/)
console.log(`  - useWordData解构filters: ${destructuringFilters ? '✅' : '❌'}`)

// 检查useEffect是否正确使用filters.status
const usesFiltersStatus = wordDataHookCode.match(/filters\.status/g)
console.log(`  - 使用filters.status的次数: ${usesFiltersStatus ? usesFiltersStatus.length : 0}`)

// 7. 最终检查：数据流完整性
console.log('\n📋 第7层：数据流完整性检查')
console.log('-'.repeat(80))

const dataFlowChecks = [
  { step: 'UI点击setStatus', pass: setStatusImpl !== null },
  { step: 'useBookFilters更新state', pass: hasUpdateFilter },
  { step: 'useWordData订阅filters.status', pass: wordDataHookCode.includes('filters.status') },
  { step: 'useEffect触发', pass: wordDataHookCode.includes('filters.status') },
  { step: 'API调用传递status', pass: hasStatusParam },
  { step: 'API处理status', pass: getsStatusParam && hasStatusCheck && filtersByStatus }
]

console.log('完整数据流:')
dataFlowChecks.forEach(({ step, pass }) => {
  console.log(`  ${step}: ${pass ? '✅' : '❌'}`)
})

const allPass = dataFlowChecks.every(({ pass }) => pass)
console.log(`\n🏁 数据流完整性: ${allPass ? '✅ 完整' : '❌ 存在断点'}`)

// 8. 潜在问题识别
console.log('\n📋 第8层：潜在问题识别')
console.log('-'.repeat(80))

if (!wordDataHookCode.includes('filters.status')) {
  console.log('❌ 关键问题：useWordData的useEffect依赖数组可能缺少filters.status!')
  console.log('   这会导致setStatus后不触发API重新调用')
}

if (wordDataHookCode.includes('filters.page') && !wordDataHookCode.includes('filters.status')) {
  console.log('❌ 关键问题：依赖数组有filters.page但缺少filters.status!')
  console.log('   这会导致点击状态筛选时不触发数据刷新')
}

console.log('\n' + '='.repeat(80))
console.log('检查完成\n')
