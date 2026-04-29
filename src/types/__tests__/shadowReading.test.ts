import { describe, it, expect } from 'vitest'
import {
  getPhaseGroup,
  getPhaseLabel,
  SPEED_OPTIONS,
  type ShadowPhase,
  type PhaseGroup,
} from '../shadowReading'

describe('shadowReading - 类型工具函数', () => {
  // ========================================
  // getPhaseGroup()
  // ========================================
  describe('getPhaseGroup() - 阶段分组映射', () => {
    it('listen1 → listen', () => {
      expect(getPhaseGroup('listen1')).toBe('listen')
    })

    it('listen2 → listen', () => {
      expect(getPhaseGroup('listen2')).toBe('listen')
    })

    it('listen3 → listen', () => {
      expect(getPhaseGroup('listen3')).toBe('listen')
    })

    it('speak → speak', () => {
      expect(getPhaseGroup('speak')).toBe('speak')
    })

    it('playback → compare', () => {
      expect(getPhaseGroup('playback')).toBe('compare')
    })

    it('compare → compare', () => {
      expect(getPhaseGroup('compare')).toBe('compare')
    })

    it('done → done', () => {
      expect(getPhaseGroup('done')).toBe('done')
    })

    it('idle → listen (default fallback)', () => {
      expect(getPhaseGroup('idle')).toBe('listen')
    })
  })

  // ========================================
  // getPhaseLabel()
  // ========================================
  describe('getPhaseLabel() - 阶段显示文本', () => {
    it('listen1 → "听第 1 遍"', () => {
      expect(getPhaseLabel('listen1')).toBe('听第 1 遍')
    })

    it('listen2 → "听第 2 遍"', () => {
      expect(getPhaseLabel('listen2')).toBe('听第 2 遍')
    })

    it('listen3 → "听第 3 遍"', () => {
      expect(getPhaseLabel('listen3')).toBe('听第 3 遍')
    })

    it('speak → "轮到你跟读"', () => {
      expect(getPhaseLabel('speak')).toBe('轮到你跟读')
    })

    it('playback → "听自己的录音"', () => {
      expect(getPhaseLabel('playback')).toBe('听自己的录音')
    })

    it('compare → "再听 1 遍对照"', () => {
      expect(getPhaseLabel('compare')).toBe('再听 1 遍对照')
    })

    it('done → "完成 → 下一句"', () => {
      expect(getPhaseLabel('done')).toBe('完成 → 下一句')
    })

    it('idle → "" (空字符串)', () => {
      expect(getPhaseLabel('idle')).toBe('')
    })
  })

  // ========================================
  // SPEED_OPTIONS 常量
  // ========================================
  describe('SPEED_OPTIONS - 速度选项', () => {
    it('应该有 4 个速度选项', () => {
      expect(SPEED_OPTIONS).toHaveLength(4)
    })

    it('值应该按升序排列', () => {
      const values = SPEED_OPTIONS.map(o => o.value)
      for (let i = 1; i < values.length; i++) {
        expect(values[i]).toBeGreaterThan(values[i - 1])
      }
    })

    it('每个选项都有 value, label, description', () => {
      SPEED_OPTIONS.forEach(option => {
        expect(option).toHaveProperty('value')
        expect(option).toHaveProperty('label')
        expect(option).toHaveProperty('description')
        expect(typeof option.value).toBe('number')
        expect(typeof option.label).toBe('string')
        expect(typeof option.description).toBe('string')
      })
    })

    it('包含 0.5, 0.8, 1.0, 1.5 四个倍率', () => {
      const values = SPEED_OPTIONS.map(o => o.value)
      expect(values).toContain(0.5)
      expect(values).toContain(0.8)
      expect(values).toContain(1.0)
      expect(values).toContain(1.5)
    })
  })

  // ========================================
  // 类型完整性编译时验证
  // ========================================
  describe('类型系统完整性', () => {
    it('ShadowPhase 覆盖所有 8 种阶段', () => {
      const allPhases: ShadowPhase[] = [
        'idle', 'listen1', 'listen2', 'listen3',
        'speak', 'playback', 'compare', 'done',
      ]
      // 确保每个阶段都有对应的 group 和 label
      allPhases.forEach(phase => {
        const group: PhaseGroup = getPhaseGroup(phase)
        expect(['listen', 'speak', 'compare', 'done']).toContain(group)
      })
    })
  })
})
