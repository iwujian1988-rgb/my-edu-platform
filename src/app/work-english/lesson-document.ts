import { companyLogoPath, getCompanyBrand } from './company-brand'

const sourceLogoStyle = `<style>
.article-masthead .we-source-logos{display:inline-flex;align-items:center;flex-wrap:wrap;gap:6px;max-width:100%;vertical-align:middle;margin-inline-end:9px}
.article-masthead .we-source-logos img{display:block;width:28px;height:28px;max-width:100%;object-fit:contain}
.article-masthead .we-source-logos img.we-source-wordmark{width:auto;height:auto;max-width:104px;max-height:26px}
</style>`

function escapeAttribute(value: string) {
  return value.replace(/[&"<>]/g, char => ({ '&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;' })[char]!)
}

export function decorateLessonDocument(template: string, company: string, backHref: string) {
  const withReturn = template.replace(
    'class="catalog-back" href="/work-english"',
    `class="catalog-back" href="${escapeAttribute(backHref)}"`,
  )
  const { wordmark, tokens } = getCompanyBrand(company, true)
  const images = wordmark
    ? [`<img class="we-source-wordmark" src="${companyLogoPath(wordmark.file)}" width="${wordmark.width}" height="${wordmark.height}" alt="">`]
    : tokens.flatMap(token => token.kind === 'logo'
      ? [`<img src="${companyLogoPath(token.slug)}" width="28" height="28" alt="">`]
      : [])
  if (!images.length) return withReturn

  return withReturn
    .replace('</head>', `${sourceLogoStyle}</head>`)
    .replace(/(<div class="article-masthead">\s*<strong>)/,
      (_, masthead) => `${masthead}<span class="we-source-logos" aria-hidden="true">${images.join('')}</span>`)
}
