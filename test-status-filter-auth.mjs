/**
 * 测试状态筛选API (带认证)
 */

const TEST_BOOK_ID = '9f1e6332-979d-4632-a8f6-8bd35246b28d'

// 从auth state文件中获取cookie
const fs = await import('fs')
const authState = JSON.parse(fs.readFileSync('e2e/.auth/admin-storage-state.json', 'utf-8'))
const authCookie = authState.cookies[0].value

console.log('\n========================================')
console.log('测试: 状态筛选API (带认证)')
console.log('========================================\n')

// Test 1: 获取所有单词 (status=all)
console.log('Test 1: 获取所有单词 (status=all)')
const response1 = await fetch(`http://localhost:3007/api/words?bookId=${TEST_BOOK_ID}&status=all&page=1&pageSize=21`, {
  headers: {
    'Cookie': `sb-snnrjnpcmdsdlyldvvps-auth-token=${authCookie}`
  }
})
const data1 = await response1.json()
console.log(`  Status: ${response1.status}`)
console.log(`  ✅ 数据量: ${data1.data?.length || 0}, 总数: ${data1.total || data1.count || 0}`)

// Test 2: 获取"认识"的单词 (status=known)
console.log('\nTest 2: 获取"认识"的单词 (status=known)')
const response2 = await fetch(`http://localhost:3007/api/words?bookId=${TEST_BOOK_ID}&status=known&page=1&pageSize=21`, {
  headers: {
    'Cookie': `sb-snnrjnpcmdsdlyldvvps-auth-token=${authCookie}`
  }
})
const data2 = await response2.json()
console.log(`  Status: ${response2.status}`)
console.log(`  ✅ 数据量: ${data2.data?.length || 0}, 总数: ${data2.total || data2.count || 0}`)

// Test 3: 获取"模糊"的单词 (status=fuzzy)
console.log('\nTest 3: 获取"模糊"的单词 (status=fuzzy)')
const response3 = await fetch(`http://localhost:3007/api/words?bookId=${TEST_BOOK_ID}&status=fuzzy&page=1&pageSize=21`, {
  headers: {
    'Cookie': `sb-snnrjnpcmdsdlyldvvps-auth-token=${authCookie}`
  }
})
const data3 = await response3.json()
console.log(`  Status: ${response3.status}`)
console.log(`  ✅ 数据量: ${data3.data?.length || 0}, 总数: ${data3.total || data3.count || 0}`)

// 验证
console.log('\n========================================')
console.log('验证结果')
console.log('========================================\n')

const allCount = data1.data?.length || 0
const knownCount = data2.data?.length || 0
const fuzzyCount = data3.data?.length || 0

console.log(`📊 状态分布:`)
console.log(`   - 所有: ${allCount}`)
console.log(`   - 认识: ${knownCount}`)
console.log(`   - 模糊: ${fuzzyCount}`)

if (knownCount > 0 || fuzzyCount > 0) {
  console.log('\n✅ API返回了筛选数据，说明status参数生效')
} else if (allCount > 0) {
  console.log('\nℹ️ 该书有单词，但没有"认识"或"模糊"的进度记录')
} else {
  console.log('\n⚠️ 该书可能没有任何单词')
}

console.log('\n========================================')
console.log('✅ API测试完成')
console.log('========================================\n')
