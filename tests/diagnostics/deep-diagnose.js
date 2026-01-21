/**
 * 深度诊断Supabase Auth问题
 * 尝试通过PostgreSQL查询找出具体错误
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

async function deepDiagnose() {
  console.log('🔍 深度诊断Supabase Auth问题...\n')

  // 测试1: 检查public.users表是否有唯一约束冲突
  console.log('📋 测试1: 检查public.users约束...')
  try {
    const { data: constraints, error } = await supabase
      .rpc('get_users_constraints')

    if (!error && constraints) {
      console.log('约束列表:', constraints)
    }
  } catch (e) {
    console.log('无法查询约束:', e.message)
  }

  // 测试2: 尝试插入到public.users（不经过auth）
  console.log('\n📋 测试2: 直接插入public.users...')
  const testUserId = `test-${Date.now()}`

  try {
    const { data, error } = await supabase
      .from('users')
      .insert({
        id: testUserId,
        email: `test-${Date.now()}@test.com`,
        phone_number: '00000000000',
        full_name: 'Test User',
        metadata: { test: true }
      })
      .select()

    if (!error && data) {
      console.log('✅ public.users插入成功')
      console.log('   ID:', data[0].id)

      // 清理
      await supabase.from('users').delete().eq('id', testUserId)
      console.log('   ✅ 测试记录已清理')
    } else {
      console.log('❌ public.users插入失败')
      console.log('   错误:', error?.message)
      console.log('   代码:', error?.code)
      console.log('   详情:', error?.details)
      console.log('   提示:', error?.hint)
    }
  } catch (e) {
    console.log('❌ 异常:', e.message)
  }

  // 测试3: 检查是否有外键约束
  console.log('\n📋 测试3: 检查外键约束...')
  console.log('💡 关键问题：public.users.id 可能引用了 auth.users.id')
  console.log('   如果是这样，当auth.users插入失败时，会导致级联错误')

  // 测试4: 查看auth.users表的触发器函数
  console.log('\n📋 测试4: 检查触发器...')
  console.log('💡 auth.users表可能有触发器在INSERT时执行')
  console.log('   这些触发器可能会失败并阻止用户创建')

  // 测试5: 检查是否有自定义的handle_new_user函数
  console.log('\n📋 测试5: 检查handle_new_user函数...')
  try {
    const { data, error } = await supabase
      .rpc('check_handle_new_user_function')

    if (!error) {
      console.log('✅ handle_new_user函数检查完成')
      console.log('   结果:', data)
    } else {
      console.log('⚠️  无法检查handle_new_user函数')
      console.log('   函数可能不存在或有错误')
    }
  } catch (e) {
    console.log('⚠️  无法检查:', e.message)
  }

  console.log('\n' + '═'.repeat(60))
  console.log('🔧 可能的问题和解决方案')
  console.log('═'.repeat(60))
  console.log('\n【问题1】auth.users触发器错误')
  console('原因: auth.users表的INSERT触发器可能有bug')
  console.log('解决:')
  console.log('  1. 在Supabase Dashboard > SQL Editor运行:')
  console.log('     SELECT * FROM information_schema.triggers')
  console.log('     WHERE event_object_table = \'users\'')
  console.log('     AND event_object_schema = \'auth\';')
  console.log('  2. 找到触发器后，临时禁用:')
  console.log('     DROP TRIGGER IF EXISTS trigger_name ON auth.users;')

  console.log('\n【问题2】public.users外键约束')
  console.log('原因: public.users.id可能是外键，引用auth.users.id')
  console.log('解决:')
  console.log('  1. 检查外键约束')
  console.log('  2. 临时删除外键约束')

  console.log('\n【问题3】数据库函数错误')
  console.log('原因: 自定义的数据库函数可能有错误')
  console.log('解决:')
  console.log('  1. 检查所有自定义函数')
  console.log('  2. 修复或删除有问题的函数')

  console.log('\n【问题4】Supabase Auth服务故障')
  console.log('原因: Supabase云服务本身有问题')
  console.log('解决:')
  console.log('  1. 检查 https://status.supabase.com/')
  console.log('  2. 联系Supabase技术支持')
  console.log('  3. 考虑创建新项目')

  console.log('\n' + '═'.repeat(60))
  console.log('📝 建议的SQL查询（在Supabase Dashboard运行）')
  console.log('═'.repeat(60))
  console.log('\n-- 查看auth触发器')
  console.log('SELECT * FROM information_schema.triggers')
  console.log('WHERE event_object_schema = \'auth\'')
  console.log('  AND event_object_table = \'users\';')
  console.log('\n-- 查看public触发器')
  console.log('SELECT * FROM information_schema.triggers')
  console.log('WHERE event_object_schema = \'public\'')
  console.log('  AND event_object_table = \'users\';')
  console.log('\n-- 查看最近创建的auth用户')
  console.log('SELECT * FROM auth.users')
  console.log('ORDER BY created_at DESC')
  console.log('LIMIT 5;')
  console.log('\n' + '═'.repeat(60))
}

deepDiagnose()
