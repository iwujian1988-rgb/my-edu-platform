import { createServer } from 'node:http'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServerClient } from '@supabase/ssr'
import { parse, serialize } from 'cookie'
import dotenv from 'dotenv'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
dotenv.config({ path: process.env.MAXNOTE_ENV_FILE || resolve(projectRoot, '.env.local') })

const PORT = Number(process.env.FRENCH_ATLAS_API_PORT || 3302)
const MAX_STATE_BYTES = 2_000_000
const APP_ORIGIN = 'https://maxnote.top'
const ALLOWED_FRENCH_ORIGINS = new Set([
  'https://fr.maxnote.top',
  'http://localhost:5188',
  'http://127.0.0.1:5188',
  'http://localhost:5189',
  'http://127.0.0.1:5189',
])
const COOKIE = { httpOnly: true, secure: true, sameSite: 'lax', path: '/' }

function isRecord(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function appendSetCookies(response, values) {
  if (!values.length) return
  const current = response.getHeader('Set-Cookie')
  const existing = current ? (Array.isArray(current) ? current : [current]) : []
  response.setHeader('Set-Cookie', [...existing, ...values])
}

function createUserClient(request, response) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('MaxNote Supabase configuration is missing')

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return Object.entries(parse(request.headers.cookie || '')).map(([name, value]) => ({ name, value }))
      },
      setAll(cookies) {
        appendSetCookies(response, cookies.map(({ name, value, options }) => serialize(name, value, { ...options, ...COOKIE })))
      },
    },
  })
}

function setCors(request, response, allowedOrigins = ALLOWED_FRENCH_ORIGINS) {
  const origin = request.headers.origin
  if (origin && allowedOrigins.has(origin)) {
    response.setHeader('Access-Control-Allow-Origin', origin)
    response.setHeader('Access-Control-Allow-Credentials', 'true')
    response.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS')
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    response.setHeader('Vary', 'Origin')
  }
  response.setHeader('Cache-Control', 'no-store')
}

function sendJson(request, response, status, value, allowedOrigins = ALLOWED_FRENCH_ORIGINS) {
  setCors(request, response, allowedOrigins)
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.end(JSON.stringify(value))
}

async function authorizeFrenchAtlas(request, response) {
  const origin = request.headers.origin
  if (!origin || !ALLOWED_FRENCH_ORIGINS.has(origin)) return { status: 403, error: 'Forbidden origin' }

  const supabase = createUserClient(request, response)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { status: 401, error: 'Unauthorized' }

  const { data: profile, error } = await supabase
    .from('users')
    .select('feature_permissions, permission_expires_at, is_banned')
    .eq('id', user.id)
    .maybeSingle()

  if (error) return { status: 503, error: 'Unable to check access' }
  const expired = !!profile?.permission_expires_at && Date.parse(profile.permission_expires_at) <= Date.now()
  if (!profile || profile.is_banned || expired || !profile.feature_permissions?.includes('french_atlas')) {
    return { status: 403, error: 'French Atlas permission required' }
  }

  return { supabase, user }
}

async function loadState(request, response, access) {
  const { data, error } = await access.supabase
    .from('french_word_atlas_user_state')
    .select('state, updated_at')
    .eq('user_id', access.user.id)
    .maybeSingle()

  if (error) return sendJson(request, response, 500, { error: 'Unable to load progress' })
  sendJson(request, response, 200, { state: data?.state ?? null, updatedAt: data?.updated_at ?? null })
}

async function readRequestJson(request) {
  const contentLength = Number(request.headers['content-length'] || 0)
  if (contentLength > MAX_STATE_BYTES) return { tooLarge: true }
  const chunks = []
  let size = 0
  let tooLarge = false
  for await (const chunk of request) {
    size += chunk.length
    if (size > MAX_STATE_BYTES) {
      tooLarge = true
      chunks.length = 0
    } else if (!tooLarge) {
      chunks.push(chunk)
    }
  }
  if (tooLarge) return { tooLarge: true }
  try {
    return { value: JSON.parse(Buffer.concat(chunks).toString('utf8')) }
  } catch {
    return { invalid: true }
  }
}

async function saveState(request, response, access) {
  const body = await readRequestJson(request)
  if (body.tooLarge) return sendJson(request, response, 413, { error: 'Progress payload too large' })
  if (body.invalid) return sendJson(request, response, 400, { error: 'Invalid JSON' })

  const snapshot = isRecord(body.value) ? body.value.snapshot : null
  const progress = isRecord(snapshot) ? snapshot.progress : null
  const settings = isRecord(snapshot) ? snapshot.settings : null
  if (!isRecord(progress) || progress.version !== 2 || typeof progress.datasetId !== 'string' || !isRecord(progress.cards) || !Array.isArray(progress.bookmarks) || !isRecord(progress.days) || !Array.isArray(progress.typing) || !Array.isArray(progress.mistakes) || !isRecord(settings)) {
    return sendJson(request, response, 400, { error: 'Invalid progress snapshot' })
  }

  const { data, error } = await access.supabase
    .from('french_word_atlas_user_state')
    .upsert({ user_id: access.user.id, state: snapshot, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    .select('updated_at')
    .single()

  if (error) return sendJson(request, response, 500, { error: 'Unable to save progress' })
  sendJson(request, response, 200, { saved: true, updatedAt: data.updated_at })
}

async function checkPermissions(request, response) {
  const origin = request.headers.origin
  if (origin && origin !== APP_ORIGIN && origin !== 'https://www.maxnote.top') {
    return sendJson(request, response, 403, { error: 'Forbidden origin' }, new Set())
  }

  let upstream
  let permissions
  try {
    upstream = await fetch('http://127.0.0.1:3000/api/auth/check-permissions', {
      method: 'POST',
      headers: { cookie: request.headers.cookie || '' },
      signal: AbortSignal.timeout(15_000),
    })
    permissions = await upstream.json()
  } catch {
    return sendJson(request, response, 503, { error: 'Permission service unavailable' }, new Set())
  }

  const upstreamCookies = upstream.headers.getSetCookie?.() || []
  appendSetCookies(response, upstreamCookies)
  if (!upstream.ok || !isRecord(permissions)) {
    return sendJson(request, response, upstream.status, permissions, new Set())
  }

  try {
    const supabase = createUserClient(request, response)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      permissions.has_french_atlas = false
      return sendJson(request, response, 200, permissions, new Set())
    }
    const { data: profile } = await supabase
      .from('users')
      .select('feature_permissions, permission_expires_at, is_banned')
      .eq('id', user.id)
      .maybeSingle()
    const expired = !!profile?.permission_expires_at && Date.parse(profile.permission_expires_at) <= Date.now()
    const hasFrenchAtlas = !!profile && !profile.is_banned && !expired && !!profile.feature_permissions?.includes('french_atlas')
    permissions.has_french_atlas = hasFrenchAtlas
    permissions.entries = Array.isArray(permissions.entries) ? permissions.entries : []
    if (hasFrenchAtlas && !permissions.entries.some(entry => entry?.id === 'french-atlas')) {
      permissions.entries.push({
        id: 'french-atlas',
        // Reuse an icon kind already present in the currently deployed portal bundle.
        kind: 'maxnote',
        title: '法语图鉴',
        description: 'TCF Canada 备考词汇与间隔复习',
        href: 'https://fr.maxnote.top/',
      })
    }
    return sendJson(request, response, 200, permissions, new Set())
  } catch {
    return sendJson(request, response, 503, { error: 'Unable to check French Atlas access' }, new Set())
  }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || '/', 'http://127.0.0.1')
  try {
    if (url.pathname === '/api/auth/check-permissions' && request.method === 'POST') {
      return await checkPermissions(request, response)
    }
    if (url.pathname !== '/api/french-atlas/state') {
      return sendJson(request, response, 404, { error: 'Not found' })
    }
    if (request.method === 'OPTIONS') {
      const origin = request.headers.origin
      if (!origin || !ALLOWED_FRENCH_ORIGINS.has(origin)) return sendJson(request, response, 403, { error: 'Forbidden origin' })
      setCors(request, response)
      response.statusCode = 204
      return response.end()
    }
    if (request.method !== 'GET' && request.method !== 'PUT') {
      response.setHeader('Allow', 'GET, PUT, OPTIONS')
      return sendJson(request, response, 405, { error: 'Method not allowed' })
    }
    const access = await authorizeFrenchAtlas(request, response)
    if (access.error) return sendJson(request, response, access.status, { error: access.error })
    if (request.method === 'GET') return await loadState(request, response, access)
    return await saveState(request, response, access)
  } catch (error) {
    console.error('[french-atlas-api]', error instanceof Error ? error.message : 'Unexpected error')
    if (!response.headersSent) sendJson(request, response, 500, { error: 'Account service unavailable' })
    else response.end()
  }
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`French Atlas account API listening on 127.0.0.1:${PORT}`)
})
