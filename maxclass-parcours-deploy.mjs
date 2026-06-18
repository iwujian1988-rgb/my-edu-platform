/**
 * Apply the MAXCLASS parcours schema migration, import course data, then verify it.
 *
 * Required env in .env.local:
 *   SUPABASE_DB_URL or DATABASE_URL
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   npm run maxclass:parcours:deploy
 */

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { config } from 'dotenv'

config({ path: '.env.local', quiet: true })

const REQUIRED_MIGRATION = 'supabase/migrations/2026061701_add_parcours_slugs.sql'
const COMMANDS = [
  ['node', 'run-sql-file.mjs', REQUIRED_MIGRATION],
  ['node', 'maxclass-parcours-import.mjs'],
  ['node', 'maxclass-parcours-verify.mjs'],
]

function fail(message) {
  console.error(message)
  process.exit(1)
}

function assertEnvironment() {
  if (!existsSync(REQUIRED_MIGRATION)) {
    fail(`Missing migration file: ${REQUIRED_MIGRATION}`)
  }

  if (!process.env.SUPABASE_DB_URL && !process.env.DATABASE_URL) {
    fail('Missing SUPABASE_DB_URL or DATABASE_URL for Postgres migration.')
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    fail('Missing NEXT_PUBLIC_SUPABASE_URL for Supabase import/verify.')
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    fail('Missing SUPABASE_SERVICE_ROLE_KEY for Supabase import/verify.')
  }
}

function runCommand(command) {
  return new Promise((resolve, reject) => {
    const [executable, ...args] = command
    const child = spawn(executable, args, {
      cwd: process.cwd(),
      env: process.env,
      shell: process.platform === 'win32',
      stdio: 'inherit',
    })

    child.on('error', reject)
    child.on('exit', code => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`${command.join(' ')} exited with ${code}`))
    })
  })
}

async function main() {
  assertEnvironment()

  for (const command of COMMANDS) {
    console.log(`\n> ${command.join(' ')}`)
    await runCommand(command)
  }

  console.log('\nMAXCLASS parcours Supabase deployment verified.')
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
