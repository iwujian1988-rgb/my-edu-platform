/**
 * 清空所有限流记录
 * 运行: node tests/diagnostics/clear-all-rate-limits.js
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function clearAllRateLimits() {
  console.log('🧹 清空所有限流记录...\n')

  try {
    // 尝试查找可能的限流表
    const tables = [
      'rate_limit_records',
      'rate_limits',
      'registration_attempts',
      'invitation_code_attempts',
      'ip_rate_limits',
      'device_rate_limits'
    ]

    let clearedAny = false

    for (const tableName of tables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1)

        if (!error && data) {
          console.log(`📋 找到表: ${tableName}`)

          // 删除所有记录
          const { error: deleteError } = await supabase
            .from(tableName)
            .delete()
            .neq('id', 0)

          if (!deleteError) {
            console.log(`✅ 已清空表: ${tableName}\n`)
            clearedAny = true
          }
        }
      } catch (e) {
        // 表不存在，继续
      }
    }

    // 尝试通过RPC调用清空（如果有存储过程）
    try {
      const { data, error } = await supabase.rpc('reset_rate_limits')
      if (!error) {
        console.log('✅ 已通过RPC清空限流记录\n')
        clearedAny = true
      }
    } catch (e) {
      // RPC不存在
    }

    // 重置invitation_codes的attempt相关字段
    try {
      const { data: codes } = await supabase
        .from('invitation_codes')
        .select('code, attempt_records, last_attempt_at, failed_attempts')
        .not('attempt_records', 'is', null)

      if (codes && codes.length > 0) {
        console.log('📋 找到有尝试记录的邀请码:')
        codes.forEach(code => {
          console.log(`   ${code.code}: ${code.attempt_records || code.failed_attempts || 0} 次尝试`)
        })

        const { error: resetError } = await supabase
          .from('invitation_codes')
          .update({
            attempt_records: 0,
            last_attempt_at: null,
            failed_attempts: 0
          })
          .not('attempt_records', 'is', null)

        if (!resetError) {
          console.log('✅ 已重置邀请码尝试记录\n')
          clearedAny = true
        }
      }
    } catch (e) {
      // 字段可能不存在
    }

    if (!clearedAny) {
      console.log('⚠️  没有找到限流记录或表\n')
      console.log('💡 可能的原因:')
      console.log('   1. 限流记录存储在auth schema中（需要服务角色访问）')
      console.log('   2. 限流是内存级别的（重启服务器后清除）')
      console.log('   3. 限流基于Redis或其他缓存服务\n')
      console.log('🚀 建议: 重启开发服务器\n')
    }

    console.log('✅ 清理完成!')
    console.log('\n现在可以尝试注册了:\n')
    console.log('   手机号: 13900000003')
    console.log('   密码: Test123456')
    console.log('   邀请码: TEST1234\n')

  } catch (error) {
    console.error('❌ 错误:', error.message)
  }
}

clearAllRateLimits()
