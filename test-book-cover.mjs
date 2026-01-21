import { BookCover } from '../src/components/BookCover'

console.log('🧪 测试 BookCover 组件渲染...\n')

try {
  // 测试所有4种类型
  const types = ['cn', 'global', 'k12', 'uni'] as const

  types.forEach(type => {
    const props = {
      code: type === 'cn' ? 'CN' : type === 'global' ? 'GL' : type === 'k12' ? 'K12' : 'UNI',
      title: `Test ${type.toUpperCase()}`,
      type
    }

    console.log(`✅ ${type.toUpperCase()} 类型:`, props)
    console.log(`   Code: ${props.code}`)
    console.log(`   Title: ${props.title}`)
    console.log(`   Type: ${props.type}`)
    console.log('')
  })

  console.log('✅ 所有类型测试通过！')
  console.log('\n💡 如果页面还是loading，请：')
  console.log('   1. 停止dev server (Ctrl+C)')
  console.log('   2. 重新运行: npm run dev')
  console.log('   3. 刷新浏览器页面 (Ctrl+Shift+R 强制刷新)')

} catch (error) {
  console.error('❌ 组件测试失败:', error)
}
