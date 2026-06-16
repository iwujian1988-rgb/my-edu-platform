/**
 * MAXCLASS exercise 组件统一出口。
 * 对应原版 MAXCLASS_V1_HANDOFF_2026-06-14/src/components/exercises/ 全部 6 个组件。
 *
 * 5 种 step 类型 + 1 个视频播放器：
 *   - FillBlank       填空
 *   - MultipleChoice  单选
 *   - TrueFalse       多条判断
 *   - Reorder         拖拽排序
 *   - MatchPairs      左右配对
 *   - VideoPlayer     自托管视频（非练习，是练习的载体）
 */

export { FillBlank } from './FillBlank'
export { MultipleChoice } from './MultipleChoice'
export { TrueFalse } from './TrueFalse'
export { Reorder } from './Reorder'
export { MatchPairs } from './MatchPairs'
export { VideoPlayer, type VideoPlayerData } from './VideoPlayer'
export type {
  ExerciseStep,
  FillBlankStep,
  MultipleChoiceStep,
  TrueFalseStep,
  ReorderStep,
  MatchPairsStep,
  StepType,
} from './types'
