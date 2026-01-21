/**
 * Performance Diagnosis Script
 */

const { createClient } = require('@supabase/supabase-js')

// Hardcode credentials for diagnosis
const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testQuery(name, queryFn) {
  const start = Date.now()
  try {
    const result = await queryFn()
    const duration = Date.now() - start
    const count = result.data?.length || 0
    console.log(`✅ ${name}: ${duration}ms (${count} rows)`)
    return { success: true, duration, result }
  } catch (error) {
    const duration = Date.now() - start
    console.error(`❌ ${name}: ${duration}ms -`, error.message)
    return { success: false, duration, error }
  }
}

async function main() {
  console.log('🔍 Performance Diagnosis\n')
  console.log('='.repeat(60))

  const userId = '7078b0aa-d06a-4209-b669-1a0d4985c8ea'
  const bookId = '003b4ce0-c3f9-407a-a7d6-5e80ada4eae5'

  console.log('\n📊 Testing Book Detail Queries (problematic page)...')
  console.log('-'.repeat(60))

  // Test 1: Get book info
  await testQuery('Get book info', async () => {
    return await supabase.from('books').select('*').eq('id', bookId).single()
  })

  // Test 2: Get all word progress for user (this might be slow!)
  const progressTest = await testQuery('Get ALL word_progress for user+book', async () => {
    return await supabase
      .from('word_progress')
      .select('word_id, status')
      .eq('user_id', userId)
      .eq('book_id', bookId)
  })

  // Test 3: Get chapters
  await testQuery('Get chapters', async () => {
    return await supabase.from('chapters').select('id').eq('book_id', bookId)
  })

  // Test 4: Get ALL words (this is the expensive one for status='new')
  const chaptersResult = await supabase.from('chapters').select('id').eq('book_id', bookId)
  if (chaptersResult.data) {
    await testQuery('Get ALL words for book (EXPENSIVE)', async () => {
      return await supabase
        .from('words')
        .select('id')
        .in('chapter_id', chaptersResult.data.map(c => c.id))
        .order('order_index', { ascending: true })
    })
  }

  // Test 5: Count total records
  await testQuery('Count total word_progress records', async () => {
    return await supabase
      .from('word_progress')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
  })

  console.log('\n' + '='.repeat(60))
  console.log('✅ Diagnosis complete!')
}

main().catch(console.error)
