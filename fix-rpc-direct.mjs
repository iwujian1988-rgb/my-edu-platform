/**
 * 直接修复RPC函数（通过Supabase SQL编辑器API）
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

async function fixRPCFunction() {
  console.log('🔧 修复RPC函数...\n')

  try {
    // 使用 rpc 方法执行 SQL (Supabase 支持 EXECUTE SQL 命令)
    // 方法1: 直接DROP和CREATE
    console.log('正在删除旧的RPC函数...')

    const { error: dropError } = await supabase.rpc('exec_sql', {
      sql: 'DROP FUNCTION IF EXISTS get_book_words_paginated_optimized(UUID, INTEGER, INTEGER)'
    })

    if (dropError && !dropError.message.includes('does not exist')) {
      console.log('⚠️  删除函数失败:', dropError.message)
    } else {
      console.log('✅ 旧函数已删除')
    }

    console.log('正在创建新的RPC函数...')

    const createSQL = `
CREATE OR REPLACE FUNCTION get_book_words_paginated_optimized(
  book_uuid UUID,
  offset_val INTEGER DEFAULT 0,
  limit_val INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  word TEXT,
  phonetic TEXT,
  uk_phonetic TEXT,
  us_phonetic TEXT,
  definition TEXT,
  definition_en TEXT,
  collocation TEXT,
  collocation_en TEXT,
  example_sentence TEXT,
  example_sentence_en TEXT,
  part_of_speech TEXT,
  chapter TEXT,
  chapter_id UUID,
  order_index INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.id,
    w.word,
    w.phonetic,
    w.uk_phonetic,
    w.us_phonetic,
    w.definition,
    w.definition_en,
    w.collocation,
    w.collocation_en,
    w.example_sentence,
    w.example_sentence_en,
    w.part_of_speech,
    w.chapter,
    w.chapter_id,
    w.order_index
  FROM words w
  WHERE w.book_id = book_uuid
  ORDER BY w.order_index ASC
  LIMIT limit_val
  OFFSET offset_val;
END;
$$;
    `

    // 使用 POST 请求直接到 Supabase REST API 执行 SQL
    const response = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ sql: createSQL })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ 创建函数失败:', errorText)
      console.log('\n请手动在Supabase控制台的SQL编辑器中运行以下SQL:')
      console.log(createSQL)
    } else {
      console.log('✅ RPC函数修复成功!')
    }

  } catch (error) {
    console.error('\n❌ 操作失败:', error)
  }
}

fixRPCFunction()
