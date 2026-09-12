'use client'

/**
 * 小说管理 - 客户端组件
 * 列出小说书，勾选绑定的邀请套餐（写 books.package_ids）
 */

import { useState } from 'react'
import useSWR from 'swr'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { BookOpen, CheckSquare2, Square, RefreshCw } from 'lucide-react'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

interface NovelBook {
  id: string
  title: string
  package_ids: string[]
  is_published: boolean
  total_chapters: number
  total_words: number
}

interface InvitationPackage {
  id: string
  name: string
  is_active: boolean
  sort_order: number
}

export function NovelManagementClient() {
  const { data, error, isLoading, mutate } = useSWR('/api/admin/novels', fetcher)

  // 本地乐观状态：bookId -> packageIds（覆盖服务器值）
  const [localBindings, setLocalBindings] = useState<Record<string, string[]>>({})
  const [savingBookId, setSavingBookId] = useState<string | null>(null)
  const [saveError, setSaveError] = useState('')

  const novels: NovelBook[] = data?.novels || []
  const packages: InvitationPackage[] = data?.packages || []

  const getBinding = (novel: NovelBook): string[] =>
    localBindings[novel.id] ?? novel.package_ids ?? []

  const handleToggle = async (novel: NovelBook, packageId: string) => {
    const current = getBinding(novel)
    const next = current.includes(packageId)
      ? current.filter((id) => id !== packageId)
      : [...current, packageId]

    const previous = localBindings[novel.id] ?? novel.package_ids ?? []
    setLocalBindings((prev) => ({ ...prev, [novel.id]: next }))
    setSaveError('')
    setSavingBookId(novel.id)

    try {
      const res = await fetch('/api/admin/novels', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: novel.id, packageIds: next })
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || '保存失败')
      }
      // 服务器已更新，清除本地覆盖让 SWR 数据接管
      mutate({ ...data, novels: novels.map((n) => (n.id === novel.id ? { ...n, package_ids: next } : n)) }, false)
      setLocalBindings((prev) => {
        const next2 = { ...prev }
        delete next2[novel.id]
        return next2
      })
    } catch (err: any) {
      setLocalBindings((prev) => ({ ...prev, [novel.id]: previous }))
      setSaveError(err.message || '保存失败')
    } finally {
      setSavingBookId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded border-[3px] border-black shadow-[4px_4px_0px_0px_#000] p-8 text-center">
        <p className="font-bold text-gray-700">加载失败，请刷新重试</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-3xl font-black text-gray-800 mb-2" style={{ fontFamily: 'Fredoka, sans-serif' }}>
          小说管理
        </h1>
        <p className="text-gray-600 font-semibold">
          给小说绑定邀请套餐：绑定后，该套餐的邀请码注册链接会直接带小说地址，用户注册完即达小说；未绑定的用户全站看不到该书。
        </p>
      </div>

      {saveError && (
        <div className="bg-red-50 border-[2px] border-red-300 rounded p-3">
          <p className="text-red-600 font-bold text-sm">保存失败：{saveError}</p>
        </div>
      )}

      {novels.length === 0 ? (
        <div className="bg-white rounded border-[3px] border-black shadow-[4px_4px_0px_0px_#000] p-12 text-center">
          <BookOpen className="mx-auto text-gray-300 mb-4" size={48} />
          <p className="text-gray-500 font-semibold text-lg">暂无小说</p>
          <p className="text-gray-400 text-sm mt-2">导入小说后（books 表 is_novel=true）会出现在这里</p>
        </div>
      ) : (
        novels.map((novel) => {
          const binding = getBinding(novel)
          const isSaving = savingBookId === novel.id

          return (
            <div key={novel.id} className="bg-white rounded border-[3px] border-black shadow-[4px_4px_0px_0px_#000] p-6">
              {/* 头部：标题 + 统计 */}
              <div className="flex flex-col md:flex-row md:items-center gap-3 mb-5">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-11 h-11 flex items-center justify-center bg-green-100 rounded border-[2px] border-black flex-shrink-0">
                    <BookOpen className="text-green-600" size={22} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xl font-black text-gray-800 truncate">{novel.title}</h2>
                    <p className="text-xs text-gray-400 font-mono truncate">{novel.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={novel.is_published ? 'default' : 'secondary'} className={novel.is_published ? 'bg-green-500' : 'bg-gray-400'}>
                    {novel.is_published ? '已上架' : '未上架'}
                  </Badge>
                  <Badge variant="outline" className="font-semibold">{novel.total_chapters} 章</Badge>
                  <Badge variant="outline" className="font-semibold">{novel.total_words} 新词</Badge>
                  <Badge variant="outline" className="font-semibold">已绑 {binding.length} 套餐</Badge>
                  {isSaving && <RefreshCw className="animate-spin text-gray-400" size={16} />}
                </div>
              </div>

              {/* 套餐勾选区 */}
              <div>
                <p className="text-sm font-bold text-gray-600 mb-3">绑定的邀请套餐（勾选立即保存）</p>
                {packages.length === 0 ? (
                  <p className="text-sm text-gray-400">尚无套餐，请先在套餐管理中创建</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {packages.map((pkg) => {
                      const checked = binding.includes(pkg.id)
                      return (
                        <button
                          key={pkg.id}
                          onClick={() => handleToggle(novel, pkg.id)}
                          disabled={isSaving}
                          className={`flex items-center gap-3 px-4 py-3 rounded border-[2px] text-left transition-all cursor-pointer disabled:opacity-60 ${
                            checked
                              ? 'border-green-500 bg-green-50'
                              : 'border-gray-200 bg-gray-50 hover:border-gray-400'
                          }`}
                        >
                          {checked ? (
                            <CheckSquare2 className="text-green-600 flex-shrink-0" size={20} />
                          ) : (
                            <Square className="text-gray-400 flex-shrink-0" size={20} />
                          )}
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm font-bold text-gray-800 truncate">{pkg.name}</span>
                            {!pkg.is_active && (
                              <span className="block text-xs text-gray-400">已停用</span>
                            )}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {binding.length === 0 && (
                <p className="mt-4 text-sm font-semibold text-orange-500">
                  未绑定任何套餐：所有用户都看不到这本书（含已注册用户）
                </p>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
