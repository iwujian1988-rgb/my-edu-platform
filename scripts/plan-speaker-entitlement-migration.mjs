import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const DEFAULT_LANGUAGE = 'en'
const SPEAKER_FEATURE = 'speaker'
const ACTIVE_STATUS = 'active'
const APPLY_FLAG = '--apply'
const IS_APPLY = process.argv.includes(APPLY_FLAG)
const LANGUAGE_BY_PACKAGE_NAME = [
  { language: 'en', pattern: /\u82f1\u8bed/ },
  { language: 'fr', pattern: /\u6cd5\u8bed/ },
  { language: 'es', pattern: /\u897f\u73ed\u7259\u8bed/ },
  { language: 'de', pattern: /\u5fb7\u8bed/ },
  { language: 'ja', pattern: /\u65e5\u8bed/ },
  { language: 'pl', pattern: /\u6ce2\u5170\u8bed/ },
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
    const key = trimmed.slice(0, separatorIndex).trim()
    const value = trimmed.slice(separatorIndex + 1).trim()
    process.env[key] = value
  }
}

function normalizeArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : []
}

function unique(values) {
  return [...new Set(values)]
}

function isActiveEntitlement(row) {
  return row.status === ACTIVE_STATUS && (!row.expires_at || new Date(row.expires_at) > new Date())
}

function inferLanguageFromPackageName(name) {
  const match = LANGUAGE_BY_PACKAGE_NAME.find(item => item.pattern.test(name || ''))
  return match?.language || null
}

async function fetchAll(supabase, tableName, select) {
  const pageSize = 1000
  const rows = []

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from(tableName)
      .select(select)
      .range(offset, offset + pageSize - 1)

    if (error) {
      throw new Error(`${tableName}: ${error.message}`)
    }

    rows.push(...(data || []))
    if (!data || data.length < pageSize) {
      return rows
    }
  }
}

function summarizeBy(rows, getKey) {
  const counts = new Map()
  for (const row of rows) {
    const key = getKey(row)
    counts.set(key, (counts.get(key) || 0) + 1)
  }
  return Object.fromEntries([...counts.entries()].sort())
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

const [packages, users, speakerPurchases] = await Promise.all([
  fetchAll(
    supabase,
    'invitation_packages',
    'id, name, is_active, feature_permissions, book_permissions, language_packages, validity_days',
  ),
  fetchAll(
    supabase,
    'users',
    'id, phone_number, email, is_active, feature_permissions, book_permissions, language_packages, permission_expires_at, package_id, package_ids',
  ),
  fetchAll(
    supabase,
    'speaker_user_language_purchases',
    'id, user_id, language, status, expires_at, purchase_type, order_id',
  ),
])

const activePurchaseKeys = new Set(
  speakerPurchases
    .filter(isActiveEntitlement)
    .map(row => `${row.user_id}:${row.language}`),
)

const packageLanguagePlans = packages
  .filter(row => normalizeArray(row.feature_permissions).includes(SPEAKER_FEATURE))
  .filter(row => normalizeArray(row.language_packages).length === 0)
  .map(row => ({
    package_id: row.id,
    package_name: row.name,
    inferred_language: inferLanguageFromPackageName(row.name) || DEFAULT_LANGUAGE,
    reason: 'speaker package has no language_packages',
  }))

const userLanguagePlans = users
  .filter(row => row.is_active !== false)
  .filter(row => normalizeArray(row.language_packages).length === 0)
  .map(row => ({
    user_id: row.id,
    phone_number: row.phone_number,
    set_language_packages: [DEFAULT_LANGUAGE],
    reason: 'empty language_packages falls back to English today',
  }))

const speakerEntitlementPlans = []
for (const user of users) {
  if (user.is_active === false) {
    continue
  }

  const featurePermissions = normalizeArray(user.feature_permissions)
  if (!featurePermissions.includes(SPEAKER_FEATURE)) {
    continue
  }

  const languages = normalizeArray(user.language_packages)
  const targetLanguages = unique(languages.length > 0 ? languages : [DEFAULT_LANGUAGE])

  for (const language of targetLanguages) {
    const key = `${user.id}:${language}`
    if (!activePurchaseKeys.has(key)) {
      speakerEntitlementPlans.push({
        user_id: user.id,
        phone_number: user.phone_number,
        language,
        purchase_type: 'lifetime',
        amount: null,
        payment_method: 'migration',
        order_id: `migration-speaker-${language}-${user.id}`,
        notes: 'Backfill from existing speaker feature and language package',
      })
    }
  }
}

print('summary', {
  dry_run: !IS_APPLY,
  packages_needing_language_packages: packageLanguagePlans.length,
  users_needing_default_language_packages: userLanguagePlans.length,
  speaker_entitlements_to_backfill: speakerEntitlementPlans.length,
  speaker_entitlements_by_language: summarizeBy(speakerEntitlementPlans, row => row.language),
})

print('package_language_plans', packageLanguagePlans)
print('user_language_plans', userLanguagePlans)
print('speaker_entitlement_plans', speakerEntitlementPlans)

if (!IS_APPLY) {
  console.log(`\nDry run only. Re-run with ${APPLY_FLAG} to write changes.`)
} else {
  const applied = {
    packages_updated: [],
    users_updated: [],
    speaker_entitlements_inserted: [],
  }

  for (const plan of packageLanguagePlans) {
    const { data, error } = await supabase
      .from('invitation_packages')
      .update({ language_packages: [plan.inferred_language] })
      .eq('id', plan.package_id)
      .select('id, name, language_packages')
      .single()

    if (error) {
      throw error
    }

    applied.packages_updated.push(data)
  }

  for (const plan of userLanguagePlans) {
    const { data, error } = await supabase
      .from('users')
      .update({ language_packages: plan.set_language_packages })
      .eq('id', plan.user_id)
      .select('id, phone_number, language_packages')
      .single()

    if (error) {
      throw error
    }

    applied.users_updated.push(data)
  }

  if (speakerEntitlementPlans.length > 0) {
    const now = new Date().toISOString()
    const rows = speakerEntitlementPlans.map(plan => ({
      user_id: plan.user_id,
      language: plan.language,
      purchase_type: plan.purchase_type,
      started_at: now,
      expires_at: null,
      amount: plan.amount,
      currency: 'CNY',
      payment_method: plan.payment_method,
      order_id: plan.order_id,
      status: ACTIVE_STATUS,
      notes: plan.notes,
    }))

    const { data, error } = await supabase
      .from('speaker_user_language_purchases')
      .upsert(rows, { onConflict: 'user_id,language' })
      .select('id, user_id, language, status, order_id')

    if (error) {
      throw error
    }

    applied.speaker_entitlements_inserted.push(...(data || []))
  }

  print('applied', {
    packages_updated: applied.packages_updated.length,
    users_updated: applied.users_updated.length,
    speaker_entitlements_inserted: applied.speaker_entitlements_inserted.length,
    detail: applied,
  })
}
