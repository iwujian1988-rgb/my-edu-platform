import React from 'react'

type CoverType = 'cn' | 'global' | 'k12' | 'uni'

interface BookCoverProps {
  code: string        // 大字，如 'GR'
  title: string       // 标签，如 'GRE'
  type: CoverType     // 封面类型
}

/**
 * 词库封面组件 - Neo-Brutalism 风格
 *
 * 4种封面类型：
 * - cn: 国内考试（红色/印章/档案风）
 * - global: 国外考试（蓝色/航空/邮件风）
 * - k12: K12教材（黄色/作业本/涂鸦风）
 * - uni: 大学教材（紫色/学术/极简风）
 */
export function BookCover({ code, title, type }: BookCoverProps) {
  // 背景样式类名映射
  const bgClasses: Record<CoverType, string> = {
    cn: 'bg-red-50',
    global: 'bg-blue-50',
    k12: 'bg-yellow-50',
    uni: 'bg-white'
  }

  // 边框颜色映射
  const borderColors: Record<CoverType, string> = {
    cn: '#DC2626',
    global: '#2563EB',
    k12: '#FACC15',
    uni: '#7C3AED'
  }

  // 装饰元素
  const decorations: Record<CoverType, React.ReactNode> = {
    cn: (
      <div className="absolute top-3 right-3">
        <div className="w-12 h-12 rounded-full border-[3px] border-black flex items-center justify-center bg-[#DC2626]">
          <span className="text-white font-black text-xs">CN</span>
        </div>
      </div>
    ),
    global: (
      <div className="absolute top-0 left-0 right-0 h-2 flex">
        <div className="flex-1 bg-red-500"></div>
        <div className="flex-1 bg-blue-500"></div>
        <div className="flex-1 bg-red-500"></div>
      </div>
    ),
    k12: (
      <div className="absolute bottom-3 left-3">
        <div className="w-8 h-8 border-[2px] border-black rounded-full flex items-center justify-center bg-[#FACC15]">
          <div className="w-4 h-4 bg-black rounded-full"></div>
        </div>
      </div>
    ),
    uni: (
      <div className="absolute top-0 right-0 w-16 h-8 bg-[#7C3AED] flex items-center justify-center">
        <span className="text-white text-xs font-bold">UNI</span>
      </div>
    )
  }

  const borderColor = borderColors[type]

  return (
    <div className="relative w-full aspect-[3/4] group cursor-pointer">
      {/* 阴影层 */}
      <div className="absolute inset-0 bg-black rounded-xl translate-x-2 translate-y-2 -z-10" />

      {/* 封面主体 */}
      <div
        className={`
          relative w-full h-full rounded-xl overflow-hidden
          border-[3px] border-black
          transition-transform duration-200
          group-hover:-translate-y-1
          ${bgClasses[type]}
        `}
      >
        {/* 装饰元素 */}
        {decorations[type]}

        {/* 文字层 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
          {/* 核心大字 */}
          <h1 className="text-7xl font-black tracking-tighter leading-none text-black drop-shadow-[2px_2px_0px_#fff] lg:text-8xl">
            {code}
          </h1>

          {/* 标题标签 */}
          <div className="mt-4 px-4 py-2 border-[2px] border-black text-white text-xs font-bold uppercase shadow-[3px_3px_0px_0px_#000] transition-all duration-200 group-hover:shadow-[4px_4px_0px_0px_#000]" style={{ backgroundColor: borderColor }}>
            {title}
          </div>
        </div>

        {/* 底部装饰线 */}
        <div className="absolute bottom-0 left-0 right-0 h-2" style={{ backgroundColor: borderColor }} />
      </div>
    </div>
  )
}
