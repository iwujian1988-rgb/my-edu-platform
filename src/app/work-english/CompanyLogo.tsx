import Image from 'next/image'

const COMPANY_MARKS: Record<string, string[]> = {
  '37signals': ['basecamp'],
  airbnb: ['airbnb'],
  amazon: ['amazon'],
  'amazon selling partners': ['amazon'],
  apple: ['apple'],
  asana: ['asana'],
  atlassian: ['atlassian'],
  buffer: ['buffer'],
  checkmarx: ['checkmarx'],
  'coca-cola': ['cocacola'],
  'the coca-cola company': ['cocacola'],
  dhl: ['dhl'],
  'alibaba.com': ['alibabadotcom'],
  dropbox: ['dropbox'],
  fedex: ['fedex'],
  'fedex dataworks': ['fedex'],
  gitlab: ['gitlab'],
  google: ['google'],
  'google cloud': ['googlecloud'],
  hilton: ['hilton'],
  'hampton by hilton': ['hilton'],
  hubspot: ['hubspot'],
  ikea: ['ikea'],
  marriott: ['marriott'],
  'marriott international': ['marriott'],
  mastercard: ['mastercard'],
  'mcdonald’s': ['mcdonalds'],
  "mcdonald's": ['mcdonalds'],
  meta: ['meta'],
  microsoft: ['microsoft'],
  netflix: ['netflix'],
  nike: ['nike'],
  'octopus deploy': ['octopusdeploy'],
  o2: ['o2'],
  samsung: ['samsung'],
  'samsung electronics': ['samsung'],
  shopify: ['shopify'],
  starbucks: ['starbucks'],
  spotify: ['spotify'],
  stripe: ['stripe'],
  target: ['target'],
  toyota: ['toyota'],
  'toyota motor corporation': ['toyota'],
  uber: ['uber'],
  unilever: ['unilever'],
  ups: ['ups'],
  'virgin media o2': ['virginmedia', 'o2'],
  'wipro enterprises': ['wipro'],
  zendesk: ['zendesk'],
  'amazon web services': ['aws.ico'],
  'best buy': ['bestbuy.ico'],
  cognizant: ['cognizant.ico'],
  'the home depot': ['homedepot.png'],
  ibm: ['ibm.ico'],
  'jpmorgan chase': ['jpmorganchase.jpg'],
  'lego group': ['lego.ico'],
  'marks & spencer': ['marksandspencer.png'],
  nestlé: ['nestle.jpg'],
  pepsico: ['pepsico.ico'],
  'procter & gamble': ['pg.jpg'],
  'spar holding bv': ['spar.png'],
  salesforce: ['salesforce.png'],
  slack: ['slack.ico'],
  'digital saksham': [],
  'no days wasted': ['nodayswasted.png'],
  'aritzia': ['aritzia.png'],
  'ey': ['ey.png'],
  weathertech: ['weathertech.png'],
  walmart: ['walmart.ico'],
  wayfair: ['wayfair.ico'],
  weetabix: ['weetabix.png'],
  toast: ['toast.ico'],
  'the walt disney company': ['disney.ico'],
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ')
}

const NORMALIZED_COMPANY_MARKS = new Map(Object.entries(COMPANY_MARKS).map(([name, slugs]) => [normalize(name), slugs]))

type LogoToken = {kind:'logo'; slug:string} | {kind:'monogram'; label:string}

function initials(value: string) {
  const words = value.match(/[A-Z0-9]+|[a-z0-9]+/g) ?? []
  return (words.length > 1 ? words.map(word => word[0]) : [words[0]?.slice(0, 2) ?? '?']).join('').slice(0, 3).toUpperCase()
}

export function CompanyLogo({company, className = ''}:{company:string;className?:string}) {
  const parts = company.split(/\s*\/\s*/).filter(Boolean).slice(0, 2)
  const tokens: LogoToken[] = parts.flatMap((part): LogoToken[] => {
    const slugs = NORMALIZED_COMPANY_MARKS.get(normalize(part))
    return slugs?.length
      ? slugs.map(slug => ({kind:'logo' as const, slug}))
      : [{kind:'monogram' as const, label:initials(part)}]
  })
  return <span className={`we-company-logo ${className}`} aria-label={company} title={company}>
    <span className="we-company-logo-marks" aria-hidden="true">
      {tokens.map((token, index) => token.kind === 'logo'
        ? <Image key={`${token.slug}-${index}`} src={`/work-english/company-logos/${token.slug.includes('.') ? token.slug : `${token.slug}.svg`}`} width={17} height={17} alt="" unoptimized/>
        : <span className="we-company-logo-monogram" key={`${token.label}-${index}`}>{token.label}</span>)}
    </span>
    <span className="we-company-logo-text">{company}</span>
  </span>
}
