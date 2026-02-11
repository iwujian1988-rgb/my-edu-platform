/**
 * 查询文章的句子索引
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

async function checkSentences() {
  // 查询 Level 1 文章的句子
  const { data: articles, error: articleError } = await supabase
    .from('speaker_articles')
    .select('id, title')
    .eq('level', 1)
    .limit(1)

  if (articleError || !articles || articles.length === 0) {
    console.error('未找到 Level 1 文章', articleError)
    return
  }

  const article = articles[0]
  console.log(`文章: ${article.title}`)
  console.log(`ID: ${article.id}`)
  console.log('')

  const { data: sentences, error: sentencesError } = await supabase
    .from('speaker_sentences')
    .select('sentence_index, text, start_time, end_time')
    .eq('article_id', article.id)
    .order('sentence_index')
    .limit(5)

  if (sentencesError) {
    console.error('查询句子失败:', sentencesError)
    return
  }

  if (!sentences || sentences.length === 0) {
    console.log('没有找到句子数据')
    return
  }

  console.log('前5个句子的索引:')
  console.log('')

  sentences.forEach((s, i) => {
    console.log(`数组索引 ${i}: sentence_index = ${s.sentence_index}`)
    console.log(`  文本: ${s.text.substring(0, 60)}...`)
    console.log(`  时间: ${s.start_time}s - ${s.end_time}s`)
    console.log('')
  })

  // 同时检查 json_data 中的句子
  const { data: articleFull } = await supabase
    .from('speaker_articles')
    .select('json_data')
    .eq('id', article.id)
    .single()

  if (articleFull?.json_data?.sentences) {
    console.log('json_data 中的前5个句子:')
    console.log('')
    articleFull.json_data.sentences.slice(0, 5).forEach((s, i) => {
      console.log(`数组索引 ${i}: id = ${s.id}`)
      console.log(`  文本: ${s.text.substring(0, 60)}...`)
      console.log(`  时间: ${s.start_time}s - ${s.end_time}s`)
      console.log('')
    })
  }
}

checkSentences()
