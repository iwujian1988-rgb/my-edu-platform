/**
 * 导入第4篇音频：Where will you be twenty years from now
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

async function importArticle() {
  console.log('📥 导入: Where will you be twenty years from now (Level 2)')

  const jsonData = JSON.parse(
    readFileSync(join(__dirname, 'vioce/Where will you be twenty years from now.json'), 'utf-8')
  )

  console.log(`   - 读取到 ${jsonData.sentences.length} 个句子`)

  const totalSentences = jsonData.sentences.length
  const lastSentence = jsonData.sentences[jsonData.sentences.length - 1]
  const durationSeconds = Math.round(lastSentence.end_time)
  const wordCount = jsonData.sentences.reduce((sum, s) => sum + s.text.split(' ').length, 0)

  const { data: article, error } = await supabase
    .from('speaker_articles')
    .insert({
      level: 2,
      title: 'Where will you be twenty years from now',
      source_url: '',
      audio_url: '/audio/speaker/level2/Where will you be twenty years from now.mp3',
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

  if (error) {
    console.error('❌ 插入失败:', error)
    throw error
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
  console.log('\n✅ 导入完成！')
}

importArticle().catch(console.error)
