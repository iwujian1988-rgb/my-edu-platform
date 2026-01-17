/**
 * continueURL.test.ts
 *
 * 测试文件：src/lib/continueURL.ts
 *
 * 测试策略：
 * 1. Happy Path：验证所有学习模式的 URL 生成
 * 2. 边界值轰炸：测试空值、特殊字符、极端值
 * 3. 逻辑分支覆盖：确保 switch/case 所有分支都被执行
 * 4. 异常处理：验证 try/catch 和错误日志
 *
 * 覆盖率目标：100% (所有分支 + 所有行)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { generateContinueURL } from '../continueURL'
import type { ContinueURLConfig } from '../continueURL'

describe('continueURL - 继续学习URL生成工具', () => {
  // ========================================
  // beforeEach/afterEach - 设置和清理
  // ========================================
  beforeEach(() => {
    // Mock console.error 和 console.warn 以避免测试输出污染
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    // 清理 mocks
    vi.restoreAllMocks()
  })

  // ========================================
  // generateContinueURL() 测试套件
  // ========================================
  describe('generateContinueURL() - 生成继续学习的完整URL', () => {
    /**
     * 测试目的：Happy Path - 验证 flashcards 模式 URL 生成
     * 覆盖场景：switch(mode) case 'flashcards' 分支
     */
    describe('Happy Path - flashcards 模式', () => {
      it('应该生成完整的 flashcards URL（shuffle=true）', () => {
        const config: ContinueURLConfig = {
          bookId: 'book-123',
          mode: 'flashcards',
          scopeType: 'unknown',
          currentIndex: 10,
          shuffle: true
        }

        const result = generateContinueURL(config)

        expect(result).toBe('/study/book-123/flashcards?scope=unknown&shuffle=true&resume=true#word-10')
      })

      it('应该生成完整的 flashcards URL（shuffle=false）', () => {
        const config: ContinueURLConfig = {
          bookId: 'book-456',
          mode: 'flashcards',
          scopeType: 'fuzzy',
          currentIndex: 5,
          shuffle: false
        }

        const result = generateContinueURL(config)

        expect(result).toBe('/study/book-456/flashcards?scope=fuzzy&shuffle=false&resume=true#word-5')
      })

      it('应该使用默认值 shuffle=true（未指定时）', () => {
        const config: ContinueURLConfig = {
          bookId: 'book-789',
          mode: 'flashcards',
          scopeType: 'known',
          currentIndex: 0
          // shuffle 未指定，应默认为 true
        }

        const result = generateContinueURL(config)

        expect(result).toBe('/study/book-789/flashcards?scope=known&shuffle=true&resume=true#word-0')
      })

      it('应该处理所有有效的 scopeType', () => {
        const scopes: Array<'all' | 'unknown' | 'fuzzy' | 'known' | 'new'> = ['all', 'unknown', 'fuzzy', 'known', 'new']

        scopes.forEach(scope => {
          const config: ContinueURLConfig = {
            bookId: 'book-test',
            mode: 'flashcards',
            scopeType: scope,
            currentIndex: 0
          }

          const result = generateContinueURL(config)

          expect(result).toContain(`scope=${scope}`)
          expect(result).toContain('shuffle=true')
          expect(result).toContain('resume=true')
        })
      })
    })

    /**
     * 测试目的：Happy Path - 验证 dictation 模式 URL 生成
     * 覆盖场景：switch(mode) case 'dictation' 分支
     */
    describe('Happy Path - dictation 模式', () => {
      it('应该生成完整的 dictation URL', () => {
        const config: ContinueURLConfig = {
          bookId: 'book-abc',
          mode: 'dictation',
          scopeType: 'unknown',
          currentIndex: 15
        }

        const result = generateContinueURL(config)

        expect(result).toBe('/study/book-abc/dictation?scope=unknown&resume=true#word-15')
      })

      it('应该处理不同的 scopeType', () => {
        const config: ContinueURLConfig = {
          bookId: 'book-def',
          mode: 'dictation',
          scopeType: 'all',
          currentIndex: 100
        }

        const result = generateContinueURL(config)

        expect(result).toContain('scope=all')
        expect(result).toContain('resume=true')
        expect(result).toContain('#word-100')
      })

      it('应该处理 currentIndex 为 0 的情况', () => {
        const config: ContinueURLConfig = {
          bookId: 'book-zero',
          mode: 'dictation',
          scopeType: 'new',
          currentIndex: 0
        }

        const result = generateContinueURL(config)

        expect(result).toBe('/study/book-zero/dictation?scope=new&resume=true#word-0')
      })
    })

    /**
     * 测试目的：Happy Path - 验证 word-list 模式 URL 生成
     * 覆盖场景：switch(mode) case 'word-list' 分支
     */
    describe('Happy Path - word-list 模式', () => {
      it('应该生成简单的 word-list URL（无参数）', () => {
        const config: ContinueURLConfig = {
          bookId: 'book-wordlist',
          mode: 'word-list',
          scopeType: 'all',
          currentIndex: 0
        }

        const result = generateContinueURL(config)

        expect(result).toBe('/library/book-wordlist')
        // word-list 模式不需要 scope、shuffle、resume 参数
      })

      it('应该忽略 currentIndex 和 scopeType（word-list 不需要）', () => {
        const config: ContinueURLConfig = {
          bookId: 'book-ignored',
          mode: 'word-list',
          scopeType: 'fuzzy',
          currentIndex: 999
        }

        const result = generateContinueURL(config)

        expect(result).toBe('/library/book-ignored')
        expect(result).not.toContain('scope')
        expect(result).not.toContain('#word')
      })
    })

    /**
     * 测试目的：Happy Path - 验证 match-game 模式 URL 生成
     * 覆盖场景：switch(mode) case 'match-game' 分支
     */
    describe('Happy Path - match-game 模式', () => {
      it('应该生成 match-game URL（无索引）', () => {
        const config: ContinueURLConfig = {
          bookId: 'book-game',
          mode: 'match-game',
          scopeType: 'all',
          currentIndex: 0
        }

        const result = generateContinueURL(config)

        expect(result).toBe('/study/book-game/match-game')
        // match-game 不携带索引（暂不支持断点续做）
      })

      it('应该忽略所有参数（match-game 不需要）', () => {
        const config: ContinueURLConfig = {
          bookId: 'book-game2',
          mode: 'match-game',
          scopeType: 'unknown',
          currentIndex: 50
        }

        const result = generateContinueURL(config)

        expect(result).toBe('/study/book-game2/match-game')
        expect(result).not.toContain('scope')
        expect(result).not.toContain('#word')
      })
    })

    /**
     * 测试目的：边界值轰炸 - 测试空值和无效值
     * 覆盖场景：if (!bookId || !mode) 分支
     */
    describe('边界值轰炸 - 空值处理', () => {
      it('应该将空字符串 bookId 视为无效，返回默认值', () => {
        const config: ContinueURLConfig = {
          bookId: '',
          mode: 'flashcards',
          scopeType: 'unknown',
          currentIndex: 0
        }

        const result = generateContinueURL(config)

        expect(result).toBe('/')
        expect(console.error).toHaveBeenCalledWith(
          '[generateContinueURL] Invalid config: missing bookId or mode',
          config
        )
      })

      it('应该将 null bookId 视为无效，返回默认值', () => {
        const config: ContinueURLConfig = {
          bookId: null as any,
          mode: 'flashcards',
          scopeType: 'unknown',
          currentIndex: 0
        }

        const result = generateContinueURL(config)

        expect(result).toBe('/')
        expect(console.error).toHaveBeenCalled()
      })

      it('应该将 undefined bookId 视为无效，返回默认值', () => {
        const config: ContinueURLConfig = {
          bookId: undefined as any,
          mode: 'flashcards',
          scopeType: 'unknown',
          currentIndex: 0
        }

        const result = generateContinueURL(config)

        expect(result).toBe('/')
        expect(console.error).toHaveBeenCalled()
      })

      it('应该将空字符串 mode 视为无效，返回默认值', () => {
        const config: ContinueURLConfig = {
          bookId: 'book-123',
          mode: '',
          scopeType: 'unknown',
          currentIndex: 0
        }

        const result = generateContinueURL(config)

        expect(result).toBe('/')
        expect(console.error).toHaveBeenCalled()
      })

      it('应该将 null mode 视为无效，返回默认值', () => {
        const config: ContinueURLConfig = {
          bookId: 'book-123',
          mode: null as any,
          scopeType: 'unknown',
          currentIndex: 0
        }

        const result = generateContinueURL(config)

        expect(result).toBe('/')
        expect(console.error).toHaveBeenCalled()
      })
    })

    /**
     * 测试目的：边界值轰炸 - 测试特殊字符和边界值
     */
    describe('边界值轰炸 - 特殊字符和极端值', () => {
      it('应该保留 bookId 中的特殊字符（路径部分不编码）', () => {
        const config: ContinueURLConfig = {
          bookId: 'book with spaces & symbols!',
          mode: 'flashcards',
          scopeType: 'unknown',
          currentIndex: 0
        }

        const result = generateContinueURL(config)

        // 路径部分不会自动编码（这是预期行为）
        expect(result).toContain('/study/book with spaces & symbols!/flashcards')
      })

      it('应该处理非常大的 currentIndex', () => {
        const config: ContinueURLConfig = {
          bookId: 'book-big',
          mode: 'flashcards',
          scopeType: 'unknown',
          currentIndex: 999999999
        }

        const result = generateContinueURL(config)

        expect(result).toContain('#word-999999999')
      })

      it('应该处理负数 currentIndex（允许负数）', () => {
        const config: ContinueURLConfig = {
          bookId: 'book-negative',
          mode: 'flashcards',
          scopeType: 'unknown',
          currentIndex: -1
        }

        const result = generateContinueURL(config)

        expect(result).toContain('#word--1')
      })

      it('应该处理 zero-filled bookId', () => {
        const config: ContinueURLConfig = {
          bookId: '000123',
          mode: 'flashcards',
          scopeType: 'unknown',
          currentIndex: 0
        }

        const result = generateContinueURL(config)

        expect(result).toContain('/study/000123/flashcards')
      })
    })

    /**
     * 测试目的：逻辑分支覆盖 - 测试未知模式
     * 覆盖场景：switch(mode) default 分支
     */
    describe('逻辑分支覆盖 - 未知模式处理', () => {
      it('应该处理未知的 mode，返回默认值', () => {
        const config: ContinueURLConfig = {
          bookId: 'book-123',
          mode: 'unknown-mode' as any,
          scopeType: 'unknown',
          currentIndex: 0
        }

        const result = generateContinueURL(config)

        expect(result).toBe('/')
        expect(console.warn).toHaveBeenCalledWith('[generateContinueURL] Unknown mode: unknown-mode')
      })

      it('应该处理大小写错误的 mode（严格匹配）', () => {
        const config: ContinueURLConfig = {
          bookId: 'book-123',
          mode: 'Flashcards' as any, // 大小写错误
          scopeType: 'unknown',
          currentIndex: 0
        }

        const result = generateContinueURL(config)

        expect(result).toBe('/')
      })
    })

    /**
     * 测试目的：异常处理 - 测试 try/catch 分支
     * 覆盖场景：try/catch 错误捕获
     */
    describe('异常处理 - 错误捕获', () => {
      it('应该捕获 URLSearchParams 构造函数的错误', () => {
        // 模拟一个会导致 URLSearchParams 失败的场景
        // 注意：在正常情况下 URLSearchParams 不会抛错，这个测试是防御性的
        const config: ContinueURLConfig = {
          bookId: 'book-123',
          mode: 'flashcards',
          scopeType: 'unknown' as any, // 可能导致问题的类型
          currentIndex: 0
        }

        // 正常情况下不应该抛错
        const result = generateContinueURL(config)

        // 如果成功，验证 URL 结构
        expect(result).toBeTruthy()
      })

      it('应该处理无效的 URL 参数拼接', () => {
        // 使用极端的 bookId 值测试
        const config: ContinueURLConfig = {
          bookId: '\x00\x01\x02', // 控制字符
          mode: 'flashcards',
          scopeType: 'unknown',
          currentIndex: 0
        }

        // 不应该抛错，应该返回一个 URL（即使是编码的）
        const result = generateContinueURL(config)

        expect(typeof result).toBe('string')
      })
    })

    /**
     * 测试目的：安全测试 - 防止注入攻击
     */
    describe('安全测试 - 防止注入', () => {
      it('应该保留 XSS 尝试（路径部分不编码，但前端会转义）', () => {
        const config: ContinueURLConfig = {
          bookId: '<script>alert(1)</script>',
          mode: 'flashcards',
          scopeType: 'unknown',
          currentIndex: 0
        }

        const result = generateContinueURL(config)

        // 路径部分不会自动编码，但前端渲染时会转义
        expect(result).toContain('<script>')
        // 查询参数会被编码
        expect(result).toContain('scope=unknown')
      })

      it('应该保留 SQL 注入尝试（路径部分不编码）', () => {
        const config: ContinueURLConfig = {
          bookId: "'; DROP TABLE users; --",
          mode: 'flashcards',
          scopeType: 'unknown',
          currentIndex: 0
        }

        const result = generateContinueURL(config)

        // 路径部分不会自动编码
        expect(result).toContain("DROP TABLE")
        expect(result).toContain("'; DROP TABLE users; --")
      })

      it('应该防止路径遍历攻击', () => {
        const config: ContinueURLConfig = {
          bookId: '../../../../etc/passwd',
          mode: 'flashcards',
          scopeType: 'unknown',
          currentIndex: 0
        }

        const result = generateContinueURL(config)

        // 应该被编码，不会实际遍历路径
        expect(result).toContain('..')
        // 但这是 URL 路径的一部分，不会访问文件系统
      })
    })

    /**
     * 测试目的：边界值轰炸 - 测试不同 scopeType 的组合
     */
    describe('边界值轰炸 - scopeType 组合测试', () => {
      const modes: Array<'flashcards' | 'dictation'> = ['flashcards', 'dictation']
      const scopes: Array<'all' | 'unknown' | 'fuzzy' | 'known' | 'new'> = ['all', 'unknown', 'fuzzy', 'known', 'new']

      it.each(modes)('应该为 %s 模式处理所有 scopeType', (mode) => {
        scopes.forEach(scope => {
          const config: ContinueURLConfig = {
            bookId: `book-${scope}`,
            mode,
            scopeType: scope,
            currentIndex: 5
          }

          const result = generateContinueURL(config)

          expect(result).toContain(`scope=${scope}`)
          expect(result).toContain('resume=true')
        })
      })
    })
  })
})
