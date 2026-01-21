/**
 * 应用RPC修复迁移
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
      const cleanValue = value.replace(/^[\"']|[\"']$/g, '')
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

async function applyMigration() {
  console.log('🔧 应用RPC修复迁移...\n')

  try {
    const sql = readFileSync(join(__dirname, 'supabase/migrations/20260113_fix_rpc_columns.sql'), 'utf-8')

    // Supabase doesn't support running arbitrary SQL directly via the client
    // We need to use the RPC method or execute via psql
    console.log('⚠️  请手动应用以下迁移:')
    console.log('\n' + sql)
    console.log('\n或者运行: ')
    console.log('psql -h <your-host> -U postgres -d postgres -f supabase/migrations/20260113_fix_rpc_columns.sql')

  } catch (error) {
    console.error('\n❌ 操作失败:', error)
  }
}

applyMigration()
