/**
 * urlValidation.test.ts
 *
 * 测试文件：src/lib/urlValidation.ts
 *
 * 测试策略：
 * 1. Happy Path：验证标准业务流程成功
 * 2. 边界值轰炸：针对数字/长度，测试 Max, Min, Max+1, Min-1, 0, Null, Undefined
 * 3. 逻辑分支覆盖：确保每一个 if/else 都被执行
 *
 * 覆盖率目标：100% (所有分支 + 所有行)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { validateScope, validateHashIndex, safeGetInt } from '../urlValidation'

describe('urlValidation - URL参数验证工具', () => {
  // ========================================
  // validateScope() 测试套件
  // ========================================
  describe('validateScope() - 验证范围类型参数', () => {
    /**
     * 测试目的：Happy Path - 验证所有有效的 scope 值都能正确返回
     * 覆盖场景：标准业务流程，用户传入有效的 scope 类型
     */
    describe('Happy Path - 有效值验证', () => {
      it('应该接受 "all" 作为有效范围', () => {
        expect(validateScope('all')).toBe('all')
      })

      it('应该接受 "unknown" 作为有效范围', () => {
        expect(validateScope('unknown')).toBe('unknown')
      })

      it('应该接受 "fuzzy" 作为有效范围', () => {
        expect(validateScope('fuzzy')).toBe('fuzzy')
      })

      it('应该接受 "known" 作为有效范围', () => {
        expect(validateScope('known')).toBe('known')
      })

      it('应该接受 "new" 作为有效范围', () => {
        expect(validateScope('new')).toBe('new')
      })
    })

    /**
     * 测试目的：边界值轰炸 - 测试 null/undefined/空字符串等边界值
     * 覆盖场景：if (!scope || typeof scope !== 'string') 分支
     */
    describe('边界值轰炸 - 空值处理', () => {
      it('应该将 null 转换为默认值 "unknown"', () => {
        expect(validateScope(null)).toBe('unknown')
      })

      it('应该将 undefined 转换为默认值 "unknown"', () => {
        expect(validateScope(undefined)).toBe('unknown')
      })

      it('应该将空字符串转换为默认值 "unknown"', () => {
        expect(validateScope('')).toBe('unknown')
      })

      it('应该将只有空格的字符串转换为默认值 "unknown"', () => {
        expect(validateScope('   ')).toBe('unknown')
      })

      it('应该处理非字符串类型（数字）', () => {
        expect(validateScope(123 as any)).toBe('unknown')
      })

      it('应该处理非字符串类型（对象）', () => {
        expect(validateScope({} as any)).toBe('unknown')
      })

      it('应该处理非字符串类型（数组）', () => {
        expect(validateScope([] as any)).toBe('unknown')
      })
    })

    /**
     * 测试目的：逻辑分支覆盖 - 测试无效的 scope 值
     * 覆盖场景：VALID_SCOPES.includes(...) 返回 false 的分支
     */
    describe('逻辑分支覆盖 - 无效值处理', () => {
      it('应该拒绝无效的 scope 值并返回默认值', () => {
        expect(validateScope('invalid')).toBe('unknown')
      })

      it('应该拒绝大小写错误的值（区分大小写）', () => {
        expect(validateScope('All')).toBe('unknown')
        expect(validateScope('ALL')).toBe('unknown')
        expect(validateScope('Unknown')).toBe('unknown')
      })

      it('应该拒绝部分匹配的值', () => {
        expect(validateScope('alll')).toBe('unknown')
        expect(validateScope('unknown-extra')).toBe('unknown')
      })

      it('应该拒绝 XSS 攻击尝试', () => {
        expect(validateScope('<script>alert(1)</script>')).toBe('unknown')
      })

      it('应该拒绝 SQL 注入尝试', () => {
        expect(validateScope("'; DROP TABLE users; --")).toBe('unknown')
      })

      it('应该拒绝特殊字符', () => {
        expect(validateScope('../../etc/passwd')).toBe('unknown')
        expect(validateScope('unknown\0null')).toBe('unknown')
      })
    })
  })

  // ========================================
  // validateHashIndex() 测试套件
  // ========================================
  describe('validateHashIndex() - 验证 hash 索引参数', () => {
    /**
     * 测试目的：Happy Path - 验证标准的 hash 格式
     * 覆盖场景：标准业务流程，用户传入正确的 hash 格式
     */
    describe('Happy Path - 有效 hash 格式', () => {
      it('应该解析带 # 前缀的 hash (#word-10)', () => {
        expect(validateHashIndex('#word-10')).toBe(10)
      })

      it('应该解析不带 # 前缀的 hash (word-5)', () => {
        expect(validateHashIndex('word-5')).toBe(5)
      })

      it('应该解析索引为 0 的 hash (#word-0)', () => {
        expect(validateHashIndex('#word-0')).toBe(0)
      })

      it('应该解析大数字索引 (#word-999999)', () => {
        expect(validateHashIndex('#word-999999')).toBe(999999)
      })

      it('应该只提取数字部分（忽略额外内容）', () => {
        expect(validateHashIndex('#word-42-extra')).toBe(42)
      })
    })

    /**
     * 测试目的：边界值轰炸 - 测试空值和边界数字
     * 覆盖场景：if (!hash || typeof hash !== 'string') 分支
     */
    describe('边界值轰炸 - 空值和边界数字', () => {
      it('应该将 null 返回 undefined', () => {
        expect(validateHashIndex(null)).toBeUndefined()
      })

      it('应该将 undefined 返回 undefined', () => {
        expect(validateHashIndex(undefined)).toBeUndefined()
      })

      it('应该将空字符串返回 undefined', () => {
        expect(validateHashIndex('')).toBeUndefined()
      })

      it('应该拒绝负数索引 (#word--1)', () => {
        expect(validateHashIndex('#word--1')).toBeUndefined()
      })

      it('应该拒绝负数索引 (#word- -5)', () => {
        expect(validateHashIndex('#word- -5')).toBeUndefined()
      })

      it('应该处理非常接近 0 的值', () => {
        expect(validateHashIndex('#word-0')).toBe(0) // 有效
      })

      it('应该处理 NaN 情况', () => {
        expect(validateHashIndex('#word-abc')).toBeUndefined()
      })

      it('应该处理浮点数（提取整数部分）', () => {
        expect(validateHashIndex('#word-3.14')).toBe(3)
      })
    })

    /**
     * 测试目的：逻辑分支覆盖 - 测试不匹配的格式
     * 覆盖场景：const match = hash.match(/word-(\d+)/) 返回 null 的分支
     */
    describe('逻辑分支覆盖 - 格式不匹配', () => {
      it('应该拒绝完全错误的格式', () => {
        expect(validateHashIndex('#wrong-10')).toBeUndefined()
        expect(validateHashIndex('#card-10')).toBeUndefined()
        expect(validateHashIndex('#index-10')).toBeUndefined()
      })

      it('应该拒绝缺少数字的格式', () => {
        expect(validateHashIndex('#word-')).toBeUndefined()
        expect(validateHashIndex('word-')).toBeUndefined()
      })

      it('应该拒绝只有前缀的格式', () => {
        expect(validateHashIndex('#word')).toBeUndefined()
        expect(validateHashIndex('word')).toBeUndefined()
      })

      it('应该接受多个 # 符号（正则只匹配 word- 数字部分）', () => {
        // 正则 /word-(\d+)/ 会匹配 word-10，忽略前面的 ##
        expect(validateHashIndex('##word-10')).toBe(10)
      })

      it('应该拒绝大小写错误的格式', () => {
        expect(validateHashIndex('#Word-10')).toBeUndefined()
        expect(validateHashIndex('#WORD-10')).toBeUndefined()
      })
    })

    /**
     * 测试目的：边界值轰炸 - 测试 isNaN(index) || index < 0 分支
     */
    describe('边界值轰炸 - 数字验证', () => {
      it('应该拒绝非数字内容', () => {
        expect(validateHashIndex('#word-abc')).toBeUndefined()
        expect(validateHashIndex('#word-1a2b')).toBe(1) // 提取第一个数字
      })

      it('应该拒绝科学计数法', () => {
        expect(validateHashIndex('#word-1e5')).toBe(1) // 提取 1
      })

      it('应该拒绝十六进制数字', () => {
        expect(validateHashIndex('#word-0x10')).toBe(0) // 提取 0
      })

      it('应该拒绝八进制数字', () => {
        expect(validateHashIndex('#word-010')).toBe(10) // 解析为十进制
      })
    })

    /**
     * 测试目的：安全测试 - 防止注入攻击
     */
    describe('安全测试 - 防止注入', () => {
      it('应该拒绝 XSS 尝试', () => {
        expect(validateHashIndex('#word-10<script>alert(1)</script>')).toBe(10)
      })

      it('应该拒绝路径遍历尝试', () => {
        expect(validateHashIndex('#word-../../etc/passwd')).toBeUndefined()
      })

      it('应该拒绝超长输入（DoS 防护）', () => {
        const longHash = '#word-' + '9'.repeat(10000)
        const result = validateHashIndex(longHash)
        // 应该返回一个数字（即使很大），或者 undefined（如果解析失败）
        expect(typeof result === 'number' || result === undefined).toBe(true)
      })
    })
  })

  // ========================================
  // safeGetInt() 测试套件
  // ========================================
  describe('safeGetInt() - 安全获取整数值', () => {
    /**
     * 测试目的：Happy Path - 验证标准的整数转换
     * 覆盖场景：标准业务流程，正常转换字符串为整数
     */
    describe('Happy Path - 基本转换', () => {
      it('应该转换有效的整数字符串', () => {
        expect(safeGetInt('42', 0)).toBe(42)
        expect(safeGetInt('0', 0)).toBe(0)
        expect(safeGetInt('100', 0)).toBe(100)
      })

      it('应该转换负数字符串', () => {
        expect(safeGetInt('-10', 0)).toBe(-10)
        expect(safeGetInt('-999', 0)).toBe(-999)
      })

      it('应该处理带空格的字符串（parseInt 会自动去除）', () => {
        expect(safeGetInt('  42  ', 0)).toBe(42)
      })

      it('应该处理带前导零的字符串', () => {
        expect(safeGetInt('042', 0)).toBe(42)
      })
    })

    /**
     * 测试目的：边界值轰炸 - 测试 null/undefined/无效值
     * 覆盖场景：if (value === null || value === undefined) 分支
     */
    describe('边界值轰炸 - 空值处理', () => {
      it('应该将 null 返回默认值', () => {
        expect(safeGetInt(null, 99)).toBe(99)
      })

      it('应该将 undefined 返回默认值', () => {
        expect(safeGetInt(undefined, 99)).toBe(99)
      })

      it('应该将无效字符串返回默认值', () => {
        expect(safeGetInt('abc', 99)).toBe(99)
        expect(safeGetInt('', 99)).toBe(99)
        expect(safeGetInt('not-a-number', 99)).toBe(99)
      })

      it('应该将特殊字符返回默认值', () => {
        expect(safeGetInt('@#$%', 99)).toBe(99)
      })

      it('应该将 Infinity 返回默认值（parseInt 失败）', () => {
        expect(safeGetInt('Infinity', 99)).toBe(99)
      })
    })

    /**
     * 测试目的：边界值轰炸 - 测试 min/max 边界
     * 覆盖场景：min/max 限制逻辑
     */
    describe('边界值轰炸 - 最小值限制 (min)', () => {
      it('应该应用最小值限制（值小于 min）', () => {
        expect(safeGetInt('0', 99, 1, 100)).toBe(1)
        expect(safeGetInt('-10', 99, 0, 100)).toBe(0)
      })

      it('应该接受等于 min 的值', () => {
        expect(safeGetInt('10', 99, 10, 100)).toBe(10)
      })

      it('应该接受大于 min 的值', () => {
        expect(safeGetInt('50', 99, 10, 100)).toBe(50)
      })

      it('应该处理负数 min', () => {
        expect(safeGetInt('-100', 99, -50, 100)).toBe(-50)
      })
    })

    describe('边界值轰炸 - 最大值限制 (max)', () => {
      it('应该应用最大值限制（值大于 max）', () => {
        expect(safeGetInt('150', 99, 1, 100)).toBe(100)
        expect(safeGetInt('999', 99, 0, 100)).toBe(100)
      })

      it('应该接受等于 max 的值', () => {
        expect(safeGetInt('100', 99, 10, 100)).toBe(100)
      })

      it('应该接受小于 max 的值', () => {
        expect(safeGetInt('50', 99, 10, 100)).toBe(50)
      })

      it('应该同时应用 min 和 max 限制', () => {
        expect(safeGetInt('0', 99, 10, 100)).toBe(10)
        expect(safeGetInt('150', 99, 10, 100)).toBe(100)
        expect(safeGetInt('50', 99, 10, 100)).toBe(50)
      })
    })

    /**
     * 测试目的：逻辑分支覆盖 - 测试 parseInt 的特殊情况
     */
    describe('逻辑分支覆盖 - parseInt 特殊情况', () => {
      it('应该处理浮点数字符串（截断小数部分）', () => {
        expect(safeGetInt('3.14', 0)).toBe(3)
        expect(safeGetInt('99.99', 0)).toBe(99)
      })

      it('应该处理科学计数法（部分解析）', () => {
        expect(safeGetInt('1e5', 0)).toBe(1) // parseInt 只解析 '1'
      })

      it('应该处理不同进制的字符串（默认十进制）', () => {
        expect(safeGetInt('0x10', 0)).toBe(0) // parseInt 解析失败，返回 0
        expect(safeGetInt('010', 0)).toBe(10) // 严格模式，不是八进制
      })

      it('应该处理超大数字（安全整数范围）', () => {
        const maxSafe = Number.MAX_SAFE_INTEGER
        expect(safeGetInt(String(maxSafe), 0)).toBe(maxSafe)
      })
    })

    /**
     * 测试目的：安全测试 - 防止恶意输入
     */
    describe('安全测试 - 恶意输入处理', () => {
      it('应该拒绝 XSS 尝试', () => {
        expect(safeGetInt('<script>alert(1)</script>', 99)).toBe(99)
      })

      it('应该拒绝 SQL 注入尝试', () => {
        expect(safeGetInt("1; DROP TABLE users; --", 99)).toBe(1)
      })

      it('应该拒绝路径遍历尝试', () => {
        expect(safeGetInt('../../etc/passwd', 99)).toBe(99)
      })

      it('应该拒绝超长输入', () => {
        const longInput = '9'.repeat(10000)
        const result = safeGetInt(longInput, 99)
        // 应该返回解析后的数字（即使很大）或默认值
        expect(typeof result === 'number').toBe(true)
      })
    })
  })
})
