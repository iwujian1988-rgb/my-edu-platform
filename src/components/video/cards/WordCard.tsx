'use client'

/**
 * 单词卡片组件
 *
 * 对应 PRD: VIDEO_MODULE_PRD.md - Section 2.6
 */

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Volume2, Star, CheckCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { VideoWordCard as VideoWordCardType, CardStatus } from '@/types/video'

interface WordCardProps {
  card: VideoWordCardType
  userStatus?: CardStatus
  isFavorited?: boolean
  onPlayTTS?: () => void
  onToggleFavorite?: () => void
  onStatusChange?: (status: CardStatus) => void
  compact?: boolean
  className?: string
}

export function WordCard({
  card,
  userStatus,
  isFavorited,
  onPlayTTS,
  onToggleFavorite,
  onStatusChange,
  compact = false,
  className,
}: WordCardProps) {
  if (compact) {
    return (
      <div className={cn('p-3 rounded-lg border bg-card', className)}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold">{card.word}</span>
              {card.phonetic && (
                <span className="text-xs text-muted-foreground">{card.phonetic}</span>
              )}
              {card.part_of_speech && (
                <Badge variant="outline" className="text-xs">{card.part_of_speech}</Badge>
              )}
            </div>
            <p className="text-sm mt-1">{card.chinese_definition}</p>
          </div>
          <div className="flex items-center gap-1">
            {onPlayTTS && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onPlayTTS}>
                <Volume2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('p-4 rounded-lg border bg-card', className)}>
      {/* 头部 */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold">{card.word}</h3>
            {card.difficulty_level && (
              <Badge variant="secondary">
                {'★'.repeat(card.difficulty_level)}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            {card.phonetic && (
              <span className="text-muted-foreground">{card.phonetic}</span>
            )}
            {card.part_of_speech && (
              <Badge variant="outline">{card.part_of_speech}</Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {onPlayTTS && (
            <Button variant="ghost" size="icon" onClick={onPlayTTS}>
              <Volume2 className="w-4 h-4" />
            </Button>
          )}
          {onToggleFavorite && (
            <Button variant="ghost" size="icon" onClick={onToggleFavorite}>
              <Star
                className={cn(
                  'w-4 h-4',
                  isFavorited && 'fill-yellow-500 text-yellow-500'
                )}
              />
            </Button>
          )}
        </div>
      </div>

      {/* 释义 */}
      <div className="space-y-2 mb-3">
        <p className="font-medium">{card.chinese_definition}</p>
        {card.english_definition && (
          <p className="text-sm text-muted-foreground">{card.english_definition}</p>
        )}
      </div>

      {/* 视频中的例句 */}
      {card.example_from_video && (
        <div className="bg-muted/50 rounded-lg p-3 mb-3">
          <p className="text-sm italic">{card.example_from_video}</p>
          {card.example_translation && (
            <p className="text-xs text-muted-foreground mt-1">
              {card.example_translation}
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
