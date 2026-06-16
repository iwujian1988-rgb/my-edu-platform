/**
 * maxclass/index.ts — MAXCLASS 数据层统一入口
 *
 * 1:1 还原 MAXCLASS_V1_HANDOFF_2026-06-14/src/data/ 的导出结构。
 * 后续页面统一从 '@/data/maxclass' 引入，避免散引 mock.ts/contentManifest.ts。
 */

export * from './mock'
export * from './contentManifest'
export * from './productLinks'
