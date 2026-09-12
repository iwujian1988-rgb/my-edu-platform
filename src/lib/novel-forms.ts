/**
 * 小说形态规范化（客户端）
 *
 * 必须与 shuangwen_tcf 导出管线 scripts/build.mjs 的 norm() 保持一致：
 * trim + 小写 + 弯引号转直引号 + 连续空白折叠。
 * 点词时 data-w → formKey 走同一函数，保证命中 novel_lexicon。
 */

export function normForm(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[’‘´`]/g, "'")
    .replace(/\s+/g, ' ')
}
