import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://snnrjnpcmdsdlyldvvps.supabase.co"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1ODg1MzgsImV4cCI6MjA4MzE2NDUzOH0.1rUusdU-SyWMYNiiAfjrDtSFlcxlwn4FOv0X8bJC7Sk"

console.log('🔍 Testing database connection...')
console.log('URL:', supabaseUrl)

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  try {
    console.log('1. Testing auth...')
    const { data, error } = await supabase.auth.getSession()
    console.log('   Auth result:', error ? '❌ Error' : '✅ OK')
    if (error) console.error('   Error:', error.message)

    console.log('2. Testing books table...')
    const { data: books, error: booksError } = await supabase
      .from('books')
      .select('id, title')
      .limit(1)
    console.log('   Books query:', booksError ? '❌ Error' : '✅ OK')
    if (booksError) console.error('   Error:', booksError.message)
    else console.log('   Found', books?.length || 0, 'books')

    console.log('3. Testing users table...')
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email')
      .limit(1)
    console.log('   Users query:', usersError ? '❌ Error' : '✅ OK')
    if (usersError) console.error('   Error:', usersError.message)
    else console.log('   Found', users?.length || 0, 'users')

    console.log('4. Testing specific book...')
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('*')
      .eq('id', '003b4ce0-c3f9-407a-a7d6-5e80ada4eae5')
      .single()
    console.log('   Book query:', bookError ? '❌ Error' : '✅ OK')
    if (bookError) console.error('   Error:', bookError.message)
    else console.log('   Book:', book?.title)

    console.log('\n✅ Database connection test completed!')
  } catch (error) {
    console.error('\n❌ Connection test failed:', error.message)
  }
}

testConnection()
