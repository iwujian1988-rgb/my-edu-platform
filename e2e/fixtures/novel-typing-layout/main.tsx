import { createRoot } from 'react-dom/client'
import { NovelReader } from '../../../src/components/novel/NovelReader'
import '../../../src/app/globals.css'
const paragraphs = [
  '跟着人流往出走，抬头全是法语。好在每块牌子底下都有箭头，全都指着同一个词：<b class="fw" data-w="la sortie">la sortie</b>（出口）。',
  '<b class="fw" data-w="bonjour">Bonjour</b>（你好）。<b class="fw" data-w="salut">Salut</b>（问候）。',
  '他翻了两页，指指箱子：<b class="fw" data-w="ouvrir">Ouvrir</b>（打开），<b class="fw" data-w="la valise">la valise</b>（行李箱）。',
  '她笑着指向窗外，说附近有一家 <b class="fw" data-w="école">école</b>（学校）。我忽然觉得，这座城市也没那么陌生。',
]
createRoot(document.getElementById('root')!).render(<NovelReader bookId="qa-novel" totalChapters={12} chapter={{ number: 2, title: '落地第一天，我被锁在了门外', contentHtml: Array.from({ length: 6 }, () => paragraphs).flat().map(p => `<p>${p}</p>`).join('') }} newWords={[]} />)
