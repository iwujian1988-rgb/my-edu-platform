import { z } from 'zod'

export const MEDICAL_FEATURES = ['history_listening', 'expression_views', 'sbar'] as const
export type MedicalFeature = typeof MEDICAL_FEATURES[number]
export const MEDICAL_FEATURE_LABELS: Record<MedicalFeature, string> = {
  history_listening: '病史信息听辨', expression_views: '三种表达视角', sbar: 'SBAR交接训练',
}
export const MEDICAL_TRAINING_VERSION = 1
export const MAX_MEDICAL_RESPONSE_LENGTH = 3000

const text = z.string().trim().min(1).max(MAX_MEDICAL_RESPONSE_LENGTH)
const english = text.regex(/[A-Za-z]/, 'Expected English').refine(value => !/[\u4e00-\u9fff]/.test(value), 'English examples cannot contain placeholder Chinese')
const evidence = z.object({
  subtitle_ids: z.array(z.uuid()).min(1).max(12),
  start: z.number().nonnegative(), end: z.number().positive(), quote: text, chinese: text,
}).refine(value => value.end > value.start, 'Evidence end must follow start')
const historyItem = z.object({
  id: text, field: text, question: text, options: z.array(text).min(2).max(5),
  answer: z.int().nonnegative(), explanation: text, evidence,
}).refine(value => value.answer < value.options.length, 'Answer is outside the options')
  .refine(value => new Set(value.options).size === value.options.length, 'Options must be distinct')
const expressionItem = z.object({
  id: text, topic: text, patient: english, clinician: english, handover: english,
  explanation: text, evidence, origin: z.literal('teaching_example'),
})
const sbarField = z.object({
  key: z.enum(['S', 'B', 'A', 'R']), label: text, prompt: text, reference: english,
  checklist: z.array(text).min(1).max(5), evidence,
})
export const medicalMaterialSchema = z.object({
  version: z.literal(MEDICAL_TRAINING_VERSION), title: text,
  context_type: z.enum(['patient_dialogue', 'teaching', 'team_dialogue', 'patient_information']),
  disclosure: text,
  history_listening: z.array(historyItem).max(8),
  expression_views: z.array(expressionItem).max(8),
  sbar: z.object({ scenario: text, origin: z.enum(['source', 'teaching_example']), fields: z.array(sbarField).length(4) }).nullable(),
}).superRefine((value, ctx) => {
  if (value.sbar && new Set(value.sbar.fields.map(field => field.key)).size !== 4) {
    ctx.addIssue({ code: 'custom', message: 'SBAR requires four distinct fields' })
  }
  for (const items of [value.history_listening, value.expression_views]) {
    if (new Set(items.map(item => item.id)).size !== items.length) ctx.addIssue({ code: 'custom', message: 'Duplicate task IDs' })
  }
  if (/本集中文任务概述|中文听辨问题|自然完整英语|唯一正确答案|合理但本片不符的选项|中文语言任务/.test(JSON.stringify(value))) {
    ctx.addIssue({ code: 'custom', message: 'Material contains unfilled editorial placeholders' })
  }
})
export type MedicalMaterial = z.infer<typeof medicalMaterialSchema>
export type MedicalEvidence = z.infer<typeof evidence>
export type MedicalHistoryItem = MedicalMaterial['history_listening'][number]
export type MedicalExpressionItem = MedicalMaterial['expression_views'][number]

export interface MedicalPackageGrant { package_id: string; feature: MedicalFeature }
export function resolveMedicalFeatures(
  userPackageIds: string[], videoPackageIds: string[], grants: MedicalPackageGrant[],
  video: { language: string; status: string },
): MedicalFeature[] {
  if (video.language !== 'en' || video.status !== 'published') return []
  // An unrelated language package or the legacy generic video flag cannot grant clinical training.
  const matching = new Set(userPackageIds.filter(id => videoPackageIds.includes(id)))
  return MEDICAL_FEATURES.filter(feature => grants.some(grant => matching.has(grant.package_id) && grant.feature === feature))
}

export function filterMedicalMaterial(material: MedicalMaterial, features: MedicalFeature[]): MedicalMaterial {
  return { ...material,
    history_listening: features.includes('history_listening') ? material.history_listening : [],
    expression_views: features.includes('expression_views') ? material.expression_views : [],
    sbar: features.includes('sbar') ? material.sbar : null,
  }
}

export const medicalSubmissionSchema = z.discriminatedUnion('feature', [
  z.object({ feature: z.literal('history_listening'), version: z.int().positive(), answers: z.record(z.string(), z.int().nonnegative()) }),
  z.object({ feature: z.literal('expression_views'), version: z.int().positive(), completed_ids: z.array(text).max(8) }),
  z.object({ feature: z.literal('sbar'), version: z.int().positive(), answers: z.object({ S: text, B: text, A: text, R: text }), checked: z.array(text).max(20) }),
])
export type MedicalSubmission = z.infer<typeof medicalSubmissionSchema>
export function assessMedicalSubmission(material: MedicalMaterial, submission: MedicalSubmission) {
  if (submission.version !== material.version) throw new Error('资料已更新，请刷新后提交')
  if (submission.feature === 'history_listening') {
    if (!material.history_listening.length || material.history_listening.some(item => submission.answers[item.id] === undefined || submission.answers[item.id] >= item.options.length)
      || Object.keys(submission.answers).some(id => !material.history_listening.some(item => item.id === id))) throw new Error('请完成本集全部听辨题')
    const correct = material.history_listening.filter(item => submission.answers[item.id] === item.answer).length
    return { completed: true, correct, total: material.history_listening.length, evaluation: 'source_listening',
      feedback: material.history_listening.map(item => ({ id: item.id, correct: submission.answers[item.id] === item.answer, answer: item.answer, explanation: item.explanation, evidence: item.evidence })) }
  }
  if (submission.feature === 'expression_views') {
    const expected = material.expression_views.map(item => item.id)
    if (!expected.length || submission.completed_ids.length !== expected.length || new Set(submission.completed_ids).size !== expected.length || expected.some(id => !submission.completed_ids.includes(id))) throw new Error('请完成本集全部表达卡')
    return { completed: true, correct: null, total: expected.length, evaluation: 'self_practice' }
  }
  if (!material.sbar) throw new Error('本片段不适用SBAR训练')
  const permitted = material.sbar.fields.flatMap(field => field.checklist.map((_, index) => `${field.key}:${index}`))
  if (new Set(submission.checked).size !== submission.checked.length || submission.checked.some(id => !permitted.includes(id))) throw new Error('自查项目无效')
  return { completed: true, correct: null, total: permitted.length, checked: submission.checked.length,
    evaluation: 'self_check_not_clinical_assessment', reference: material.sbar }
}
