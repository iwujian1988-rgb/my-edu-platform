import { describe, expect, it } from 'vitest'
import { assessMedicalSubmission, filterMedicalMaterial, medicalMaterialSchema, resolveMedicalFeatures } from '../medical-training'
import type { MedicalMaterial } from '../medical-training'

const evidence = { subtitle_ids: ['11111111-1111-4111-8111-111111111111'], start: 10, end: 15, quote: 'When did it start?', chinese: '什么时候开始的？' }
const material: MedicalMaterial = {
  version: 1, title: '起病时间听辨', context_type: 'patient_dialogue', disclosure: '英语训练，非诊疗指南',
  history_listening: [{ id: 'onset', field: '时间', question: '患者何时开始不适？', options: ['昨天', '上周'], answer: 0, explanation: '原文说yesterday', evidence }],
  expression_views: [{ id: 'time', topic: '起病时间', patient: 'It started yesterday.', clinician: 'When did it start?', handover: 'The patient reports symptoms starting yesterday.', explanation: '保留患者报告性质', origin: 'teaching_example', evidence }],
  sbar: { scenario: '按原片整理交接', origin: 'source', fields: ['S', 'B', 'A', 'R'].map(key => ({ key: key as 'S' | 'B' | 'A' | 'R', label: key, prompt: '组织英语信息', reference: 'This information needs clarification.', checklist: ['没有编造信息'], evidence })) },
}
describe('medical package entitlements', () => {
  const video = { language: 'en', status: 'published' }
  const grants = [{ package_id: 'medical', feature: 'history_listening' as const }]
  it('requires the same package to grant the content and the feature', () => {
    expect(resolveMedicalFeatures(['french'], ['medical'], grants, video)).toEqual([])
    expect(resolveMedicalFeatures(['medical'], ['medical'], grants, video)).toEqual(['history_listening'])
    expect(resolveMedicalFeatures(['medical'], ['other'], grants, video)).toEqual([])
  })
  it('does not unlock unpublished or French videos', () => {
    expect(resolveMedicalFeatures(['medical'], ['medical'], grants, { ...video, status: 'draft' })).toEqual([])
    expect(resolveMedicalFeatures(['medical'], ['medical'], grants, { ...video, language: 'fr' })).toEqual([])
  })
  it('omits unlicensed data from the server response', () => {
    const filtered = filterMedicalMaterial(material, ['history_listening'])
    expect(filtered.expression_views).toEqual([]); expect(filtered.sbar).toBeNull()
  })
})
describe('source-bound training results', () => {
  it('scores listening from the material answer, not a client score', () => {
    expect(assessMedicalSubmission(material, { feature: 'history_listening', version: 1, answers: { onset: 1 } }).correct).toBe(0)
  })
  it('rejects missing answers, extra IDs, invalid options and stale versions', () => {
    for (const answers of [{}, { onset: 4 }, { onset: 0, other: 0 }]) expect(() => assessMedicalSubmission(material, { feature: 'history_listening', version: 1, answers })).toThrow()
    expect(() => assessMedicalSubmission(material, { feature: 'history_listening', version: 2, answers: { onset: 0 } })).toThrow()
  })
  it('rejects false expression completion and SBAR self-check IDs', () => {
    expect(() => assessMedicalSubmission(material, { feature: 'expression_views', version: 1, completed_ids: ['unknown'] })).toThrow()
    expect(() => assessMedicalSubmission(material, { feature: 'sbar', version: 1, answers: { S: 'S', B: 'B', A: 'A', R: 'R' }, checked: ['R:99'] })).toThrow()
  })
  it('labels written handover as self-check without a clinical score', () => {
    const result = assessMedicalSubmission(material, { feature: 'sbar', version: 1, answers: { S: 'S', B: 'B', A: 'A', R: 'R' }, checked: ['S:0'] })
    expect(result.correct).toBeNull(); expect(result.evaluation).toBe('self_check_not_clinical_assessment')
  })
  it('rejects inverted evidence and duplicate SBAR fields', () => {
    const bad = structuredClone(material); bad.history_listening[0].evidence.end = 1
    expect(medicalMaterialSchema.safeParse(bad).success).toBe(false)
    const duplicate = structuredClone(material); duplicate.sbar.fields[1].key = 'S'
    expect(medicalMaterialSchema.safeParse(duplicate).success).toBe(false)
  })
})
