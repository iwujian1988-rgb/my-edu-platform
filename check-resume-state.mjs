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

async function checkResumeState() {
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

  console.log('\n检查最近3本书的 resume_state:')
  console.log('=====================================\n')

  prefs.forEach((p, i) => {
    console.log(`${i + 1}. book_id: ${p.book_id.slice(0, 8)}...`)
    console.log('   last_resume_state:', JSON.stringify(p.last_resume_state, null, 2))

    const hasValidResumeState = !!(p.last_resume_state &&
      typeof p.last_resume_state === 'object' &&
      Object.keys(p.last_resume_state).length > 0 &&
      p.last_resume_state.mode)

    console.log('   hasValidResumeState:', hasValidResumeState)
    console.log('')
  })
}

checkResumeState().catch(console.error)
