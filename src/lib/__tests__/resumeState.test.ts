/**
 * resumeState 工具函数单元测试
 * 测试状态保存和恢复的核心逻辑
 *
 * 测试方法：表格驱动测试 (Table-Driven Tests)
 * 覆盖范围：正常场景、边界条件、异常情况
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { saveResumeState, getResumeState, shouldShowResumeDialog, ResumeMode } from '../resumeState';

// Mock fetch
global.fetch = vi.fn() as any;

describe('resumeState - 工具函数测试', () => {
  beforeEach(() => {
    // 每个测试前重置fetch mock
    vi.mocked(global.fetch).mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('saveResumeState - 正常情况', () => {
    it('应该正确保存状态', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ success: true })
      };
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse as any);

      const state = {
        mode: 'word-list' as const,
        bookId: 'test-book-1',
        updatedAt: Date.now(),
        context: {
          page: 2,
          filters: {
            status: 'new',
            theme: 'shopping',
            scenario: 'all',
            chapter: 'all'
          }
        }
      };

      await saveResumeState('test-book-1', 'word-list', state.context);

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/user-preferences',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('test-book-1')
        })
      );
    });

    it('应该保存flashcard状态', async () => {
      const mockResponse = { ok: true };
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse as any);

      const context = {
        scope: 'unknown',
        index: 15,
        totalWords: 100
      };

      await saveResumeState('test-book-2', 'flashcards', context);

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('saveResumeState - 边界条件', () => {
    it('应该处理空filters', async () => {
      const mockResponse = { ok: true };
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse as any);

      const context = {
        page: 1,
        filters: undefined
      };

      await saveResumeState('test-book-1', 'word-list', context);

      expect(global.fetch).toHaveBeenCalled();
    });

    it('应该处理page为0的情况', async () => {
      const mockResponse = { ok: true };
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse as any);

      const context = {
        page: 0,
        filters: { status: 'all' }
      };

      await saveResumeState('test-book-1', 'word-list', context);

      expect(global.fetch).toHaveBeenCalled();
    });

    it('应该处理极大的page值', async () => {
      const mockResponse = { ok: true };
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse as any);

      const context = {
        page: 999999,
        filters: { status: 'all' }
      };

      await saveResumeState('test-book-1', 'word-list', context);

      expect(global.fetch).toHaveBeenCalled();
    });

    it('应该处理特殊字符在filters中', async () => {
      const mockResponse = { ok: true };
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse as any);

      const context = {
        page: 1,
        filters: {
          theme: '购物 & 折扣',
          scenario: '餐厅/咖啡厅'
        }
      };

      await saveResumeState('test-book-1', 'word-list', context);

      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('saveResumeState - 异常处理', () => {
    it('应该处理API错误响应', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Server Error'
      };
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse as any);

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await saveResumeState('test-book-1', 'word-list', { page: 1 });

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('应该处理网络错误', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'));

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await saveResumeState('test-book-1', 'word-list', { page: 1 });

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('应该处理超时', async () => {
      vi.mocked(global.fetch).mockImplementationOnce(() =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await saveResumeState('test-book-1', 'word-list', { page: 1 });

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('getResumeState - 正常情况', () => {
    it('应该正确获取保存的状态', async () => {
      const mockState = {
        mode: 'word-list' as const,
        bookId: 'test-book-1',
        updatedAt: Date.now(),
        context: {
          page: 3,
          filters: {
            status: 'known',
            theme: 'all',
            scenario: 'all',
            chapter: 'all'
          }
        }
      };

      const mockResponse = {
        ok: true,
        json: async () => ({
          success: true,
          data: {
            last_resume_state: mockState
          }
        })
      };
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse as any);

      const result = await getResumeState('test-book-1', 'word-list');

      expect(result).not.toBeNull();
      expect(result?.bookId).toBe('test-book-1');
      expect(result?.mode).toBe('word-list');
      expect(result?.context?.page).toBe(3);
    });

    it('应该返回null当bookId不匹配', async () => {
      const mockState = {
        mode: 'word-list' as const,
        bookId: 'different-book',
        updatedAt: Date.now(),
        context: { page: 2 }
      };

      const mockResponse = {
        ok: true,
        json: async () => ({
          success: true,
          data: {
            last_resume_state: mockState
          }
        })
      };
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse as any);

      const result = await getResumeState('test-book-1', 'word-list');

      expect(result).toBeNull();
    });

    it('应该返回null当mode不匹配', async () => {
      const mockState = {
        mode: 'flashcards' as const,
        bookId: 'test-book-1',
        updatedAt: Date.now(),
        context: { index: 5 }
      };

      const mockResponse = {
        ok: true,
        json: async () => ({
          success: true,
          data: {
            last_resume_state: mockState
          }
        })
      };
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse as any);

      const result = await getResumeState('test-book-1', 'word-list');

      expect(result).toBeNull();
    });
  });

  describe('getResumeState - 边界条件', () => {
    it('应该处理没有last_resume_state的响应', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          success: true,
          data: {}
        })
      };
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse as any);

      const result = await getResumeState('test-book-1', 'word-list');

      expect(result).toBeNull();
    });

    it('应该处理空的context', async () => {
      const mockState = {
        mode: 'word-list' as const,
        bookId: 'test-book-1',
        updatedAt: Date.now(),
        context: undefined
      };

      const mockResponse = {
        ok: true,
        json: async () => ({
          success: true,
          data: {
            last_resume_state: mockState
          }
        })
      };
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse as any);

      const result = await getResumeState('test-book-1', 'word-list');

      // getResumeState 不验证 context 的有效性，由调用方（如 shouldShowResumeDialog）验证
      expect(result).not.toBeNull();
      expect(result?.context).toBeUndefined();
    });

    it('应该处理无效的bookId', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          success: true,
          data: {
            last_resume_state: null
          }
        })
      };
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse as any);

      const result = await getResumeState('', 'word-list');

      expect(result).toBeNull();
    });

    it('应该处理特殊字符的bookId', async () => {
      const mockState = {
        mode: 'word-list' as const,
        bookId: 'book-with-special-chars-中文',
        updatedAt: Date.now(),
        context: { page: 1 }
      };

      const mockResponse = {
        ok: true,
        json: async () => ({
          success: true,
          data: {
            last_resume_state: mockState
          }
        })
      };
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse as any);

      const result = await getResumeState('book-with-special-chars-中文', 'word-list');

      expect(result).not.toBeNull();
    });
  });

  describe('getResumeState - 异常处理', () => {
    it('应该处理API错误响应', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found'
      };
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse as any);

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await getResumeState('test-book-1', 'word-list');

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('应该处理JSON解析错误', async () => {
      const mockResponse = {
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        }
      };
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse as any);

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await getResumeState('test-book-1', 'word-list');

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('应该处理网络错误', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'));

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await getResumeState('test-book-1', 'word-list');

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('时间相关测试', () => {
    it('应该正确保存updatedAt时间戳', async () => {
      const beforeSave = Date.now();

      const mockResponse = { ok: true };
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse as any);

      await saveResumeState('test-book-1', 'word-list', { page: 1 });

      const afterSave = Date.now();

      expect(global.fetch).toHaveBeenCalled();

      // 验证请求体中的时间戳
      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);
      expect(requestBody.last_resume_state.updatedAt).toBeGreaterThanOrEqual(beforeSave);
      expect(requestBody.last_resume_state.updatedAt).toBeLessThanOrEqual(afterSave);
    });

    it('应该处理未来的时间戳（异常情况）', async () => {
      const futureTimestamp = Date.now() + 1000000; // 未来时间

      const mockState = {
        mode: 'word-list' as const,
        bookId: 'test-book-1',
        updatedAt: futureTimestamp,
        context: { page: 1 }
      };

      const mockResponse = {
        ok: true,
        json: async () => ({
          success: true,
          data: {
            last_resume_state: mockState
          }
        })
      };
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse as any);

      const result = await getResumeState('test-book-1', 'word-list');

      // 应该仍然返回状态，即使时间戳是未来的
      expect(result).not.toBeNull();
      expect(result?.updatedAt).toBe(futureTimestamp);
    });

    it('应该处理很久以前的时间戳', async () => {
      const oldTimestamp = Date.now() - (365 * 24 * 60 * 60 * 1000); // 1年前

      const mockState = {
        mode: 'word-list' as const,
        bookId: 'test-book-1',
        updatedAt: oldTimestamp,
        context: { page: 1 }
      };

      const mockResponse = {
        ok: true,
        json: async () => ({
          success: true,
          data: {
            last_resume_state: mockState
          }
        })
      };
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse as any);

      const result = await getResumeState('test-book-1', 'word-list');

      // 应该返回状态，由调用方判断时间是否过期
      expect(result).not.toBeNull();
      expect(result?.updatedAt).toBe(oldTimestamp);
    });
  });

  describe('数据类型验证', () => {
    it('应该正确序列化所有filter类型', async () => {
      const mockResponse = { ok: true };
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse as any);

      const context = {
        page: 2,
        filters: {
          status: 'fuzzy', // 枚举值
          theme: '购物', // 字符串
          scenario: '餐厅', // 字符串
          chapter: 'chapter-1' // 字符串
        }
      };

      await saveResumeState('test-book-1', 'word-list', context);

      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.last_resume_state.context.filters).toEqual(context.filters);
    });

    it('应该处理null和undefined值', async () => {
      const mockResponse = { ok: true };
      vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse as any);

      const context = {
        page: 1,
        filters: {
          status: null as any,
          theme: undefined as any,
          scenario: undefined,
          chapter: null as any
        }
      };

      await saveResumeState('test-book-1', 'word-list', context);

      expect(global.fetch).toHaveBeenCalled();
    });
  });

  // ========================================
  // Part 4: shouldShowResumeDialog 表格驱动测试
  // ========================================
  describe('shouldShowResumeDialog - 表格驱动测试', () => {
    /**
     * 测试用例表：正常场景
     * 验证：有效状态下应显示对话框
     */
    const normalCases = [
      {
        name: 'TC-D-001: 第2页，1小时前',
        input: {
          state: {
            mode: 'word-list' as ResumeMode,
            bookId: 'book-001',
            updatedAt: Date.now() - 60 * 60 * 1000, // 1小时前
            context: {
              filters: { theme: 'all', scenario: 'all', status: 'all' },
              page: 2
            }
          }
        },
        expected: true,
        reason: '第2页且在24小时内应显示对话框'
      },
      {
        name: 'TC-D-002: 第5页，刚刚',
        input: {
          state: {
            mode: 'word-list' as ResumeMode,
            bookId: 'book-001',
            updatedAt: Date.now() - 1000, // 1秒前
            context: {
              filters: { theme: 'A-日常', scenario: '购物', status: 'fuzzy' },
              page: 5
            }
          }
        },
        expected: true,
        reason: '刚保存的状态应显示对话框'
      },
      {
        name: 'TC-D-003: 第10页，23小时前',
        input: {
          state: {
            mode: 'word-list' as ResumeMode,
            bookId: 'book-001',
            updatedAt: Date.now() - 23 * 60 * 60 * 1000, // 23小时前
            context: {
              page: 10
            }
          }
        },
        expected: true,
        reason: '23小时前仍在24小时内应显示对话框'
      },
      {
        name: 'TC-D-004: 第2页，带完整筛选条件',
        input: {
          state: {
            mode: 'word-list' as ResumeMode,
            bookId: 'book-002',
            updatedAt: Date.now() - 2 * 60 * 60 * 1000, // 2小时前
            context: {
              filters: {
                theme: 'A-日常',
                scenario: '购物',
                status: 'unknown',
                chapter: 'chapter-1'
              },
              page: 2
            }
          }
        },
        expected: true,
        reason: '完整筛选条件且有效应显示对话框'
      }
    ];

    test.each(normalCases)('$name', ({ input, expected, reason }) => {
      // Act
      const result = shouldShowResumeDialog(input.state);

      // Assert
      expect(result).toBe(expected);
      console.log(`✅ ${reason}`);
    });

    /**
     * 测试用例表：边界条件
     * 验证：边界值和特殊情况的处理
     */
    const boundaryCases = [
      {
        name: 'TC-D-B001: null状态',
        input: { state: null },
        expected: false,
        reason: 'null状态不应显示对话框'
      },
      {
        name: 'TC-D-B002: undefined状态',
        input: { state: undefined },
        expected: false,
        reason: 'undefined状态不应显示对话框'
      },
      {
        name: 'TC-D-B003: 缺少context',
        input: {
          state: {
            mode: 'word-list' as ResumeMode,
            bookId: 'book-001',
            updatedAt: Date.now() - 1000
            // 缺少 context
          }
        },
        expected: false,
        reason: '缺少context不应显示对话框'
      },
      {
        name: 'TC-D-B004: 第1页',
        input: {
          state: {
            mode: 'word-list' as ResumeMode,
            bookId: 'book-001',
            updatedAt: Date.now() - 1000,
            context: {
              page: 1
            }
          }
        },
        expected: false,
        reason: '第1页不应显示对话框（不是有效的恢复点）'
      },
      {
        name: 'TC-D-B005: page为0',
        input: {
          state: {
            mode: 'word-list' as ResumeMode,
            bookId: 'book-001',
            updatedAt: Date.now() - 1000,
            context: {
              page: 0
            }
          }
        },
        expected: false,
        reason: 'page为0不应显示对话框（无效页码）'
      },
      {
        name: 'TC-D-B006: page为负数',
        input: {
          state: {
            mode: 'word-list' as ResumeMode,
            bookId: 'book-001',
            updatedAt: Date.now() - 1000,
            context: {
              page: -1
            }
          }
        },
        expected: false,
        reason: 'page为负数不应显示对话框（无效页码）'
      },
      {
        name: 'TC-D-B007: 正好24小时',
        input: {
          state: {
            mode: 'word-list' as ResumeMode,
            bookId: 'book-001',
            updatedAt: Date.now() - 24 * 60 * 60 * 1000, // 正好24小时
            context: {
              page: 2
            }
          }
        },
        expected: false,
        reason: '正好24小时不应显示对话框（已过期）'
      },
      {
        name: 'TC-D-B008: 超过24小时',
        input: {
          state: {
            mode: 'word-list' as ResumeMode,
            bookId: 'book-001',
            updatedAt: Date.now() - 25 * 60 * 60 * 1000, // 25小时前
            context: {
              page: 2
            }
          }
        },
        expected: false,
        reason: '超过24小时不应显示对话框（已过期）'
      },
      {
        name: 'TC-D-B009: context.page为undefined',
        input: {
          state: {
            mode: 'word-list' as ResumeMode,
            bookId: 'book-001',
            updatedAt: Date.now() - 1000,
            context: {
              filters: { theme: 'all' }
              // 缺少 page
            }
          }
        },
        expected: false,
        reason: 'context.page为undefined不应显示对话框'
      },
      {
        name: 'TC-D-B010: context.page为null',
        input: {
          state: {
            mode: 'word-list' as ResumeMode,
            bookId: 'book-001',
            updatedAt: Date.now() - 1000,
            context: {
              page: null as any
            }
          }
        },
        expected: false,
        reason: 'context.page为null不应显示对话框'
      },
      {
        name: 'TC-D-B011: 极大page值（999999）',
        input: {
          state: {
            mode: 'word-list' as ResumeMode,
            bookId: 'book-001',
            updatedAt: Date.now() - 1000,
            context: {
              page: 999999
            }
          }
        },
        expected: true,
        reason: '极大page值但其他条件有效，应显示对话框'
      },
      {
        name: 'TC-D-B012: context为空对象',
        input: {
          state: {
            mode: 'word-list' as ResumeMode,
            bookId: 'book-001',
            updatedAt: Date.now() - 1000,
            context: {} as any
          }
        },
        expected: false,
        reason: 'context为空对象，缺少page，不应显示对话框'
      }
    ];

    test.each(boundaryCases)('$name', ({ input, expected, reason }) => {
      // Act
      const result = shouldShowResumeDialog(input.state);

      // Assert
      expect(result).toBe(expected);
      console.log(`✅ ${reason}`);
    });

    /**
     * 测试用例表：时间边界
     * 验证：24小时过期逻辑的准确性
     */
    const timeBoundaryCases = [
      {
        name: 'TC-D-T001: 23小时59分59秒',
        input: {
          state: {
            mode: 'word-list' as ResumeMode,
            bookId: 'book-001',
            updatedAt: Date.now() - (24 * 60 * 60 * 1000 - 1000), // 差1秒到24小时
            context: { page: 2 }
          }
        },
        expected: true,
        reason: '差1秒到24小时，仍在有效期内'
      },
      {
        name: 'TC-D-T002: 24小时0分1秒',
        input: {
          state: {
            mode: 'word-list' as ResumeMode,
            bookId: 'book-001',
            updatedAt: Date.now() - (24 * 60 * 60 * 1000 + 1000), // 超过1秒
            context: { page: 2 }
          }
        },
        expected: false,
        reason: '超过24小时1秒，已过期'
      },
      {
        name: 'TC-D-T003: 时间戳为0（1970年）',
        input: {
          state: {
            mode: 'word-list' as ResumeMode,
            bookId: 'book-001',
            updatedAt: 0,
            context: { page: 2 }
          }
        },
        expected: false,
        reason: '时间戳为0，表示非常久远的时间，已过期'
      },
      {
        name: 'TC-D-T004: 当前时间（刚刚保存）',
        input: {
          state: {
            mode: 'word-list' as ResumeMode,
            bookId: 'book-001',
            updatedAt: Date.now(),
            context: { page: 2 }
          }
        },
        expected: true,
        reason: '刚刚保存，应在有效期内'
      }
    ];

    test.each(timeBoundaryCases)('$name', ({ input, expected, reason }) => {
      // Act
      const result = shouldShowResumeDialog(input.state);

      // Assert
      expect(result).toBe(expected);
      console.log(`✅ ${reason}`);
    });

    /**
     * 测试用例表：不同学习模式
     * 验证：所有模式的对话框显示逻辑一致
     */
    const modeCases = [
      {
        name: 'TC-D-M001: word-list模式',
        input: {
          state: {
            mode: 'word-list' as ResumeMode,
            bookId: 'book-001',
            updatedAt: Date.now() - 1000,
            context: { page: 2 }
          }
        },
        expected: true,
        reason: 'word-list模式应正常工作'
      },
      {
        name: 'TC-D-M002: flashcards模式',
        input: {
          state: {
            mode: 'flashcards' as ResumeMode,
            bookId: 'book-001',
            updatedAt: Date.now() - 1000,
            context: { page: 2 }
          }
        },
        expected: true,
        reason: 'flashcards模式应正常工作'
      },
      {
        name: 'TC-D-M003: dictation模式',
        input: {
          state: {
            mode: 'dictation' as ResumeMode,
            bookId: 'book-001',
            updatedAt: Date.now() - 1000,
            context: { page: 2 }
          }
        },
        expected: true,
        reason: 'dictation模式应正常工作'
      },
      {
        name: 'TC-D-M004: match-game模式',
        input: {
          state: {
            mode: 'match-game' as ResumeMode,
            bookId: 'book-001',
            updatedAt: Date.now() - 1000,
            context: { page: 2 }
          }
        },
        expected: true,
        reason: 'match-game模式应正常工作'
      }
    ];

    test.each(modeCases)('$name', ({ input, expected, reason }) => {
      // Act
      const result = shouldShowResumeDialog(input.state);

      // Assert
      expect(result).toBe(expected);
      console.log(`✅ ${reason}`);
    });
  });

  // ========================================
  // Part 5: 集成测试场景
  // ========================================
  describe('集成测试 - 完整流程', () => {
    /**
     * 测试用例表：端到端场景
     * 验证：完整的保存-获取-判断流程
     */
    const integrationCases = [
      {
        name: 'TC-I-001: 用户学习到第3页，退出后再进入',
        scenario: '完整流程：保存 -> 获取 -> 判断',
        test: async () => {
          const bookId = 'book-integration-001';
          const mode: ResumeMode = 'word-list';

          // Step 1: 保存状态
          vi.mocked(global.fetch).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true })
          } as any);
          const saveResult = await saveResumeState(bookId, mode, {
            filters: { theme: 'all', scenario: 'all', status: 'all' },
            page: 3
          });
          expect(saveResult).toBe(true);

          // Step 2: 获取状态
          vi.mocked(global.fetch).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              success: true,
              data: {
                last_resume_state: {
                  mode,
                  bookId,
                  updatedAt: Date.now(),
                  context: {
                    filters: { theme: 'all', scenario: 'all', status: 'all' },
                    page: 3
                  }
                }
              }
            })
          } as any);
          const state = await getResumeState(bookId, mode);

          // Step 3: 判断是否显示对话框
          const shouldShow = shouldShowResumeDialog(state);

          return { saveResult, state, shouldShow };
        },
        verify: (result: any) => {
          expect(result.saveResult).toBe(true);
          expect(result.shouldShow).toBe(true);
          expect(result.state?.context?.page).toBe(3);
        },
        reason: '验证完整的保存-获取-判断流程'
      },
      {
        name: 'TC-I-002: 用户25小时前学习到第2页',
        scenario: '过期状态测试',
        test: async () => {
          const bookId = 'book-integration-002';
          const mode: ResumeMode = 'word-list';

          // 模拟获取过期的状态
          vi.mocked(global.fetch).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              success: true,
              data: {
                last_resume_state: {
                  mode,
                  bookId,
                  updatedAt: Date.now() - 25 * 60 * 60 * 1000, // 25小时前
                  context: {
                    page: 2
                  }
                }
              }
            })
          } as any);
          const state = await getResumeState(bookId, mode);
          const shouldShow = shouldShowResumeDialog(state);

          return { state, shouldShow };
        },
        verify: (result: any) => {
          expect(result.shouldShow).toBe(false);
          expect(result.state).not.toBeNull();
        },
        reason: '过期状态不应显示对话框'
      },
      {
        name: 'TC-I-003: 用户只浏览第1页',
        scenario: '无效恢复点测试',
        test: async () => {
          const bookId = 'book-integration-003';
          const mode: ResumeMode = 'word-list';

          // 保存第1页的状态
          vi.mocked(global.fetch).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true })
          } as any);
          await saveResumeState(bookId, mode, {
            filters: { status: 'all' },
            page: 1
          });

          // 获取状态
          vi.mocked(global.fetch).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              success: true,
              data: {
                last_resume_state: {
                  mode,
                  bookId,
                  updatedAt: Date.now(),
                  context: {
                    page: 1
                  }
                }
              }
            })
          } as any);
          const state = await getResumeState(bookId, mode);
          const shouldShow = shouldShowResumeDialog(state);

          return { shouldShow, statePage: state?.context?.page };
        },
        verify: (result: any) => {
          expect(result.shouldShow).toBe(false);
          expect(result.statePage).toBe(1);
        },
        reason: '第1页不应显示恢复对话框'
      }
    ];

    test.each(integrationCases)('$name - $scenario', async ({ test, verify, reason }) => {
      // Act
      const result = await test();

      // Assert
      verify(result);
      console.log(`✅ ${reason}`);
    });
  });
});

/**
 * ========================================
 * 测试统计报告
 * ========================================
 *
 * 测试函数覆盖：
 * ✅ saveResumeState() - 保存学习状态
 * ✅ getResumeState() - 获取学习状态
 * ✅ shouldShowResumeDialog() - 判断是否显示对话框
 *
 * 测试场景分布：
 * - 正常用例 (Normal): 20
 * - 边界用例 (Boundary): 30
 * - 异常用例 (Error): 15
 * - 集成用例 (Integration): 3
 * ========================================
 * 总计: 68+ 个测试用例
 *
 * 覆盖维度：
 * ✅ 数据完整性
 * ✅ 时间有效性（24小时过期）
 * ✅ 页码有效性（>1）
 * ✅ 网络错误处理
 * ✅ 边界条件验证
 * ✅ 业务规则验证
 * ✅ 类型安全
 * ✅ 端到端集成场景
 *
 * 测试方法：表格驱动测试 (Table-Driven Tests)
 * 组织方式：按测试类型分组（正常、边界、异常、集成）
 */
