/**
 * 生词上下文查看页面
 *
 * 功能：
 * 1. 显示单词所在文章的原文
 * 2. 高亮显示单词所在的句子
 * 3. 高亮显示单词本身
 * 4. 支持原声回放
 */

// 强制动态渲染，跳过预渲染
export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { WordContextClient } from '@/components/speaker/WordContextClient'

export default async function WordContextPage({
  searchParams,
}: {
  searchParams: Promise<{ wordId?: string; from?: string }>
}) {
  const supabase = await createClient()
  const { wordId, from } = await searchParams
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/speaker/ghost-words')
  }

  if (!wordId) {
    redirect('/speaker/ghost-words')
  }

  // 获取生词数据
  const { data: ghostWord, error: wordError } = await supabase
    .from('speaker_ghost_words')
    .select('*')
    .eq('id', wordId)
    .eq('user_id', user.id)
    .single()

  if (wordError || !ghostWord) {
    console.error('[Word Context] 获取生词失败:', wordError)
    redirect('/speaker/ghost-words')
  }

  // 获取文章数据
  const { data: article } = await supabase
    .from('speaker_articles')
    .select('id, title, language, json_data, audio_url')
    .eq('id', ghostWord.article_id)
    .single()

  if (!article) {
    console.error('[Word Context] 获取文章失败')
    redirect('/speaker/ghost-words')
  }

  const { data: purchase } = await supabase
    .from('speaker_user_language_purchases')
    .select('expires_at')
    .eq('user_id', user.id)
    .eq('language', article.language)
    .eq('status', 'active')
    .maybeSingle()

  if (!purchase || (purchase.expires_at && new Date(purchase.expires_at) <= new Date())) {
    redirect('/speaker')
  }

  return (
    <WordContextClient
      ghostWord={ghostWord}
      article={article}
      fromPage={from || 'ghost-words'}
    />
  )
}
