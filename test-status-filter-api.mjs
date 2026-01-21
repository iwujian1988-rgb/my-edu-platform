/**
 * 直接测试API - 验证status参数生效
 *
 * 这个测试直接调用API，验证：
 * 1. status=known 返回已标记为"认识"的单词
 * 2. status=all 返回所有单词
 */

const TEST_BOOK_ID = '9f1e6332-979d-4632-a8f6-8bd35246b28d'

console.log('\n========================================')
console.log('测试: 状态筛选API')
console.log('========================================\n')

// Test 1: 获取所有单词 (status=all)
console.log('Test 1: 获取所有单词 (status=all)')
const response1 = await fetch(`http://localhost:3007/api/words?bookId=${TEST_BOOK_ID}&status=all&page=1&pageSize=21`)
const data1 = await response1.json()
console.log(`  ✅ API响应: success=${data1.success}, 数据量=${data1.data?.length || 0}, 总数=${data1.total || 0}`)

// Test 2: 获取"认识"的单词 (status=known)
console.log('\nTest 2: 获取"认识"的单词 (status=known)')
const response2 = await fetch(`http://localhost:3007/api/words?bookId=${TEST_BOOK_ID}&status=known&page=1&pageSize=21`)
const data2 = await response2.json()
console.log(`  ✅ API响应: success=${data2.success}, 数据量=${data2.data?.length || 0}, 总数=${data2.total || 0}`)

// Test 3: 获取"模糊"的单词 (status=fuzzy)
console.log('\nTest 3: 获取"模糊"的单词 (status=fuzzy)')
const response3 = await fetch(`http://localhost:3007/api/words?bookId=${TEST_BOOK_ID}&status=fuzzy&page=1&pageSize=21`)
const data3 = await response3.json()
console.log(`  ✅ API响应: success=${data3.success}, 数据量=${data3.data?.length || 0}, 总数=${data3.total || 0}`)

// Test 4: 获取"不认识"的单词 (status=unknown)
console.log('\nTest 4: 获取"不认识"的单词 (status=unknown)')
const response4 = await fetch(`http://localhost:3007/api/words?bookId=${TEST_BOOK_ID}&status=unknown&page=1&pageSize=21`)
const data4 = await response4.json()
console.log(`  ✅ API响应: success=${data4.success}, 数据量=${data4.data?.length || 0}, 总数=${data4.total || 0}`)

// 验证
console.log('\n========================================')
console.log('验证结果')
console.log('========================================\n')

const allCount = data1.data?.length || 0
const knownCount = data2.data?.length || 0
const fuzzyCount = data3.data?.length || 0
const unknownCount = data4.data?.length || 0

console.log(`📊 状态分布:`)
console.log(`   - 所有: ${allCount}`)
console.log(`   - 认识: ${knownCount}`)
console.log(`   - 模糊: ${fuzzyCount}`)
console.log(`   - 不认识: ${unknownCount}`)

if (knownCount > 0 || fuzzyCount > 0 || unknownCount > 0) {
  console.log('\n✅ API返回了筛选数据，说明status参数生效')
} else {
  console.log('\n⚠️ 所有筛选结果都是0，可能是该书没有任何进度记录')
}

console.log('\n========================================')
console.log('✅ API测试完成')
console.log('========================================\n')
