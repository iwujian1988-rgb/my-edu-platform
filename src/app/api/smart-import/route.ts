import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * 智能录入API
 * 调用免费词典API获取单词释义、音标等信息
 * 限制：每日500词配额
 */
export async function POST(request: Request) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { words, bookId } = body

    if (!Array.isArray(words) || words.length === 0) {
      return NextResponse.json({ error: '单词列表不能为空' }, { status: 400 })
    }

    if (!bookId) {
      return NextResponse.json({ error: '词库ID不能为空' }, { status: 400 })
    }

    const supabase = await createClient()

    // 1. 检查今日已使用的配额
    const todayStr = new Date().toISOString().split('T')[0]

    const { data: quotaData, error: quotaError } = await supabase
      .from('smart_import_quota')
      .select('count')
      .eq('user_id', user.id)
      .eq('quota_date', todayStr)
      .maybeSingle()

    const todayUsed = (quotaData as any)?.count || 0
    const DAILY_LIMIT = 500

    if (todayUsed + words.length > DAILY_LIMIT) {
      return NextResponse.json({
        error: '超过每日配额限制',
        remaining: DAILY_LIMIT - todayUsed,
        requested: words.length
      }, { status: 429 })
    }

    // 2. 调用有道词典API获取单词信息
    const results = []

    for (const word of words) {
      try {
        // 调用有道词典API
        const response = await fetch(`https://dict.youdao.com/jsonapi?q=${encodeURIComponent(word.trim())}`)

        if (!response.ok) {
          // 如果API失败，返回基本信息
          results.push({
            word: word.trim(),
            phonetic: '',
            definition: '',
            definition_en: '',
            collocation: '',
            collocation_en: '',
            example_sentence: '',
            example_sentence_en: '',
            part_of_speech: '',
            success: false
          })
          continue
        }

        const data = await response.json()

        // 提取基础信息
        const simple = data.simple?.word?.[0]
        const ec = data.ec?.word?.[0]
        const ee = data.ee?.word?.[0]
        const blng = data.blng_sents_part?.['sentence-pair']?.[0]
        const phrs = data.phrs?.phrs?.[0]
        const syno = data.syno?.synos?.[0]

        // 音标（优先使用美式音标）
        const phonetic = simple?.usphone || simple?.ukphone || ''

        // 中文释义（从ec中提取）
        const definition = ec?.trs?.[0]?.tr?.[0]?.l?.i?.[0] || ''

        // 英文释义（从ee中提取）
        let definition_en = ''
        if (ee?.trs) {
          for (const tr of ee.trs) {
            if (tr.tr?.[0]?.l?.i) {
              definition_en = tr.tr[0].l.i
              break
            }
          }
        }

        // 词性
        const partOfSpeech = syno?.syno?.pos || ''

        // 例句（中英文）
        const exampleSentence = blng?.['sentence-translation'] || ''
        const exampleSentenceEn = blng?.['sentence-eng'] || blng?.sentence || ''

        // 搭配
        const collocationEn = phrs?.phr?.headword?.l?.i || ''
        const collocation = phrs?.phr?.trs?.[0]?.tr?.[0]?.l?.i || ''

        results.push({
          word: word.trim(),
          phonetic: phonetic.replace(/\//g, ''), // 移除音标符号
          definition: definition,
          definition_en: definition_en,
          collocation: collocation,
          collocation_en: collocationEn,
          example_sentence: exampleSentence,
          example_sentence_en: exampleSentenceEn,
          part_of_speech: partOfSpeech,
          success: true
        })
      } catch (error) {
        console.error(`Error fetching word "${word}":`, error)
        results.push({
          word: word.trim(),
          phonetic: '',
          definition: '',
          definition_en: '',
          collocation: '',
          collocation_en: '',
          example_sentence: '',
          example_sentence_en: '',
          part_of_speech: '',
          success: false
        })
      }
    }

    // 3. 创建默认章节
    console.log(`[DEBUG] Creating chapter for book ${bookId} with ${words.length} words`)

    const { data: chapterData, error: chapterError } = await supabase
      .from('chapters')
      .insert({
        book_id: bookId,
        title: '默认章节',
        order_index: 1,
        word_count: words.length
      } as any)
      .select()
      .single()

    if (chapterError || !chapterData) {
      console.error('[ERROR] Failed to create chapter:', chapterError)
      return NextResponse.json({ error: '创建章节失败: ' + (chapterError?.message || '未知错误') }, { status: 500 })
    }

    const chapterId = (chapterData as any).id
    console.log(`[DEBUG] Chapter created successfully with ID: ${chapterId}`)

    // 4. 批量插入到words表
    const wordsToInsert = results.map((result, index) => ({
      chapter_id: chapterId,
      word: result.word,
      phonetic: result.phonetic,
      definition: result.definition,
      definition_en: result.definition_en,
      collocation: result.collocation,
      collocation_en: result.collocation_en,
      example_sentence: result.example_sentence,
      example_sentence_en: result.example_sentence_en,
      part_of_speech: result.part_of_speech,
      order_index: index + 1
    }))

    const { data: insertedWords, error: insertError } = await supabase
      .from('words')
      .insert(wordsToInsert as any)
      .select()

    if (insertError) {
      console.error('Error inserting words:', insertError)
      return NextResponse.json({ error: '保存单词失败' }, { status: 500 })
    }

    // 5. 更新配额
    const { error: quotaUpdateError } = await supabase
      .from('smart_import_quota')
      .upsert({
        user_id: user.id,
        count: todayUsed + words.length,
        quota_date: todayStr,
        updated_at: new Date().toISOString()
      } as any, {
        onConflict: 'user_id,quota_date'
      })

    if (quotaUpdateError) {
      console.error('Error updating quota:', quotaUpdateError)
    }

    // 6. 更新词库的单词总数
    await supabase
      .from('books')
      // @ts-ignore - Supabase type inference issue
      .update({ total_words: words.length })
      .eq('id', bookId)

    return NextResponse.json({
      success: true,
      words: insertedWords,
      remaining: DAILY_LIMIT - (todayUsed + words.length)
    })
  } catch (error) {
    console.error('Error in POST /api/smart-import:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

/**
 * GET /api/smart-import - 获取今日剩余配额
 */
export async function GET() {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = await createClient()
    const todayStr = new Date().toISOString().split('T')[0]

    const { data: quotaData } = await supabase
      .from('smart_import_quota')
      .select('count')
      .eq('user_id', user.id)
      .eq('quota_date', todayStr)
      .maybeSingle()

    const todayUsed = (quotaData as any)?.count || 0
    const DAILY_LIMIT = 500

    return NextResponse.json({
      used: todayUsed,
      remaining: DAILY_LIMIT - todayUsed,
      limit: DAILY_LIMIT
    })
  } catch (error) {
    console.error('Error in GET /api/smart-import:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
