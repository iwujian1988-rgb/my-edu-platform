/**
 * 卡片笔记 Hook
 *
 * 用于管理用户对视频卡片的个人笔记
 */

import { useState, useCallback } from 'react'
import useSWR from 'swr'
import type { VideoCardNote, CardType } from '@/types/video'

interface UseCardNotesProps {
  videoId: string
}

interface NoteResponse {
  notes: VideoCardNote[]
}

const fetcher = async (url: string): Promise<NoteResponse> => {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error('Failed to fetch notes')
  }
  return res.json()
}

export function useCardNotes({ videoId }: UseCardNotesProps) {
  const [isSaving, setIsSaving] = useState(false)

  // 获取笔记列表
  const { data, error, isLoading, mutate } = useSWR<NoteResponse>(
    `/api/user/video-card-notes?video_id=${videoId}`,
    fetcher
  )

  // 获取特定卡片的笔记
  const getNote = useCallback(
    (cardType: CardType, cardId: string): VideoCardNote | undefined => {
      if (!data?.notes) return undefined
      return data.notes.find(
        (note) => note.card_type === cardType && note.card_id === cardId
      )
    },
    [data]
  )

  // 保存笔记
  const saveNote = useCallback(
    async (cardType: CardType, cardId: string, note: string): Promise<boolean> => {
      setIsSaving(true)
      try {
        const res = await fetch('/api/user/video-card-notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            video_id: videoId,
            card_type: cardType,
            card_id: cardId,
            note,
          }),
        })

        if (!res.ok) {
          throw new Error('Failed to save note')
        }

        // 刷新数据
        await mutate()
        return true
      } catch (err) {
        return false
      } finally {
        setIsSaving(false)
      }
    },
    [videoId, mutate]
  )

  // 删除笔记
  const deleteNote = useCallback(
    async (cardType: CardType, cardId: string): Promise<boolean> => {
      try {
        const res = await fetch(
          `/api/user/video-card-notes?card_type=${cardType}&card_id=${cardId}`,
          { method: 'DELETE' }
        )

        if (!res.ok) {
          throw new Error('Failed to delete note')
        }

        // 刷新数据
        await mutate()
        return true
      } catch (err) {
        return false
      }
    },
    [mutate]
  )

  return {
    notes: data?.notes || [],
    isLoading,
    isSaving,
    error,
    getNote,
    saveNote,
    deleteNote,
  }
}
