'use client'

/**
 * 短语卡片组件
 *
 * 对应 PRD: VIDEO_MODULE_PRD.md - Section 2.6
 */

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Volume2, Star, CheckCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { VideoPhraseCard as VideoPhraseCardType, CardStatus } from '@/types/video'

interface PhraseCardProps {
  card: VideoPhraseCardType
  userStatus?: CardStatus
  isFavorited?: boolean
  onPlayTTS?: () => void
  onToggleFavorite?: () => void
  onStatusChange?: (status: CardStatus) => void
  compact?: boolean
  className?: string
}

export function PhraseCard({
  card,
  userStatus,
  isFavorited,
  onPlayTTS,
  onToggleFavorite,
  onStatusChange,
  compact = false,
  className,
}: PhraseCardProps) {
  if (compact) {
    return (
      <div className={cn('p-3 rounded-lg border bg-card', className)}>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">{card.phrase}</p>
            <p className="text-sm text-muted-foreground">{card.chinese_definition}</p>
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
    <div className={cn('rounded-lg border bg-card p-4', className)}>
      {/* 头部 */}
      <div className="flex items-center justify-between mb-3">
        <Badge variant="secondary">短语</Badge>
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

      {/* 短语和音标 */}
      <div className="mb-3">
        <h3 className="text-lg font-bold">{card.phrase}</h3>
        {card.phonetic && (
          <p className="text-sm text-muted-foreground">{card.phonetic}</p>
        )}
      </div>

      {/* 释义 */}
      <p className="mb-3">{card.chinese_definition}</p>

      {/* 同义词 */}
      {card.synonyms && (
        <div className="mb-3">
          <p className="text-sm font-medium text-muted-foreground mb-1">同义表达</p>
          <p className="text-sm">{card.synonyms}</p>
        </div>
      )}

      {/* 上下文 */}
      {card.context && (
        <div className="bg-muted/50 rounded p-3 mb-3">
          <p className="text-sm">{card.context}</p>
          {card.context_translation && (
            <p className="text-xs text-muted-foreground mt-1">
              {card.context_translation}
            </p>
          )}
        </div>
      )}

      {/* 掌握状态 */}
      {onStatusChange && (
        <div className="flex items-center justify-center gap-2 pt-3 border-t">
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
