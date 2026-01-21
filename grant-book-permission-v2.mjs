/**
 * 给测试用户分配测试book的权限
 * 通过更新users表的book_permissions字段
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function loadEnvFile() {
  try {
    const envPath = join(__dirname, '.env.local')
    const envContent = readFileSync(envPath, 'utf-8')

    const envVars = {}
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=')
      const value = valueParts.join('=').trim()
      const cleanValue = value.replace(/^[\\"']|[\\"']$/g, '')
      if (key && cleanValue) {
        envVars[key.trim()] = cleanValue
      }
    })

    return envVars
  } catch (error) {
    return {}
  }
}

const env = loadEnvFile()
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const TEST_USER = {
  phone: '13800138000'
}

const TEST_BOOK_ID = '003b4ce0-c3f9-407a-a7d6-5e80ada4eae5'

async function grantPermission() {
  console.log('🔧 给测试用户分配权限...\n')

  try {
    // 1. 获取用户ID和当前权限
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('phone_number', TEST_USER.phone)
      .single()

    if (userError || !user) {
      console.log('❌ 用户不存在')
      return
    }

    console.log('✅ 找到用户:', user.id)
    console.log('   当前权限:', {
      feature_permissions: user.feature_permissions || [],
      book_permissions: user.book_permissions || [],
      permission_expires_at: user.permission_expires_at
    })

    // 2. 更新权限 - 给用户添加所有book权限（使用"*"）
    console.log('\n📝 更新用户权限...')

    const { error: updateError } = await supabase
      .from('users')
      .update({
        book_permissions: ['*'],  // "*"表示所有book
        permission_expires_at: null,  // 永久有效
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.log('❌ 更新权限失败:', updateError.message)
      console.log('   详情:', JSON.stringify(updateError, null, 2))
      return
    }

    console.log('✅ 权限更新成功！')

    // 3. 验证权限
    console.log('\n🔍 验证权限...')
    const { data: verifyUser, error: verifyError } = await supabase
      .from('users')
      .select('book_permissions, permission_expires_at')
      .eq('id', user.id)
      .single()

    if (verifyError || !verifyUser) {
      console.log('❌ 验证失败')
    } else {
      console.log('✅ 权限验证成功')
      console.log('   book_permissions:', verifyUser.book_permissions)
      console.log('   permission_expires_at:', verifyUser.permission_expires_at)
    }

    console.log('\n🎉 权限分配完成！')

  } catch (error) {
    console.error('\n❌ 操作失败:', error)
  }
}

grantPermission()
