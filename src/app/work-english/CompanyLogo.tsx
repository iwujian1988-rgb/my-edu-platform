import Image from 'next/image'

const COMPANY_MARKS: Record<string, {label:string; slug:string; className?:string}> = {
  Google: {label:'Google', slug:'google'},
  Microsoft: {label:'Microsoft', slug:'microsoft'},
  Amazon: {label:'Amazon', slug:'amazon'},
  Netflix: {label:'Netflix', slug:'netflix'},
  Meta: {label:'Meta', slug:'meta'},
  Airbnb: {label:'Airbnb', slug:'airbnb'},
  Atlassian: {label:'Atlassian', slug:'atlassian'},
  Dropbox: {label:'Dropbox', slug:'dropbox'},
  GitLab: {label:'GitLab', slug:'gitlab'},
  '37signals': {label:'Basecamp', slug:'basecamp'},
}

export function CompanyLogo({company, className = ''}:{company:string;className?:string}) {
  const mark = COMPANY_MARKS[company] ?? {label:company,slug:'basecamp'}
  return <span className={`we-company-logo ${className}`} aria-label={mark.label} title={mark.label}>
    <Image src={`/work-english/company-logos/${mark.slug}.svg`} width={19} height={19} alt="" unoptimized/>
    <span>{mark.label}</span>
  </span>
}
