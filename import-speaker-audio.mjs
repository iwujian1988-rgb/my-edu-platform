/**
 * 演说家模块 - 导入新音频数据
 *
 * 导入3篇新音频数据：
 * 1. How to maintain a long-lasting friendship (Level 1)
 * 2. Success depends not on IQ, but on perseverance (Level 2)
 * 3. Dont get caught in the boiling frog scenario (Level 3)
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
        // 移除引号（单引号或双引号）
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

// ========================================
// 配置
// ========================================
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('🔧 配置检查:')
console.log(`   - SUPABASE_URL: ${SUPABASE_URL?.substring(0, 30)}...`)
console.log(`   - SUPABASE_SERVICE_KEY: ${SUPABASE_SERVICE_KEY ? '已设置 (' + SUPABASE_SERVICE_KEY.substring(0, 20) + '...)' : '未设置'}`)

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ 缺少环境变量: NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY')
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

// ========================================
// 旧数据标题列表（需要删除）
// ========================================
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

/**
 * 读取 JSON 文件
 */
function readJsonFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8')
    return JSON.parse(content)
  } catch (error) {
    console.error(`❌ 读取 JSON 文件失败: ${filePath}`, error)
    throw error
  }
}

/**
 * 删除旧数据
 */
async function deleteOldData() {
  console.log('\n🗑️  删除旧测试数据...')

  // 先获取要删除的文章ID
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

    // 删除句子数据
    const { error: sentencesError } = await supabase
      .from('speaker_sentences')
      .delete()
      .in('article_id', articleIds)

    if (sentencesError) {
      console.error('❌ 删除句子数据失败:', sentencesError)
      throw sentencesError
    }

    // 删除文章数据
    const { error: articlesError } = await supabase
      .from('speaker_articles')
      .delete()
      .in('id', articleIds)

    if (articlesError) {
      console.error('❌ 删除文章数据失败:', articlesError)
      throw articlesError
    }

    console.log(`✅ 删除了 ${articleIds.length} 篇旧文章`)
  } else {
    console.log('ℹ️  没有找到需要删除的旧文章')
  }
}

/**
 * 导入单篇文章
 */
async function importArticle(data) {
  console.log(`\n📥 导入: ${data.title} (Level ${data.level})`)

  try {
    // 1. 读取 JSON 数据
    const jsonData = readJsonFile(data.jsonPath)
    console.log(`   - 读取到 ${jsonData.sentences.length} 个句子`)

    // 2. 计算统计信息
    const totalSentences = jsonData.sentences.length
    const lastSentence = jsonData.sentences[jsonData.sentences.length - 1]
    const durationSeconds = Math.round(lastSentence.end_time)
    const wordCount = jsonData.sentences.reduce((sum, s) => sum + s.text.split(' ').length, 0)

    // 3. 插入文章
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
      console.error('❌ 插入文章失败:', articleError)
      throw articleError
    }

    console.log(`   - 文章插入成功 (ID: ${article.id})`)

    // 4. 插入句子数据
    const sentencesData = jsonData.sentences.map((s, index) => ({
      article_id: article.id,
      sentence_index: index,
      text: s.text,
      text_en: s.text,
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

    return article
  } catch (error) {
    console.error(`❌ 导入失败: ${data.title}`, error)
    throw error
  }
}

// ========================================
// 主函数
// ========================================
async function main() {
  console.log('========================================')
  console.log('🎤 演说家模块 - 音频数据导入工具')
  console.log('========================================')

  try {
    // 0. 修改数据库约束（支持 Level 1）
    console.log('\n🔧 检查数据库约束...')

    const { error: constraintError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE speaker_articles DROP CONSTRAINT IF EXISTS speaker_articles_level_check;
        ALTER TABLE speaker_articles
          ADD CONSTRAINT speaker_articles_level_check
          CHECK (level IN (1, 2, 3));
      `
    })

    if (constraintError) {
      console.log('⚠️  无法自动修改约束，请手动执行迁移文件: supabase/migrations/20260209_add_level1_support.sql')
    } else {
      console.log('✅ 数据库约束已更新（支持 Level 1, 2, 3）')
    }

    // 1. 删除旧数据
    await deleteOldData()

    // 2. 导入新数据
    console.log('\n📚 开始导入新数据...')

    for (const data of audioData) {
      await importArticle(data)
    }

    console.log('\n========================================')
    console.log('✅ 所有数据导入成功！')
    console.log('========================================')
    console.log('\n📊 导入统计:')
    console.log(`   - Level 1: 1 篇`)
    console.log(`   - Level 2: 1 篇`)
    console.log(`   - Level 3: 1 篇`)
    console.log(`   - 总计: 3 篇文章`)
    console.log('\n💡 提示: 访问 /speaker 查看新数据')

  } catch (error) {
    console.error('\n❌ 导入失败:', error)
    process.exit(1)
  }
}

// 运行主函数
main()
