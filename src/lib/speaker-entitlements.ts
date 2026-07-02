import type { SupabaseClient } from '@supabase/supabase-js'

const SPEAKER_FEATURE = 'speaker'
const DEFAULT_LANGUAGE = 'en'
const ACTIVE_STATUS = 'active'
const DEFAULT_CURRENCY = 'CNY'

interface GrantSpeakerLanguagePurchasesParams {
  userId: string
  featurePermissions: unknown
  languagePackages: unknown
  validityDays?: unknown
  expiresAt?: unknown
  source: string
}

interface SpeakerPurchaseInsert {
  user_id: string
  language: string
  purchase_type: 'subscription' | 'lifetime'
  started_at: string
  expires_at: string | null
  amount: number | null
  currency: string
  payment_method: string
  order_id: string
  status: string
  notes: string
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((item): item is string => typeof item === 'string' && item.length > 0)
}

function resolveExpiresAt(validityDays: unknown, expiresAt: unknown): string | null {
  if (typeof expiresAt === 'string' && expiresAt.length > 0) {
    return expiresAt
  }

  if (typeof validityDays !== 'number' || !Number.isFinite(validityDays) || validityDays <= 0) {
    return null
  }

  const expiry = new Date()
  expiry.setDate(expiry.getDate() + validityDays)
  return expiry.toISOString()
}

export async function grantSpeakerLanguagePurchases(
  supabase: SupabaseClient,
  params: GrantSpeakerLanguagePurchasesParams
): Promise<number> {
  const featurePermissions = normalizeStringArray(params.featurePermissions)
  if (!featurePermissions.includes(SPEAKER_FEATURE)) {
    return 0
  }

  const normalizedLanguages = normalizeStringArray(params.languagePackages)
  const languages = [...new Set(normalizedLanguages.length > 0 ? normalizedLanguages : [DEFAULT_LANGUAGE])]
  const startedAt = new Date().toISOString()
  const expiresAt = resolveExpiresAt(params.validityDays, params.expiresAt)
  const purchaseType = expiresAt ? 'subscription' : 'lifetime'

  const rows: SpeakerPurchaseInsert[] = languages.map(language => ({
    user_id: params.userId,
    language,
    purchase_type: purchaseType,
    started_at: startedAt,
    expires_at: expiresAt,
    amount: null,
    currency: DEFAULT_CURRENCY,
    payment_method: params.source,
    order_id: `${params.source}-speaker-${language}-${params.userId}`,
    status: ACTIVE_STATUS,
    notes: 'Granted from package speaker feature and language package',
  }))

  const { error } = await supabase
    .from('speaker_user_language_purchases')
    .upsert(rows, { onConflict: 'user_id,language' })

  if (error) {
    throw error
  }

  return rows.length
}
