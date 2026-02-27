/**
 * 时间轴页面 - 客户端组件
 */

'use client'

import { useRouter } from 'next/navigation'
import { CheckCircle2, Circle, PlayCircle, BookOpen, Mic, Music, BookText } from 'lucide-react'
import type { SpeakerArticle, SpeakerProgress } from '@/types/speaker'

interface TimelineClientProps {
  article: SpeakerArticle
  progress: SpeakerProgress | null
}

export function TimelineClient({ article, progress }: TimelineClientProps) {
  const router = useRouter()

  // 计算当前应该进行的步骤
  const getCurrentStep = () => {
    if (!progress) return 0

    // 按顺序找到第一个未完成的步骤
    if (!progress.step1_completed) return 0
    if (!progress.step2_completed) return 1
    if (!progress.step3_completed) return 2
    if (!progress.step4_completed) return 3
    return 3 // 全部完成，停留在最后一步
  }

  const currentStepIndex = getCurrentStep()

  // 步骤定义
  const steps = [
    {
      id: 'step1',
      number: 1,
      title: '整段盲听',
      description: '纯听觉输入，建立整体印象',
      icon: PlayCircle,
      completed: progress?.step1_completed ?? false,
      current: currentStepIndex === 0,
      path: `/speaker/steps/step1?id=${article.id}`
    },
    {
      id: 'step2',
      number: 2,
      title: '听写训练',
      description: '逐句听写，核心练习',
      icon: BookOpen,
      completed: progress?.step2_completed ?? false,
      current: currentStepIndex === 1,
      path: `/speaker/steps/step2?id=${article.id}`
    },
    {
      id: 'step2_5',
      number: 3,
      title: '搞懂单词',
      description: '她说："查字典把听不懂的单词学完"',
      icon: BookText,
      completed: false, // 魔鬼单词表不需要完成状态追踪
      current: false,   // 不影响进度判断
      path: `/speaker/ghost-words?articleId=${article.id}`
    },
    {
      id: 'step3',
      number: 4,
      title: '跟读背诵',
      description: '模仿发音，强化记忆',
      icon: Mic,
      completed: progress?.step3_completed ?? false,
      current: currentStepIndex === 2,
      path: `/speaker/steps/step3?id=${article.id}`
    },
    {
      id: 'step4',
      number: 5,
      title: '原音对比',
      description: '背到和原音一样快 方可结束',
      icon: Music,
      completed: progress?.step4_completed ?? false,
      current: currentStepIndex === 3,
      path: `/speaker/steps/step4?id=${article.id}`
    }
  ]

  const handleStepClick = (path: string) => {
    console.log('[Timeline] 点击步骤:', path)
    router.push(path)
  }

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      {/* 页面头部 */}
      <div className="bg-white dark:bg-gray-800 border-b-[3px] border-black dark:border-gray-600 transition-colors duration-300">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* 返回按钮 */}
          <button
            onClick={() => router.push('/speaker')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-600 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666] hover:shadow-[2px_2px_0px_0px_#000] dark:hover:shadow-[2px_2px_0px_0px_#666] hover:-translate-y-0.5 text-sm font-black tracking-tight transition-all duration-150 text-black dark:text-white mb-6"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            返回文章列表
          </button>

          {/* 标题 */}
          <h1 className="text-2xl md:text-4xl lg:text-5xl font-black tracking-tight leading-snug text-black dark:text-white transition-colors duration-300 mb-4 font-sans">
            {article.title}
          </h1>

          {/* 标签组 */}
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            {/* Level 标签 - 荧光绿背景 */}
            <div className="px-2 md:px-4 py-1 md:py-2 bg-[#B4F416] border-[2px] md:border-[3px] border-black shadow-[2px_2px_0px_0px_#000] md:shadow-[4px_4px_0px_0px_#000]">
              <span className="text-xs md:text-sm font-black tracking-tight text-black">
                LEVEL {article.level}
              </span>
            </div>

            {/* 句数标签 */}
            <div className="px-2 md:px-4 py-1 md:py-2 bg-white dark:bg-gray-800 border-[2px] md:border-[3px] border-black dark:border-gray-600 shadow-[2px_2px_0px_0px_#000] md:shadow-[4px_4px_0px_0px_#000] dark:shadow-[2px_2px_0px_0px_#666] md:dark:shadow-[4px_4px_0px_0px_#666]">
              <span className="text-xs md:text-sm font-black tracking-tight text-black dark:text-white">
                {article.total_sentences} 句
              </span>
            </div>

            {/* 状态标签（如果有进度） */}
            {progress && (
              <div className={`px-2 md:px-4 py-1 md:py-2 border-[2px] md:border-[3px] border-black dark:border-gray-600 shadow-[2px_2px_0px_0px_#000] md:shadow-[4px_4px_0px_0px_#000] dark:shadow-[2px_2px_0px_0px_#666] md:dark:shadow-[4px_4px_0px_0px_#666] ${
                progress.status === 'completed'
                  ? 'bg-[#B4F416]'
                  : progress.status === 'in_progress'
                  ? 'bg-blue-400'
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}>
                <span className="text-xs md:text-sm font-black tracking-tight text-black dark:text-white">
                  {progress.status === 'completed' ? '✓ 已完成' : progress.status === 'in_progress' ? '→ 进行中' : '○ 未开始'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 时间轴内容 */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-12">
        <div className="relative">
          {/* 进度连线 - 左侧 */}
          <div className="absolute left-6 md:left-10 top-0 bottom-0 w-0.5 md:w-1 bg-gray-200 dark:bg-gray-700 -z-10">
            {/* 进度填充 - 荧光绿 */}
            <div
              className="bg-[#B4F416] transition-all duration-500"
              style={{
                height: `${((currentStepIndex + 1) / steps.length) * 100}%`
              }}
            />
          </div>

          <div className="space-y-3 md:space-y-6">
            {steps.map((step, index) => {
              const Icon = step.icon

              return (
                <button
                  key={step.id}
                  onClick={() => handleStepClick(step.path)}
                  className={`group w-full relative border-[2px] md:border-[3px] transition-all duration-150 overflow-hidden rounded-sm ${
                    step.current
                      ? 'bg-[#B4F416] border-black dark:border-gray-600 shadow-[4px_4px_0px_0px_#000] md:shadow-[8px_8px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666] md:dark:shadow-[8px_8px_0px_0px_#666] scale-[1.02] md:scale-105'
                      : 'bg-white dark:bg-gray-800 border-black dark:border-gray-600 shadow-[3px_3px_0px_0px_#000] md:shadow-[6px_6px_0px_0px_#000] dark:shadow-[3px_3px_0px_0px_#666] md:dark:shadow-[6px_6px_0px_0px_#666] hover:shadow-[4px_4px_0px_0px_#000] md:hover:shadow-[8px_8px_0px_0px_#000] dark:hover:shadow-[4px_4px_0px_0px_#666] md:dark:hover:shadow-[8px_8px_0px_0px_#666] hover:-translate-y-1'
                  }`}
                >
                  {/* 当前步骤标签 */}
                  {step.current && !step.completed && (
                    <div className="absolute top-1.5 md:top-2 right-1.5 md:right-2 px-1.5 md:px-2 py-0.5 md:py-1 bg-black text-white text-[10px] md:text-xs font-black rounded-sm animate-pulse">
                      当前
                    </div>
                  )}

                  <div className="flex items-stretch">
                    {/* 左侧序号 - 黑色圆圈 */}
                    <div className={`relative w-12 md:w-20 flex items-center justify-center flex-shrink-0 transition-colors duration-300 ${
                      step.completed || step.current
                        ? 'bg-black dark:bg-black'
                        : 'bg-gray-300 dark:bg-gray-700'
                    }`}>
                      <span className={`font-mono font-black text-2xl md:text-4xl ${
                        step.completed || step.current
                          ? 'text-white dark:text-white'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {String(step.number).padStart(2, '0')}
                      </span>

                      {/* 完成标记 */}
                      {step.completed && (
                        <div className="absolute top-1.5 md:top-2 right-1.5 md:right-2 w-3.5 h-3.5 md:w-5 md:h-5 bg-[#B4F416] border-2 border-white rounded-full flex items-center justify-center">
                          <CheckCircle2 className="w-2 h-2 md:w-3 md:h-3 text-black" strokeWidth={3} />
                        </div>
                      )}
                    </div>

                    {/* 右侧内容区域 */}
                    <div className="flex-1 p-3 md:p-6 text-left">
                      <div className="flex items-start justify-between gap-2 md:gap-4">
                        <div className="flex items-start gap-2 md:gap-4 flex-1">
                          {/* 图标 - 白底黑框，hover变荧光绿 */}
                          <div className={`
                            p-1.5 md:p-3 border-[2px] border-black dark:border-gray-600 rounded-sm transition-all duration-150
                            ${step.completed || step.current
                              ? 'bg-[#B4F416]'
                              : 'bg-white dark:bg-gray-800 group-hover:bg-[#B4F416]'
                            }
                          `}>
                            <Icon className="w-4 h-4 md:w-6 md:h-6 text-black dark:text-white" strokeWidth={3} />
                          </div>

                          {/* 标题和描述 */}
                          <div className="flex-1">
                            <h3 className={`
                              text-base md:text-xl font-black tracking-tight mb-1 md:mb-2 uppercase font-sans
                              ${step.completed || step.current
                                ? 'text-black dark:text-white'
                                : 'text-gray-900 dark:text-white'
                              } transition-colors duration-300
                            `}>
                              {step.title}
                            </h3>
                            <p className="text-xs md:text-sm font-bold text-gray-600 dark:text-gray-400 transition-colors duration-300 font-sans">
                              {step.description}
                            </p>
                          </div>
                        </div>

                        {/* 箭头 - 正方形容器，hover变全黑 */}
                        <div className={`
                          flex-shrink-0 w-8 h-8 md:w-10 md:h-10 flex items-center justify-center
                          border-[2px] border-black dark:border-gray-600 rounded-sm
                          transition-all duration-150
                          group-hover:bg-black dark:group-hover:bg-black group-hover:text-white
                        `}>
                          <svg className="w-4 h-4 md:w-5 md:h-5 text-black dark:text-white group-hover:text-white transition-transform duration-300 group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* 提示信息 - Neo-Brutalism 警告栏 */}
        <div className="mt-12 p-6 bg-gray-100 dark:bg-gray-800 border-[3px] border-black dark:border-gray-600 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666] rounded-sm transition-colors duration-300">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-[#B4F416] border-[3px] border-black rounded-sm flex items-center justify-center">
                <svg className="w-6 h-6 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <h4 className="text-base font-black tracking-tight uppercase text-black dark:text-white mb-2 transition-colors duration-300 font-sans">
                学习提示
              </h4>
              <p className="text-sm font-bold text-gray-700 dark:text-gray-300 transition-colors duration-300 font-sans">
                你可以自由选择任意步骤开始学习，不需要按顺序完成。建议按照 Step 1 → Step 2 → Step 3 → Step 4 的顺序循序渐进。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
