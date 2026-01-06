/**
 * 创建测试账号的脚本
 * 运行: npx tsx scripts/create-test-user.ts
 */

async function createTestUser() {
  const response = await fetch('http://localhost:3000/login', {
    method: 'GET',
  })

  console.log('请手动在浏览器中注册测试账号:')
  console.log('1. 访问 http://localhost:3000/login')
  console.log('2. 切换到"注册"标签')
  console.log('3. 填写信息:')
  console.log('   - 手机号: 13800138000')
  console.log('   - 密码: test123456')
  console.log('   - 确认密码: test123456')
  console.log('   - 邀请码: TEST1234')
  console.log('4. 点击注册')
}

createTestUser()
