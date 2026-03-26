'use client'

/**
 * UP主列表客户端组件
 * Neo-brutalism 风格
 */

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, ExternalLink, Users } from 'lucide-react'
import Image from 'next/image'
import type { UpstreamCreator, CreatorPlatform } from '@/types/video'
import { CREATOR_PLATFORM_LABELS } from '@/types/video'

const PLATFORM_OPTIONS: { id: CreatorPlatform | ''; name: string }[] = [
  { id: '', name: '全部平台' },
  { id: 'youtube', name: 'YouTube' },
  { id: 'bilibili', name: 'B站' },
  { id: 'tiktok', name: 'TikTok' },
  { id: 'instagram', name: 'Instagram' },
  { id: 'twitter', name: 'Twitter/X' },
  { id: 'other', name: '其他' },
]

interface UpstreamCreatorListProps {
  initialCreators: UpstreamCreator[]
}

export default function UpstreamCreatorList({ initialCreators }: UpstreamCreatorListProps) {
  const [creators, setCreators] = useState<UpstreamCreator[]>(initialCreators)
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [platformFilter, setPlatformFilter] = useState<CreatorPlatform | ''>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingCreator, setEditingCreator] = useState<UpstreamCreator | null>(null)
  const [loading, setLoading] = useState(false)

  const filteredCreators = creators.filter(creator => {
    if (filter === 'active' && !creator.is_active) return false
    if (filter === 'inactive' && creator.is_active) return false
    if (platformFilter && creator.platform !== platformFilter) return false
    if (searchQuery && !creator.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const refreshCreators = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/upstream-creators')
      const data = await response.json()
      if (data.creators) {
        setCreators(data.creators)
      }
    } catch (error) {
      console.error('Failed to refresh creators:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleActive = async (creator: UpstreamCreator) => {
    try {
      const response = await fetch(`/api/admin/upstream-creators/${creator.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !creator.is_active })
      })

      if (response.ok) {
        refreshCreators()
      }
    } catch (error) {
      console.error('Failed to toggle creator status:', error)
    }
  }

  const deleteCreator = async (id: string, name: string) => {
    if (!confirm(`确定删除UP主「${name}」吗？删除后无法恢复，关联的视频将失去UP主关联。`)) return

    try {
      const response = await fetch(`/api/admin/upstream-creators/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        refreshCreators()
      }
    } catch (error) {
      console.error('Failed to delete creator:', error)
    }
  }

  const handleCloseModal = () => {
    setShowCreateModal(false)
    setEditingCreator(null)
  }

  const handleSaveSuccess = () => {
    handleCloseModal()
    refreshCreators()
  }

  const formatFollowerCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`
    }
    return count.toString()
  }

  return (
    <div>
      {/* 操作栏 */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* 状态筛选 */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-black dark:text-white">状态：</span>
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 text-sm font-bold border-[3px] border-black dark:border-gray-600 transition-all ${
                filter === 'all'
                  ? 'bg-blue-500 text-white shadow-[2px_2px_0px_0px_#000]'
                  : 'bg-white dark:bg-gray-800 text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              全部
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-3 py-1.5 text-sm font-bold border-[3px] border-black dark:border-gray-600 transition-all ${
                filter === 'active'
                  ? 'bg-green-500 text-white shadow-[2px_2px_0px_0px_#000]'
                  : 'bg-white dark:bg-gray-800 text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              已启用
            </button>
            <button
              onClick={() => setFilter('inactive')}
              className={`px-3 py-1.5 text-sm font-bold border-[3px] border-black dark:border-gray-600 transition-all ${
                filter === 'inactive'
                  ? 'bg-gray-500 text-white shadow-[2px_2px_0px_0px_#000]'
                  : 'bg-white dark:bg-gray-800 text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              已禁用
            </button>
          </div>

          {/* 平台筛选 */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-black dark:text-white">平台：</span>
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value as CreatorPlatform | '')}
              className="px-3 py-1.5 text-sm font-bold border-[3px] border-black dark:border-gray-600 bg-white dark:bg-gray-800 text-black dark:text-white focus:outline-none"
            >
              {PLATFORM_OPTIONS.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.name}</option>
              ))}
            </select>
          </div>

          {/* 搜索 */}
          <input
            type="text"
            placeholder="搜索UP主名称..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-1.5 text-sm border-[3px] border-black dark:border-gray-600 bg-white dark:bg-gray-800 text-black dark:text-white focus:outline-none w-48"
          />
        </div>

        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-green-500 hover:bg-green-600 text-white font-bold border-[3px] border-black shadow-[3px_3px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5 transition-all"
        >
          <Plus className="w-4 h-4 mr-2" />
          创建UP主
        </Button>
      </div>

      {/* UP主列表 */}
      <div className="grid gap-4">
        {filteredCreators.map(creator => (
          <div
            key={creator.id}
            className="bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-600 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666] p-4 transition-all hover:shadow-[6px_6px_0px_0px_#000] dark:hover:shadow-[6px_6px_0px_0px_#666] hover:-translate-y-1"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                {/* 头像 */}
                <div className="flex-shrink-0">
                  {creator.avatar_url ? (
                    <Image
                      src={creator.avatar_url}
                      alt={creator.name}
                      width={64}
                      height={64}
                      unoptimized
                      className="w-16 h-16 rounded-full border-[3px] border-black object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full border-[3px] border-black bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <Users className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* 信息 */}
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-black text-black dark:text-white">{creator.name}</h3>
                    {creator.platform && (
                      <span className="px-2 py-0.5 text-xs font-bold bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 border-2 border-purple-300 dark:border-purple-700">
                        {CREATOR_PLATFORM_LABELS[creator.platform] || creator.platform}
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 text-xs font-bold border-2 ${
                        creator.is_active
                          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {creator.is_active ? '已启用' : '已禁用'}
                    </span>
                  </div>

                  {creator.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{creator.description}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                    {creator.follower_count > 0 && (
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {formatFollowerCount(creator.follower_count)} 粉丝
                      </span>
                    )}
                    {creator.channel_url && (
                      <a
                        href={creator.channel_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-500 hover:underline"
                      >
                        <ExternalLink className="w-4 h-4" />
                        频道链接
                      </a>
                    )}
                    {creator.platform_user_id && (
                      <span className="text-xs">ID: {creator.platform_user_id}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setEditingCreator(creator)}
                  className="px-3 py-1.5 font-bold text-sm bg-yellow-400 text-black border-[3px] border-black shadow-[2px_2px_0px_0px_#000] hover:shadow-[3px_3px_0px_0px_#000] hover:-translate-y-0.5 transition-all"
                >
                  <Pencil className="w-4 h-4 inline mr-1" />
                  编辑
                </button>
                <button
                  onClick={() => toggleActive(creator)}
                  className={`px-3 py-1.5 font-bold text-sm border-[3px] border-black shadow-[2px_2px_0px_0px_#000] hover:shadow-[3px_3px_0px_0px_#000] hover:-translate-y-0.5 transition-all ${
                    creator.is_active
                      ? 'bg-orange-400 text-black'
                      : 'bg-green-400 text-black'
                  }`}
                >
                  {creator.is_active ? (
                    <><ToggleRight className="w-4 h-4 inline mr-1" />禁用</>
                  ) : (
                    <><ToggleLeft className="w-4 h-4 inline mr-1" />启用</>
                  )}
                </button>
                <button
                  onClick={() => deleteCreator(creator.id, creator.name)}
                  className="px-3 py-1.5 font-bold text-sm bg-red-500 text-white border-[3px] border-black shadow-[2px_2px_0px_0px_#000] hover:shadow-[3px_3px_0px_0px_#000] hover:-translate-y-0.5 transition-all"
                >
                  <Trash2 className="w-4 h-4 inline mr-1" />
                  删除
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredCreators.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-600">
            {searchQuery || platformFilter || filter !== 'all'
              ? '没有找到符合条件的UP主'
              : '暂无UP主数据，点击"创建UP主"添加'}
          </div>
        )}
      </div>

      {/* 创建弹窗 */}
      <CreatorFormDialog
        open={showCreateModal}
        creator={null}
        onClose={handleCloseModal}
        onSave={handleSaveSuccess}
      />

      {/* 编辑弹窗 */}
      <CreatorFormDialog
        open={editingCreator !== null}
        creator={editingCreator}
        onClose={handleCloseModal}
        onSave={handleSaveSuccess}
      />
    </div>
  )
}

// 表单弹窗组件
function CreatorFormDialog({
  open,
  creator,
  onClose,
  onSave
}: {
  open: boolean
  creator: UpstreamCreator | null
  onClose: () => void
  onSave: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    platform: '' as CreatorPlatform | '',
    platform_user_id: '',
    avatar_url: '',
    description: '',
    follower_count: 0,
    channel_url: '',
    is_active: true,
    display_order: 0
  })

  useEffect(() => {
    if (creator) {
      setFormData({
        name: creator.name,
        platform: creator.platform || '',
        platform_user_id: creator.platform_user_id || '',
        avatar_url: creator.avatar_url || '',
        description: creator.description || '',
        follower_count: creator.follower_count,
        channel_url: creator.channel_url || '',
        is_active: creator.is_active,
        display_order: creator.display_order
      })
    } else {
      setFormData({
        name: '',
        platform: '',
        platform_user_id: '',
        avatar_url: '',
        description: '',
        follower_count: 0,
        channel_url: '',
        is_active: true,
        display_order: 0
      })
    }
  }, [creator, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = creator
        ? `/api/admin/upstream-creators/${creator.id}`
        : '/api/admin/upstream-creators'

      const submitData = {
        ...formData,
        platform: formData.platform || null,
        platform_user_id: formData.platform_user_id || null,
        avatar_url: formData.avatar_url || null,
        description: formData.description || null,
        channel_url: formData.channel_url || null,
      }

      const response = await fetch(url, {
        method: creator ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      })

      if (response.ok) {
        onSave()
      } else {
        const error = await response.json()
        alert(error.error || '操作失败')
      }
    } catch (error) {
      console.error('Failed to save creator:', error)
      alert('操作失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 border-[3px] border-black dark:border-gray-600 shadow-[6px_6px_0px_0px_#000] dark:shadow-[6px_6px_0px_0px_#666]">
        <DialogHeader className="border-b-[3px] border-black dark:border-gray-700 pb-4">
          <DialogTitle className="text-2xl font-black text-black dark:text-white">
            {creator ? '编辑UP主' : '创建UP主'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* 名称 */}
          <div>
            <label className="block text-sm font-bold text-black dark:text-white mb-2">
              UP主名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 border-[3px] border-black dark:border-gray-600 bg-white dark:bg-gray-800 text-black dark:text-white font-semibold focus:ring-2 focus:ring-green-500 focus:outline-none"
              placeholder="UP主昵称（用于批量上传匹配）"
            />
          </div>

          {/* 平台 */}
          <div>
            <label className="block text-sm font-bold text-black dark:text-white mb-2">
              平台
            </label>
            <select
              value={formData.platform}
              onChange={e => setFormData({ ...formData, platform: e.target.value as CreatorPlatform | '' })}
              className="w-full px-4 py-3 border-[3px] border-black dark:border-gray-600 bg-white dark:bg-gray-800 text-black dark:text-white font-semibold focus:outline-none"
            >
              <option value="">请选择平台</option>
              {Object.entries(CREATOR_PLATFORM_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {/* 平台用户ID */}
          <div>
            <label className="block text-sm font-bold text-black dark:text-white mb-2">
              平台用户ID
            </label>
            <input
              type="text"
              value={formData.platform_user_id}
              onChange={e => setFormData({ ...formData, platform_user_id: e.target.value })}
              className="w-full px-4 py-3 border-[3px] border-black dark:border-gray-600 bg-white dark:bg-gray-800 text-black dark:text-white font-semibold focus:ring-2 focus:ring-green-500 focus:outline-none"
              placeholder="平台用户ID"
            />
          </div>

          {/* 头像URL */}
          <div>
            <label className="block text-sm font-bold text-black dark:text-white mb-2">
              头像URL
            </label>
            <input
              type="url"
              value={formData.avatar_url}
              onChange={e => setFormData({ ...formData, avatar_url: e.target.value })}
              className="w-full px-4 py-3 border-[3px] border-black dark:border-gray-600 bg-white dark:bg-gray-800 text-black dark:text-white font-semibold focus:ring-2 focus:ring-green-500 focus:outline-none"
              placeholder="https://..."
            />
          </div>

          {/* 频道链接 */}
          <div>
            <label className="block text-sm font-bold text-black dark:text-white mb-2">
              频道链接
            </label>
            <input
              type="url"
              value={formData.channel_url}
              onChange={e => setFormData({ ...formData, channel_url: e.target.value })}
              className="w-full px-4 py-3 border-[3px] border-black dark:border-gray-600 bg-white dark:bg-gray-800 text-black dark:text-white font-semibold focus:ring-2 focus:ring-green-500 focus:outline-none"
              placeholder="https://..."
            />
          </div>

          {/* 粉丝量 */}
          <div>
            <label className="block text-sm font-bold text-black dark:text-white mb-2">
              粉丝量
            </label>
            <input
              type="number"
              min="0"
              value={formData.follower_count}
              onChange={e => setFormData({ ...formData, follower_count: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-3 border-[3px] border-black dark:border-gray-600 bg-white dark:bg-gray-800 text-black dark:text-white font-semibold focus:ring-2 focus:ring-green-500 focus:outline-none"
            />
          </div>

          {/* 介绍 */}
          <div>
            <label className="block text-sm font-bold text-black dark:text-white mb-2">
              介绍
            </label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 border-[3px] border-black dark:border-gray-600 bg-white dark:bg-gray-800 text-black dark:text-white font-semibold focus:ring-2 focus:ring-green-500 focus:outline-none resize-none"
              rows={2}
              placeholder="UP主介绍..."
            />
          </div>

          {/* 排序和状态 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-black dark:text-white mb-2">
                排序
              </label>
              <input
                type="number"
                value={formData.display_order}
                onChange={e => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-3 border-[3px] border-black dark:border-gray-600 bg-white dark:bg-gray-800 text-black dark:text-white font-semibold focus:ring-2 focus:ring-green-500 focus:outline-none"
              />
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer py-3">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-5 h-5 border-[3px] border-black dark:border-gray-600"
                />
                <span className="font-bold text-black dark:text-white">启用</span>
              </label>
            </div>
          </div>

          {/* 按钮 */}
          <DialogFooter className="border-t-[3px] border-black dark:border-gray-700 pt-4 gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 font-bold bg-gray-200 dark:bg-gray-700 text-black dark:text-white border-[3px] border-black dark:border-gray-600 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
              disabled={loading}
            >
              取消
            </button>
            <button
              type="submit"
              className="px-6 py-3 font-bold bg-green-500 text-white border-[3px] border-black shadow-[3px_3px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5 transition-all disabled:opacity-50"
              disabled={loading}
            >
              {loading ? '保存中...' : creator ? '保存' : '创建'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
