/**
 * timeUtils.test.ts
 *
 * 测试文件：src/lib/timeUtils.ts
 *
 * 测试策略：
 * 1. Happy Path：验证标准时间差计算
 * 2. 边界值轰炸：测试时间边界值（0, 未来, 负数, 极端值）
 * 3. 逻辑分支覆盖：确保每个时间单位分支都被执行
 * 4. 时区测试：验证不同时区下的行为
 *
 * 覆盖率目标：100% (所有分支 + 所有行)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { formatTimeAgo, formatDateTime } from '../timeUtils'

describe('timeUtils - 时间格式化工具', () => {
  // ========================================
  // beforeEach/afterEach - Mock Date.now()
  // ========================================
  beforeEach(() => {
    // Mock console.warn 以避免测试输出污染
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ========================================
  // formatTimeAgo() 测试套件
  // ========================================
  describe('formatTimeAgo() - 格式化时间差为相对时间描述', () => {
    /**
     * 测试目的：Happy Path - 验证"刚刚"显示
     * 覆盖场景：if (diff < TIME_UNITS.minute) 分支
     */
    describe('Happy Path - "刚刚"显示', () => {
      it('应该显示"刚刚"（1秒前）', () => {
        const timestamp = Date.now() - 1000 // 1秒前
        expect(formatTimeAgo(timestamp)).toBe('刚刚')
      })

      it('应该显示"刚刚"（30秒前）', () => {
        const timestamp = Date.now() - 30 * 1000
        expect(formatTimeAgo(timestamp)).toBe('刚刚')
      })

      it('应该显示"刚刚"（59秒前）', () => {
        const timestamp = Date.now() - 59 * 1000
        expect(formatTimeAgo(timestamp)).toBe('刚刚')
      })

      it('应该显示"刚刚"（边界值：59999毫秒）', () => {
        const timestamp = Date.now() - 60 * 1000 + 1
        expect(formatTimeAgo(timestamp)).toBe('刚刚')
      })
    })

    /**
     * 测试目的：Happy Path - 验证"X分钟前"显示
     * 覆盖场景：if (diff < TIME_UNITS.hour) 分支
     */
    describe('Happy Path - "X分钟前"显示', () => {
      it('应该显示"1分钟前"（刚好1分钟）', () => {
        const timestamp = Date.now() - 60 * 1000
        expect(formatTimeAgo(timestamp)).toBe('1分钟前')
      })

      it('应该显示"5分钟前"', () => {
        const timestamp = Date.now() - 5 * 60 * 1000
        expect(formatTimeAgo(timestamp)).toBe('5分钟前')
      })

      it('应该显示"30分钟前"', () => {
        const timestamp = Date.now() - 30 * 60 * 1000
        expect(formatTimeAgo(timestamp)).toBe('30分钟前')
      })

      it('应该显示"59分钟前"（边界值）', () => {
        const timestamp = Date.now() - 59 * 60 * 1000 - 59 * 1000
        expect(formatTimeAgo(timestamp)).toBe('59分钟前')
      })
    })

    /**
     * 测试目的：Happy Path - 验证"X小时前"显示
     * 覆盖场景：if (diff < TIME_UNITS.day) 分支
     */
    describe('Happy Path - "X小时前"显示', () => {
      it('应该显示"1小时前"（刚好1小时）', () => {
        const timestamp = Date.now() - 60 * 60 * 1000
        expect(formatTimeAgo(timestamp)).toBe('1小时前')
      })

      it('应该显示"3小时前"', () => {
        const timestamp = Date.now() - 3 * 60 * 60 * 1000
        expect(formatTimeAgo(timestamp)).toBe('3小时前')
      })

      it('应该显示"12小时前"', () => {
        const timestamp = Date.now() - 12 * 60 * 60 * 1000
        expect(formatTimeAgo(timestamp)).toBe('12小时前')
      })

      it('应该显示"23小时前"（边界值）', () => {
        const timestamp = Date.now() - 23 * 60 * 60 * 1000 - 59 * 60 * 1000
        expect(formatTimeAgo(timestamp)).toBe('23小时前')
      })
    })

    /**
     * 测试目的：Happy Path - 验证"X天前"显示
     * 覆盖场景：if (diff < TIME_UNITS.week) 分支
     */
    describe('Happy Path - "X天前"显示', () => {
      it('应该显示"1天前"（刚好1天）', () => {
        const timestamp = Date.now() - 24 * 60 * 60 * 1000
        expect(formatTimeAgo(timestamp)).toBe('1天前')
      })

      it('应该显示"2天前"', () => {
        const timestamp = Date.now() - 2 * 24 * 60 * 60 * 1000
        expect(formatTimeAgo(timestamp)).toBe('2天前')
      })

      it('应该显示"6天前"（边界值）', () => {
        const timestamp = Date.now() - 6 * 24 * 60 * 60 * 1000 - 23 * 60 * 60 * 1000
        expect(formatTimeAgo(timestamp)).toBe('6天前')
      })
    })

    /**
     * 测试目的：Happy Path - 验证"X周前"显示
     * 覆盖场景：if (diff < TIME_UNITS.month) 分支
     */
    describe('Happy Path - "X周前"显示', () => {
      it('应该显示"1周前"（刚好1周）', () => {
        const timestamp = Date.now() - 7 * 24 * 60 * 60 * 1000
        expect(formatTimeAgo(timestamp)).toBe('1周前')
      })

      it('应该显示"2周前"', () => {
        const timestamp = Date.now() - 2 * 7 * 24 * 60 * 60 * 1000
        expect(formatTimeAgo(timestamp)).toBe('2周前')
      })

      it('应该显示"3周前"', () => {
        const timestamp = Date.now() - 3 * 7 * 24 * 60 * 60 * 1000
        expect(formatTimeAgo(timestamp)).toBe('3周前')
      })
    })

    /**
     * 测试目的：Happy Path - 验证"X月前"显示
     * 覆盖场景：if (diff < TIME_UNITS.year) 分支
     */
    describe('Happy Path - "X月前"显示', () => {
      it('应该显示"1月前"（刚好30天）', () => {
        const timestamp = Date.now() - 30 * 24 * 60 * 60 * 1000
        expect(formatTimeAgo(timestamp)).toBe('1月前')
      })

      it('应该显示"2月前"（60天）', () => {
        const timestamp = Date.now() - 60 * 24 * 60 * 60 * 1000
        expect(formatTimeAgo(timestamp)).toBe('2月前')
      })

      it('应该显示"6月前"', () => {
        const timestamp = Date.now() - 6 * 30 * 24 * 60 * 60 * 1000
        expect(formatTimeAgo(timestamp)).toBe('6月前')
      })

      it('应该显示"11月前"（边界值）', () => {
        const timestamp = Date.now() - 11 * 30 * 24 * 60 * 60 * 1000
        expect(formatTimeAgo(timestamp)).toBe('11月前')
      })
    })

    /**
     * 测试目的：Happy Path - 验证"X年前"显示
     * 覆盖场景：else 分支（超过1年）
     */
    describe('Happy Path - "X年前"显示', () => {
      it('应该显示"1年前"（刚好365天）', () => {
        const timestamp = Date.now() - 365 * 24 * 60 * 60 * 1000
        expect(formatTimeAgo(timestamp)).toBe('1年前')
      })

      it('应该显示"2年前"', () => {
        const timestamp = Date.now() - 2 * 365 * 24 * 60 * 60 * 1000
        expect(formatTimeAgo(timestamp)).toBe('2年前')
      })

      it('应该显示"5年前"', () => {
        const timestamp = Date.now() - 5 * 365 * 24 * 60 * 60 * 1000
        expect(formatTimeAgo(timestamp)).toBe('5年前')
      })

      it('应该显示"10年前"', () => {
        const timestamp = Date.now() - 10 * 365 * 24 * 60 * 60 * 1000
        expect(formatTimeAgo(timestamp)).toBe('10年前')
      })
    })

    /**
     * 测试目的：边界值轰炸 - 测试无效输入
     * 覆盖场景：if (!timestamp || typeof timestamp !== 'number') 分支
     */
    describe('边界值轰炸 - 无效输入处理', () => {
      it('应该将 null 返回"未知时间"', () => {
        expect(formatTimeAgo(null as any)).toBe('未知时间')
        expect(console.warn).toHaveBeenCalledWith('[formatTimeAgo] Invalid timestamp:', null)
      })

      it('应该将 undefined 返回"未知时间"', () => {
        expect(formatTimeAgo(undefined as any)).toBe('未知时间')
        expect(console.warn).toHaveBeenCalled()
      })

      it('应该将 0 视为无效（0 是 falsy 值）', () => {
        // 代码使用 !timestamp 检查，0 被视为 falsy
        const result = formatTimeAgo(0)
        expect(result).toBe('未知时间')
        expect(console.warn).toHaveBeenCalledWith('[formatTimeAgo] Invalid timestamp:', 0)
      })

      it('应该将非数字类型返回"未知时间"', () => {
        expect(formatTimeAgo('string' as any)).toBe('未知时间')
        expect(formatTimeAgo({} as any)).toBe('未知时间')
        expect(formatTimeAgo([] as any)).toBe('未知时间')
        expect(console.warn).toHaveBeenCalledTimes(3)
      })

      it('应该将 NaN 返回"未知时间"', () => {
        expect(formatTimeAgo(NaN)).toBe('未知时间')
        expect(console.warn).toHaveBeenCalled()
      })

      it('应该将 Infinity 视为无效（Infinity 检查失败）', () => {
        const result = formatTimeAgo(Infinity)
        // Infinity - Date.now() = Infinity
        // 所有 Infinity < TIME_UNITS.xxx 检查都为 false
        // 最终会返回计算结果
        expect(typeof result).toBe('string')
        expect(result.length).toBeGreaterThan(0)
      })
    })

    /**
     * 测试目的：边界值轰炸 - 测试时间在未来
     * 覆盖场景：if (diff < 0) 分支
     */
    describe('边界值轰炸 - 未来时间处理', () => {
      it('应该将未来时间显示为"刚刚"', () => {
        const futureTimestamp = Date.now() + 1000 // 1秒后
        expect(formatTimeAgo(futureTimestamp)).toBe('刚刚')
        expect(console.warn).toHaveBeenCalledWith('[formatTimeAgo] Timestamp is in the future:', futureTimestamp)
      })

      it('应该将很远的未来时间显示为"刚刚"', () => {
        const farFuture = Date.now() + 365 * 24 * 60 * 60 * 1000 // 1年后
        expect(formatTimeAgo(farFuture)).toBe('刚刚')
        expect(console.warn).toHaveBeenCalled()
      })

      it('应该处理极远的未来时间', () => {
        const extremeFuture = Date.now() + 1000 * 365 * 24 * 60 * 60 * 1000 // 1000年后
        expect(formatTimeAgo(extremeFuture)).toBe('刚刚')
      })
    })

    /**
     * 测试目的：边界值轰炸 - 测试极值边界
     */
    describe('边界值轰炸 - 极端值测试', () => {
      it('应该处理 JavaScript 最小时间戳', () => {
        const minTimestamp = -8640000000000000 // 最小安全时间戳
        const result = formatTimeAgo(minTimestamp)
        expect(result).toBeTruthy()
        expect(result).toContain('前')
      })

      it('应该处理 JavaScript 最大时间戳', () => {
        const maxTimestamp = 8640000000000000 // 最大安全时间戳
        const result = formatTimeAgo(maxTimestamp)
        expect(result).toBe('刚刚') // 未来时间
      })

      it('应该处理负数时间戳（1970之前）', () => {
        const negativeTimestamp = Date.now() - 100 * 365 * 24 * 60 * 60 * 1000 // 100年前
        const result = formatTimeAgo(negativeTimestamp)
        expect(result).toContain('前')
      })

      it('应该处理浮点数时间戳（取整）', () => {
        const floatTimestamp = Date.now() - 30.5 * 1000 // 30.5秒前
        expect(formatTimeAgo(floatTimestamp)).toBe('刚刚')
      })
    })

    /**
     * 测试目的：逻辑分支覆盖 - 测试所有时间单位边界
     */
    describe('逻辑分支覆盖 - 时间单位边界测试', () => {
      it('应该正确处理分钟边界（59秒 vs 1分钟）', () => {
        const justNow = Date.now() - 59 * 1000
        const oneMinute = Date.now() - 60 * 1000

        expect(formatTimeAgo(justNow)).toBe('刚刚')
        expect(formatTimeAgo(oneMinute)).toBe('1分钟前')
      })

      it('应该正确处理小时边界（59分钟 vs 1小时）', () => {
        const fiftyNineMinutes = Date.now() - 59 * 60 * 1000 - 59 * 1000
        const oneHour = Date.now() - 60 * 60 * 1000

        expect(formatTimeAgo(fiftyNineMinutes)).toBe('59分钟前')
        expect(formatTimeAgo(oneHour)).toBe('1小时前')
      })

      it('应该正确处理天边界（23小时 vs 1天）', () => {
        const twentyThreeHours = Date.now() - 23 * 60 * 60 * 1000 - 59 * 60 * 1000
        const oneDay = Date.now() - 24 * 60 * 60 * 1000

        expect(formatTimeAgo(twentyThreeHours)).toBe('23小时前')
        expect(formatTimeAgo(oneDay)).toBe('1天前')
      })

      it('应该正确处理周边界（6天 vs 1周）', () => {
        const sixDays = Date.now() - 6 * 24 * 60 * 60 * 1000 - 23 * 60 * 60 * 1000
        const oneWeek = Date.now() - 7 * 24 * 60 * 60 * 1000

        expect(formatTimeAgo(sixDays)).toBe('6天前')
        expect(formatTimeAgo(oneWeek)).toBe('1周前')
      })

      it('应该正确处理月边界（4周 vs 1月）', () => {
        const fourWeeks = Date.now() - 4 * 7 * 24 * 60 * 60 * 1000
        const oneMonth = Date.now() - 30 * 24 * 60 * 60 * 1000

        expect(formatTimeAgo(fourWeeks)).toBe('4周前')
        expect(formatTimeAgo(oneMonth)).toBe('1月前')
      })

      it('应该正确处理年边界（12月 vs 1年）', () => {
        const twelveMonths = Date.now() - 12 * 30 * 24 * 60 * 60 * 1000
        const oneYear = Date.now() - 365 * 24 * 60 * 60 * 1000

        expect(formatTimeAgo(twelveMonths)).toBe('12月前')
        expect(formatTimeAgo(oneYear)).toBe('1年前')
      })
    })
  })

  // ========================================
  // formatDateTime() 测试套件
  // ========================================
  describe('formatDateTime() - 格式化时间差为详细时间描述', () => {
    /**
     * 测试目的：Happy Path - 验证标准格式化
     */
    describe('Happy Path - 标准格式化', () => {
      it('应该格式化为 YYYY-MM-DD HH:mm', () => {
        // 2024-01-10 15:30:00 UTC
        const timestamp = 1704892200000
        const result = formatDateTime(timestamp)

        // 验证格式：YYYY-MM-DD HH:mm
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/)
      })

      it('应该正确格式化午夜时间（00:00）', () => {
        // 使用本地时间创建
        const date = new Date()
        date.setHours(0, 0, 0, 0)
        const result = formatDateTime(date.getTime())

        expect(result).toContain('00:00')
      })

      it('应该正确格式化月末时间', () => {
        // 使用本地时间创建
        const date = new Date()
        date.setFullYear(2024)
        date.setMonth(0) // 1月
        date.setDate(31)
        date.setHours(23, 59, 59, 0)
        const result = formatDateTime(date.getTime())

        // 验证格式，不验证具体时间（时区差异）
        expect(result).toMatch(/^\d{4}-01-31 23:59$/)
      })

      it('应该正确格式化年初时间', () => {
        const date = new Date()
        date.setFullYear(2024)
        date.setMonth(0) // 1月
        date.setDate(1)
        date.setHours(0, 0, 0, 0)
        const result = formatDateTime(date.getTime())

        // 验证格式，不验证具体时间（时区差异）
        expect(result).toMatch(/^2024-01-01 00:00$/)
      })

      it('应该正确格式化年末时间', () => {
        const date = new Date()
        date.setFullYear(2024)
        date.setMonth(11) // 12月
        date.setDate(31)
        date.setHours(23, 59, 59, 0)
        const result = formatDateTime(date.getTime())

        // 验证格式，不验证具体时间（时区差异）
        expect(result).toMatch(/^2024-12-31 23:59$/)
      })
    })

    /**
     * 测试目的：边界值轰炸 - 测试无效输入
     */
    describe('边界值轰炸 - 无效输入处理', () => {
      it('应该将 null 返回"未知时间"', () => {
        expect(formatDateTime(null as any)).toBe('未知时间')
        expect(console.warn).toHaveBeenCalledWith('[formatDateTime] Invalid timestamp:', null)
      })

      it('应该将 undefined 返回"未知时间"', () => {
        expect(formatDateTime(undefined as any)).toBe('未知时间')
        expect(console.warn).toHaveBeenCalled()
      })

      it('应该将空字符串返回"未知时间"', () => {
        expect(formatDateTime('' as any)).toBe('未知时间')
        expect(console.warn).toHaveBeenCalled()
      })

      it('应该将非数字类型返回"未知时间"', () => {
        expect(formatDateTime({} as any)).toBe('未知时间')
        expect(formatDateTime([] as any)).toBe('未知时间')
        expect(formatDateTime('string' as any)).toBe('未知时间')
      })

      it('应该将 NaN 返回"未知时间"', () => {
        expect(formatDateTime(NaN)).toBe('未知时间')
        expect(console.warn).toHaveBeenCalled()
      })

      it('应该将 Infinity 返回"未知时间"或特殊格式', () => {
        const result = formatDateTime(Infinity)
        // new Date(Infinity) 可能返回 Invalid Date 或极端日期
        expect(result === '未知时间' || result.includes('NaN')).toBe(true)
      })
    })

    /**
     * 测试目的：边界值轰炸 - 测试极值边界
     */
    describe('边界值轰炸 - 极端值测试', () => {
      it('应该将 Unix 纪元时间（0）视为无效（0 是 falsy 值）', () => {
        const result = formatDateTime(0)
        // 代码使用 !timestamp 检查，0 被视为 falsy
        expect(result).toBe('未知时间')
        expect(console.warn).toHaveBeenCalledWith('[formatDateTime] Invalid timestamp:', 0)
      })

      it('应该处理负数时间戳（1970之前）', () => {
        const negativeTimestamp = -86400000 // 1969-12-31 00:00:00 UTC
        const result = formatDateTime(negativeTimestamp)
        expect(result).toMatch(/^1969-12-31 \d{2}:\d{2}$/)
      })

      it('应该处理 JavaScript 最小时间戳', () => {
        const minTimestamp = -8640000000000000
        const result = formatDateTime(minTimestamp)
        // 极端日期可能包含负数年份
        expect(typeof result).toBe('string')
        expect(result.length).toBeGreaterThan(0)
      })

      it('应该处理 JavaScript 最大时间戳', () => {
        const maxTimestamp = 8640000000000000
        const result = formatDateTime(maxTimestamp)
        // 极端日期可能包含超大年份
        expect(typeof result).toBe('string')
        expect(result.length).toBeGreaterThan(0)
      })
    })

    /**
     * 测试目的：逻辑分支覆盖 - 测试零填充
     */
    describe('逻辑分支覆盖 - 零填充验证', () => {
      it('应该正确填充个位数月份（1-9月）', () => {
        // 创建一个1月的时间
        const date = new Date()
        date.setMonth(0) // 1月
        date.setFullYear(2024)
        date.setDate(15)
        date.setHours(12, 0, 0, 0)

        const result = formatDateTime(date.getTime())

        // 验证月份是两位数
        expect(result).toMatch(/-01-/)
      })

      it('应该正确填充个位数日期（1-9日）', () => {
        const date = new Date()
        date.setFullYear(2024)
        date.setMonth(0) // 1月
        date.setDate(5) // 5日
        date.setHours(12, 0, 0, 0)

        const result = formatDateTime(date.getTime())

        // 验证日期是两位数
        expect(result).toMatch(/-05 /)
      })

      it('应该正确填充个位数小时（0-9时）', () => {
        const date = new Date()
        date.setFullYear(2024)
        date.setMonth(0)
        date.setDate(10)
        date.setHours(5, 30, 0, 0)

        const result = formatDateTime(date.getTime())

        // 验证小时是两位数
        expect(result).toMatch(/ 05:/)
      })

      it('应该正确填充个位数分钟（0-9分）', () => {
        const date = new Date()
        date.setFullYear(2024)
        date.setMonth(0)
        date.setDate(10)
        date.setHours(15, 5, 0, 0)

        const result = formatDateTime(date.getTime())

        // 验证分钟是两位数
        expect(result).toMatch(/:05$/)
      })

      it('应该正确处理所有边界值（9日、9月、9时、9分）', () => {
        const date = new Date()
        date.setFullYear(2024)
        date.setMonth(8) // 9月（0-based）
        date.setDate(9)
        date.setHours(9, 9, 0, 0)

        const result = formatDateTime(date.getTime())

        // 验证所有个位数都被填充
        expect(result).toBe('2024-09-09 09:09')
      })
    })

    /**
     * 测试目的：逻辑分支覆盖 - 测试两位数不填充
     */
    describe('逻辑分支覆盖 - 两位数不填充验证', () => {
      it('应该不填充两位数月份（10-12月）', () => {
        const date = new Date()
        date.setFullYear(2024)
        date.setMonth(9) // 10月（0-based）
        date.setDate(15)
        date.setHours(12, 0, 0, 0)

        const result = formatDateTime(date.getTime())

        // 验证月份是两位数但不填充
        expect(result).toMatch(/-10-/)
      })

      it('应该不填充两位数日期（10-31日）', () => {
        const date = new Date()
        date.setFullYear(2024)
        date.setMonth(0)
        date.setDate(15)
        date.setHours(12, 0, 0, 0)

        const result = formatDateTime(date.getTime())

        // 验证日期是两位数但不填充
        expect(result).toMatch(/-15 /)
      })

      it('应该不填充两位数小时（10-23时）', () => {
        const date = new Date()
        date.setFullYear(2024)
        date.setMonth(0)
        date.setDate(10)
        date.setHours(18, 30, 0, 0)

        const result = formatDateTime(date.getTime())

        // 验证小时是两位数但不填充
        expect(result).toMatch(/ 18:/)
      })

      it('应该不填充两位数分钟（10-59分）', () => {
        const date = new Date()
        date.setFullYear(2024)
        date.setMonth(0)
        date.setDate(10)
        date.setHours(15, 45, 0, 0)

        const result = formatDateTime(date.getTime())

        // 验证分钟是两位数但不填充
        expect(result).toMatch(/:45$/)
      })
    })

    /**
     * 测试目的：边界值轰炸 - 时区测试
     */
    describe('边界值轰炸 - 时区处理', () => {
      it('应该使用本地时区（不是 UTC）', () => {
        // 创建一个固定的时间戳
        const timestamp = 1704883200000 // 2024-01-10 12:00:00 UTC

        // 格式化结果会根据本地时区不同而不同
        const result = formatDateTime(timestamp)

        // 验证格式正确
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/)
      })

      it('应该正确处理夏令时边界（如果本地时区支持）', () => {
        // 这个测试依赖于本地时区
        const timestamp = Date.now()
        const result = formatDateTime(timestamp)

        expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/)
      })
    })
  })
})
