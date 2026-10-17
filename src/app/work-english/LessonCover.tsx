import {Building2, ClipboardList, Mail, MessageCircle, Presentation, UsersRound, UserRoundCheck, MessageSquareWarning, MessagesSquare, MessageSquareReply, ShieldCheck, GitPullRequest, Handshake, MicVocal, FileText, CalendarCheck, Workflow, Target, Lightbulb, Compass, BriefcaseBusiness, AudioLines} from 'lucide-react'
import {groupForLesson} from './catalog-scenes'

const COVER_ICONS = {
  messages: Mail,
  meetings: Presentation,
  feedback: MessageCircle,
  projects: ClipboardList,
  management: UsersRound,
  onboarding: UserRoundCheck,
  company: Building2,
} as const

const SUBJECT_ICONS = [MessageSquareWarning, MessagesSquare, MessageSquareReply, ShieldCheck, GitPullRequest, Handshake, MicVocal, FileText, CalendarCheck, Workflow, Target, Lightbulb, Compass, BriefcaseBusiness, AudioLines]

interface Props {
  id: string
  company: string
  sourceType: string
  title: string
  routeStep: number | null
  action: string
}

export default function LessonCover({id,company,sourceType,title,routeStep,action}:Props) {
  const group = groupForLesson(id)
  const Icon = Number(id) <= 3 ? SUBJECT_ICONS[Number(id) - 1] : SUBJECT_ICONS[Number(id) % SUBJECT_ICONS.length] ?? (group ? COVER_ICONS[group.id] : Mail)
  const variant = Number(id) % 4
  return <div className={`we-cover we-cover-${group?.tone ?? 'sage'} we-cover-variant-${variant}`}>
    <div className="we-cover-paper" aria-hidden="true"/>
    <div className="we-cover-top"><span className="we-cover-company">{company}</span><span className="we-cover-kind">{sourceType}</span></div>
    <div className="we-cover-art" aria-hidden="true"><span className="we-cover-art-ring"/><Icon size={78} strokeWidth={1.3}/></div>
    <div className="we-cover-content"><span className="we-cover-scene">{group?.name ?? '职场英语'} / {group?.coverWord ?? 'WORK'}</span><strong>{title}</strong></div>
    <div className="we-cover-bottom"><span>{routeStep ? `路线第 ${routeStep} 步` : `第 ${id} 期`}</span><span className="we-cover-action" aria-hidden="true">{action} ↗</span></div>
  </div>
}
