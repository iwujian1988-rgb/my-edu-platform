import { Keyboard, FileText, Layers, Gamepad2, Zap } from 'lucide-react'
import { MODE_CONFIG, SCOPE_LABELS, type LearningMode, type ScopeType } from '@/types/progress'
import { formatTimeAgo } from '@/lib/timeUtils'

/**
 * CourseCard - 工业风 Neo-Brutalism 进度卡片组件
 *
 * 设计规范：
 * - 核心风格：数据终端视觉语言，工业设计美学
 * - 排版：标题粗体无衬线，数据使用等宽字体 (Monospace)
 * - 装饰：螺丝钉、条纹背景、装饰性编号 (ID: TASK-01)
 * - 色彩：黑白灰为主 + 高亮色（荧光绿/信号红）点缀
 * - 交互：按压感 (scale-95) + 机械回弹 (阴影错位)
 */

interface CourseCardProps {
  /** 课程名称 */
  title: string
  /** 学习模式 */
  mode: LearningMode
  /** 学习范围 */
  scopeType: ScopeType
  /** 进度百分比 (0-100) */
  percentage: number
  /** 当前进度 */
  current: number
  /** 总数 */
  total: number
  /** 上次学习时间（时间戳） */
  lastTime: number
  /** 点击跳转链接 */
  href: string
  /** 课程ID（用于测试和任务编号） */
  bookId?: string
}

export function CourseCard({
  title,
  mode,
  scopeType,
  percentage,
  current,
  total,
  lastTime,
  href,
  bookId
}: CourseCardProps) {
  // 获取模式配置
  const modeConfig = MODE_CONFIG[mode]
  const ModeIcon = modeConfig.icon
  const modeLabel = modeConfig.label
  const themeColor = modeConfig.color
  const themeLight = modeConfig.light

  // 范围标签
  const scopeLabel = SCOPE_LABELS[scopeType]

  // 时间标签
  const timeLabel = formatTimeAgo(lastTime)

  // 构建副标题：模式 + 范围
  const subText = `${modeLabel} · ${scopeLabel}`

  // 生成任务编号 (基于 bookId 的 hash，保持一致性)
  const taskNumber = `TASK-${String(bookId?.slice(0, 2) || '01').toUpperCase()}`

  return (
    <a
      href={href}
      className="group block"
      data-testid="progress-card"
      data-book-id={bookId}
    >
      <div className="group relative w-full h-44 cursor-pointer active:scale-95 transition-transform">
        {/* A. 阴影层 (深色偏移，模拟厚度) */}
        <div className="absolute inset-0 bg-gray-900 rounded translate-x-2 translate-y-2 transition-transform group-hover:translate-x-3 group-hover:translate-y-3" />

        {/* B. 卡片主体 */}
        <div className="relative h-full bg-white border-2 border-black rounded overflow-hidden flex flex-col transition-transform group-hover:-translate-y-0.5 group-hover:-translate-x-0.5">

          {/* --- 顶部 Header: 工业编号栏 --- */}
          <div className="h-9 border-b-2 border-black flex items-center justify-between px-3 bg-gray-50">
            {/* 装饰性编号 */}
            <span className="font-mono text-[10px] font-bold text-gray-400 tracking-widest">
              {taskNumber}
            </span>
            {/* 装饰性螺丝钉 */}
            <div className="flex gap-1.5">
              <div className="w-1 h-1 rounded-full bg-gray-300"></div>
              <div className="w-1 h-1 rounded-full bg-gray-300"></div>
            </div>
          </div>

          {/* --- 中间 Content: 核心信息 --- */}
          <div className="p-4 flex-1 flex flex-col justify-between relative">

            {/* 1. 标题与右上角按键 */}
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0 pr-2">
                {/* 标题 - 粗体无衬线 */}
                <h3 className="text-xl font-black text-black leading-none tracking-tight truncate">
                  {title}
                </h3>

                {/* 模式标签 (Badge 风格) */}
                <div className="mt-2 inline-flex items-center px-1.5 py-0.5 border border-black rounded bg-gray-100">
                  <ModeIcon className="w-3 h-3 mr-1" strokeWidth={2.5} />
                  <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wide">
                    {subText}
                  </span>
                </div>
              </div>

              {/* 右上角图标 (实体按键风格) */}
              <div className={`w-9 h-9 border-2 border-black rounded shadow-[2px_2px_0px_0px_#000] flex items-center justify-center shrink-0 ${themeLight}`}>
                <ModeIcon className="w-5 h-5 text-black" strokeWidth={2} />
              </div>
            </div>

            {/* 2. 底部数据区 (精密仪表盘风格) */}
            <div className="flex items-end justify-between mt-2">
              {/* 左侧：巨大百分比 */}
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-gray-400 font-mono mb-[-2px]">PROGRESS</span>
                <div className="text-4xl font-black text-black leading-none">
                  {percentage}<span className="text-lg ml-1">%</span>
                </div>
              </div>

              {/* 右侧：详细数据 (等宽字体) */}
              <div className="text-right">
                <div className="font-mono text-xs font-bold text-black bg-gray-100 px-1 border border-gray-200 rounded mb-1">
                  {current} / {total}
                </div>
                <div className="text-[10px] font-bold text-gray-400 flex items-center justify-end gap-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${themeColor}`}></div>
                  {timeLabel}
                </div>
              </div>
            </div>

          </div>

          {/* 底部进度条 - 绝对定位贴边 */}
          <div className="absolute bottom-0 left-0 w-full h-1.5 bg-gray-100 border-t-2 border-black">
            <div
              className={`h-full border-r-2 border-black transition-all duration-500 ${mode === 'typing' ? 'bg-[#ccff00]' : 'bg-black'}`}
              style={{ width: `${percentage}%` }}
            />
          </div>

        </div>
      </div>
    </a>
  )
}
