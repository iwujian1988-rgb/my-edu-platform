/**
 * 查询当前数据库中的所有文章
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 加载环境变量
function loadEnvFile() {
  try {
    const envPath = join(__dirname, '.env.local')
    const envContent = readFileSync(envPath, 'utf-8')
    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim()
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=')
        let value = valueParts.join('=').trim()
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1)
        }
        if (key && value) {
          process.env[key] = value
        }
      }
    })
  } catch (error) {
    // ignore
  }
}

loadEnvFile()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function listArticles() {
  console.log('📚 当前数据库中的文章:')
  console.log('')

  const { data, error } = await supabase
    .from('speaker_articles')
    .select('id, level, title, status, created_at')
    .order('id')

  if (error) {
    console.error('❌ 查询失败:', error)
    process.exit(1)
  }

  console.log('ID\tLevel\tStatus\tCreated At\t\tTitle')
  console.log('-'.repeat(120))

  data.forEach(article => {
    const createdAt = new Date(article.created_at).toLocaleString('zh-CN')
    console.log(`${article.id}\t${article.level}\t${article.status}\t${createdAt}\t${article.title}`)
  })

  console.log('')
  console.log(`✅ 总计: ${data.length} 篇文章`)

  // 统计各等级数量
  const level1Count = data.filter(a => a.level === 1).length
  const level2Count = data.filter(a => a.level === 2).length
  const level3Count = data.filter(a => a.level === 3).length

  console.log('')
  console.log('📊 等级分布:')
  console.log(`   - Level 1: ${level1Count} 篇`)
  console.log(`   - Level 2: ${level2Count} 篇`)
  console.log(`   - Level 3: ${level3Count} 篇`)
}

listArticles()
