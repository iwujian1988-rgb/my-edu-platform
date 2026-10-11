import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import type { MedicalMaterial } from '@/lib/medical-training'

const mocks = vi.hoisted(() => ({ currentUser: vi.fn(), adminClient: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ getCurrentUser: mocks.currentUser, createAdminClient: mocks.adminClient }))
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }))
const VIDEO = '11111111-1111-4111-8111-111111111111'
const USER = '22222222-2222-4222-8222-222222222222'
const evidence = { subtitle_ids: [VIDEO], start: 1, end: 5, quote: 'Yesterday.', chinese: '昨天。' }
const material: MedicalMaterial = {
  version: 1, title: '病史', context_type: 'patient_dialogue', disclosure: '英语试学',
  history_listening: [{ id: 'onset', field: '起病', question: '何时起病？', options: ['昨天', '上周'], answer: 0, explanation: '原文昨天', evidence }],
  expression_views: [], sbar: null,
}
type Row = Record<string, unknown>
interface Result { data: Row[] | Row | null; error: null }
let rows: Record<string, Row[]>
let written: Row | undefined
class Query implements PromiseLike<Result> {
  private predicates: Array<(row: Row) => boolean> = []
  private one = false
  constructor(private table: string) {}
  select() { return this }
  eq(key: string, value: unknown) { this.predicates.push(row => row[key] === value); return this }
  in(key: string, values: unknown[]) { this.predicates.push(row => values.includes(row[key])); return this }
  maybeSingle() { this.one = true; return this }
  upsert(value: Row) { written = value; return this }
  then<TResult1 = Result, TResult2 = never>(fulfilled?: ((value: Result) => TResult1 | PromiseLike<TResult1>) | null, rejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null): PromiseLike<TResult1 | TResult2> {
    const filtered = (rows[this.table] ?? []).filter(row => this.predicates.every(predicate => predicate(row)))
    return Promise.resolve({ data: this.one ? filtered[0] ?? null : filtered, error: null } as Result).then(fulfilled, rejected)
  }
}
const params = { params: Promise.resolve({ id: VIDEO }) }
const request = (body?: unknown) => new NextRequest(`http://localhost/api/videos/${VIDEO}/medical-training`, body === undefined ? {} : { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } })
beforeEach(() => {
  written = undefined
  mocks.currentUser.mockResolvedValue({ id: USER })
  mocks.adminClient.mockResolvedValue({ from: (table: string) => new Query(table) })
  rows = {
    videos: [{ id: VIDEO, language: 'en', status: 'published', package_ids: ['medical'] }],
    users: [{ id: USER, package_ids: ['medical'] }],
    invitation_packages: [{ id: 'medical', is_active: true }],
    medical_package_features: [{ package_id: 'medical', feature: 'history_listening' }],
    medical_video_learning: [{ video_id: VIDEO, material, version: 1 }],
    medical_training_progress: [],
  }
})
describe('clinical training server authorization', () => {
  it('rejects anonymous users and invalid IDs', async () => {
    mocks.currentUser.mockResolvedValueOnce(null)
    expect((await GET(request(), params)).status).toBe(401)
    expect((await GET(request(), { params: Promise.resolve({ id: 'not-a-uuid' }) })).status).toBe(400)
  })
  it('does not grant clinical training via generic video permission or another package', async () => {
    rows.users[0] = { id: USER, package_ids: ['french'], feature_permissions: ['video'] }
    expect((await GET(request(), params)).status).toBe(403)
  })
  it('rejects inactive packages, drafts and French content', async () => {
    rows.invitation_packages[0].is_active = false
    expect((await GET(request(), params)).status).toBe(403)
    rows.invitation_packages[0].is_active = true
    rows.videos[0].status = 'draft'
    expect((await GET(request(), params)).status).toBe(404)
    rows.videos[0].status = 'published'; rows.videos[0].language = 'fr'
    expect((await GET(request(), params)).status).toBe(403)
  })
  it('returns only permitted material and current-user/version progress with no shared caching', async () => {
    rows.medical_training_progress = [
      { user_id: USER, video_id: VIDEO, feature: 'history_listening', version: 1, result: { correct: 1 } },
      { user_id: 'someone-else', video_id: VIDEO, feature: 'history_listening', version: 1 },
      { user_id: USER, video_id: VIDEO, feature: 'history_listening', version: 2 },
    ]
    const result = await GET(request(), params)
    const body = await result.json()
    expect(result.headers.get('Cache-Control')).toBe('private, no-store')
    expect(body.progress).toHaveLength(1)
    expect(body.material.sbar).toBeNull()
    expect(body.material.expression_views).toEqual([])
  })
  it('rejects unlicensed feature submissions and incomplete answers', async () => {
    expect((await POST(request({ feature: 'expression_views', version: 1, completed_ids: [] }), params)).status).toBe(403)
    expect((await POST(request({ feature: 'history_listening', version: 1, answers: {} }), params)).status).toBe(400)
    expect(written).toBeUndefined()
  })
  it('binds progress to the authenticated user and scores answers server-side', async () => {
    const result = await POST(request({ feature: 'history_listening', version: 1, answers: { onset: 1 }, user_id: 'someone-else', score: 100 }), params)
    expect(result.status).toBe(200)
    expect(written?.user_id).toBe(USER)
    expect(written?.video_id).toBe(VIDEO)
    expect((written?.result as { correct: number }).correct).toBe(0)
  })
})
