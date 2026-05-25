'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

/** 每个 step 的主题色 */
const STEP_STYLES: Array<{ dot: string; text: string; line: string }> = [
  { dot: 'bg-blue-500 text-white', text: 'text-blue-700 dark:text-blue-300', line: 'bg-blue-200 dark:bg-blue-800' },
  { dot: 'bg-indigo-500 text-white', text: 'text-indigo-700 dark:text-indigo-300', line: 'bg-indigo-200 dark:bg-indigo-800' },
  { dot: 'bg-violet-500 text-white', text: 'text-violet-700 dark:text-violet-300', line: 'bg-violet-200 dark:bg-violet-800' },
  { dot: 'bg-pink-500 text-white', text: 'text-pink-700 dark:text-pink-300', line: 'bg-pink-200 dark:bg-pink-800' },
  { dot: 'bg-amber-500 text-white', text: 'text-amber-700 dark:text-amber-300', line: 'bg-amber-200 dark:bg-amber-800' },
  { dot: 'bg-teal-500 text-white', text: 'text-teal-700 dark:text-teal-300', line: 'bg-teal-200 dark:bg-teal-800' },
  { dot: 'bg-emerald-500 text-white', text: 'text-emerald-700 dark:text-emerald-300', line: 'bg-emerald-200 dark:bg-emerald-800' },
]

interface ImmersiveSectionProps {
  index: number
  title: string
  subtitle: string
  isOpen: boolean
  isCompleted: boolean
  isLast: boolean
  onToggle: () => void
  children: React.ReactNode
}

export function ImmersiveSection({
  index,
  title,
  subtitle,
  isOpen,
  isCompleted,
  isLast,
  onToggle,
  children,
}: ImmersiveSectionProps) {
  const style = STEP_STYLES[(index - 1) % STEP_STYLES.length]

  return (
    <div className="flex gap-3">
      {/* 左侧时间线 */}
      <div className="flex flex-col items-center flex-shrink-0 w-7">
        {/* 步骤圆点 */}
        <div
          className={cn(
            'w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0 z-10',
            isCompleted ? 'bg-green-500 text-white' : style.dot
          )}
        >
          {isCompleted ? <Check className="w-3.5 h-3.5" /> : index}
        </div>
        {/* 连接线 */}
        {!isLast && (
          <div className={cn('flex-1 w-0.5 min-h-4', isCompleted ? 'bg-green-300 dark:bg-green-700' : style.line)} />
        )}
      </div>

      {/* 右侧内容 */}
      <div className="flex-1 min-w-0 pb-2">
        {/* 标题行 */}
        <button
          onClick={onToggle}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left transition-colors',
            isOpen ? 'bg-gray-50 dark:bg-gray-800/60' : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'
          )}
        >
          <div className="flex-1 min-w-0">
            <span className={cn('text-sm font-bold', isOpen ? style.text : 'text-gray-700 dark:text-gray-300')}>
              {title}
            </span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-2">{subtitle}</span>
          </div>

          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.15 }}
            className="flex-shrink-0"
          >
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </motion.div>
        </button>

        {/* 展开内容 */}
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              <div className="px-3 py-3">
                {children}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
