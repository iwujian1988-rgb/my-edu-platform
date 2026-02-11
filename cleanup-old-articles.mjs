/**
 * 清理旧的文章数据，只保留新的4篇音频
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

// 需要保留的文章
const keepTitles = [
  'How to maintain a long-lasting friendship',
  'Success depends not on IQ, but on perseverance',
  'Where will you be twenty years from now',
  "Dont get caught in the boiling frog scenario"
]

async function cleanupArticles() {
  console.log('🗑️  开始清理旧文章...\n')

  // 1. 查询所有文章
  const { data: allArticles, error: fetchError } = await supabase
    .from('speaker_articles')
    .select('id, title, created_at')
    .order('created_at', { ascending: true })

  if (fetchError) {
    console.error('❌ 查询文章失败:', fetchError)
    process.exit(1)
  }

  console.log(`📊 当前共有 ${allArticles.length} 篇文章\n`)

  // 2. 找出需要删除的文章
  const toDelete = allArticles.filter(a => !keepTitles.includes(a.title))
  console.log(`📋 将删除 ${toDelete.length} 篇旧文章:`)
  toDelete.forEach(a => {
    console.log(`   - ${a.title}`)
  })
  console.log('')

  // 3. 处理重复的文章
  const duplicates = {}
  allArticles.forEach(a => {
    if (keepTitles.includes(a.title)) {
      if (!duplicates[a.title]) {
        duplicates[a.title] = []
      }
      duplicates[a.title].push(a)
    }
  })

  const duplicateTitles = Object.keys(duplicates).filter(title => duplicates[title].length > 1)

  if (duplicateTitles.length > 0) {
    console.log(`⚠️  发现 ${duplicateTitles.length} 篇重复文章，将保留最早创建的:`)
    duplicateTitles.forEach(title => {
      const articles = duplicates[title].sort((a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
      const toKeep = articles[0]
      const toRemove = articles.slice(1)
      console.log(`   - "${title}"`)
      console.log(`     保留: ${toKeep.id} (${toKeep.created_at})`)
      toRemove.forEach(a => {
        console.log(`     删除: ${a.id} (${a.created_at})`)
        toDelete.push(a)
      })
    })
    console.log('')
  }

  if (toDelete.length === 0) {
    console.log('✅ 没有需要删除的文章')
    process.exit(0)
  }

  // 4. 删除文章（先删除ghost_words，再删除句子，最后删除文章）
  console.log('🔄 开始删除...')

  const deleteIds = toDelete.map(a => a.id)

  // 删除 ghost_words
  const { error: ghostError } = await supabase
    .from('speaker_ghost_words')
    .delete()
    .in('article_id', deleteIds)

  if (ghostError) {
    console.error('❌ 删除 ghost_words 失败:', ghostError)
    process.exit(1)
  }

  console.log(`   ✅ 删除了 ghost_words 数据`)

  // 删除句子
  const { error: sentencesError } = await supabase
    .from('speaker_sentences')
    .delete()
    .in('article_id', deleteIds)

  if (sentencesError) {
    console.error('❌ 删除句子失败:', sentencesError)
    process.exit(1)
  }

  console.log(`   ✅ 删除了句子数据`)

  // 删除文章
  const { error: articlesError } = await supabase
    .from('speaker_articles')
    .delete()
    .in('id', deleteIds)

  if (articlesError) {
    console.error('❌ 删除文章失败:', articlesError)
    process.exit(1)
  }

  console.log(`   ✅ 删除了 ${toDelete.length} 篇文章`)

  // 5. 验证结果
  const { data: remaining, error: verifyError } = await supabase
    .from('speaker_articles')
    .select('id, title, level')
    .order('level')

  if (verifyError) {
    console.error('❌ 验证失败:', verifyError)
    process.exit(1)
  }

  console.log('')
  console.log('✅ 清理完成！')
  console.log('')
  console.log('📊 剩余文章:')
  remaining.forEach(article => {
    console.log(`   [Level ${article.level}] ${article.title}`)
  })
  console.log(`   总计: ${remaining.length} 篇`)
}

cleanupArticles().catch(console.error)
