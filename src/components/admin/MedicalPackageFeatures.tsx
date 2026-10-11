'use client'
import { useEffect, useState } from 'react'
import { MEDICAL_FEATURES, MEDICAL_FEATURE_LABELS } from '@/lib/medical-training'
import type { MedicalFeature } from '@/lib/medical-training'

export function MedicalPackageFeatures({ packageId }: { packageId: string }) {
  const [features, setFeatures] = useState<MedicalFeature[]>([])
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [retry, setRetry] = useState(0)
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    setBusy(true); setLoaded(false); setError(''); setSaved(false)
    fetch(`/api/admin/packages/${packageId}/medical-features`, { signal: controller.signal, cache: 'no-store' }).then(async response => {
      const body: { features: MedicalFeature[]; error?: string } = await response.json()
      if (!response.ok) throw new Error(body.error ?? '读取权限失败')
      setFeatures(body.features); setLoaded(true)
    }).catch((failure: unknown) => { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : '读取权限失败') })
      .finally(() => { if (!controller.signal.aborted) setBusy(false) })
    return () => controller.abort()
  }, [packageId, retry])
  async function save() {
    setBusy(true); setSaved(false); setError('')
    try {
      const response = await fetch(`/api/admin/packages/${packageId}/medical-features`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ features }) })
      const body: { error?: string } = await response.json()
      if (!response.ok) throw new Error(body.error ?? '保存权限失败')
      setSaved(true)
    } catch (failure) { setError(failure instanceof Error ? failure.message : '保存权限失败') }
    finally { setBusy(false) }
  }
  return <fieldset className="space-y-3 rounded-xl border border-teal-200 p-4 dark:border-teal-900"><legend className="px-1 text-sm font-semibold">临床英语专属功能</legend><p className="text-xs text-muted-foreground">用户持有本套餐，且英语视频也属于本套餐时，开放勾选的训练。功能权限单独保存。</p>{MEDICAL_FEATURES.map(feature => <label key={feature} className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={busy || !loaded} checked={features.includes(feature)} onChange={event => { setFeatures(previous => event.target.checked ? [...previous, feature] : previous.filter(value => value !== feature)); setSaved(false) }} />{MEDICAL_FEATURE_LABELS[feature]}</label>)}{error && <p role="alert" className="text-xs text-red-600">{error}{!loaded && <button type="button" className="ml-2 underline" onClick={() => setRetry(value => value + 1)}>重试</button>}</p>}<button type="button" disabled={busy || !loaded} onClick={save} className="rounded-lg bg-teal-700 px-3 py-2 text-sm text-white disabled:opacity-50">{busy ? '处理中…' : '保存专属功能权限'}</button>{saved && <p role="status" className="text-xs text-teal-700">功能权限已保存</p>}</fieldset>
}
