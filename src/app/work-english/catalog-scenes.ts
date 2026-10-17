// Routes are deliberately curated: a company document belongs here only when
// its current lesson can support the named workplace task.
export const SCENE_PATHS = [
  {
    id: 'daily',
    name: '日常消息与邮件',
    question: '让同事看懂、回应并接着做',
    description: '从写清需求、回复时间，到跨时区交接。',
    lessonIds: ['072', '004', '069', '081', '060', '071', '080'],
  },
  {
    id: 'feedback',
    name: '反馈与分歧',
    question: '把难说的话说清楚',
    description: '提意见、回应反对、处理冲突。',
    lessonIds: ['001', '002', '003', '005'],
  },
] as const

export type ScenePathId = (typeof SCENE_PATHS)[number]['id']

// Every source has one primary shelf. The shelves help readers find a work
// situation; they do not assert that an unreviewed lesson is publication-ready.
export const SCENE_GROUPS = [
  {
    id: 'messages', name: '消息与邮件', question: '把请求和下一步写清楚',
    coverWord: 'MESSAGE', tone: 'sage',
    lessonIds: ['004','025','026','029','060','061','066','069','071','072','078','080','081'],
  },
  {
    id: 'meetings', name: '会议与同步', question: '让讨论留下决定',
    coverWord: 'MEETING', tone: 'blue',
    lessonIds: ['005','030','034','040','058','067','070','073','074','075','076','077','090','091','092','096'],
  },
  {
    id: 'feedback', name: '反馈与分歧', question: '把难说的话说清楚',
    coverWord: 'FEEDBACK', tone: 'coral',
    lessonIds: ['001','002','003','015','039','051','063','068','083','086','087','099'],
  },
  {
    id: 'projects', name: '项目与决策', question: '对齐职责、风险与交付',
    coverWord: 'PROJECT', tone: 'ochre',
    lessonIds: ['018','027','028','031','032','033','035','036','037','038','056','057','059','064','065','079','084'],
  },
  {
    id: 'management', name: '带团队与成长', question: '辅导同事，沟通目标',
    coverWord: 'TEAM', tone: 'lavender',
    lessonIds: ['006','007','008','009','010','019','020','021','062','082','085','095'],
  },
  {
    id: 'onboarding', name: '面试与入职', question: '从面试到融入团队',
    coverWord: 'START', tone: 'mint',
    lessonIds: ['011','012','013','014','016','017','088','089','093','097'],
  },
  {
    id: 'company', name: '名企决策与文化', question: '读懂管理层如何说明变化',
    coverWord: 'COMPANY', tone: 'slate',
    lessonIds: ['022','023','024','041','042','043','044','045','046','047','048','049','050','052','053','054','055','094','098','100'],
  },
] as const

export type SceneGroupId = (typeof SCENE_GROUPS)[number]['id']

export function groupForLesson(id: string) {
  return SCENE_GROUPS.find(group => (group.lessonIds as readonly string[]).includes(id))
}
