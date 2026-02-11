/**
 * 演说家模块 - 完整迁移和导入脚本
 *
 * 1. 修改数据库约束（支持 Level 1）
 * 2. 删除旧数据
 * 3. 导入新音频数据
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// ========================================
// 加载环境变量
// ========================================
function loadEnvFile() {
  try {
    const envPath = join(__dirname, '.env.local')
    const envContent = readFileSync(envPath, 'utf-8')

    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim()
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=')
        let value = valueParts.join('=').trim()
        // 移除引号
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1)
        }
        if (key && value) {
          process.env[key] = value
        }
      }
    })

    console.log('✅ 环境变量加载成功')
  } catch (error) {
    console.log('⚠️  未找到 .env.local 文件，使用系统环境变量')
  }
}

loadEnvFile()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ 缺少环境变量')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// ========================================
// 音频数据配置
// ========================================
const audioData = [
  {
    level: 1,
    title: 'How to maintain a long-lasting friendship',
    jsonPath: join(__dirname, 'vioce/How to maintain a long-lasting friendship.json'),
    audioPath: '/audio/speaker/level1/How to maintain a long-lasting friendship.mp3'
  },
  {
    level: 2,
    title: 'Success depends not on IQ, but on perseverance',
    jsonPath: join(__dirname, 'vioce/Success depends not on IQ, but on perseverance.json'),
    audioPath: '/audio/speaker/level2/Success depends not on IQ, but on perseverance.mp3'
  },
  {
    level: 3,
    title: 'Dont get caught in the boiling frog scenario',
    jsonPath: join(__dirname, 'vioce/Dont get caught in the boiling frog scenario.json'),
    audioPath: '/audio/speaker/level3/Dont get caught in the boiling frog scenario.mp3'
  }
]

const oldTitles = [
  'A Day at the Park',
  'The Importance of Reading',
  'Why are billionaires building bunkers',
  'Scared of speaking English',
  'What English phrases really mean',
  'Is social media dead',
  'Is it OK to disagree',
  'Warming your house the green way just got more expensive',
  'All these data centers are gonna fry my electric bill',
  'Americas next top Fed Chair',
  'A huge EU India deal Heated Rivalry and a hefty price hike',
  'Hawaiis worker shortage goes NUTS',
  'Why isnt corporate America standing up to Trump'
]

// ========================================
// 工具函数
// ========================================
function readJsonFile(filePath) {
  const content = readFileSync(filePath, 'utf-8')
  return JSON.parse(content)
}

// ========================================
// 步骤 1：修改数据库约束
// ========================================
async function updateDatabaseConstraint() {
  console.log('\n🔧 步骤 1/3: 修改数据库约束...')

  // 使用 Supabase 的 REST API 执行 SQL
  const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    },
    body: JSON.stringify({
      query: `
        ALTER TABLE speaker_articles DROP CONSTRAINT IF EXISTS speaker_articles_level_check;
        ALTER TABLE speaker_articles
          ADD CONSTRAINT speaker_articles_level_check
          CHECK (level IN (1, 2, 3));
      `
    })
  })

  if (response.ok) {
    console.log('✅ 数据库约束已更新（支持 Level 1, 2, 3）')
  } else {
    console.log('⚠️  自动修改约束失败，请手动在 Supabase Dashboard 执行:')
    console.log('\nSQL Editor 中执行:')
    console.log('```sql')
    console.log('ALTER TABLE speaker_articles DROP CONSTRAINT IF EXISTS speaker_articles_level_check;')
    console.log('ALTER TABLE speaker_articles')
    console.log('  ADD CONSTRAINT speaker_articles_level_check')
    console.log('  CHECK (level IN (1, 2, 3));')
    console.log('``\n')
  }
}

// ========================================
// 步骤 2：删除旧数据
// ========================================
async function deleteOldData() {
  console.log('\n🗑️  步骤 2/3: 删除旧测试数据...')

  const { data: articlesToDelete, error: fetchError } = await supabase
    .from('speaker_articles')
    .select('id')
    .in('title', oldTitles)

  if (fetchError) {
    console.error('❌ 获取旧文章失败:', fetchError)
    throw fetchError
  }

  if (articlesToDelete && articlesToDelete.length > 0) {
    const articleIds = articlesToDelete.map(a => a.id)

    await supabase.from('speaker_sentences').delete().in('article_id', articleIds)
    await supabase.from('speaker_articles').delete().in('id', articleIds)

    console.log(`✅ 删除了 ${articleIds.length} 篇旧文章`)
  } else {
    console.log('ℹ️  没有找到需要删除的旧文章')
  }
}

// ========================================
// 步骤 3：导入新数据
// ========================================
async function importArticle(data) {
  console.log(`\n📥 导入: ${data.title} (Level ${data.level})`)

  const jsonData = readJsonFile(data.jsonPath)
  console.log(`   - 读取到 ${jsonData.sentences.length} 个句子`)

  const totalSentences = jsonData.sentences.length
  const lastSentence = jsonData.sentences[jsonData.sentences.length - 1]
  const durationSeconds = Math.round(lastSentence.end_time)
  const wordCount = jsonData.sentences.reduce((sum, s) => sum + s.text.split(' ').length, 0)

  const { data: article, error: articleError } = await supabase
    .from('speaker_articles')
    .insert({
      level: data.level,
      title: data.title,
      source_url: '',
      audio_url: data.audioPath,
      image_url: null,
      has_preroll_ad: false,
      total_sentences: totalSentences,
      duration_seconds: durationSeconds,
      word_count: wordCount,
      json_data: jsonData,
      status: 'active'
    })
    .select()
    .single()

  if (articleError) {
    console.error('❌ 插入文章失败:', articleError.message)
    throw articleError
  }

  console.log(`   - 文章插入成功 (ID: ${article.id})`)

  const sentencesData = jsonData.sentences.map((s, index) => ({
    article_id: article.id,
    sentence_index: index,
    text: s.text,
    start_time: s.start_time,
    end_time: s.end_time
  }))

  const { error: sentencesError } = await supabase
    .from('speaker_sentences')
    .insert(sentencesData)

  if (sentencesError) {
    console.error('❌ 插入句子失败:', sentencesError)
    throw sentencesError
  }

  console.log(`   - 句子插入成功 (${totalSentences} 条)`)
}

// ========================================
// 主函数
// ========================================
async function main() {
  console.log('========================================')
  console.log('🎤 演说家模块 - 完整迁移和导入')
  console.log('========================================')

  try {
    await updateDatabaseConstraint()
    await deleteOldData()

    console.log('\n📚 步骤 3/3: 导入新数据...')

    for (const data of audioData) {
      await importArticle(data)
    }

    console.log('\n========================================')
    console.log('✅ 所有数据导入成功！')
    console.log('========================================')
    console.log('\n📊 导入统计:')
    console.log(`   - Level 1: 1 篇 (友谊)`)
    console.log(`   - Level 2: 1 篇 (毅力)`)
    console.log(`   - Level 3: 1 篇 (青蛙)`)
    console.log(`   - 总计: 3 篇文章`)
    console.log('\n💡 访问 /speaker 查看新数据')

  } catch (error) {
    console.error('\n❌ 导入失败:', error.message)
    process.exit(1)
  }
}

main()
