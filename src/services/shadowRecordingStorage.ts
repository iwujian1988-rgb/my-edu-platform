/**
 * IndexedDB 存储层 — 跟读模式录音
 *
 * Database: shadow_reading_recordings (version 1)
 * Store:    recordings
 * Key:      `${videoId}::${subtitleId}`
 * Value:    { blob, duration, timestamp }
 *
 * 纯客户端存储，录音不上传 OSS，清浏览器缓存即丢失。
 */

const DB_NAME = 'shadow_reading_recordings'
const DB_VERSION = 1
const STORE_NAME = 'recordings'

interface RecordingEntry {
  blob: Blob
  duration: number
  timestamp: number
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function buildKey(videoId: string, subtitleId: string): string {
  return `${videoId}::${subtitleId}`
}

/**
 * 保存一条录音到 IndexedDB
 */
export async function saveRecording(
  videoId: string,
  subtitleId: string,
  blob: Blob,
  duration: number,
): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)

  const entry: RecordingEntry = { blob, duration, timestamp: Date.now() }
  store.put(entry, buildKey(videoId, subtitleId))

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/**
 * 获取一条录音
 */
export async function getRecording(
  videoId: string,
  subtitleId: string,
): Promise<{ blob: Blob; duration: number } | null> {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readonly')
  const store = tx.objectStore(STORE_NAME)

  const request = store.get(buildKey(videoId, subtitleId))

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const entry = request.result as RecordingEntry | undefined
      if (!entry) {
        resolve(null)
        return
      }
      resolve({ blob: entry.blob, duration: entry.duration })
    }
    request.onerror = () => reject(request.error)
  })
}

/**
 * 获取某个视频的所有录音
 * 返回 Map<subtitleId, { blob, duration }>
 */
export async function getAllRecordings(
  videoId: string,
): Promise<Map<string, { blob: Blob; duration: number }>> {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readonly')
  const store = tx.objectStore(STORE_NAME)

  const prefix = `${videoId}::`

  const request = store.openCursor()
  const result = new Map<string, { blob: Blob; duration: number }>()

  return new Promise((resolve, reject) => {
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
      if (!cursor) {
        resolve(result)
        return
      }

      const key = cursor.key as string
      if (key.startsWith(prefix)) {
        const subtitleId = key.slice(prefix.length)
        const entry = cursor.value as RecordingEntry
        result.set(subtitleId, { blob: entry.blob, duration: entry.duration })
      }
      cursor.continue()
    }
    request.onerror = () => reject(request.error)
  })
}

/**
 * 获取某个视频的录音数量（不加载 blob，更轻量）
 */
export async function getRecordingCount(videoId: string): Promise<number> {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readonly')
  const store = tx.objectStore(STORE_NAME)

  const prefix = `${videoId}::`

  const request = store.openCursor()
  let count = 0

  return new Promise((resolve, reject) => {
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
      if (!cursor) {
        resolve(count)
        return
      }

      const key = cursor.key as string
      if (key.startsWith(prefix)) {
        count++
      }
      cursor.continue()
    }
    request.onerror = () => reject(request.error)
  })
}

/**
 * 删除一条录音
 */
export async function deleteRecording(
  videoId: string,
  subtitleId: string,
): Promise<void> {
  const db = await openDB()
  const tx = db.transaction(STORE_NAME, 'readwrite')
  const store = tx.objectStore(STORE_NAME)

  store.delete(buildKey(videoId, subtitleId))

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
