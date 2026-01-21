/**
 * 测试脚本：验证三个修复
 * 1. 筛选功能
 * 2. 返回按钮响应
 * 3. 继续按钮响应
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

console.log('\n🧪 开始自测修复效果\n')
console.log('=' .repeat(80))

// ✅ 测试 1: 检查 useWordData.ts 的依赖数组
console.log('\n📋 测试 1: 检查 useWordData.ts 依赖数组')
try {
  const useWordDataContent = readFileSync(join(__dirname, 'src/hooks/useWordData.ts'), 'utf-8')

  // 查找 useEffect 的依赖数组
  const useEffectMatch = useWordDataContent.match(/}, \[([^\]]+)\] \/\/ ✅/)
  if (useEffectMatch) {
    const deps = useEffectMatch[1]
    console.log('   依赖数组:', deps)

    // 检查是否包含错误的依赖
    const hasTheme = deps.includes('filters.theme')
    const hasScenario = deps.includes('filters.scenario')
    const hasPage = deps.includes('filters.page')
    const hasStatus = deps.includes('filters.status')

    if (!hasTheme && !hasScenario && hasPage && hasStatus) {
      console.log('   ✅ PASS: 依赖数组正确（只包含需要API查询的参数）')
    } else if (hasTheme || hasScenario) {
      console.log('   ❌ FAIL: 依赖数组包含客户端筛选参数（theme/scenario）')
    } else {
      console.log('   ⚠️  WARNING: 依赖数组可能有问题')
    }
  } else {
    console.log('   ❌ FAIL: 未找到依赖数组')
  }
} catch (error) {
  console.log('   ❌ FAIL: 无法读取文件:', error.message)
}

// ✅ 测试 2: 检查 useBookFilters.ts 的 cleanup 逻辑
console.log('\n📋 测试 2: 检查 useBookFilters.ts cleanup 逻辑')
try {
  const useBookFiltersContent = readFileSync(join(__dirname, 'src/hooks/useBookFilters.ts'), 'utf-8')

  // 检查 cleanup 函数
  const hasCleanup = useBookFiltersContent.includes('return () => {')
  const hasHandleBeforeUnloadCall = useBookFiltersContent.match(/return \(\) \{[\s\S]*?handleBeforeUnload\(\)/)

  if (hasCleanup && !hasHandleBeforeUnloadCall) {
    console.log('   ✅ PASS: cleanup 不调用 handleBeforeUnload（不会阻塞）')
  } else if (hasHandleBeforeUnloadCall) {
    console.log('   ❌ FAIL: cleanup 仍然调用 handleBeforeUnload（会阻塞）')
  } else {
    console.log('   ⚠️  WARNING: cleanup 逻辑可能有问题')
  }
} catch (error) {
  console.log('   ❌ FAIL: 无法读取文件:', error.message)
}

// ✅ 测试 3: 检查 readingProgress.ts 是否使用 upsert
console.log('\n📋 测试 3: 检查 readingProgress.ts 优化')
try {
  const readingProgressContent = readFileSync(join(__dirname, 'src/lib/readingProgress.ts'), 'utf-8')

  const hasUpsert = readingProgressContent.includes('.upsert(')
  const hasUpdateThenInsert = readingProgressContent.includes('.update(') && readingProgressContent.includes('.insert(')

  if (hasUpsert && !hasUpdateThenInsert) {
    console.log('   ✅ PASS: 使用 upsert（优化，减少数据库往返）')
  } else if (hasUpdateThenInsert) {
    console.log('   ❌ FAIL: 仍然使用先update后insert（慢）')
  } else {
    console.log('   ⚠️  WARNING: 未找到预期的代码模式')
  }
} catch (error) {
  console.log('   ❌ FAIL: 无法读取文件:', error.message)
}

// ✅ 测试 4: 检查已加载页码追踪
console.log('\n📋 测试 4: 检查 useWordData.ts 页码缓存优化')
try {
  const useWordDataContent = readFileSync(join(__dirname, 'src/hooks/useWordData.ts'), 'utf-8')

  const hasLoadedPagesRef = useWordDataContent.includes('loadedPagesRef')
  const hasSkipLogic = useWordDataContent.includes('loadedPagesRef.current.has(filters.page)')
  const hasMarkLoaded = useWordDataContent.includes('loadedPagesRef.current.add(filters.page)')

  if (hasLoadedPagesRef && hasSkipLogic && hasMarkLoaded) {
    console.log('   ✅ PASS: 实现了已加载页码追踪（跳过重复API调用）')
  } else {
    console.log('   ❌ FAIL: 缺少页码缓存优化')
    if (!hasLoadedPagesRef) console.log('      - 缺少 loadedPagesRef')
    if (!hasSkipLogic) console.log('      - 缺少跳过逻辑')
    if (!hasMarkLoaded) console.log('      - 缺少标记逻辑')
  }
} catch (error) {
  console.log('   ❌ FAIL: 无法读取文件:', error.message)
}

// ✅ 测试 5: 检查 API 调用参数
console.log('\n📋 测试 5: 检查 API 调用参数（不传递theme/scenario）')
try {
  const useWordDataContent = readFileSync(join(__dirname, 'src/hooks/useWordData.ts'), 'utf-8')

  // 查找 API 参数构建代码
  const paramsMatch = useWordDataContent.match(/const params = new URLSearchParams\(\{([\s\S]*?)\}\)/)
  if (paramsMatch) {
    const params = paramsMatch[1]

    const hasBookId = params.includes('bookId')
    const hasStatus = params.includes('status')
    const hasTheme = params.includes('theme')
    const hasScenario = params.includes('scenario')

    if (hasBookId && hasStatus && !hasTheme && !hasScenario) {
      console.log('   ✅ PASS: API 参数正确（只传递支持的参数）')
    } else if (hasTheme || hasScenario) {
      console.log('   ❌ FAIL: API 参数包含不支持的theme/scenario')
    } else {
      console.log('   ⚠️  WARNING: API 参数可能有问题')
    }
  } else {
    console.log('   ❌ FAIL: 未找到API参数构建代码')
  }
} catch (error) {
  console.log('   ❌ FAIL: 无法读取文件:', error.message)
}

console.log('\n' + '=' .repeat(80))
console.log('✅ 自测完成\n')
