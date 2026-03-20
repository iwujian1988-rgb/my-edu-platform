'use client'

/**
 * 语言筛选器组件
 *
 * 对应 PRD: VIDEO_MODULE_PRD.md - Section 4.1
 * 对应 Tech: VIDEO_MODULE_TECH.md v5.0 - Section 3.3.6
 */

import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { VideoLanguage } from '@/types/video'
import { VIDEO_LANGUAGE_LABELS } from '@/types/video'

// 语言选项
const LANGUAGE_OPTIONS = [
  { value: 'all', label: '全部语言' },
  { value: 'en', label: '英语' },
  { value: 'fr', label: '法语' },
  { value: 'de', label: '德语' },
  { value: 'es', label: '西班牙语' },
  { value: 'ja', label: '日语' },
  { value: 'it', label: '意大利语' },
  { value: 'ru', label: '俄语' },
]

interface LanguageFilterProps {
  value?: VideoLanguage | 'all'
  onChange?: (value: VideoLanguage | 'all') => void
  className?: string
}

export function LanguageFilter({
  value: controlledValue,
  onChange,
    className,
  }: LanguageFilterProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    // 内部状态，当没有提供受控值时使用
    const [internalValue, setInternalValue] = useState<VideoLanguage | 'all'>(
        controlledValue ?? (searchParams.get('language') as VideoLanguage | 'all') ?? 'all'
    )

    const handleChange = useCallback(
        (newValue: string) => {
            const value = newValue as VideoLanguage | 'all'

            // 受控模式： 只更新内部状态， 触发 onChange
            if (onChange) {
                onChange(value)
                return
            }

            // 非受控模式: 更新 URL
            const params = new URLSearchParams(searchParams.toString())

            if (value === 'all') {
                params.delete('language')
            } else {
                params.set('language', value)
            }

            params.delete('offset')

            const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname
            router.push(newUrl)
        },
        [onChange, pathname, router, searchParams, controlledValue]
    )

    // 同步内部状态和 URL 变化
    useEffect(() => {
        if (!controlledValue) {
            const urlValue = searchParams.get('language') as VideoLanguage | 'all'
            setInternalValue(urlValue ?? 'all')
        }
    }, [controlledValue, searchParams])

    return (
        <Select value={internalValue} onValueChange={handleChange}>
            <SelectTrigger className={className}>
                <SelectValue placeholder="选择语言" />
            </SelectTrigger>
            <SelectContent>
                {LANGUAGE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                        {option.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}

// 难度筛选器
const DIFFICULTY_OPTIONS = [
    { value: 'all', label: '全部难度' },
    { value: 'beginner', label: '入门' },
    { value: 'intermediate', label: '进阶' },
    { value: 'advanced', label: '难' },
]

interface DifficultyFilterProps {
    value?: 'all' | 'beginner' | 'intermediate' | 'advanced'
    onChange?: (value: 'all' | 'beginner' | 'intermediate' | 'advanced') => void
    className?: string
}

export function DifficultyFilter({
    value: controlledValue,
    onChange,
    className,
}: DifficultyFilterProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    // 内部状态，当没有提供受控值时使用
    const [internalValue, setInternalValue] = useState<'all' | 'beginner' | 'intermediate' | 'advanced'>(
        controlledValue ?? (searchParams.get('difficulty') as 'all' | 'beginner' | 'intermediate' | 'advanced') ?? 'all'
    )

    const handleChange = useCallback(
        (newValue: string) => {
            const value = newValue as 'all' | 'beginner' | 'intermediate' | 'advanced'

            // 受控模式: 只更新内部状态， 触发 onChange
            if (onChange) {
                onChange(value)
                return
            }

            // 非受控模式: 更新 URL
            const params = new URLSearchParams(searchParams.toString())

            if (value === 'all') {
                params.delete('difficulty')
            } else {
                params.set('difficulty', value)
            }

            params.delete('offset')

            const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname
            router.push(newUrl)
        },
        [onChange, pathname, router, searchParams, controlledValue]
    )

    // 同步内部状态和 URL 变化
    useEffect(() => {
        if (!controlledValue) {
            const urlValue = searchParams.get('difficulty') as 'all' | 'beginner' | 'intermediate' | 'advanced'
            setInternalValue(urlValue ?? 'all')
        }
    }, [controlledValue, searchParams])

    return (
        <Select value={internalValue} onValueChange={handleChange}>
            <SelectTrigger className={className}>
                <SelectValue placeholder="选择难度" />
            </SelectTrigger>
            <SelectContent>
                {DIFFICULTY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                        {option.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
