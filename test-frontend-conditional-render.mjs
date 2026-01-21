/**
 * 测试前端条件渲染逻辑
 * 验证代码是否正确实现动态显示/隐藏筛选按钮
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

console.log('\n🧪 测试前端条件渲染逻辑')
console.log('='.repeat(80))

// 测试1: 检查useWordData hook
console.log('\n📋 测试1: 检查useWordData Hook')
console.log('-'.repeat(80))

const hookContent = readFileSync(join(__dirname, 'src/hooks/useWordData.ts'), 'utf-8')

const hasStateDeclaration = hookContent.includes('const [hasThemeData, setHasThemeData] = useState(false)')
const hasSceneStateDeclaration = hookContent.includes('const [hasSceneData, setHasSceneData] = useState(false)')
const hasThemeUpdate = hookContent.includes('setHasThemeData(data.hasThemeData)')
const hasSceneUpdate = hookContent.includes('setHasSceneData(data.hasSceneData)')
const hasThemeReturn = hookContent.includes('hasThemeData,')
const hasSceneReturn = hookContent.includes('hasSceneData')

console.log('✅ useWordData Hook检查:')
console.log(`  - 声明hasThemeData状态: ${hasStateDeclaration ? '✅' : '❌'}`)
console.log(`  - 声明hasSceneData状态: ${hasSceneStateDeclaration ? '✅' : '❌'}`)
console.log(`  - 更新hasThemeData: ${hasThemeUpdate ? '✅' : '❌'}`)
console.log(`  - 更新hasSceneData: ${hasSceneUpdate ? '✅' : '❌'}`)
console.log(`  - 返回hasThemeData: ${hasThemeReturn ? '✅' : '❌'}`)
console.log(`  - 返回hasSceneData: ${hasSceneReturn ? '✅' : '❌'}`)

const hookPass = hasStateDeclaration && hasSceneStateDeclaration && hasThemeUpdate && hasSceneUpdate && hasThemeReturn && hasSceneReturn
console.log(`\n结果: ${hookPass ? '✅ PASS' : '❌ FAIL'}`)

// 测试2: 检查BookDetailPageClient组件
console.log('\n📋 测试2: 检查BookDetailPageClient组件')
console.log('-'.repeat(80))

const componentContent = readFileSync(join(__dirname, 'src/components/BookDetailPageClient.tsx'), 'utf-8')

const destructuring = componentContent.match(/const \{ words, totalWords, hasMore, isLoading, isLoadingMore, hasThemeData, hasSceneData \} = useWordData\(/)

const themeConditional = componentContent.includes('{hasThemeData && (')
const sceneConditional = componentContent.includes('{hasSceneData && (')

console.log('✅ BookDetailPageClient检查:')
console.log(`  - 解构hasThemeData和hasSceneData: ${destructuring ? '✅' : '❌'}`)
console.log(`  - 主题按钮条件渲染: ${themeConditional ? '✅' : '❌'}`)
console.log(`  - 场景按钮条件渲染: ${sceneConditional ? '✅' : '❌'}`)

const componentPass = destructuring && themeConditional && sceneConditional
console.log(`\n结果: ${componentPass ? '✅ PASS' : '❌ FAIL'}`)

// 测试3: 检查条件渲染的位置和结构
console.log('\n📋 测试3: 检查条件渲染结构')
console.log('-'.repeat(80))

// 检查主题按钮的条件渲染块（JSX注释格式）
const themeBlockExists = componentContent.includes('{hasThemeData && (') &&
                          (componentContent.includes('{/* 🔥 主题选择器 - 仅当书籍有theme数据时显示 */}') ||
                           componentContent.includes('🔥 主题选择器 - 仅当书籍有theme数据时显示'))
const sceneBlockExists = componentContent.includes('{hasSceneData && (') &&
                          (componentContent.includes('{/* 🔥 场景选择器 - 仅当书籍有scene数据时显示 */}') ||
                           componentContent.includes('🔥 场景选择器 - 仅当书籍有scene数据时显示'))

console.log('✅ 条件渲染结构检查:')
console.log(`  - 主题按钮条件块: ${themeBlockExists ? '✅' : '❌'}`)
console.log(`  - 场景按钮条件块: ${sceneBlockExists ? '✅' : '❌'}`)

const structurePass = themeBlockExists && sceneBlockExists
console.log(`\n结果: ${structurePass ? '✅ PASS' : '❌ FAIL'}`)

// 测试4: 检查章节筛选不受影响
console.log('\n📋 测试4: 检查章节筛选器是否保留（不受影响）')
console.log('-'.repeat(80))

const chapterSelectorExists = componentContent.includes('{uniqueChapters.length > 0 && (')
const chapterSelectorComment = componentContent.includes('章节选择器 - 仅当有章节时显示')

console.log('✅ 章节筛选器检查:')
console.log(`  - 章节筛选器存在: ${chapterSelectorExists ? '✅' : '❌'}`)
console.log(`  - 章节筛选器注释存在: ${chapterSelectorComment ? '✅' : '❌'}`)

const chapterPass = chapterSelectorExists && chapterSelectorComment
console.log(`\n结果: ${chapterPass ? '✅ PASS' : '❌ FAIL'}`)

// 测试5: 检查注释说明
console.log('\n📋 测试5: 检查代码注释说明')
console.log('-'.repeat(80))

const hasThemeComment = componentContent.includes('🔥 主题选择器 - 仅当书籍有theme数据时显示')
const hasSceneComment = componentContent.includes('🔥 场景选择器 - 仅当书籍有scene数据时显示')
const hasDataFeatureComment = hookContent.includes('🔥 书籍数据特性') || hookContent.includes('书籍数据特性')

console.log('✅ 代码注释检查:')
console.log(`  - 主题按钮注释: ${hasThemeComment ? '✅' : '❌'}`)
console.log(`  - 场景按钮注释: ${hasSceneComment ? '✅' : '❌'}`)
console.log(`  - Hook返回值注释: ${hasDataFeatureComment ? '✅' : '❌'}`)

const commentPass = hasThemeComment && hasSceneComment && hasDataFeatureComment
console.log(`\n结果: ${commentPass ? '✅ PASS' : '❌ FAIL'}`)

// 总结
console.log('\n' + '='.repeat(80))
console.log('📊 测试总结:')
console.log(`  测试1 (useWordData Hook): ${hookPass ? '✅ PASS' : '❌ FAIL'}`)
console.log(`  测试2 (BookDetailPageClient): ${componentPass ? '✅ PASS' : '❌ FAIL'}`)
console.log(`  测试3 (条件渲染结构): ${structurePass ? '✅ PASS' : '❌ FAIL'}`)
console.log(`  测试4 (章节筛选器): ${chapterPass ? '✅ PASS' : '❌ FAIL'}`)
console.log(`  测试5 (代码注释): ${commentPass ? '✅ PASS' : '❌ FAIL'}`)

const allPass = hookPass && componentPass && structurePass && chapterPass && commentPass
console.log(`\n🏁 总体结果: ${allPass ? '✅ 全部通过' : '❌ 存在失败'}`)
console.log('='.repeat(80) + '\n')

process.exit(allPass ? 0 : 1)
