'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Headphones, Loader2, Play, Stethoscope } from 'lucide-react'
import { MAX_MEDICAL_RESPONSE_LENGTH, MEDICAL_FEATURE_LABELS, MEDICAL_FEATURES } from '@/lib/medical-training'
import type { MedicalEvidence, MedicalFeature, MedicalMaterial, MedicalSubmission } from '@/lib/medical-training'

interface Props { videoId: string; language: string; onPlaySegment: (start: number, end: number) => void }
interface Progress { feature: MedicalFeature; submission: MedicalSubmission; result: { correct: number | null; total: number; completed: boolean } }
interface ResponseData { features: MedicalFeature[]; material: MedicalMaterial | null; progress: Progress[]; error?: string }
const VIEWS = ['patient', 'clinician', 'handover'] as const
type ExpressionView = typeof VIEWS[number]
const VIEW_LABELS: Record<ExpressionView, string> = { patient: '患者怎么说', clinician: '医生怎么问', handover: '同事间怎么表达' }
const SBAR_KEYS = ['S', 'B', 'A', 'R'] as const
const BUTTON = 'rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed'

function Evidence({ evidence, onPlay }: { evidence: MedicalEvidence; onPlay: Props['onPlaySegment'] }) {
  return <details className="mt-3 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-900">
    <summary className="cursor-pointer font-medium text-teal-700 dark:text-teal-300">查看原片依据（字幕节选） · {Math.floor(evidence.start / 60)}:{String(Math.floor(evidence.start % 60)).padStart(2, '0')}</summary>
    <p className="mt-2 leading-relaxed text-slate-800 dark:text-slate-100">{evidence.quote}</p>
    <p className="mt-1 leading-relaxed text-slate-600 dark:text-slate-300">{evidence.chinese}</p>
    <button type="button" className={`${BUTTON} mt-2 inline-flex items-center gap-2 bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-200`} onClick={() => onPlay(evidence.start, evidence.end)}><Play size={14} />回听这一段</button>
  </details>
}

export function MedicalTrainingPanel({ videoId, language, onPlaySegment }: Props) {
  const [data, setData] = useState<ResponseData | null>(null)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(true)
  const [active, setActive] = useState<MedicalFeature>('history_listening')
  const [view, setView] = useState<ExpressionView>('patient')
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [completedCards, setCompletedCards] = useState<string[]>([])
  const [sbar, setSbar] = useState({ S: '', B: '', A: '', R: '' })
  const [checked, setChecked] = useState<string[]>([])
  const [saved, setSaved] = useState<MedicalFeature[]>([])
  const [saving, setSaving] = useState(false)
  const [showReference, setShowReference] = useState(false)
  const generation = useRef(0)

  useEffect(() => {
    generation.current += 1
    if (language !== 'en') return
    const controller = new AbortController()
    setLoading(true)
    setData(null)
    setSaving(false)
    setError('')
    fetch(`/api/videos/${videoId}/medical-training`, { signal: controller.signal, cache: 'no-store' })
      .then(async response => {
        if ([403, 404].includes(response.status)) return null
        const body: ResponseData = await response.json()
        if (!response.ok) throw new Error(body.error ?? '读取资料失败')
        return body
      }).then(body => {
        if (controller.signal.aborted) return
        setData(body)
        setAnswers({}); setCompletedCards([]); setSbar({ S: '', B: '', A: '', R: '' }); setChecked([]); setShowReference(false)
        setSaved(body?.progress.filter(row => row.result.completed).map(row => row.feature) ?? [])
        if (body?.features.length) setActive(body.features[0])
        for (const row of body?.progress ?? []) {
          if (row.submission.feature === 'history_listening') setAnswers(row.submission.answers)
          if (row.submission.feature === 'expression_views') setCompletedCards(row.submission.completed_ids)
          if (row.submission.feature === 'sbar') { setSbar(row.submission.answers); setChecked(row.submission.checked) }
        }
      }).catch((failure: unknown) => {
        if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : '读取资料失败')
      }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => { controller.abort(); generation.current += 1 }
  }, [videoId, language, reload])

  if (language !== 'en') return null
  if (!loading && !error && !data?.material) return null
  const material = data?.material
  const available = data?.features.filter(feature => feature === 'history_listening' ? material?.history_listening.length : feature === 'expression_views' ? material?.expression_views.length : material?.sbar) ?? []
  const selected = available.includes(active) ? active : available[0]
  const completed = saved.includes(selected)

  async function submit(submission: MedicalSubmission) {
    const currentGeneration = generation.current
    setSaving(true); setError('')
    try {
      const response = await fetch(`/api/videos/${videoId}/medical-training`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(submission) })
      const body: { error?: string } = await response.json()
      if (!response.ok) throw new Error(body.error ?? '保存失败，请重试')
      if (generation.current !== currentGeneration) return
      setSaved(previous => [...new Set([...previous, submission.feature])])
      if (submission.feature === 'sbar') setShowReference(true)
    } catch (failure) { if (generation.current === currentGeneration) setError(failure instanceof Error ? failure.message : '保存失败，请重试') }
    finally { if (generation.current === currentGeneration) setSaving(false) }
  }
  function invalidate(feature: MedicalFeature) { setSaved(previous => previous.filter(value => value !== feature)) }

  return <section aria-label="临床英语专属训练" className="my-5 overflow-hidden rounded-2xl border border-teal-200 bg-white text-slate-900 shadow-sm dark:border-teal-900 dark:bg-slate-950 dark:text-slate-100">
    <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 bg-teal-50 px-5 py-4 text-left dark:bg-teal-950/50">
      <span className="rounded-xl bg-teal-700 p-2.5 text-white"><Stethoscope size={22} /></span>
      <span className="flex-1"><span className="block text-lg font-bold">临床英语工作台</span><span className="mt-0.5 block text-xs text-teal-800 dark:text-teal-300">听清信息 · 换一种表达 · 组织交接</span></span>
      <ChevronDown size={20} className={open ? 'rotate-180' : ''} />
    </button>
    {open && <div className="p-4 sm:p-5">
      {loading && <p role="status" className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="animate-spin" size={16} />正在读取临床资料…</p>}
      {error && <div role="alert" className="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-950 dark:text-rose-200">{error}{!material && <button type="button" onClick={() => setReload(value => value + 1)} className="ml-3 underline">重试</button>}</div>}
      {material && <>
        <p className="mb-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{material.title}</p>
        <div role="tablist" aria-label="临床训练类型" className="mb-5 flex flex-wrap gap-2">
          {MEDICAL_FEATURES.filter(feature => available.includes(feature)).map(feature => <button key={feature} id={`${videoId}-medical-${feature}`} type="button" role="tab" tabIndex={selected === feature ? 0 : -1} aria-selected={selected === feature} className={`${BUTTON} ${selected === feature ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'}`} onClick={() => { setActive(feature); setError('') }} onKeyDown={event => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
            event.preventDefault()
            const offset = event.key === 'ArrowRight' ? 1 : -1
            const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? available.length - 1 : (available.indexOf(feature) + offset + available.length) % available.length
            const nextFeature = available[nextIndex]
            setActive(nextFeature); setError('')
            document.getElementById(`${videoId}-medical-${nextFeature}`)?.focus()
          }}>{MEDICAL_FEATURE_LABELS[feature]}{saved.includes(feature) && <Check className="ml-1 inline" size={14} />}</button>)}
        </div>
        <fieldset role="tabpanel" aria-labelledby={`${videoId}-medical-${selected}`} disabled={saving} className="min-w-0">
          {selected === 'history_listening' && <>
            <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">{material.context_type === 'teaching' ? '听辨本片段讲解的沟通方法；不填写虚构患者病史。' : '先听原片，再选择患者或团队实际提供的信息。未提及的信息不作推断。'}</p>
            <p role="status" className="mb-3 text-sm font-medium text-teal-700 dark:text-teal-300">{completed ? `听辨结果：${material.history_listening.filter(item => answers[item.id] === item.answer).length}/${material.history_listening.length}` : `已作答 ${material.history_listening.filter(item => answers[item.id] !== undefined).length}/${material.history_listening.length}`}</p>
            <div className="space-y-4">{material.history_listening.map((item, index) => <article key={item.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <div className="mb-2 text-xs font-semibold text-teal-700 dark:text-teal-300">{String(index + 1).padStart(2, '0')} · {item.field}</div>
              <p className="mb-3 font-semibold">{item.question}</p>
              <button type="button" onClick={() => onPlaySegment(item.evidence.start, item.evidence.end)} className={`${BUTTON} mb-3 inline-flex items-center gap-2 bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-200`}><Headphones size={16} />听这段原音</button>
              <div className="space-y-2">{item.options.map((option, optionIndex) => <label key={optionIndex} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm ${answers[item.id] === optionIndex ? 'border-teal-600 bg-teal-50 dark:bg-teal-950' : 'border-slate-200 dark:border-slate-800'}`}>
                <input type="radio" name={`${videoId}-${item.id}`} checked={answers[item.id] === optionIndex} onChange={() => { setAnswers(previous => ({ ...previous, [item.id]: optionIndex })); invalidate('history_listening') }} className="mt-0.5 accent-teal-700" />{option}
              </label>)}</div>
              {completed && <div className="mt-3 text-sm"><p className={answers[item.id] === item.answer ? 'text-teal-700 dark:text-teal-300' : 'text-rose-700 dark:text-rose-300'}>{answers[item.id] === item.answer ? '回答正确' : `参考答案：${item.options[item.answer]}`}</p><p className="mt-1 leading-relaxed text-slate-600 dark:text-slate-300">{item.explanation}</p><Evidence evidence={item.evidence} onPlay={onPlaySegment} /></div>}
            </article>)}</div>
            <button type="button" disabled={saving || material.history_listening.some(item => answers[item.id] === undefined)} className={`${BUTTON} mt-4 bg-teal-700 text-white`} onClick={() => submit({ feature: 'history_listening', version: material.version, answers })}>{saving ? '正在保存…' : completed ? '重新提交听辨' : '提交听辨，查看原片依据'}</button>
          </>}
          {selected === 'expression_views' && <>
            <div className="mb-4 flex flex-wrap gap-2">{VIEWS.map(value => <button key={value} type="button" aria-pressed={view === value} className={`${BUTTON} ${view === value ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800'}`} onClick={() => setView(value)}>{VIEW_LABELS[value]}</button>)}</div>
            <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">以下为原创教学表达，非原片逐字台词；回听按钮播放对应语境依据。</p>
            <div className="space-y-4">{material.expression_views.map(item => <article key={item.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"><p className="text-sm font-semibold text-teal-700 dark:text-teal-300">{item.topic}</p><p className="my-3 text-xl font-medium leading-relaxed">{item[view]}</p><p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{item.explanation}</p><Evidence evidence={item.evidence} onPlay={onPlaySegment} /><label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={completedCards.includes(item.id)} onChange={event => { setCompletedCards(previous => event.target.checked ? [...previous, item.id] : previous.filter(id => id !== item.id)); invalidate('expression_views') }} className="accent-teal-700" />我已对照三种视角并开口练习</label></article>)}</div>
            <button type="button" disabled={saving || completedCards.length !== material.expression_views.length} className={`${BUTTON} mt-4 bg-teal-700 text-white`} onClick={() => submit({ feature: 'expression_views', version: material.version, completed_ids: completedCards })}>{saving ? '正在保存…' : '保存表达练习记录'}</button>
          </>}
          {selected === 'sbar' && material.sbar && <>
            <p className="mb-4 rounded-xl bg-indigo-50 p-4 text-sm leading-relaxed dark:bg-indigo-950">{material.sbar.scenario}</p>
            <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">{material.sbar.origin === 'source' ? '依原片已有信息组织交接；未提供的信息明确说尚未确认。' : '原创教学模拟：将原片沟通原则迁移到交接练习。'}按语言与信息组织自查，结果不评判临床决策。</p>
            <div className="space-y-4">{material.sbar.fields.map(field => <article key={field.key} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"><label htmlFor={`${videoId}-sbar-${field.key}`} className="font-semibold"><span className="mr-2 inline-block rounded-lg bg-teal-700 px-2 py-1 text-white">{field.key}</span>{field.label}</label><p className="my-2 text-sm text-slate-600 dark:text-slate-300">{field.prompt}</p><textarea id={`${videoId}-sbar-${field.key}`} value={sbar[field.key]} maxLength={MAX_MEDICAL_RESPONSE_LENGTH} rows={3} placeholder="用英语组织这部分交接…" onChange={event => { setSbar(previous => ({ ...previous, [field.key]: event.target.value })); invalidate('sbar') }} className="w-full rounded-xl border border-slate-300 bg-white p-3 text-base focus:border-teal-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900" />
              {field.checklist.map((item, index) => <label key={item} className="mt-2 flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300"><input type="checkbox" checked={checked.includes(`${field.key}:${index}`)} onChange={event => { const id = `${field.key}:${index}`; setChecked(previous => event.target.checked ? [...previous, id] : previous.filter(value => value !== id)); invalidate('sbar') }} className="mt-1 accent-teal-700" />{item}</label>)}
              {showReference && <div className="mt-3"><p className="text-xs font-semibold text-teal-700 dark:text-teal-300">参考表达 · 不作为临床处置标准</p><p className="mt-1 leading-relaxed">{field.reference}</p><Evidence evidence={field.evidence} onPlay={onPlaySegment} /></div>}
            </article>)}</div>
            <div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={saving || SBAR_KEYS.some(key => !sbar[key].trim())} className={`${BUTTON} bg-teal-700 text-white`} onClick={() => submit({ feature: 'sbar', version: material.version, answers: sbar, checked })}>{saving ? '正在保存…' : '保存交接与自查记录'}</button><button type="button" className={`${BUTTON} bg-slate-100 dark:bg-slate-800`} onClick={() => setShowReference(!showReference)}>{showReference ? '收起参考' : '查看参考表达'}</button></div>
          </>}
        </fieldset>
        {completed && <p role="status" className="mt-3 flex items-center gap-2 text-sm text-teal-700 dark:text-teal-300"><Check size={16} />已保存，下次打开可继续查看。</p>}
        <p className="mt-5 border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-500 dark:border-slate-800 dark:text-slate-400"><Headphones size={13} className="mr-1 inline" />{material.disclosure}</p>
      </>}
    </div>}
  </section>
}
