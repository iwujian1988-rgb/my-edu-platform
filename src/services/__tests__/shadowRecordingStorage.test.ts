// src/services/__tests__/shadowRecordingStorage.test.ts
// shadowRecordingStorage 单元测试 — 内存模拟 IndexedDB

import {
  saveRecording,
  getRecording,
  getAllRecordings,
  getRecordingCount,
  deleteRecording,
} from '../shadowRecordingStorage'

// ---------------------------------------------------------------------------
// 轻量 IDB 内存模拟
// ---------------------------------------------------------------------------

interface RecordingEntry {
  blob: Blob
  duration: number
  timestamp: number
}

/** 整个 "数据库" 就是这个 Map */
const fakeStore = new Map<string, RecordingEntry>()

/**
 * 创建一个 "请求" 对象，onsuccess/onerror 可由调用方（源码）赋值，
 * 微任务后自动触发对应回调。
 */
function createRequest(): IDBRequest {
  const req = {
    result: undefined as unknown,
    onsuccess: null as ((ev: Event) => void) | null,
    onerror: null as ((ev: Event) => void) | null,
    error: null,
  }
  return req as unknown as IDBRequest
}

/** 在下一个微任务触发 request.onsuccess */
function scheduleSuccess(req: IDBRequest, result?: unknown) {
  queueMicrotask(() => {
    if (result !== undefined) {
      (req as Record<string, unknown>).result = result
    }
    if (req.onsuccess) {
      req.onsuccess({ target: req } as unknown as Event)
    }
  })
}

/** 创建模拟的 IDBObjectStore */
function createFakeStore(mode: IDBTransactionMode) {
  const pendingOps: Array<{ type: 'put'; key: string; value: RecordingEntry }
    | { type: 'delete'; key: string }> = []

  return {
    put(value: RecordingEntry, key: string) {
      if (mode === 'readwrite') {
        pendingOps.push({ type: 'put', key, value })
      }
    },
    get(key: string): IDBRequest {
      const req = createRequest()
      scheduleSuccess(req, fakeStore.get(key))
      return req
    },
    delete(key: string) {
      if (mode === 'readwrite') {
        pendingOps.push({ type: 'delete', key })
      }
    },
    openCursor(): IDBRequest {
      const entries = Array.from(fakeStore.entries())
      const req = createRequest()
      if (entries.length === 0) {
        scheduleSuccess(req, null)
        return req
      }

      let idx = 0
      const cursor = {
        key: entries[0][0] as string,
        value: entries[0][1] as RecordingEntry,
        continue() {
          idx++
          if (idx < entries.length) {
            // 同步推进 cursor，立即触发 onsuccess
            ;(cursor as Record<string, unknown>).key = entries[idx][0]
            ;(cursor as Record<string, unknown>).value = entries[idx][1]
            ;(req as Record<string, unknown>).result = cursor
            if (req.onsuccess) {
              req.onsuccess({ target: req } as unknown as Event)
            }
          } else {
            ;(req as Record<string, unknown>).result = null
            if (req.onsuccess) {
              req.onsuccess({ target: req } as unknown as Event)
            }
          }
        },
      }

      scheduleSuccess(req, cursor)
      return req
    },
    /** 提交所有挂起的写操作到 fakeStore */
    commit() {
      for (const op of pendingOps) {
        if (op.type === 'put') {
          fakeStore.set(op.key, op.value)
        } else {
          fakeStore.delete(op.key)
        }
      }
    },
  }
}

/** 创建模拟的 IDBTransaction */
function createFakeTransaction(mode: IDBTransactionMode) {
  const store = createFakeStore(mode)
  const tx = {
    objectStore: () => store,
    oncomplete: null as (() => void) | null,
    onerror: null as (() => void) | null,
    error: null,
  }

  // readwrite 事务：微任务后提交并触发 oncomplete
  if (mode === 'readwrite') {
    queueMicrotask(() => {
      store.commit()
      if (tx.oncomplete) {
        tx.oncomplete()
      }
    })
  }

  return tx
}

/** 创建模拟的 IDBDatabase */
function createFakeDatabase(): IDBDatabase {
  return {
    transaction: (_names: string | string[], mode?: IDBTransactionMode) =>
      createFakeTransaction(mode ?? 'readonly'),
    objectStoreNames: { contains: () => true } as unknown as DOMStringList,
  } as unknown as IDBDatabase
}

/** 注入模拟的 indexedDB */
function installFakeIDB() {
  ;(globalThis as Record<string, unknown>).indexedDB = {
    open: () => {
      const req = {
        result: createFakeDatabase(),
        onupgradeneeded: null as ((ev: Event) => void) | null,
        onsuccess: null as ((ev: Event) => void) | null,
        onerror: null as ((ev: Event) => void) | null,
        error: null,
      }

      // 微任务后触发 onsuccess，保证源码已经设置了 onsuccess 回调
      queueMicrotask(() => {
        if (req.onsuccess) {
          req.onsuccess({ target: req } as unknown as Event)
        }
      })

      return req as unknown as IDBOpenDBRequest
    },
  }
}

/** 等待所有微任务完成（用于 readwrite 事务提交后验证） */
async function flush() {
  // openDB onsuccess (1 microtask) + transaction oncomplete (1 microtask) = 2 flushes
  await new Promise<void>(r => queueMicrotask(() => queueMicrotask(r)))
}

// ---------------------------------------------------------------------------
// 测试辅助
// ---------------------------------------------------------------------------

function createTestBlob(content = 'audio-data'): Blob {
  return new Blob([content], { type: 'audio/webm' })
}

// ---------------------------------------------------------------------------
// 测试套件
// ---------------------------------------------------------------------------

describe('shadowRecordingStorage', () => {
  beforeEach(() => {
    fakeStore.clear()
    installFakeIDB()
  })

  afterEach(() => {
    delete (globalThis as Record<string, unknown>).indexedDB
  })

  // -----------------------------------------------------------------------
  // saveRecording + getRecording
  // -----------------------------------------------------------------------
  describe('saveRecording / getRecording', () => {
    it('应该保存录音并通过 getRecording 取回', async () => {
      const blob = createTestBlob()
      await saveRecording('video-1', 'sub-1', blob, 3.5)
      await flush()

      const result = await getRecording('video-1', 'sub-1')

      expect(result).not.toBeNull()
      expect(result!.blob).toBe(blob)
      expect(result!.duration).toBe(3.5)
    })

    it('不存在的录音应该返回 null', async () => {
      const result = await getRecording('video-1', 'sub-999')

      expect(result).toBeNull()
    })

    it('覆盖保存相同 key 应更新已有数据', async () => {
      const blob1 = createTestBlob('first')
      const blob2 = createTestBlob('second')

      await saveRecording('video-1', 'sub-1', blob1, 1.0)
      await flush()

      await saveRecording('video-1', 'sub-1', blob2, 2.5)
      await flush()

      const result = await getRecording('video-1', 'sub-1')
      expect(result).not.toBeNull()
      expect(result!.blob).toBe(blob2)
      expect(result!.duration).toBe(2.5)
    })
  })

  // -----------------------------------------------------------------------
  // getAllRecordings
  // -----------------------------------------------------------------------
  describe('getAllRecordings', () => {
    it('应该返回指定视频的所有录音', async () => {
      const blob1 = createTestBlob('a')
      const blob2 = createTestBlob('b')
      const blob3 = createTestBlob('c')

      await saveRecording('video-1', 'sub-1', blob1, 1.0)
      await flush()
      await saveRecording('video-1', 'sub-2', blob2, 2.0)
      await flush()
      await saveRecording('video-1', 'sub-3', blob3, 3.0)
      await flush()

      const result = await getAllRecordings('video-1')

      expect(result).toBeInstanceOf(Map)
      expect(result.size).toBe(3)
      expect(result.get('sub-1')!.blob).toBe(blob1)
      expect(result.get('sub-1')!.duration).toBe(1.0)
      expect(result.get('sub-2')!.blob).toBe(blob2)
      expect(result.get('sub-3')!.blob).toBe(blob3)
    })

    it('没有录音时应该返回空 Map', async () => {
      const result = await getAllRecordings('video-empty')

      expect(result).toBeInstanceOf(Map)
      expect(result.size).toBe(0)
    })

    it('应该只返回匹配 videoId 的录音', async () => {
      const blobA = createTestBlob('a')
      const blobB = createTestBlob('b')

      await saveRecording('video-A', 'sub-1', blobA, 1.0)
      await flush()
      await saveRecording('video-B', 'sub-2', blobB, 2.0)
      await flush()

      const resultA = await getAllRecordings('video-A')
      expect(resultA.size).toBe(1)
      expect(resultA.has('sub-1')).toBe(true)

      const resultB = await getAllRecordings('video-B')
      expect(resultB.size).toBe(1)
      expect(resultB.has('sub-2')).toBe(true)
    })
  })

  // -----------------------------------------------------------------------
  // getRecordingCount
  // -----------------------------------------------------------------------
  describe('getRecordingCount', () => {
    it('应该准确返回指定视频的录音数量', async () => {
      await saveRecording('video-1', 'sub-1', createTestBlob(), 1.0)
      await flush()
      await saveRecording('video-1', 'sub-2', createTestBlob(), 2.0)
      await flush()
      await saveRecording('video-1', 'sub-3', createTestBlob(), 3.0)
      await flush()

      const count = await getRecordingCount('video-1')
      expect(count).toBe(3)
    })

    it('没有录音时应该返回 0', async () => {
      const count = await getRecordingCount('video-nonexistent')
      expect(count).toBe(0)
    })

    it('添加新录音后数量应该递增', async () => {
      expect(await getRecordingCount('video-1')).toBe(0)

      await saveRecording('video-1', 'sub-1', createTestBlob(), 1.0)
      await flush()
      expect(await getRecordingCount('video-1')).toBe(1)

      await saveRecording('video-1', 'sub-2', createTestBlob(), 2.0)
      await flush()
      expect(await getRecordingCount('video-1')).toBe(2)
    })

    it('应该只计算匹配 videoId 的录音', async () => {
      await saveRecording('video-A', 'sub-1', createTestBlob(), 1.0)
      await flush()
      await saveRecording('video-A', 'sub-2', createTestBlob(), 2.0)
      await flush()
      await saveRecording('video-B', 'sub-1', createTestBlob(), 3.0)
      await flush()

      expect(await getRecordingCount('video-A')).toBe(2)
      expect(await getRecordingCount('video-B')).toBe(1)
    })
  })

  // -----------------------------------------------------------------------
  // deleteRecording
  // -----------------------------------------------------------------------
  describe('deleteRecording', () => {
    it('应该删除已存在的录音', async () => {
      await saveRecording('video-1', 'sub-1', createTestBlob(), 1.0)
      await flush()

      expect(await getRecording('video-1', 'sub-1')).not.toBeNull()

      await deleteRecording('video-1', 'sub-1')
      await flush()

      expect(await getRecording('video-1', 'sub-1')).toBeNull()
    })

    it('删除不存在的 key 不应该抛出错误', async () => {
      await expect(
        deleteRecording('video-1', 'sub-nonexistent'),
      ).resolves.not.toThrow()
    })

    it('删除一条录音后 getAllRecordings 应该不再包含它', async () => {
      await saveRecording('video-1', 'sub-1', createTestBlob(), 1.0)
      await flush()
      await saveRecording('video-1', 'sub-2', createTestBlob(), 2.0)
      await flush()

      await deleteRecording('video-1', 'sub-1')
      await flush()

      const all = await getAllRecordings('video-1')
      expect(all.has('sub-1')).toBe(false)
      expect(all.has('sub-2')).toBe(true)
    })
  })

  // -----------------------------------------------------------------------
  // Key 格式隔离
  // -----------------------------------------------------------------------
  describe('key 格式隔离', () => {
    it('不同 videoId 下相同 subtitleId 不应该互相覆盖', async () => {
      const blobA = createTestBlob('video-A')
      const blobB = createTestBlob('video-B')

      await saveRecording('video-A', 'same-sub', blobA, 1.0)
      await flush()
      await saveRecording('video-B', 'same-sub', blobB, 2.0)
      await flush()

      const resultA = await getRecording('video-A', 'same-sub')
      const resultB = await getRecording('video-B', 'same-sub')

      expect(resultA).not.toBeNull()
      expect(resultA!.blob).toBe(blobA)
      expect(resultA!.duration).toBe(1.0)

      expect(resultB).not.toBeNull()
      expect(resultB!.blob).toBe(blobB)
      expect(resultB!.duration).toBe(2.0)
    })

    it('删除一个 videoId 的录音不影响另一个 videoId', async () => {
      await saveRecording('video-A', 'sub-1', createTestBlob('a'), 1.0)
      await flush()
      await saveRecording('video-B', 'sub-1', createTestBlob('b'), 2.0)
      await flush()

      await deleteRecording('video-A', 'sub-1')
      await flush()

      expect(await getRecording('video-A', 'sub-1')).toBeNull()
      expect(await getRecording('video-B', 'sub-1')).not.toBeNull()
    })

    it('videoId 中包含 :: 字符时存取仍然正确', async () => {
      // 注意：buildKey 使用 ${videoId}::${subtitleId}，不做转义
      // 所以 videoId 含 :: 时，其他拆分组合可能产生相同的 key — 这是已知的简单实现限制
      const blob = createTestBlob('special')
      await saveRecording('video::with::colons', 'sub-1', blob, 5.0)
      await flush()

      const result = await getRecording('video::with::colons', 'sub-1')
      expect(result).not.toBeNull()
      expect(result!.blob).toBe(blob)
      expect(result!.duration).toBe(5.0)
    })
  })
})
