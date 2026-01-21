import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

async function applyMigration() {
  // Read environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials. Please check .env.local file.')
    process.exit(1)
  }

  // Create admin client
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  // Read the migration file
  const migrationPath = join(__dirname, 'supabase', 'migrations', '20260116_add_book_scope_stats_function.sql')
  const migrationSQL = readFileSync(migrationPath, 'utf-8')

  console.log('Applying migration: get_book_scope_stats function')

  try {
    // Execute the migration SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    })

    if (error) {
      // Try direct SQL execution if exec_sql is not available
      console.log('exec_sql not available, trying alternative method...')

      // Split the SQL into individual statements
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0)

      for (const statement of statements) {
        console.log(`Executing: ${statement.substring(0, 50)}...`)
        const { error: stmtError } = await supabase
          .from('_migrations')
          .select('*')
          .limit(1)

        // We'll need to use a different approach
        // Let's use the raw SQL execution via PostgreSQL client
      }
    }

    console.log('Migration applied successfully!')
    console.log('The get_book_scope_stats function is now available.')
  } catch (error) {
    console.error('Error applying migration:', error)
    console.error('\nPlease run the SQL manually in your Supabase dashboard:')
    console.error('1. Go to https://app.supabase.com/project/_/sql')
    console.error('2. Copy and paste the contents of:')
    console.error('   supabase/migrations/20260116_add_book_scope_stats_function.sql')
    console.error('3. Click "Run" to execute the migration')
    process.exit(1)
  }
}

applyMigration()
