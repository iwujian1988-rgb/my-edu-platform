import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const APPLY_FLAG = '--apply'
const IS_APPLY = process.argv.includes(APPLY_FLAG)

const CORE_FEATURES = [
  'match_game',
  'flashcard',
  'dictation',
  'custom_book',
  'review_mode',
]

const PACKAGE_DEFINITIONS = [
  {
    name: 'Speak + 英语永久会员',
    description: '仅包含 Speaker 英语内容权限，不包含普通单词功能。',
    validity_days: null,
    feature_permissions: ['speaker'],
    book_permissions: [],
    language_packages: ['en'],
    is_active: true,
    sort_order: 201,
  },
  {
    name: 'Speak + 法语永久会员',
    description: '仅包含 Speaker 法语内容权限，不包含普通单词功能。',
    validity_days: null,
    feature_permissions: ['speaker'],
    book_permissions: [],
    language_packages: ['fr'],
    is_active: true,
    sort_order: 202,
  },
  {
    name: '英语单词功能永久会员（不含 Speak）',
    description: '包含英语单词、卡片、听写、消消乐、自定义词库和复习功能，不包含 Speaker。',
    validity_days: null,
    feature_permissions: CORE_FEATURES,
    book_permissions: ['*'],
    language_packages: ['en'],
    is_active: true,
    sort_order: 203,
  },
  {
    name: '法语单词功能永久会员（不含 Speak）',
    description: '包含法语单词、卡片、听写、消消乐、自定义词库和复习功能，不包含 Speaker。',
    validity_days: null,
    feature_permissions: CORE_FEATURES,
    book_permissions: ['*'],
    language_packages: ['fr'],
    is_active: true,
    sort_order: 204,
  },
]

function loadEnv(filePath) {
  const content = fs.readFileSync(path.resolve(filePath), 'utf8')
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }
    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex === -1) {
      continue
    }
    process.env[trimmed.slice(0, separatorIndex).trim()] = trimmed.slice(separatorIndex + 1).trim()
  }
}

function print(label, value) {
  console.log(`\n## ${label}`)
  console.log(JSON.stringify(value, null, 2))
}

loadEnv('.env.local')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing Supabase credentials in .env.local')
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
})

const { data: existingPackages, error: existingError } = await supabase
  .from('invitation_packages')
  .select('id, name, description, validity_days, feature_permissions, book_permissions, language_packages, is_active, sort_order')
  .in('name', PACKAGE_DEFINITIONS.map(item => item.name))

if (existingError) {
  throw existingError
}

const existingByName = new Map((existingPackages || []).map(item => [item.name, item]))
const plan = PACKAGE_DEFINITIONS.map(definition => {
  const existing = existingByName.get(definition.name)
  return {
    action: existing ? 'update' : 'insert',
    id: existing?.id || null,
    ...definition,
  }
})

print('plan', {
  dry_run: !IS_APPLY,
  count: plan.length,
  packages: plan,
})

if (!IS_APPLY) {
  console.log(`\nDry run only. Re-run with ${APPLY_FLAG} to write changes.`)
} else {
  const results = []
  for (const item of plan) {
    if (item.action === 'update' && item.id) {
      const { data, error } = await supabase
        .from('invitation_packages')
        .update({
          description: item.description,
          validity_days: item.validity_days,
          feature_permissions: item.feature_permissions,
          book_permissions: item.book_permissions,
          language_packages: item.language_packages,
          is_active: item.is_active,
          sort_order: item.sort_order,
        })
        .eq('id', item.id)
        .select('id, name')
        .single()

      if (error) {
        throw error
      }
      results.push({ action: item.action, package: data })
      continue
    }

    const { data, error } = await supabase
      .from('invitation_packages')
      .insert({
        name: item.name,
        description: item.description,
        validity_days: item.validity_days,
        feature_permissions: item.feature_permissions,
        book_permissions: item.book_permissions,
        language_packages: item.language_packages,
        is_active: item.is_active,
        sort_order: item.sort_order,
      })
      .select('id, name')
      .single()

    if (error) {
      throw error
    }
    results.push({ action: item.action, package: data })
  }

  print('applied', results)
}
