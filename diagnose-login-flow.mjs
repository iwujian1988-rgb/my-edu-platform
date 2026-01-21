/**
 * 登录问题诊断脚本
 * 检查：
 * 1. 环境变量是否正确
 * 2. Supabase 连接是否正常
 * 3. 用户数据是否存在
 * 4. 登录流程是否正确
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 加载环境变量
const envPath = join(__dirname, '.env.local')
const envContent = readFileSync(envPath, 'utf-8')
const envVars = {}

// 解析 .env.local 文件
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=')
  if (key && !key.startsWith('#') && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim().replace(/^"|"$/g, '')
  }
})

console.log('📋 环境变量检查:')
console.log('NEXT_PUBLIC_SUPABASE_URL:', envVars.NEXT_PUBLIC_SUPABASE_URL ? '✅ 已设置' : '❌ 未设置')
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ 已设置' : '❌ 未设置')
console.log('SUPABASE_SERVICE_ROLE_KEY:', envVars.SUPABASE_SERVICE_ROLE_KEY ? '✅ 已设置' : '❌ 未设置')

if (!envVars.NEXT_PUBLIC_SUPABASE_URL || !envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.error('❌ 环境变量不完整，请检查 .env.local 文件')
  process.exit(1)
}

// 创建 Supabase 客户端
const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

console.log('\n🔗 Supabase 连接测试:')
console.log('URL:', envVars.NEXT_PUBLIC_SUPABASE_URL)

// 测试登录函数
async function testLogin(phone, password) {
  console.log(`\n🧪 测试登录: ${phone}`)

  // 转换手机号为 email
  const email = `${phone}@phone.xiaoyu.com`
  console.log('转换后的 Email:', email)

  try {
    // 尝试登录
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      console.error('❌ 登录失败:', {
        message: error.message,
        status: error.status,
        code: error.code,
        name: error.name
      })

      // 检查用户是否存在
      console.log('\n🔍 检查用户是否存在...')
      const { data: users, error: listError } = await supabase.auth.admin.listUsers()

      if (listError) {
        console.error('❌ 无法获取用户列表:', listError.message)
      } else {
        const foundUser = users.users.find(u => u.email === email)
        if (foundUser) {
          console.log('✅ 用户存在于 auth.users:', {
            id: foundUser.id,
            email: foundUser.email,
            created_at: foundUser.created_at,
            last_sign_in_at: foundUser.last_sign_in_at
          })

          // 检查 users 表
          console.log('\n🔍 检查 public.users 表...')
          const { data: publicUser, error: publicError } = await supabase
            .from('users')
            .select('*')
            .eq('id', foundUser.id)
            .single()

          if (publicError) {
            console.error('❌ 查询 public.users 失败:', publicError.message)
          } else if (publicUser) {
            console.log('✅ 用户存在于 public.users:', {
              id: publicUser.id,
              phone_number: publicUser.phone_number,
              full_name: publicUser.full_name,
              is_banned: publicUser.is_banned,
              ban_reason: publicUser.ban_reason
            })
          } else {
            console.log('⚠️ 用户不存在于 public.users 表（数据不一致）')
          }
        } else {
          console.log('❌ 用户不存在于 auth.users')
          console.log('\n💡 建议: 用户需要先注册，使用手机号:', phone)
        }
      }

      return false
    }

    if (data?.user) {
      console.log('✅ 登录成功:', {
        id: data.user.id,
        email: data.user.email,
        created_at: data.user.created_at
      })

      // 检查是否被封禁
      console.log('\n🔍 检查用户状态...')
      const { data: publicUser, error: publicError } = await supabase
        .from('users')
        .select('is_banned, ban_reason')
        .eq('id', data.user.id)
        .single()

      if (publicError) {
        console.error('❌ 无法查询用户状态:', publicError.message)
      } else if (publicUser?.is_banned) {
        console.log('⚠️ 用户已被封禁:', publicUser.ban_reason)
      } else {
        console.log('✅ 用户状态正常')
      }

      return true
    }

    console.log('❌ 登录失败: 未返回用户数据')
    return false
  } catch (err) {
    console.error('❌ 登录异常:', err.message)
    console.error('错误详情:', err)
    return false
  }
}

// 测试用户列表
async function listAllUsers() {
  console.log('\n👥 所有用户列表:')

  try {
    // 使用 service role key 创建 admin 客户端
    const adminClient = createClient(
      envVars.NEXT_PUBLIC_SUPABASE_URL,
      envVars.SUPABASE_SERVICE_ROLE_KEY
    )

    const { data, error } = await adminClient.auth.admin.listUsers()

    if (error) {
      console.error('❌ 获取用户列表失败:', error.message)
      return
    }

    if (data.users.length === 0) {
      console.log('⚠️ 当前没有任何用户')
      return
    }

    console.log(`✅ 共有 ${data.users.length} 个用户:\n`)

    for (const user of data.users) {
      console.log('────────────────────────────────────')
      console.log('ID:', user.id)
      console.log('Email:', user.email)
      console.log('手机号:', user.user_metadata?.phone_number || '未设置')
      console.log('创建时间:', user.created_at)
      console.log('最后登录:', user.last_sign_in_at || '从未登录')

      // 检查 public.users
      const { data: publicUser } = await adminClient
        .from('users')
        .select('phone_number, is_banned, ban_reason')
        .eq('id', user.id)
        .single()

      if (publicUser) {
        console.log('Public表手机号:', publicUser.phone_number || '未设置')
        if (publicUser.is_banned) {
          console.log('⚠️ 状态: 已封禁 -', publicUser.ban_reason)
        } else {
          console.log('✅ 状态: 正常')
        }
      } else {
        console.log('⚠️ 状态: 不在 public.users 表中')
      }
    }
    console.log('────────────────────────────────────')
  } catch (err) {
    console.error('❌ 获取用户列表异常:', err.message)
  }
}

// 主函数
async function main() {
  // 从命令行获取参数
  const args = process.argv.slice(2)
  const phone = args[0]
  const password = args[1]

  if (!phone) {
    console.log('\n使用方法:')
    console.log('  node diagnose-login-flow.mjs <手机号> [密码]')
    console.log('\n示例:')
    console.log('  node diagnose-login-flow.mjs 13800138000')
    console.log('  node diagnose-login-flow.mjs 13800138000 yourpassword')
    console.log('\n如果不提供密码，将只列出所有用户\n')

    // 列出所有用户
    await listAllUsers()
    process.exit(0)
  }

  // 先列出所有用户
  await listAllUsers()

  // 如果提供了密码，测试登录
  if (password) {
    await testLogin(phone, password)
  } else {
    console.log(`\n💡 提示: 要测试登录，请提供密码`)
    console.log(`   node diagnose-login-flow.mjs ${phone} <密码>`)
  }
}

main().catch(console.error)
