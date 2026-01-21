import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const envContent = readFileSync('.env.local', 'utf-8')

const getEnvValue = (key) => {
  const match = envContent.match(new RegExp(`^${key}=\"?(.*?)\"?$`, 'm'))
  return match ? match[1].replace(/^"|"$/g, '') : ''
}

const SUPABASE_URL = getEnvValue('NEXT_PUBLIC_SUPABASE_URL')
const SUPABASE_KEY = getEnvValue('SUPABASE_SERVICE_ROLE_KEY')

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function checkHomepageURLs() {
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('phone_number', '15652936305')
    .single()

  console.log('User:', user.id)

  const { data: prefs } = await supabase
    .from('user_book_preferences')
    .select('book_id, last_resume_state')
    .eq('user_id', user.id)
    .order('last_accessed_at', { ascending: false })
    .limit(3)

  console.log('\n检查前3本书的 resume_state 和生成的 continueURL:')
  console.log('==============================================\n')

  for (let i = 0; i < prefs.length; i++) {
    const p = prefs[i]
    const resumeState = p.last_resume_state
    const bookId = p.book_id

    console.log(`${i + 1}. book_id: ${bookId.slice(0, 8)}...`)
    console.log('   resume_state:', JSON.stringify(resumeState, null, 2))

    // 模拟首页的URL生成逻辑
    const hasValidResumeState = resumeState &&
      typeof resumeState === 'object' &&
      Object.keys(resumeState).length > 0 &&
      (resumeState.mode || resumeState.context)

    const mode = resumeState?.mode || 'word-list'
    let scopeType = resumeState?.context?.scope || resumeState?.context?.scopeType || 'all'
    const currentIndex = resumeState?.context?.index || resumeState?.context?.currentIndex || 0

    // ✅ 新逻辑：默认跳转到词书详情页
    let continueURL = `/library/${bookId}`

    if (hasValidResumeState) {
      if (mode === 'word-list') {
        const params = new URLSearchParams()
        const contextPage = resumeState.context?.page
        const contextStatus = resumeState.context?.status || resumeState.context?.scope
        const contextTheme = resumeState.context?.theme
        const contextScenario = resumeState.context?.scenario

        if (contextPage && contextPage > 1) {
          params.set('page', String(contextPage))
        }
        if (contextStatus && contextStatus !== 'all') {
          params.set('status', contextStatus)
        }
        if (contextTheme && contextTheme !== 'all') {
          params.set('theme', contextTheme)
        }
        if (contextScenario && contextScenario !== 'all') {
          params.set('scenario', contextScenario)
        }

        const queryString = params.toString()
        continueURL = `/library/${bookId}${queryString ? `?${queryString}` : ''}`
      } else if (mode === 'flashcards') {
        const hash = `#word-${currentIndex}`
        continueURL = `/study/${bookId}/flashcards?scope=${scopeType}&shuffle=true${hash}`
      } else if (mode === 'dictation') {
        const hash = `#word-${currentIndex}`
        continueURL = `/study/${bookId}/dictation?scope=${scopeType}${hash}`
      } else if (mode === 'typing') {
        continueURL = `/practice?bookId=${bookId}&scope=${scopeType}`
      }
    }

    console.log(`   mode: ${mode}`)
    console.log(`   continueURL: ${continueURL}`)
    console.log('')
  }
}

checkHomepageURLs().catch(console.error)
