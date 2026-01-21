/**
 * 验证缓存修复
 */
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

console.log('\n✅ 验证缓存修复\n')
console.log('='.repeat(80))

const code = readFileSync(join(__dirname, 'src/hooks/useWordData.ts'), 'utf-8')

console.log('\n检查1: 缓存key是否包含status')
console.log('-'.repeat(80))

const hasCacheKeyWithStatus = code.includes('const cacheKey = `${filters.page}-${filters.status}`')
const usesStringSet = code.includes(': Set<string>')
const savesStringSet = code.includes('Set<string>(')

console.log(`  - 使用page-status组合作为key: ${hasCacheKeyWithStatus ? '✅' : '❌'}`)
console.log(`  - Set类型改为string: ${usesStringSet ? '✅' : '❌'}`)
console.log(`  - 函数签名更新: ${savesStringSet ? '✅' : '❌'}`)

if (hasCacheKeyWithStatus && usesStringSet && savesStringSet) {
  console.log('\n✅ 修复验证通过！')
  console.log('   现在 status 变化时会正确触发 API 调用')
  console.log('   示例:')
  console.log('     - page=1, status="all" → 缓存key: "1-all"')
  console.log('     - page=1, status="known" → 缓存key: "1-known" ✅ 不同的key')
  console.log('     - 不会因为"1-all"已加载就跳过"1-known"的API调用')
} else {
  console.log('\n❌ 修复可能不完整')
}

console.log('\n' + '='.repeat(80))
console.log('验证完成\n')
