import Image from 'next/image'
import { companyLogoPath, getCompanyBrand } from './company-brand'

export function CompanyLogo({company, className = '', editorial = false}:{company:string;className?:string;editorial?:boolean}) {
  const { wordmark, tokens } = getCompanyBrand(company, editorial)
  if (wordmark) return <span className={`we-company-logo we-company-logo--wordmark ${className}`} title={company}>
    <Image src={companyLogoPath(wordmark.file)} width={wordmark.width} height={wordmark.height} alt={company} unoptimized/>
  </span>
  return <span className={`we-company-logo ${className}`} aria-label={company} title={company}>
    <span className="we-company-logo-marks" aria-hidden="true">
      {tokens.map((token, index) => token.kind === 'logo'
        ? <Image key={`${token.slug}-${index}`} src={companyLogoPath(token.slug)} width={17} height={17} alt="" unoptimized/>
        : <span className="we-company-logo-monogram" key={`${token.label}-${index}`}>{token.label}</span>)}
    </span>
    <span className="we-company-logo-text">{company}</span>
  </span>
}
