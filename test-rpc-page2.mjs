/**
 * 测试RPC函数第2页
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
      const cleanValue = value.replace(/^[\\\"']|[\\\"']$/g, '')
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

const TEST_BOOK_ID = '003b4ce0-c3f9-407a-a7d6-5e80ada4eae5'

async function testRPCPage2() {
  console.log('🔍 测试RPC函数第2页...\n')

  try {
    // 第1页
    console.log('1️⃣ 测试第1页 (offset=0, limit=21)')
    const { data: page1, error: error1 } = await supabase.rpc('get_book_words_paginated_optimized', {
      book_uuid: TEST_BOOK_ID,
      offset_val: 0,
      limit_val: 21
    })

    console.log(`   结果: ${error1 ? '❌ 错误' : '✅ 成功'}`)
    console.log(`   返回数量: ${page1?.length || 0}`)
    if (page1?.length > 0) {
      console.log(`   第一个单词: ${page1[0].word}`)
      console.log(`   最后一个单词: ${page1[page1.length-1].word}`)
    }

    // 第2页
    console.log('\n2️⃣ 测试第2页 (offset=21, limit=21)')
    const { data: page2, error: error2 } = await supabase.rpc('get_book_words_paginated_optimized', {
      book_uuid: TEST_BOOK_ID,
      offset_val: 21,
      limit_val: 21
    })

    console.log(`   结果: ${error2 ? '❌ 错误' : '✅ 成功'}`)
    if (error2) {
      console.log(`   错误信息: ${error2.message}`)
    }
    console.log(`   返回数量: ${page2?.length || 0}`)
    if (page2?.length > 0) {
      console.log(`   第一个单词: ${page2[0].word}`)
      console.log(`   最后一个单词: ${page2[page2.length-1].word}`)
    } else {
      console.log(`   ⚠️  第2页返回空数组！`)
    }

    // 检查总共有多少单词
    console.log('\n3️⃣ 检查数据库总单词数')
    const { data: book } = await supabase
      .from('books')
      .select('total_words')
      .eq('id', TEST_BOOK_ID)
      .single()

    console.log(`   书中记录的总单词数: ${book?.total_words || 0}`)

    // 检查words表中有多少个
    const { count } = await supabase
      .from('words')
      .select('*', { count: 'exact', head: true })
      .eq('book_id', TEST_BOOK_ID)

    console.log(`   words表中实际单词数: ${count || 0}`)

    console.log('\n✅ 测试完成')

  } catch (error) {
    console.error('\n❌ 错误:', error.message)
  }
}

testRPCPage2()
