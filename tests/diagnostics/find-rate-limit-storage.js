/**
 * 查找限流记录的真实存储位置
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

async function findRateLimitStorage() {
  console.log('🔍 查找限流记录的真实存储位置...\n')

  // 1. 查看所有表
  console.log('📋 步骤1: 查看所有表...')
  try {
    const { data: tables, error } = await supabase
      .rpc('get_tables_and_views')  // 尝试获取所有表
      .select('tablename')

    if (!error && tables) {
      console.log('找到表:', tables.map(t => t.tablename).join(', '))
    }
  } catch (e) {
    // 继续其他方法
  }

  // 2. 通过PostgreSQL查询获取所有表
  console.log('\n📋 步骤2: 查找可能的限流表...')

  const possibleTables = [
    'registration_attempts',
    'invitation_code_attempts',
    'rate_limits',
    'ip_rate_limits',
    'device_rate_limits',
    'auth_attempts',
    'user_registrations',
    'signup_attempts',
    'security_logs',
    'access_logs'
  ]

  for (const tableName of possibleTables) {
    try {
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true })

      if (!error) {
        console.log(`✅ 找到表: ${tableName} (${count || 0} 条记录)`)
      }
    } catch (e) {
      // 表不存在，继续
    }
  }

  // 3. 查看数据库函数
  console.log('\n📋 步骤3: 查找数据库函数...')

  // 尝试调用限流相关的函数看看返回什么
  try {
    const { data, error } = await supabase
      .rpc('check_and_record_registration_attempt', {
        p_ip_address: '127.0.0.1',
        p_user_agent: 'test'
      })

    console.log('函数返回:', data)
    if (!error && data) {
      console.log('  retryAfter:', data.retry_after)
      console.log('  allowed:', data.allowed)
      console.log('  reason:', data.reason)
    }
  } catch (e) {
    console.log('  函数调用失败:', e.message)
  }

  // 4. 查看invitation_codes表中可能存储限流信息的字段
  console.log('\n📋 步骤4: 查看邀请码表...')

  try {
    const { data: codes } = await supabase
      .from('invitation_codes')
      .select('code, failed_attempts, last_attempt_at, created_at')
      .limit(5)

    if (codes) {
      console.log('邀请码记录:')
      codes.forEach(code => {
        console.log(`  ${code.code}:`)
        console.log(`    failed_attempts: ${code.failed_attempts || 'N/A'}`)
        console.log(`    last_attempt_at: ${code.last_attempt_at || 'N/A'}`)
      })
    }
  } catch (e) {
    console.log('  查询失败:', e.message)
  }

  // 5. 尝试直接调用Supabase Admin API
  console.log('\n📋 步骤5: 检查Supabase Auth限制...')
  try {
    // Supabase Auth可能有自己的限流
    // 这个无法通过数据库直接访问
    console.log('⚠️  Supabase Auth可能有独立的限流机制')
    console.log('   需要在Supabase Dashboard中查看')
  } catch (e) {
    // 继续
  }

  console.log('\n' + '─'.repeat(60))
  console.log('💡 如果以上都没找到限流记录，可能是：')
  console.log('\n  1. 限流是基于时间戳计算的（数据库函数中）')
  console.log('     比如查看过去1小时的注册次数，动态计算是否超限')
  console.log('     解决方案：等待时间窗口过去，或修改时间窗口参数\n')

  console.log('  2. 限流在auth schema中（Supabase Auth托管的）')
  console.log('     解决方案：在Supabase Dashboard查看Auth设置\n')

  console.log('  3. 限流在内存中（开发服务器）')
  console.log('     解决方案：重启开发服务器 (Ctrl+C → npm run dev)\n')

  console.log('  4. 限流基于Redis等缓存服务')
  console.log('     解决方案：清空Redis缓存\n')

  console.log('─'.repeat(60))
}

findRateLimitStorage()
