import {
  BookOpen,
  GraduationCap,
  Languages,
  Brain,
  Lightbulb,
  Target,
  Trophy,
  Globe,
  Sparkles,
  FileText,
  Library,
  Award,
  Bookmark
} from 'lucide-react'

interface BookIconProps {
  title: string
  size?: 'sm' | 'md' | 'lg'
}

/**
 * 为单词书匹配合适的图标
 * 基于书名关键词智能选择，并添加独特性
 */
export function BookIcon({ title, size = 'md' }: BookIconProps) {
  // 根据书名生成唯一ID，用于选择图标和颜色
  const generateId = (title: string): number => {
    let id = 0
    for (let i = 0; i < title.length; i++) {
      id += title.charCodeAt(i)
    }
    return id
  }

  const id = generateId(title)

  // 可用的图标列表
  const availableIcons = [
    BookOpen, GraduationCap, Languages, Brain, Lightbulb,
    Target, Trophy, Globe, Sparkles, FileText, Library, Award, Bookmark
  ]

  // 图标匹配规则（优先级从高到低）
  const getIconForTitle = (title: string): React.ElementType => {
    const lowerTitle = title.toLowerCase()

    // 演示数据 - 使用特殊图标
    if (lowerTitle.includes('演示') || lowerTitle.includes('demo')) {
      return FileText
    }

    // 考试相关（更具体的关键词优先）
    if (lowerTitle.includes('ielts') || lowerTitle.includes('雅思')) {
      return Trophy
    }
    if (lowerTitle.includes('toefl') || lowerTitle.includes('托福')) {
      return Award
    }
    if (lowerTitle.includes('gre') || lowerTitle.includes('sat')) {
      return Target
    }
    if (lowerTitle.includes('cet-4') || lowerTitle.includes('四级') || lowerTitle.includes('cet-6') || lowerTitle.includes('六级')) {
      return GraduationCap
    }

    // 具体的学习类型
    if (lowerTitle.includes('核心') && lowerTitle.includes('词汇')) {
      return Brain
    }
    if (lowerTitle.includes('商务') && lowerTitle.includes('英语')) {
      return Globe
    }
    if (lowerTitle.includes('基础') || lowerTitle.includes('入门')) {
      return Sparkles
    }

    // 如果标题包含"英语"但没有其他具体信息，根据ID轮换图标
    if (lowerTitle.includes('英语') || lowerTitle.includes('english') || lowerTitle.includes('词汇')) {
      // 根据ID选择不同的图标，避免重复
      const alternativeIcons = [BookOpen, Languages, Lightbulb, Library, Bookmark]
      return alternativeIcons[id % alternativeIcons.length]
    }

    // 默认：根据ID轮换图标，确保每个书都不一样
    return availableIcons[id % availableIcons.length]
  }

  const IconComponent = getIconForTitle(title)

  // 根据ID生成独特的渐变色方案
  const gradients = [
    'from-indigo-500 to-purple-600',
    'from-emerald-500 to-teal-600',
    'from-rose-500 to-pink-600',
    'from-amber-500 to-orange-600',
    'from-cyan-500 to-blue-600',
    'from-violet-500 to-purple-600',
    'from-sky-500 to-indigo-600',
    'from-lime-500 to-green-600',
    'from-fuchsia-500 to-pink-600',
    'from-teal-500 to-cyan-600'
  ]

  const gradient = gradients[id % gradients.length]

  // 尺寸配置
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  }

  const iconSize = {
    sm: 18,
    md: 22,
    lg: 26
  }

  return (
    <div className={`${sizeClasses[size]} bg-gradient-to-br ${gradient} rounded shadow-sm flex items-center justify-center`}>
      <IconComponent size={iconSize[size]} className="text-white" strokeWidth={2} />
    </div>
  )
}

