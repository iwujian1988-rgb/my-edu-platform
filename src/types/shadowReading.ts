/**
 * 跟读模式类型定义
 */

/** 录音跟读: listen1 → listen2 → speak → playback → compare → done
 *  影子跟读: listen1 → listen2 → listen3 → done
 */
export type ShadowMode = 'recording' | 'shadow'

/** 跟读阶段的 6 种状态 + idle */
export type ShadowPhase =
  | 'idle'
  | 'listen1'
  | 'listen2'
  | 'listen3'   // 影子跟读专用
  | 'speak'
  | 'playback'
  | 'compare'
  | 'done'

/** 录音间隔倍率 = segmentDuration × speedMultiplier */
export type SpeedMultiplier = 0.5 | 0.8 | 1.0 | 1.5

/** 阶段分组对应的 pill 样式 */
export type PhaseGroup = 'listen' | 'speak' | 'compare' | 'done'

/** 录音权限状态 */
export type MicPermission = 'unknown' | 'granted' | 'denied'

/** 将 ShadowPhase 映射到 PhaseGroup */
export function getPhaseGroup(phase: ShadowPhase): PhaseGroup {
  switch (phase) {
    case 'listen1':
    case 'listen2':
    case 'listen3':
      return 'listen'
    case 'speak':
      return 'speak'
    case 'playback':
    case 'compare':
      return 'compare'
    case 'done':
      return 'done'
    default:
      return 'listen'
  }
}

/** 速度选项 UI 配置 */
export interface SpeedOption {
  value: SpeedMultiplier
  label: string
  description: string
}

export const SPEED_OPTIONS: SpeedOption[] = [
  { value: 0.5, label: '0.5×', description: '紧凑' },
  { value: 0.8, label: '0.8×', description: '适中' },
  { value: 1.0, label: '1.0×', description: '从容' },
  { value: 1.5, label: '1.5×', description: '宽松' },
]

/** 阶段 pill 显示文本 */
export function getPhaseLabel(phase: ShadowPhase): string {
  switch (phase) {
    case 'listen1':
      return '听第 1 遍'
    case 'listen2':
      return '听第 2 遍'
    case 'listen3':
      return '听第 3 遍'
    case 'speak':
      return '轮到你跟读'
    case 'playback':
      return '听自己的录音'
    case 'compare':
      return '再听 1 遍对照'
    case 'done':
      return '完成 → 下一句'
    default:
      return ''
  }
}
