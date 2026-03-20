'use client'

/**
 * 卡片弹窗组件
 *
 * 对应 PRD: VIDEO_MODULE_PRD.md - Section 2.6
 * 对应 Tech: VIDEO_MODULE_TECH.md v5.0
 */

import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  X,
  Volume2,
  Star,
  CheckCircle,
  XCircle,
  GraduationCap,
  MessageSquare,
  Lightbulb,
  BookOpen,
  Pencil,
  Save,
} from 'lucide-react'
import { useTTS } from '@/hooks/use-tts'
import { useVideoFavorites } from '@/hooks/useVideoFavorites'
import { useCardNotes } from '@/hooks/useCardNotes'
import type {
  VideoCard,
  VideoWordCard,
  VideoPhraseCard,
  VideoExpressionCard,
  CardType,
  CardStatus,
  VideoLanguage,
} from '@/types/video'

interface CardPopoverProps {
  card: VideoCard
  cardType: CardType
  videoLanguage: VideoLanguage
  videoId: string
  onClose: () => void
  onStatusChange: (status: CardStatus) => void
  currentStatus?: CardStatus
}

export function CardPopover({
  card,
  cardType,
  videoLanguage,
  videoId,
  onClose,
  onStatusChange,
  currentStatus,
}: CardPopoverProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [showNoteInput, setShowNoteInput] = useState(false)

  const { speak, isSpeaking } = useTTS()
  const { isFavorited, toggleFavorite, getFavoriteId } = useVideoFavorites({ videoId })
  const { getNote, saveNote, isSaving } = useCardNotes({ videoId })

  const isFav = isFavorited(`${cardType}_card`, card.id)
  const existingNote = getNote(cardType, card.id)

  // 初始化笔记文本
  useState(() => {
    if (existingNote) {
      setNoteText(existingNote.note)
    }
  })

  // 保存笔记
  const handleSaveNote = useCallback(async () => {
    if (!noteText.trim()) return
    const success = await saveNote(cardType, card.id, noteText.trim())
    if (success) {
      setShowNoteInput(false)
    }
  }, [noteText, saveNote, cardType, card.id])

  // 播放发音
  const handlePlayTTS = useCallback(() => {
    const text = getCardText()
    if (text) {
      const langMap: Record<VideoLanguage, string> = {
        en: 'en-US',
        fr: 'fr-FR',
        de: 'de-DE',
        es: 'es-ES',
        ja: 'ja-JP',
        it: 'it-IT',
        ru: 'ru-RU',
      }
      speak(text, langMap[videoLanguage] || 'en-US')
    }
  }, [speak, videoLanguage])

  const getCardText = (): string => {
    switch (cardType) {
      case 'word':
        return (card as VideoWordCard).word
      case 'phrase':
        return (card as VideoPhraseCard).phrase
      case 'expression':
        return (card as VideoExpressionCard).expression
      default:
        return ''
    }
  }

  // 收藏/取消收藏
  const handleToggleFavorite = useCallback(async () => {
    await toggleFavorite(`${cardType}_card`, card.id)
  }, [toggleFavorite, cardType, card.id])

  // 标记状态
  const handleStatusChange = useCallback(
    (status: CardStatus) => {
      onStatusChange(status)
    },
    [onStatusChange]
  )

  // 渲染单词卡片
  const renderWordCard = (card: VideoWordCard) => (
    <div className="space-y-4">
      {/* 单词和音标 */}
      <div className="flex items-center gap-3">
        <div>
          <h3 className="text-xl font-bold">{card.word}</h3>
          {card.phonetic && (
            <p className="text-sm text-muted-foreground">{card.phonetic}</p>
          )}
        </div>
        {card.part_of_speech && (
          <span className="text-xs px-2 py-0.5 rounded bg-muted">
            {card.part_of_speech}
          </span>
        )}
      </div>

      {/* 释义 */}
      <div>
        <p className="font-medium">{card.chinese_definition}</p>
        {card.english_definition && (
          <p className="text-sm text-muted-foreground mt-1">
            {card.english_definition}
          </p>
        )}
      </div>

      {/* 例句 */}
      {card.example_from_video && (
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <BookOpen className="w-3 h-3" />
            <span>视频例句</span>
          </div>
          <p className="text-sm">{card.example_from_video}</p>
          {card.example_translation && (
            <p className="text-sm text-muted-foreground mt-1">
              {card.example_translation}
            </p>
          )}
        </div>
      )}
    </div>
  )

  // 渲染短语卡片
  const renderPhraseCard = (card: VideoPhraseCard) => (
    <div className="space-y-4">
      {/* 短语和音标 */}
      <div>
        <h3 className="text-xl font-bold">{card.phrase}</h3>
        {card.phonetic && (
          <p className="text-sm text-muted-foreground">{card.phonetic}</p>
        )}
      </div>

      {/* 释义 */}
      <p className="font-medium">{card.chinese_definition}</p>

      {/* 同义词 */}
      {card.synonyms && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">同义：</span>
          {card.synonyms.split(',').map((syn, i) => (
            <span key={i} className="text-sm px-2 py-0.5 bg-muted rounded">
              {syn.trim()}
            </span>
          ))}
        </div>
      )}

      {/* 语境 */}
      {card.context && (
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <MessageSquare className="w-3 h-3" />
            <span>语境</span>
          </div>
          <p className="text-sm">{card.context}</p>
          {card.context_translation && (
            <p className="text-sm text-muted-foreground mt-1">
              {card.context_translation}
            </p>
          )}
        </div>
      )}
    </div>
  )

  // 渲染表达卡片
  const renderExpressionCard = (card: VideoExpressionCard) => (
    <ScrollArea className="max-h-[60vh]">
      <div className="space-y-4 pr-4">
        {/* 表达和语境 */}
        <div>
          <h3 className="text-xl font-bold">{card.expression}</h3>
        </div>

        {/* 语境 */}
        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-sm">{card.context}</p>
          {card.context_translation && (
            <p className="text-sm text-muted-foreground mt-1">
              {card.context_translation}
            </p>
          )}
        </div>

        {/* 公式 */}
        {card.formula && (
          <div className="bg-primary/10 rounded-lg p-3">
            <div className="flex items-center gap-2 text-xs text-primary mb-1">
              <GraduationCap className="w-3 h-3" />
              <span>公式</span>
            </div>
            <p className="font-medium">{card.formula}</p>
          </div>
        )}

        {/* 含义 */}
        {card.meaning && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">核心含义</p>
            <p>{card.meaning}</p>
          </div>
        )}

        {/* 使用说明 */}
        {card.usage_note && (
          <div className="bg-amber-500/10 rounded-lg p-3">
            <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 mb-1">
              <Lightbulb className="w-3 h-3" />
              <span>使用说明</span>
            </div>
            <p className="text-sm">{card.usage_note}</p>
          </div>
        )}

        {/* 例句 */}
        {card.examples && card.examples.length > 0 && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">举一反三</p>
            <div className="space-y-2">
              {card.examples.map((ex, i) => (
                <div key={i} className="bg-muted/30 rounded p-2">
                  <p className="text-sm">{ex.original}</p>
                  <p className="text-sm text-muted-foreground">{ex.cn}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 使用场景 */}
        {card.scenarios && (
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">使用场景</p>
            <p className="text-sm">{card.scenarios}</p>
          </div>
        )}

        {/* 相似表达 */}
        {card.similar_expressions && card.similar_expressions.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">相似表达：</span>
            {card.similar_expressions.map((exp, i) => (
              <span key={i} className="text-sm px-2 py-0.5 bg-muted rounded">
                {exp}
              </span>
            ))}
          </div>
        )}

        {/* 正式程度 */}
        {card.formality_level && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">正式程度：</span>
            <span
              className={cn(
                'text-xs px-2 py-0.5 rounded',
                card.formality_level === 'formal' && 'bg-blue-500/20 text-blue-600',
                card.formality_level === 'informal' && 'bg-orange-500/20 text-orange-600',
                card.formality_level === 'neutral' && 'bg-gray-500/20 text-gray-600'
              )}
            >
              {card.formality_level === 'formal'
                ? '正式'
                : card.formality_level === 'informal'
                  ? '非正式'
                  : '中性'}
            </span>
          </div>
        )}
      </div>
    </ScrollArea>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background rounded-xl shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-xs px-2 py-0.5 rounded',
                cardType === 'word' && 'bg-blue-500/20 text-blue-600',
                cardType === 'phrase' && 'bg-green-500/20 text-green-600',
                cardType === 'expression' && 'bg-purple-500/20 text-purple-600'
              )}
            >
              {cardType === 'word'
                ? '单词'
                : cardType === 'phrase'
                  ? '短语'
                  : '地道表达'}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {/* 发音 */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePlayTTS}
              disabled={isSpeaking}
            >
              <Volume2 className={cn('w-4 h-4', isSpeaking && 'animate-pulse')} />
            </Button>

            {/* 收藏 */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggleFavorite}
            >
              <Star
                className={cn(
                  'w-4 h-4',
                  isFav && 'fill-yellow-500 text-yellow-500'
                )}
              />
            </Button>

            {/* 关闭 */}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 内容 */}
        <ScrollArea className="flex-1">
          <div className="p-4">
            {cardType === 'word' && renderWordCard(card as VideoWordCard)}
            {cardType === 'phrase' && renderPhraseCard(card as VideoPhraseCard)}
            {cardType === 'expression' && renderExpressionCard(card as VideoExpressionCard)}

            {/* 笔记区域 */}
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Pencil className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">我的笔记</span>
                </div>
                {!showNoteInput && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowNoteInput(true)}
                  >
                    {existingNote ? '编辑' : '添加'}
                  </Button>
                )}
              </div>

              {showNoteInput ? (
                <div className="space-y-2">
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="记录你对这个知识点的理解..."
                    className="w-full min-h-[80px] p-2 text-sm rounded-md border bg-background resize-none"
                    rows={3}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowNoteInput(false)
                        setNoteText(existingNote?.note || '')
                      }}
                    >
                      取消
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveNote}
                      disabled={isSaving || !noteText.trim()}
                    >
                      <Save className="w-4 h-4 mr-1" />
                      {isSaving ? '保存中...' : '保存'}
                    </Button>
                  </div>
                </div>
              ) : existingNote ? (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-sm">{existingNote.note}</p>
                </div>
              ) : null}
            </div>
          </div>
        </ScrollArea>

        {/* 底部操作栏 */}
        <div className="flex items-center justify-center gap-4 p-4 border-t bg-muted/30">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleStatusChange('unknown')}
            className={cn(
              currentStatus === 'unknown' && 'border-red-500 text-red-500'
            )}
          >
            <XCircle className="w-4 h-4 mr-1" />
            不认识
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleStatusChange('learning')}
            className={cn(
              currentStatus === 'learning' && 'border-yellow-500 text-yellow-500'
            )}
          >
            <GraduationCap className="w-4 h-4 mr-1" />
            学习中
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleStatusChange('known')}
            className={cn(
              currentStatus === 'known' && 'border-green-500 text-green-500'
            )}
          >
            <CheckCircle className="w-4 h-4 mr-1" />
            已掌握
          </Button>
        </div>
      </div>
    </div>
  )
}
