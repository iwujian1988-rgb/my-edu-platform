import { NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import type { Database, Json } from '@/types/database'

const ALLOWED_ORIGINS = new Set([
  'https://fr.maxnote.top',
  'http://localhost:5188',
  'http://127.0.0.1:5188',
  'http://localhost:5189',
  'http://127.0.0.1:5189',
])
const MAX_STATE_BYTES = 2_000_000

type FrenchAtlasDatabase = Database & {
  public: {
    Tables: {
      french_word_atlas_user_state: {
        Row: { user_id: string; state: Json; updated_at: string }
        Insert: { user_id: string; state: Json; updated_at?: string }
        Update: { state?: Json; updated_at?: string }
        Relationships: []
      }
    }
  }
}

function addCors(request: NextRequest, response: NextResponse) {
  const origin = request.headers.get('origin')
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type')
    response.headers.append('Vary', 'Origin')
  }
  response.headers.set('Cache-Control', 'no-store')
  return response
}

function json(request: NextRequest, body: unknown, status = 200) {
  return addCors(request, NextResponse.json(body, { status }))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

async function authorize(request: NextRequest) {
  const origin = request.headers.get('origin')
  if (!origin || !ALLOWED_ORIGINS.has(origin)) {
    return { response: json(request, { error: 'Forbidden origin' }, 403) }
  }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { response: json(request, { error: 'Unauthorized' }, 401) }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('feature_permissions, permission_expires_at, is_banned')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) return { response: json(request, { error: 'Unable to check access' }, 503) }
  const expired = !!profile?.permission_expires_at && Date.parse(profile.permission_expires_at) <= Date.now()
  if (!profile || profile.is_banned || expired || !profile.feature_permissions?.includes('french_atlas')) {
    return { response: json(request, { error: 'French Atlas permission required' }, 403) }
  }

  return { client: supabase as SupabaseClient<FrenchAtlasDatabase>, user }
}

export function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin')
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return new NextResponse(null, { status: 403 })
  return addCors(request, new NextResponse(null, { status: 204 }))
}

export async function GET(request: NextRequest) {
  const access = await authorize(request)
  if ('response' in access) return access.response

  const { data, error } = await access.client
    .from('french_word_atlas_user_state')
    .select('state, updated_at')
    .eq('user_id', access.user.id)
    .maybeSingle()

  if (error) return json(request, { error: 'Unable to load progress' }, 500)
  return json(request, { state: data?.state ?? null, updatedAt: data?.updated_at ?? null })
}

export async function PUT(request: NextRequest) {
  const access = await authorize(request)
  if ('response' in access) return access.response

  const contentLength = Number(request.headers.get('content-length') || 0)
  if (contentLength > MAX_STATE_BYTES) return json(request, { error: 'Progress payload too large' }, 413)

  const bodyText = await request.text()
  if (new TextEncoder().encode(bodyText).byteLength > MAX_STATE_BYTES) return json(request, { error: 'Progress payload too large' }, 413)

  let body: unknown
  try {
    body = JSON.parse(bodyText)
  } catch {
    return json(request, { error: 'Invalid JSON' }, 400)
  }

  const snapshot = isRecord(body) ? body.snapshot : null
  const progress = isRecord(snapshot) ? snapshot.progress : null
  const settings = isRecord(snapshot) ? snapshot.settings : null
  if (!isRecord(progress) || progress.version !== 2 || typeof progress.datasetId !== 'string' || !isRecord(progress.cards) || !Array.isArray(progress.bookmarks) || !isRecord(progress.days) || !Array.isArray(progress.typing) || !Array.isArray(progress.mistakes) || !isRecord(settings)) {
    return json(request, { error: 'Invalid progress snapshot' }, 400)
  }

  const { data, error } = await access.client
    .from('french_word_atlas_user_state')
    .upsert({ user_id: access.user.id, state: snapshot as unknown as Json, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    .select('updated_at')
    .single()

  if (error) return json(request, { error: 'Unable to save progress' }, 500)
  return json(request, { saved: true, updatedAt: data.updated_at })
}
