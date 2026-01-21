/**
 * 完整诊断：从数据库到API的完整数据流检查
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
      const cleanValue = value.replace(/^[\\"']|[\\"']$/g, '')
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

const TEST_USER_PHONE = '13800138000'
const TEST_BOOK_ID = '003b4ce0-c3f9-407a-a7d6-5e80ada4eae5'

async function diagnoseCompleteFlow() {
  console.log('🔍 完整数据流诊断\n')
  console.log('='.repeat(60))

  try {
    // 1. 获取用户
    console.log('\n1️⃣ 检查用户...')
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('phone_number', TEST_USER_PHONE)
      .single()

    if (!user) {
      console.log('❌ 用户不存在')
      return
    }

    console.log('✅ 用户存在')
    console.log('   ID:', user.id)
    console.log('   book_permissions:', user.book_permissions)

    // 2. 检查book
    console.log('\n2️⃣ 检查book...')
    const { data: book } = await supabase
      .from('books')
      .select('*')
      .eq('id', TEST_BOOK_ID)
      .single()

    if (!book) {
      console.log('❌ Book不存在')
      return
    }

    console.log('✅ Book存在')
    console.log('   ID:', book.id)
    console.log('   Title:', book.title)
    console.log('   is_official:', book.is_official)
    console.log('   total_words:', book.total_words)

    // 3. 检查chapters
    console.log('\n3️⃣ 检查chapters...')
    const { data: chapters, error: chaptersError } = await supabase
      .from('chapters')
      .select('id, title, book_id')
      .eq('book_id', TEST_BOOK_ID)

    if (chaptersError) {
      console.log('❌ Chapters查询失败:', chaptersError.message)
      return
    }

    console.log(`✅ 找到 ${chapters?.length || 0} 个chapters`)

    if (!chapters || chapters.length === 0) {
      console.log('⚠️ 没有chapters！这是问题所在！')
      console.log('   没有chapters，无法通过chapter_id查询words')
      return
    }

    console.log('   Chapters:')
    chapters.slice(0, 3).forEach((ch, i) => {
      console.log(`     ${i + 1}. ${ch.id}: ${ch.title}`)
    })

    // 4. 检查words（通过chapter_id）
    console.log('\n4️⃣ 检查words（通过chapter_id）...')
    const chapterIds = chapters.map(ch => ch.id)

    const { data: wordsByChapter, error: wordsError } = await supabase
      .from('words')
      .select('id, word, book_id, chapter_id')
      .in('chapter_id', chapterIds)
      .limit(5)

    if (wordsError) {
      console.log('❌ Words查询失败:', wordsError.message)
      return
    }

    console.log(`✅ 找到 ${wordsByChapter?.length || 0} 个words`)

    if (!wordsByChapter || wordsByChapter.length === 0) {
      console.log('⚠️ 没有words！')
      return
    }

    console.log('   示例words:')
    wordsByChapter.forEach((w, i) => {
      console.log(`     ${i + 1}. ${w.word} (book_id: ${w.book_id}, chapter_id: ${w.chapter_id})`)
    })

    // 5. 检查words的book_id
    console.log('\n5️⃣ 检查words的book_id分布...')
    const { count: wordsWithBookId } = await supabase
      .from('words')
      .select('*', { count: 'exact', head: true })
      .in('chapter_id', chapterIds)
      .not('book_id', 'is', null)

    const { count: wordsWithoutBookId } = await supabase
      .from('words')
      .select('*', { count: 'exact', head: true })
      .in('chapter_id', chapterIds)
      .is('book_id', 'is', null)

    console.log(`   有book_id的words: ${wordsWithBookId || 0}`)
    console.log(`   没有book_id的words: ${wordsWithoutBookId || 0}`)

    // 6. 测试RPC函数（模拟API调用）
    console.log('\n6️⃣ 测试RPC函数...')

    // 登录以获取session
    const email = `${TEST_USER_PHONE}@phone.xiaoyu.com`
    const { data: authData } = await supabase.auth.signInWithPassword({
      email,
      password: 'password123'
    })

    if (!authData?.user) {
      console.log('❌ 登录失败')
      return
    }

    console.log('✅ 登录成功')

    // 使用带session的client调用RPC
    const userSupabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
    await userSupabase.auth.setSession({
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token
    })

    console.log('   调用 get_book_words_paginated_optimized...')
    const { data: rpcWords, error: rpcError } = await userSupabase
      .rpc('get_book_words_paginated_optimized', {
        book_uuid: TEST_BOOK_ID,
        offset_val: 0,
        limit_val: 5
      })

    if (rpcError) {
      console.log('❌ RPC调用失败:', rpcError.message)
      console.log('   Details:', JSON.stringify(rpcError, null, 2))
    } else {
      console.log(`✅ RPC成功，返回 ${rpcWords?.length || 0} 个words`)
      if (rpcWords && rpcWords.length > 0) {
        console.log('   第一个word:', {
          word: rpcWords[0].word,
          chapter: rpcWords[0].chapter,
          theme: rpcWords[0].theme,
          scene: rpcWords[0].scene
        })
      }
    }

    // 7. 测试实际HTTP API
    console.log('\n7️⃣ 测试HTTP API...')

    const apiUrl = `http://localhost:3000/api/words?bookId=${TEST_BOOK_ID}&page=1&pageSize=5`
    console.log('   URL:', apiUrl)

    try {
      const response = await fetch(apiUrl, {
        headers: {
          'Cookie': `sb-access-token=${authData.session.access_token}`
        }
      })

      console.log('   Status:', response.status)

      if (!response.ok) {
        const text = await response.text()
        console.log('❌ HTTP API失败')
        console.log('   Response:', text.substring(0, 500))
      } else {
        const data = await response.json()
        console.log(`✅ HTTP API成功，返回 ${data.data?.length || 0} 个words`)

        if (data.data && data.data.length > 0) {
          console.log('   第一个word:', {
            word: data.data[0].word,
            chapter: data.data[0].chapter,
            theme: data.data[0].theme,
            scene: data.data[0].scene
          })
        }

        console.log('   完整响应:', JSON.stringify(data, null, 2))
      }
    } catch (fetchError) {
      console.log('❌ Fetch异常:', fetchError.message)
    }

    console.log('\n' + '='.repeat(60))
    console.log('✅ 诊断完成')

  } catch (error) {
    console.error('\n❌ 诊断失败:', error)
  }
}

diagnoseCompleteFlow()
