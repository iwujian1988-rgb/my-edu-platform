/**
 * 重置用户密码的辅助脚本
 * 运行: node tests/diagnostics/reset-password-helper.js <手机号> <新密码>
 *
 * 示例:
 * node tests/diagnostics/reset-password-helper.js 13900000001 NewPassword123
 */

const fs = require('fs')
const path = require('path')

function loadEnv() {
  const envPath = path.join(__dirname, '../../.env.local')
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8')
    envContent.split('\n').forEach(line => {
      line = line.trim()
      if (line && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=')
        let value = valueParts.join('=').trim()
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1)
        }
        if (key) {
          process.env[key.trim()] = value
        }
      }
    })
  }
}

loadEnv()

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function resetUserPassword(phone, newPassword) {
  console.log('🔐 重置用户密码...\n')
  console.log('手机号:', phone)
  console.log('新密码:', newPassword)
  console.log('\n' + '─'.repeat(60) + '\n')

  // 手机号转邮箱
  const email = `${phone}@phone.xiaoyu.com`

  try {
    // 步骤1: 查找用户
    console.log('📋 步骤1: 查找用户...')
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()

    if (listError) {
      console.log('❌ 查询用户失败:', listError.message)
      return false
    }

    const targetUser = users.find(u => u.email === email)

    if (!targetUser) {
      console.log('❌ 用户不存在:', phone)
      console.log('\n💡 提示：请先注册该手机号')
      return false
    }

    console.log('✅ 找到用户')
    console.log('   用户ID:', targetUser.id)
    console.log('   Email:', targetUser.email)
    console.log('   创建时间:', targetUser.created_at)

    // 步骤2: 更新用户密码
    console.log('\n📋 步骤2: 更新密码...')
    const { data, error: updateError } = await supabase.auth.admin.updateUserById(
      targetUser.id,
      { password: newPassword }
    )

    if (updateError) {
      console.log('❌ 更新密码失败:', updateError.message)
      console.log('   错误详情:', JSON.stringify(updateError, null, 2))
      return false
    }

    console.log('✅ 密码更新成功!')
    console.log('   用户ID:', data.id)
    console.log('   新密码已生效')

    // 步骤3: 验证密码是否可以登录
    console.log('\n📋 步骤3: 验证新密码...')
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: newPassword
    })

    if (signInError) {
      console.log('⚠️  新密码验证失败:', signInError.message)
      console.log('   但密码已更新，可能需要等待几秒')
    } else {
      console.log('✅ 新密码验证成功，可以正常登录')
    }

    console.log('\n' + '─'.repeat(60))
    console.log('✅ 密码重置完成！')
    console.log('\n现在可以使用以下凭据登录:')
    console.log(`  手机号: ${phone}`)
    console.log(`  密码: ${newPassword}`)
    console.log('\n或使用旧密码登录应该会失败！')
    console.log('─'.repeat(60))

    return true

  } catch (e) {
    console.log('❌ 异常错误:', e.message)
    console.log('   堆栈:', e.stack)
    return false
  }
}

// 从命令行参数获取手机号和新密码
const args = process.argv.slice(2)
if (args.length < 2) {
  console.log('用法: node reset-password-helper.js <手机号> <新密码>')
  console.log('\n示例:')
  console.log('  node reset-password-helper.js 13900000001 NewPassword123')
  console.log('\n运行测试:')
  console.log('  npx playwright test e2e/scenarios/login-related.spec.ts')
  process.exit(1)
}

const phone = args[0]
const newPassword = args[1]

resetUserPassword(phone, newPassword)
