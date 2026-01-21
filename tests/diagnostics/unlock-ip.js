/**
 * 解锁IP限流 - 完整版
 * 运行: node tests/diagnostics/unlock-ip.js
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

async function unlockIP() {
  console.log('🔓 开始解锁IP限流...\n')

  let clearedAny = false

  // 清空 registration_attempts
  console.log('📋 步骤1: 清空注册限流记录...')
  try {
    const { data: regAttempts, error: regCheckError } = await supabase
      .from('registration_attempts')
      .select('*')
      .limit(1)

    if (!regCheckError && regAttempts) {
      const { count, error: regDeleteError } = await supabase
        .from('registration_attempts')
        .delete()
        .neq('id', 0)
        .select('*', { count: 'exact', head: true })

      if (!regDeleteError) {
        console.log(`✅ 已清空 ${count || 0} 条注册限流记录`)
        clearedAny = true
      }
    } else {
      console.log('   registration_attempts 表不存在或为空')
    }
  } catch (e) {
    console.log('   表不存在，跳过')
  }

  // 清空 invitation_code_attempts
  console.log('\n📋 步骤2: 清空邀请码尝试记录...')
  try {
    const { data: codeAttempts, error: codeCheckError } = await supabase
      .from('invitation_code_attempts')
      .select('*')
      .limit(1)

    if (!codeCheckError && codeAttempts) {
      const { count, error: codeDeleteError } = await supabase
        .from('invitation_code_attempts')
        .delete()
        .neq('id', 0)
        .select('*', { count: 'exact', head: true })

      if (!codeDeleteError) {
        console.log(`✅ 已清空 ${count || 0} 条邀请码尝试记录`)
        clearedAny = true
      }
    } else {
      console.log('   invitation_code_attempts 表不存在或为空')
    }
  } catch (e) {
    console.log('   表不存在，跳过')
  }

  // 重置邀请码的attempt相关字段
  console.log('\n📋 步骤3: 重置邀请码尝试计数...')
  try {
    const { error: resetError } = await supabase
      .from('invitation_codes')
      .update({
        failed_attempts: 0,
        last_attempt_at: null
      })
      .neq('failed_attempts', 0)

    if (!resetError) {
      console.log('✅ 已重置邀请码尝试计数')
      clearedAny = true
    } else {
      console.log('   没有需要重置的邀请码')
    }
  } catch (e) {
    console.log('   字段可能不存在，跳过')
  }

  console.log('\n' + '─'.repeat(50))

  if (clearedAny) {
    console.log('✅✅✅ IP已解锁!')
    console.log('\n现在可以正常注册了:\n')
    console.log('   手机号: 13900000003')
    console.log('   密码: Test123456')
    console.log('   邀请码: TEST1234\n')
  } else {
    console.log('⚠️  没有找到限流记录')
    console.log('\n可能的原因:')
    console.log('  1. 限流是内存级别的（重启开发服务器）')
    console.log('  2. 限流基于时间戳计算（已自动过期）')
    console.log('  3. 使用了不同的限流机制\n')

    console.log('🚀 建议操作:')
    console.log('\n  选项1: 重启开发服务器')
    console.log('  - 停止当前服务器 (Ctrl+C)')
    console.log('  - 重新运行: npm run dev\n')

    console.log('  选项2: 等待限流自动过期')
    console.log('  - 当前时间: ' + new Date().toLocaleTimeString('zh-CN'))
    console.log('  - 解锁时间: 12:05\n')

    console.log('  选项3: 使用不同的网络')
    console.log('  - 切换WiFi/移动网络')
    console.log('  - 使用VPN更换IP\n')

    console.log('  选项4: 在浏览器隐私模式测试')
    console.log('  - 打开无痕/隐私窗口')
    console.log('  - 访问: http://localhost:3000/login?code=TEST1234\n')
  }

  console.log('─'.repeat(50))
}

unlockIP()
