'use client'

interface StudyPattern {
  title: string
  structure: string
  explanation: string
  source: string
  sourceTranslation: string
  example: string
  translation: string
}

interface StudyNotes {
  introduction: string
  patterns: StudyPattern[]
  context: string
  challenge: string
}

const NOTES: Record<string, StudyNotes> = {
  'f6f155b9-6fd7-4609-af85-c97c0a6466b3': {
    introduction: '这一期聊「最近喜欢的东西」。先听她怎么开场，再试着介绍自己的心头好。',
    patterns: [
      { title: '想做某事', structure: 'avoir envie de + 动词原形', explanation: 'envie 就是「想要、念头」。后面接 de 和动词原形，想做什么就往后填。', source: "Il y a aussi des gadgets que j'ai envie de vous montrer.", sourceTranslation: '还有一些小东西，我想给你们看看。', example: 'J’ai envie de découvrir ce café.', translation: '我想去看看这家咖啡馆。' },
      { title: '遇到心头好', structure: 'avoir un coup de cœur pour + 人或物', explanation: '看到一件东西特别喜欢，就可以说有了 un coup de cœur。介绍书、衣服或店时都能用。', source: "J'ai eu un gros coup de cœur sur cette tendance.", sourceTranslation: '我特别喜欢这个潮流。', example: 'J’ai eu un coup de cœur pour ce livre.', translation: '这本书一下子成了我的心头好。' },
    ],
    context: '「每月最爱」视频里，博主会分享最近喜欢的东西。这期她也特意说了：视频没有赞助，收到的赠品会单独说明。',
    challenge: '最近有没有什么东西让你眼前一亮？试着用 coup de cœur 介绍它，再说一句为什么喜欢。',
  },
  '008ffc58-bc6c-4587-87ea-eb6ab61c2dfc': {
    introduction: '这一期聊护发和护肤。留意她怎么说「用多少」和「我平时容易怎样」。',
    patterns: [
      { title: '几滴就够了', structure: 'quelques + 复数名词 + suffisent', explanation: 'quelques 是「几个、一些」。这里后面接复数 gouttes；主语是复数，所以用 suffisent。', source: 'Juste quelques gouttes, ça suffit.', sourceTranslation: '只要几滴就够了。', example: 'Quelques gouttes suffisent.', translation: '几滴就够。' },
      { title: '我经常会这样', structure: 'avoir tendance à + 动词原形', explanation: '不是「一定会」，而是「容易、往往会」。说习惯或身体状况时很常见。', source: 'vous avez tendance à avoir des plis, des petites ridules au niveau des yeux', sourceTranslation: '你的眼周容易出现褶皱和细纹。', example: 'J’ai tendance à avoir les cheveux secs.', translation: '我的头发容易干。' },
    ],
    context: '片中说的是博主自己的使用感受。她介绍用量、大小规格，也说了用了以后自己的感觉；这些都是她的个人体验。',
    challenge: '想想你常用的一件东西：一次用多少？你为什么喜欢它？试着各说一句。',
  },
  'fedf6b24-bea2-4233-97e6-5c6827dabdf4': {
    introduction: '这一期从一个小风扇讲起：它是什么、怎么用、值不值得买。',
    patterns: [
      { title: '这是什么？', structure: 'il s’agit de + 名词', explanation: '介绍一件事物时可以这样开头。后面如果是 un，de 和 un 要合起来写成 d’un。', source: "Il s'agit d'un mini ventilateur portable.", sourceTranslation: '这是一个便携式小风扇。', example: 'Il s’agit d’un petit outil pratique.', translation: '这是一个实用的小工具。' },
      { title: '它能做什么？', structure: 'pouvoir + 动词原形', explanation: 'pouvoir 跟着主语变位：比如 je peux。后面的动作不变位，保持原形。', source: "Je peux régler l'intensité avec la molette.", sourceTranslation: '我可以用旋钮调节风力。', example: 'Je peux régler la luminosité.', translation: '我可以调节亮度。' },
    ],
    context: '视频结尾，她请观众点赞、评论和订阅。N’hésitez pas à 直译是「不要犹豫」，放在这里更像是亲切地说「欢迎……」。',
    challenge: '拿起身边一个常用小物件：先说它是什么，再说它能做什么。',
  },
}

export function EpisodeStudyNotes({ videoId }: { videoId: string }) {
  const notes = NOTES[videoId]
  if (!notes) return null

  return (
    <section aria-label="本期表达笔记" className="mb-7 border border-[#e6e1d8] bg-[#fffefa] px-5 py-6 text-[#2f302e] shadow-[0_2px_10px_rgba(54,45,30,0.05)] sm:px-8 sm:py-8 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100">
      <div className="border-b border-[#e7e1d7] pb-5 dark:border-stone-700">
        <p className="text-xs font-medium tracking-[0.2em] text-[#a66b52] dark:text-orange-300">NOTES · 本期笔记</p>
        <h3 className="mt-3 text-xl font-bold tracking-wide sm:text-2xl">跟着视频，把这几句话学会</h3>
        <p className="mt-3 text-sm leading-7 text-stone-600 dark:text-stone-300">{notes.introduction}</p>
      </div>
      <div className="mt-6 space-y-8">
        {notes.patterns.map((pattern, index) => (
          <article key={pattern.structure}>
            <div className="flex items-baseline gap-3"><span className="font-serif text-lg italic text-[#b77d65]">0{index + 1}</span><h4 className="text-base font-bold">{pattern.title}</h4></div>
            <p className="mt-3 inline-block bg-[#f5e9b8] px-2 py-1 text-base font-semibold leading-7 text-[#58462f] dark:bg-amber-900 dark:text-amber-100">{pattern.structure}</p>
            <p className="mt-3 text-sm leading-7 text-stone-700 dark:text-stone-300">{pattern.explanation}</p>
            <div className="mt-4 border-l-[3px] border-[#d6b8a5] pl-4">
              <p className="text-xs font-semibold text-[#9b6c59] dark:text-orange-300">视频里这样说</p>
              <p className="mt-1.5 text-[15px] font-medium leading-7">{pattern.source}</p>
              <p className="mt-1 text-sm leading-6 text-stone-500 dark:text-stone-400">{pattern.sourceTranslation}</p>
            </div>
            <div className="mt-4 bg-[#f5f4ef] px-4 py-3 text-sm leading-7 dark:bg-stone-800">
              <p className="font-semibold text-[#698073] dark:text-emerald-300">换个场景</p>
              <p className="mt-1">{pattern.example}</p><p className="text-stone-500 dark:text-stone-400">{pattern.translation}</p>
            </div>
          </article>
        ))}
      </div>
      <div className="mt-8 border-t border-[#e7e1d7] pt-6 dark:border-stone-700">
        <h4 className="text-base font-bold">再多了解一点</h4><p className="mt-2 text-sm leading-7 text-stone-700 dark:text-stone-300">{notes.context}</p>
        <div className="mt-5 border-l-[3px] border-[#d7b65b] bg-[#faf5df] px-4 py-3 dark:bg-stone-800"><h4 className="text-sm font-bold">轮到你说了</h4><p className="mt-1 text-sm leading-7 text-stone-700 dark:text-stone-300">{notes.challenge}</p></div>
      </div>
    </section>
  )
}
