/**
 * 邀请码状态检查脚本
 * 用于诊断测试邀请码的状态
 */

const { createClient } = require('@supabase/supabase-js')

// Supabase配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:8000'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseKey) {
  console.error('❌ 错误: SUPABASE_SERVICE_ROLE_KEY环境变量未设置')
  console.log('请在.env.local文件中设置该变量')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkInvitationCodes() {
  console.log('🔍 检查测试邀请码状态...\n')

  const codes = ['TEST1234', 'DEMO2024', 'EXPIRED2024', 'TEST2024']

  for (const code of codes) {
    try {
      const { data, error } = await supabase
        .from('invitation_codes')
        .select('*')
        .eq('code', code)
        .single()

      if (error) {
        console.log(`❌ ${code}: 不存在或查询错误`)
        console.log(`   错误: ${error.message}\n`)
      } else {
        const isActive = data.is_active ? '✅' : '❌'
        const isExpired = data.expires_at && new Date(data.expires_at) < new Date() ? '⏰ 已过期' : '✅ 有效期'

        console.log(`📋 ${code}:`)
        console.log(`   状态: ${isActive} ${data.is_active ? '激活' : '未激活'}`)
        console.log(`   有效期: ${isExpired}`)
        console.log(`   使用次数: ${data.used_count}/${data.max_uses}`)
        console.log(`   过期时间: ${data.expires_at || '永不过期'}`)

        // 判断是否可用
        const available = data.is_active &&
                         (!data.expires_at || new Date(data.expires_at) > new Date()) &&
                         data.used_count < data.max_uses

        console.log(`   可用: ${available ? '✅ 是' : '❌ 否'}\n`)
      }
    } catch (err) {
      console.log(`❌ ${code}: 查询失败 - ${err.message}\n`)
    }
  }
}

async function resetTestCodes() {
  console.log('🔧 重置测试邀请码...\n')

  const updates = [
    { code: 'TEST1234', updates: { used_count: 0, is_active: true, max_uses: 10000 } },
    { code: 'DEMO2024', updates: { used_count: 0, is_active: true, max_uses: 10000 } },
    { code: 'EXPIRED2024', updates: { used_count: 0, is_active: true, expires_at: '2020-01-01' } } // 保持过期
  ]

  for (const { code, updates } of updates) {
    try {
      const { data, error } = await supabase
        .from('invitation_codes')
        .update(updates)
        .eq('code', code)
        .select()

      if (error) {
        console.log(`❌ ${code}: 更新失败 - ${error.message}`)
      } else {
        console.log(`✅ ${code}: 已重置 - 使用次数: 0`)
      }
    } catch (err) {
      console.log(`❌ ${code}: 更新失败 - ${err.message}`)
    }
  }
  console.log()
}

async function main() {
  const args = process.argv.slice(2)
  const shouldReset = args.includes('--reset')

  console.log('=================================')
  console.log('  邀请码状态检查工具')
  console.log('=================================\n')

  if (shouldReset) {
    await resetTestCodes()
  }

  await checkInvitationCodes()

  console.log('=================================')
  console.log('💡 提示:')
  console.log('  - 仅查看状态: node check-invitation-codes.js')
  console.log('  - 重置并查看: node check-invitation-codes.js --reset')
  console.log('=================================')
}

main().catch(console.error)
