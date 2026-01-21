/**
 * 给测试用户分配测试book的权限
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
    // 1. 获取用户ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('phone_number', TEST_USER.phone)
      .single()

    if (userError || !user) {
      console.log('❌ 用户不存在')
      return
    }

    console.log('✅ 找到用户:', user.id)

    // 2. 检查权限是否已存在
    const { data: existingPermission, error: checkError } = await supabase
      .from('user_book_permissions')
      .select('*')
      .eq('user_id', user.id)
      .eq('book_id', TEST_BOOK_ID)
      .maybeSingle()

    if (existingPermission) {
      console.log('✅ 权限已存在')
      console.log('   权限:', existingPermission.permissions)
      console.log('   激活状态:', existingPermission.is_active)

      // 如果权限未激活，激活它
      if (!existingPermission.is_active) {
        console.log('   激活权限...')
        const { error: updateError } = await supabase
          .from('user_book_permissions')
          .update({ is_active: true })
          .eq('user_id', user.id)
          .eq('book_id', TEST_BOOK_ID)

        if (updateError) {
          console.log('   ❌ 激活失败:', updateError.message)
        } else {
          console.log('   ✅ 权限已激活')
        }
      }

      return
    }

    // 3. 创建权限
    console.log('📝 创建新权限...')
    const { error: insertError } = await supabase
      .from('user_book_permissions')
      .insert({
        user_id: user.id,
        book_id: TEST_BOOK_ID,
        permissions: 'read',
        is_active: true,
        granted_by: user.id, // 用户自己分配（用于测试）
        granted_at: new Date().toISOString()
      })

    if (insertError) {
      console.log('❌ 创建权限失败:', insertError.message)
      console.log('   详情:', JSON.stringify(insertError, null, 2))
      return
    }

    console.log('✅ 权限创建成功！')

    // 4. 验证权限
    console.log('\n🔍 验证权限...')
    const { data: verifyPermission, error: verifyError } = await supabase
      .from('user_book_permissions')
      .select('*')
      .eq('user_id', user.id)
      .eq('book_id', TEST_BOOK_ID)
      .single()

    if (verifyError || !verifyPermission) {
      console.log('❌ 验证失败')
    } else {
      console.log('✅ 权限验证成功')
      console.log('   user_id:', verifyPermission.user_id)
      console.log('   book_id:', verifyPermission.book_id)
      console.log('   permissions:', verifyPermission.permissions)
      console.log('   is_active:', verifyPermission.is_active)
    }

    console.log('\n🎉 权限分配完成！')

  } catch (error) {
    console.error('\n❌ 操作失败:', error)
  }
}

grantPermission()
