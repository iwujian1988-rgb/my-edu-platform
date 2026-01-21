/**
 * 清空限流记录
 * 运行: node tests/diagnostics/clear-rate-limits.js
 */

const fs = require('fs')
const path = require('path')

// 读取.env.local文件
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

async function clearRateLimits() {
  console.log('🧹 清空限流记录...\n')

  try {
    // 查看当前的限流记录
    const { data: records, error } = await supabase
      .from('rate_limit_records')
      .select('*')

    if (error) {
      console.log('⚠️  查询限流记录失败:', error.message)
      console.log('💡 可能表不存在，这没问题\n')
    } else {
      console.log(`📊 当前有 ${records?.length || 0} 条限流记录`)

      if (records && records.length > 0) {
        records.forEach(record => {
          console.log(`  - ${record.invitation_code || 'IP限流'}: ${record.attempts || 0} 次尝试`)
        })

        // 删除所有记录
        const { error: deleteError } = await supabase
          .from('rate_limit_records')
          .delete()
          .neq('id', 0)  // 删除所有记录

        if (deleteError) {
          console.log('❌ 删除限流记录失败:', deleteError.message)
        } else {
          console.log('✅ 所有限流记录已清空\n')
        }
      } else {
        console.log('✅ 没有限流记录需要清空\n')
      }
    }

    console.log('✅ 限流记录清理完成！')
    console.log('🚀 现在可以重新运行测试了\n')

  } catch (error) {
    console.error('❌ 错误:', error.message)
    console.log('💡 这可能不影响测试，继续运行即可\n')
  }
}

clearRateLimits()
