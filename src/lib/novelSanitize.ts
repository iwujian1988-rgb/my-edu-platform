'use client'

/**
 * 小说正文 sanitize（纵深防御）
 *
 * 正文由 shuangwen_tcf 导出管线生成（仅 <p> 与 <b class="fw" data-w="...">），
 * 导入前已受信。此处只在渲染前再过一遍白名单：
 * - 允许的标签：P、B
 * - B 允许 class="fw" 与 data-w（点词标记）
 * - 其余标签剥壳保文本，所有事件属性一律移除
 */

const ALLOWED_TAGS = new Set(['P', 'B'])
const ALLOWED_B_ATTRS = new Set(['class', 'data-w'])

export function sanitizeNovelHtml(html: string): string {
  if (typeof window === 'undefined' || !html) {
    return ''
  }

  const template = document.createElement('template')
  template.innerHTML = html

  const clean = (node: Node): void => {
    if (node.nodeType === Node.COMMENT_NODE) {
      node.parentNode?.removeChild(node)
      return
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return

    const el = node as Element

    if (!ALLOWED_TAGS.has(el.tagName)) {
      const text = document.createTextNode(el.textContent || '')
      el.parentNode?.replaceChild(text, el)
      return
    }

    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase()
      if (name.startsWith('on')) {
        el.removeAttribute(attr.name)
        continue
      }
      if (el.tagName === 'B') {
        if (!ALLOWED_B_ATTRS.has(name) || (name === 'class' && attr.value !== 'fw')) {
          el.removeAttribute(attr.name)
        }
        continue
      }
      el.removeAttribute(attr.name)
    }

    for (const child of Array.from(el.childNodes)) clean(child)
  }

  for (const child of Array.from(template.content.childNodes)) clean(child)

  return template.innerHTML
}
