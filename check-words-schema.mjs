/**
 * 检查words表的实际字段结构
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

async function checkWordsSchema() {
  console.log('🔍 检查words表的字段结构...\n')

  try {
    // 查询一个实际的单词记录，看看有哪些字段
    const { data: words, error } = await supabase
      .from('words')
      .select('*')
      .limit(1)

    if (error) {
      console.error('❌ 查询失败:', error.message)
      return
    }

    if (words && words.length > 0) {
      console.log('📝 words表的字段:')
      console.log('   ', Object.keys(words[0]).join(', '))
      console.log('\n🔍 完整的示例数据:')
      console.log(JSON.stringify(words[0], null, 2))
    } else {
      console.log('⚠️  没有找到单词数据')
    }

  } catch (error) {
    console.error('\n❌ 操作失败:', error)
  }
}

checkWordsSchema()
