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

const EDITORIAL_COMPANY_MARKS = new Map<string, string[]>([
  [normalize('P&G'), ['pg.jpg']],
  [normalize('Basecamp'), ['basecamp']],
  [normalize('adidas'), ['adidas-editorial']],
  [normalize('Boeing'), ['boeing-editorial']],
  [normalize('Adobe'), ['adobe-editorial.ico']],
  [normalize('Automattic'), ['automattic-editorial']],
  [normalize('Facebook (now Meta)'), ['facebook-editorial']],
  [normalize('LEGO'), ['lego.ico']],
  [normalize('Wells Fargo'), ['wellsfargo-editorial']],
])

const EDITORIAL_COMPANY_WORDMARKS: Record<string, {file:string;width:number;height:number}> = {
  'coca cola': {file:'cocacola-editorial.png',width:192,height:61},
  'dhl': {file:'dhl-editorial.png',width:192,height:28},
  'hilton': {file:'hilton-editorial.png',width:192,height:72},
  github: {file:'github-editorial.svg',width:416,height:95},
  posthog: {file:'posthog-editorial.svg',width:160,height:28},
  uber: {file:'uber-editorial.svg',width:72,height:30},
  zoom: {file:'zoom-editorial.png',width:1426,height:321},
  [normalize("Delta Air Lines")]: {file:'delta-editorial.png',width:199,height:31},
  [normalize("Costco")]: {file:'costco-editorial.png',width:240,height:69},
  [normalize("Disney+")]: {file:'disneyplus-editorial.png',width:192,height:105},
  [normalize("Ford")]: {file:'ford-editorial.png',width:200,height:76},
  [normalize("Visa")]: {file:'visa-editorial.png',width:200,height:66},
  [normalize("L’Oréal")]: {file:'loreal-editorial.png',width:240,height:46},
}

export function companyLogoPath(file: string) {
  return `/work-english/company-logos/${file.includes('.') ? file : `${file}.svg`}`
}

export function getCompanyBrand(company: string, editorial: boolean) {
  const wordmark = editorial ? EDITORIAL_COMPANY_WORDMARKS[normalize(company)] : undefined
  const parts = company.split(/\s*\/\s*/).filter(Boolean).slice(0, 2)
  const tokens: LogoToken[] = parts.flatMap((part): LogoToken[] => {
    const name = normalize(part)
    const slugs = (editorial ? EDITORIAL_COMPANY_MARKS.get(name) : undefined) ?? NORMALIZED_COMPANY_MARKS.get(name)
    return slugs?.length
      ? slugs.map(slug => ({kind:'logo' as const, slug}))
      : [{kind:'monogram' as const, label:initials(part)}]
  })
  return { wordmark, tokens }
}
