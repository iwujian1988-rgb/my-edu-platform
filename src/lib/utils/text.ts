/**
 * 过滤 HTML 标签，只保留纯文本
 * @param text 包含 HTML 标签的文本
 * @returns 纯文本内容
 */
export function stripHtmlTags(text: string | null | undefined): string {
  if (!text) return ''
  return text.replace(/<[^>]*>/g, '')
}

/**
 * 过滤 HTML 标签并解码 HTML 实体
 * @param text 包含 HTML 标签和实体的文本
 * @returns 纯文本内容
 */
export function decodeHtmlEntities(text: string | null | undefined): string {
  if (!text) return ''

  // 先移除 HTML 标签
  let result = stripHtmlTags(text)

  // 解码常见 HTML 实体
  const entities: Record<string, string> = {
    '&lt;': '<',
    '&gt;': '>',
    '&amp;': '&',
    '&quot;': '"',
    '&apos;': "'",
    '&nbsp;': ' '
  }

  result = result.replace(/&[a-zA-Z]+;/g, (entity) => entities[entity] || entity)

  return result
}
