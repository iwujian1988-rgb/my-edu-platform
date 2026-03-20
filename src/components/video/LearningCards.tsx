/**
 * 学习卡片列表组件
 *
 * 用于"学"模式，展示所有词汇、短语、惯用语卡片
 * 支持按状态筛选和标记
 */

'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import {
  BookOpen,
  MessageSquare,
  Sparkles,
  CheckCircle,
  Circle,
  Loader2,
  Filter,
  Play,
} from 'lucide-react'
import type {
  VideoCards,
  VideoWordCard,
  VideoPhraseCard,
  VideoExpressionCard,
  CardType,
  CardProgressStatus,
} from '@/types/video'

interface LearningCardsProps {
  cards: VideoCards
  onCardClick: (card: VideoWordCard | VideoPhraseCard | VideoExpressionCard, type: CardType) => void
  getCardStatus: (type: CardType, cardId: string) => CardProgressStatus
  onStatusChange: (
    type: CardType,
    cardId: string,
    status: 'known' | 'unknown' | 'learning'
  ) => void
  onJumpToSubtitle?: (cardType: CardType, cardId: string) => void
}

type CardTab = 'all' | 'words' | 'phrases' | 'expressions'
type StatusFilter = 'all' | 'unknown' | 'learning' | 'known'

// 辅助函数：获取卡片文本
function getCardText(card: VideoWordCard | VideoPhraseCard | VideoExpressionCard): string {
  if ('word' in card) return card.word
  if ('phrase' in card) return card.phrase
  if ('expression' in card) return card.expression
  return ''
}

// 辅助函数：获取卡片翻译
function getCardTranslation(card: VideoWordCard | VideoPhraseCard | VideoExpressionCard): string {
  if ('chinese_definition' in card) return card.chinese_definition
  if ('meaning' in card) return card.meaning || ''
  return ''
}

export function LearningCards({
  cards,
  onCardClick,
  getCardStatus,
  onStatusChange,
  onJumpToSubtitle,
}: LearningCardsProps) {
  const [currentTab, setCurrentTab] = useState<CardTab>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  // 统计数据
  const stats = {
    words: {
      total: cards.words.length,
      unknown: cards.words.filter((c) => getCardStatus('word', c.id) === 'unknown').length,
      learning: cards.words.filter((c) => getCardStatus('word', c.id) === 'learning').length,
      known: cards.words.filter((c) => getCardStatus('word', c.id) === 'known').length,
    },
    phrases: {
      total: cards.phrases.length,
      unknown: cards.phrases.filter((c) => getCardStatus('phrase', c.id) === 'unknown').length,
      learning: cards.phrases.filter((c) => getCardStatus('phrase', c.id) === 'learning').length,
      known: cards.phrases.filter((c) => getCardStatus('phrase', c.id) === 'known').length,
    },
    expressions: {
      total: cards.expressions.length,
      unknown: cards.expressions.filter((c) => getCardStatus('expression', c.id) === 'unknown').length,
      learning: cards.expressions.filter((c) => getCardStatus('expression', c.id) === 'learning').length,
      known: cards.expressions.filter((c) => getCardStatus('expression', c.id) === 'known').length,
    },
  }

  // 获取总数
  const totalStats = {
    total: stats.words.total + stats.phrases.total + stats.expressions.total,
    unknown: stats.words.unknown + stats.phrases.unknown + stats.expressions.unknown,
    learning: stats.words.learning + stats.phrases.learning + stats.expressions.learning,
    known: stats.words.known + stats.phrases.known + stats.expressions.known,
  }

  // 筛选卡片
  const filterCards = useCallback(
    <T extends VideoWordCard | VideoPhraseCard | VideoExpressionCard>(
      cardList: T[],
      type: CardType
    ): T[] => {
      if (statusFilter === 'all') return cardList
      return cardList.filter((card) => getCardStatus(type, card.id) === statusFilter)
    },
    [statusFilter, getCardStatus]
  )

  // 渲染卡片列表
  const renderCardList = useCallback(
    (
      cardList: (VideoWordCard | VideoPhraseCard | VideoExpressionCard)[],
      type: CardType
    ) => (
      <div className="space-y-2">
        {cardList.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {statusFilter === 'all'
              ? '暂无内容'
              : `暂无${statusFilter === 'unknown' ? '未学习' : statusFilter === 'learning' ? '学习中' : '已掌握'}的内容`}
          </div>
        ) : (
          cardList.map((card) => {
            const status = getCardStatus(type, card.id)
            const text = getCardText(card)
            const translation = getCardTranslation(card)

            return (
              <div
                key={card.id}
                onClick={() => onCardClick(card, type)}
                className={cn(
                  'p-3 rounded-lg border cursor-pointer transition-all',
                  'hover:border-primary hover:shadow-sm',
                  status === 'known' && 'bg-green-50/50 dark:bg-green-900/10',
                  status === 'learning' && 'bg-yellow-50/50 dark:bg-yellow-900/10'
                )}
              >
                {/* 卡片头部 */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{text}</p>
                    {translation && (
                      <p className="text-sm text-muted-foreground truncate">
                        {translation}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {status === 'known' && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                    {status === 'learning' && (
                      <Loader2 className="w-4 h-4 text-yellow-500" />
                    )}
                    {status === 'unknown' && (
                      <Circle className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* 快速状态按钮 */}
                <div className="flex items-center gap-1">
                  <Button
                    variant={status === 'unknown' ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={(e) => {
                      e.stopPropagation()
                      onStatusChange(type, card.id, 'unknown')
                    }}
                  >
                    不认识
                  </Button>
                  <Button
                    variant={status === 'learning' ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={(e) => {
                      e.stopPropagation()
                      onStatusChange(type, card.id, 'learning')
                    }}
                  >
                    学习中
                  </Button>
                  <Button
                    variant={status === 'known' ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={(e) => {
                      e.stopPropagation()
                      onStatusChange(type, card.id, 'known')
                    }}
                  >
                    已掌握
                  </Button>
                  {onJumpToSubtitle && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs ml-auto"
                      onClick={(e) => {
                        e.stopPropagation()
                        onJumpToSubtitle(type, card.id)
                      }}
                      title="跳转到字幕位置"
                    >
                      <Play className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    ),
    [getCardStatus, onCardClick, onStatusChange, statusFilter]
  )

  return (
    <div className="h-full flex flex-col">
      {/* 统计概览 */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium">学习卡片</h3>
          <Badge variant="outline">{totalStats.total} 个</Badge>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div className="p-2 rounded bg-muted">
            <div className="font-bold text-red-500">{totalStats.unknown}</div>
            <div className="text-xs text-muted-foreground">未学习</div>
          </div>
          <div className="p-2 rounded bg-muted">
            <div className="font-bold text-yellow-500">{totalStats.learning}</div>
            <div className="text-xs text-muted-foreground">学习中</div>
          </div>
          <div className="p-2 rounded bg-muted">
            <div className="font-bold text-green-500">{totalStats.known}</div>
            <div className="text-xs text-muted-foreground">已掌握</div>
          </div>
        </div>
      </div>

      {/* 状态筛选 */}
      <div className="px-4 py-2 border-b">
        <div className="flex items-center gap-1">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Button
            variant={statusFilter === 'all' ? 'default' : 'ghost'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setStatusFilter('all')}
          >
            全部
          </Button>
          <Button
            variant={statusFilter === 'unknown' ? 'default' : 'ghost'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setStatusFilter('unknown')}
          >
            未学习
          </Button>
          <Button
            variant={statusFilter === 'learning' ? 'default' : 'ghost'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setStatusFilter('learning')}
          >
            学习中
          </Button>
          <Button
            variant={statusFilter === 'known' ? 'default' : 'ghost'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setStatusFilter('known')}
          >
            已掌握
          </Button>
        </div>
      </div>

      {/* 卡片分类 Tab */}
      <Tabs
        value={currentTab}
        onValueChange={(v) => setCurrentTab(v as CardTab)}
        className="flex-1 flex flex-col"
      >
        <TabsList className="grid grid-cols-4 mx-4 mt-2">
          <TabsTrigger value="all" className="text-xs">
            全部
            <span className="ml-1 text-muted-foreground">
              ({totalStats.total})
            </span>
          </TabsTrigger>
          <TabsTrigger value="words" className="text-xs">
            <BookOpen className="w-3 h-3 mr-1" />
            词汇
            <span className="ml-1 text-muted-foreground">
              ({stats.words.total})
            </span>
          </TabsTrigger>
          <TabsTrigger value="phrases" className="text-xs">
            <MessageSquare className="w-3 h-3 mr-1" />
            短语
            <span className="ml-1 text-muted-foreground">
              ({stats.phrases.total})
            </span>
          </TabsTrigger>
          <TabsTrigger value="expressions" className="text-xs">
            <Sparkles className="w-3 h-3 mr-1" />
            惯用语
            <span className="ml-1 text-muted-foreground">
              ({stats.expressions.total})
            </span>
          </TabsTrigger>
        </TabsList>

        {/* 全部 */}
        <TabsContent value="all" className="flex-1 overflow-y-auto p-4 m-0">
          {stats.words.total > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                词汇 ({stats.words.total})
              </h4>
              {renderCardList(filterCards(cards.words, 'word'), 'word')}
            </div>
          )}
          {stats.phrases.total > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                短语 ({stats.phrases.total})
              </h4>
              {renderCardList(filterCards(cards.phrases, 'phrase'), 'phrase')}
            </div>
          )}
          {stats.expressions.total > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                惯用语 ({stats.expressions.total})
              </h4>
              {renderCardList(filterCards(cards.expressions, 'expression'), 'expression')}
            </div>
          )}
        </TabsContent>

        {/* 词汇 */}
        <TabsContent value="words" className="flex-1 overflow-y-auto p-4 m-0">
          {renderCardList(filterCards(cards.words, 'word'), 'word')}
        </TabsContent>

        {/* 短语 */}
        <TabsContent value="phrases" className="flex-1 overflow-y-auto p-4 m-0">
          {renderCardList(filterCards(cards.phrases, 'phrase'), 'phrase')}
        </TabsContent>

        {/* 惯用语 */}
        <TabsContent value="expressions" className="flex-1 overflow-y-auto p-4 m-0">
          {renderCardList(filterCards(cards.expressions, 'expression'), 'expression')}
        </TabsContent>
      </Tabs>
    </div>
  )
}
