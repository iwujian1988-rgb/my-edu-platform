/**
 * 练习步骤的 TS 类型定义。
 * 数据形态对应 MAXCLASS_V1_HANDOFF_2026-06-14/src/data/mock.js 中的 step 字面量。
 *
 * 共 5 种 step.type：
 *   - fill_blank     填空（segments 数组混合 text/blank）
 *   - multiple_choice 单选
 *   - true_false     多条判断题
 *   - reorder        拖拽排序
 *   - match_pairs    左右两列配对
 */

export type StepType = 'fill_blank' | 'multiple_choice' | 'true_false' | 'reorder' | 'match_pairs'

export interface VideoSegment {
  start: number
  end: number
}

// ─── fill_blank ─────────────────────────────────────────────────────
export interface TextSegment {
  type: 'text'
  content: string
}
export interface BlankSegment {
  type: 'blank'
  id: number
  answer: string
}
export type FillBlankSegment = TextSegment | BlankSegment

export interface FillBlankStep {
  type: 'fill_blank'
  videoSegment?: VideoSegment
  instruction: string
  segments: FillBlankSegment[]
}

// ─── multiple_choice ────────────────────────────────────────────────
export interface ChoiceOption {
  id: string
  text: string
}
export interface MultipleChoiceStep {
  type: 'multiple_choice'
  videoSegment?: VideoSegment
  instruction: string
  question: string
  options: ChoiceOption[]
  correct: string
  explanation?: string
}

// ─── true_false ─────────────────────────────────────────────────────
export interface TrueFalseStatement {
  id: number
  text: string
  correct: boolean
}
export interface TrueFalseStep {
  type: 'true_false'
  videoSegment?: VideoSegment
  instruction: string
  statements: TrueFalseStatement[]
}

// ─── reorder ────────────────────────────────────────────────────────
export interface ReorderItem {
  id: number
  text: string
}
export interface ReorderStep {
  type: 'reorder'
  videoSegment?: VideoSegment
  instruction: string
  items: ReorderItem[]
  correctOrder: number[]
}

// ─── match_pairs ────────────────────────────────────────────────────
export interface MatchPair {
  left: string
  right: string
}
export interface MatchPairsStep {
  type: 'match_pairs'
  videoSegment?: VideoSegment
  instruction: string
  pairs: MatchPair[]
}

export type ExerciseStep =
  | FillBlankStep
  | MultipleChoiceStep
  | TrueFalseStep
  | ReorderStep
  | MatchPairsStep
