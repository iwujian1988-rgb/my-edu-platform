'use client'

/**
 * 地道表达卡片组件（核心差异化）
 *
 * 对应 PRD: VIDEO_MODULE_PRD.md - Section 2.6
 * 这是最重要的卡片类型，包含：
 * - 公式（语法结构）
 * - 含义
 * - 使用说明
 * - 举一反三（多个例句）
 * - 使用场景
 * - 相似表达
 */

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Volume2,
  Star,
  CheckCircle,
  XCircle,
  Lightbulb,
  MessageSquare,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { VideoExpressionCard as VideoExpressionCardType, CardStatus } from '@/types/video'

interface ExpressionCardProps {
  card: VideoExpressionCardType
  userStatus?: CardStatus
  isFavorited?: boolean
  onPlayTTS?: () => void
  onToggleFavorite?: () => void
  onStatusChange?: (status: CardStatus) => void
  compact?: boolean
  className?: string
}

export function ExpressionCard({
  card,
  userStatus,
  isFavorited,
  onPlayTTS,
  onToggleFavorite,
  onStatusChange,
  compact = false,
  className,
}: ExpressionCardProps) {
  if (compact) {
    return (
      <div className={cn('p-3 rounded-lg border bg-card', className)}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="default" className="bg-purple-500">
                地道表达
              </Badge>
              <span className="text-xs text-muted-foreground">
                {card.formality_level === 'formal'
                  ? '正式'
                  : card.formality_level === 'informal'
                    ? '非正式'
                    : '中性'}
              </span>
            </div>
            <p className="font-medium">{card.expression}</p>
            <p className="text-sm text-muted-foreground">{card.meaning}</p>
          </div>
          <div className="flex items-center gap-1">
            {onPlayTTS && (
              <Button variant="ghost" size="icon" onClick={onPlayTTS}>
                <Volume2 className="w-4 h-4" />
              </Button>
            )}
            {onToggleFavorite && (
              <Button variant="ghost" size="icon" onClick={onToggleFavorite}>
                <Star className={cn('w-4 h-4', isFavorited && 'fill-yellow-500')} />
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('rounded-lg border bg-card', className)}>
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Badge className="bg-purple-500">地道表达</Badge>
          <Badge variant="outline">
            {card.formality_level === 'formal'
              ? '正式'
              : card.formality_level === 'informal'
                ? '非正式'
                : '中性'}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          {onPlayTTS && (
            <Button variant="ghost" size="icon" onClick={onPlayTTS}>
              <Volume2 className="w-4 h-4" />
            </Button>
          )}
          {onToggleFavorite && (
            <Button variant="ghost" size="icon" onClick={onToggleFavorite}>
              <Star className={cn('w-4 h-4', isFavorited && 'fill-yellow-500')} />
            </Button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 表达 */}
        <div>
          <h3 className="text-xl font-bold text-purple-600 dark:text-purple-400">
            {card.expression}
          </h3>
        </div>

        {/* 上下文 */}
        <div className="bg-muted/50 rounded p-3">
          <p className="text-sm">{card.context}</p>
          {card.context_translation && (
            <p className="text-xs text-muted-foreground mt-1">
              {card.context_translation}
            </p>
          )}
        </div>

        {/* 公式 */}
        {card.formula && (
          <div className="flex items-start gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium">语法公式</p>
              <p className="text-sm text-muted-foreground">{card.formula}</p>
            </div>
          </div>
        )}

        {/* 含义 */}
        {card.meaning && (
          <div className="flex items-start gap-2">
            <MessageSquare className="w-5 h-5 text-blue-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium">核心含义</p>
              <p>{card.meaning}</p>
            </div>
          </div>
        )}

        {/* 使用说明 */}
        {card.usage_note && (
          <div className="bg-blue-50 dark:bg-blue-950/20 rounded p-3">
            <p className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-1">
              💡 使用说明
            </p>
            <p className="text-sm">{card.usage_note}</p>
          </div>
        )}

        {/* 举一反三 */}
        {card.examples && card.examples.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              <p className="text-sm font-medium">举一反三</p>
            </div>
            <div className="space-y-2">
              {card.examples.map((example, index) => (
                <div
                  key={index}
                  className="bg-muted/50 rounded p-3"
                >
                  <p className="text-sm">{example.original}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {example.cn}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 使用场景 */}
        {card.scenarios && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">
              🎯 使用场景
            </p>
            <p className="text-sm">{card.scenarios}</p>
          </div>
        )}

        {/* 相似表达 */}
        {card.similar_expressions && card.similar_expressions.length > 0 && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">
              🔄 相似表达
            </p>
            <div className="flex flex-wrap gap-2">
              {card.similar_expressions.map((expr, index) => (
                <Badge key={index} variant="outline">
                  {expr}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 掌握状态 */}
      {onStatusChange && (
        <div className="flex items-center justify-center gap-2 p-4 border-t">
          <Button
            variant={userStatus === 'unknown' ? 'destructive' : 'outline'}
            size="sm"
            onClick={() => onStatusChange('unknown')}
          >
            <XCircle className="w-4 h-4 mr-1" />
            不认识
          </Button>
          <Button
            variant={userStatus === 'learning' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onStatusChange('learning')}
          >
            学习中
          </Button>
          <Button
            variant={userStatus === 'known' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onStatusChange('known')}
          >
            <CheckCircle className="w-4 h-4 mr-1" />
            已掌握
          </Button>
        </div>
      )}
    </div>
  )
}
