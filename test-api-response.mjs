/**
 * 调试API响应
 */

const TEST_BOOK_ID = '9f1e6332-979d-4632-a8f6-8bd35246b28d'

console.log('\n调试: 查看完整API响应\n')

const response = await fetch(`http://localhost:3007/api/words?bookId=${TEST_BOOK_ID}&status=all&page=1&pageSize=21`)
const text = await response.text()

console.log('Status:', response.status)
console.log('Headers:', Object.fromEntries(response.headers))
console.log('\nResponse body (first 500 chars):')
console.log(text.substring(0, 500))
console.log('...\n')

try {
  const json = JSON.parse(text)
  console.log('Parsed JSON keys:', Object.keys(json))
  console.log('Full JSON:', JSON.stringify(json, null, 2))
} catch (e) {
  console.log('❌ 无法解析为JSON')
}
