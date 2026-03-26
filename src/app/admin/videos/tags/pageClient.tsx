'use client'

/**
 * 视频标签管理 - 客户端组件
 *
 * 功能：标签的增删改查
 */

import { useState } from 'react'
import useSWR from 'swr'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Plus,
  Pencil,
  Trash2,
  Tag,
  AlertCircle,
  Loader2,
} from 'lucide-react'

// 标签类型选项
const TAG_TYPE_OPTIONS = [
  { value: 'topic', label: '主题', color: '#3B82F6' },
  { value: 'creator', label: '创作者', color: '#8B5CF6' },
  { value: 'difficulty', label: '难度', color: '#F59E0B' },
  { value: 'duration', label: '时长', color: '#10B981' },
]

// 预设颜色
const PRESET_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
]

// 标签类型定义
interface VideoTag {
  id: string
  name: string
  type: 'topic' | 'creator' | 'difficulty' | 'duration'
  color: string
  display_order: number
  created_at: string
}

// SWR fetcher
const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

// 表单数据类型
interface TagFormData {
  name: string
  type: 'topic' | 'creator' | 'difficulty' | 'duration'
  color: string
  display_order: number
}

const initialFormData: TagFormData = {
  name: '',
  type: 'topic',
  color: '#3B82F6',
  display_order: 0,
}

export function TagManagementClient() {
  // 弹窗状态
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<VideoTag | null>(null)
  const [formData, setFormData] = useState<TagFormData>(initialFormData)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // 获取标签列表
  const { data, error, isLoading, mutate } = useSWR(
    '/api/admin/video-tags',
    fetcher
  )

  // 打开新建弹窗
  const handleCreate = () => {
    setEditingTag(null)
    setFormData(initialFormData)
    setSubmitError(null)
    setIsDialogOpen(true)
  }

  // 打开编辑弹窗
  const handleEdit = (tag: VideoTag) => {
    setEditingTag(tag)
    setFormData({
      name: tag.name,
      type: tag.type,
      color: tag.color,
      display_order: tag.display_order,
    })
    setSubmitError(null)
    setIsDialogOpen(true)
  }

  // 删除标签
  const handleDelete = async (tagId: string, tagName: string) => {
    if (!confirm(`确定要删除标签「${tagName}」吗？\n\n注意：与视频的关联关系也会被删除。`)) return

    try {
      const res = await fetch(`/api/admin/video-tags/${tagId}`, { method: 'DELETE' })
      const json = await res.json()

      if (!json.success) {
        alert(`删除失败: ${json.error}`)
        return
      }

      mutate()
    } catch (err) {
      console.error('Failed to delete tag:', err)
      alert('删除失败')
    }
  }

  // 提交表单
  const handleSubmit = async () => {
    // 验证
    if (!formData.name.trim()) {
      setSubmitError('请输入标签名称')
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      let res
      if (editingTag) {
        // 更新
        res = await fetch(`/api/admin/video-tags/${editingTag.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
      } else {
        // 创建
        res = await fetch('/api/admin/video-tags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
      }

      const json = await res.json()

      if (!json.success) {
        setSubmitError(json.error || '操作失败')
        return
      }

      setIsDialogOpen(false)
      mutate()
    } catch (err) {
      console.error('Failed to save tag:', err)
      setSubmitError('网络错误，请重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 获取标签类型显示名称
  const getTypeLabel = (type: string) => {
    return TAG_TYPE_OPTIONS.find(t => t.value === type)?.label || type
  }

  // 加载状态
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  // 错误状态
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-lg font-bold text-gray-800 mb-2">加载失败</h3>
        <p className="text-gray-500 mb-4">无法加载标签列表</p>
        <Button onClick={() => mutate()}>重试</Button>
      </div>
    )
  }

  const tags = data?.data || []

  return (
    <div className="space-y-6">
      {/* 顶部操作栏 */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-gray-800">视频标签管理</h2>
          <p className="text-sm text-gray-500 mt-1">管理视频分类标签，用于筛选和组织视频内容</p>
        </div>
        <Button
          onClick={handleCreate}
          className="bg-green-500 hover:bg-green-600 text-white font-bold border-[2px] border-black shadow-[3px_3px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5 transition-all"
        >
          <Plus className="w-4 h-4 mr-2" />
          新建标签
        </Button>
      </div>

      {/* 标签列表 */}
      <div className="bg-white border-[3px] border-black shadow-[4px_4px_0px_0px_#000] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 border-b-[2px] border-black">
              <TableHead className="font-black text-gray-800">标签名称</TableHead>
              <TableHead className="font-black text-gray-800">类型</TableHead>
              <TableHead className="font-black text-gray-800">颜色</TableHead>
              <TableHead className="font-black text-gray-800">排序</TableHead>
              <TableHead className="font-black text-gray-800 text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tags.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-gray-500">
                  <Tag className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                  <p>暂无标签</p>
                  <p className="text-sm mt-1">点击「新建标签」创建第一个标签</p>
                </TableCell>
              </TableRow>
            ) : (
              tags.map((tag: VideoTag) => (
                <TableRow key={tag.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <TableCell className="font-bold">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 border border-black"
                        style={{ backgroundColor: tag.color }}
                      />
                      {tag.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="font-bold border-[2px] border-black"
                      style={{ backgroundColor: `${tag.color}20`, borderColor: tag.color }}
                    >
                      {getTypeLabel(tag.type)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                      {tag.color}
                    </code>
                  </TableCell>
                  <TableCell className="font-mono text-gray-600">
                    {tag.display_order}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(tag)}
                        className="border-[2px] border-black font-bold hover:bg-gray-100"
                      >
                        <Pencil className="w-3 h-3 mr-1" />
                        编辑
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(tag.id, tag.name)}
                        className="border-[2px] border-red-500 text-red-600 font-bold hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        删除
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 统计信息 */}
      {tags.length > 0 && (
        <div className="flex gap-4">
          {TAG_TYPE_OPTIONS.map(typeOpt => {
            const count = tags.filter((t: VideoTag) => t.type === typeOpt.value).length
            return (
              <div
                key={typeOpt.value}
                className="flex items-center gap-2 px-3 py-2 bg-white border-[2px] border-black"
              >
                <div
                  className="w-3 h-3 border border-black"
                  style={{ backgroundColor: typeOpt.color }}
                />
                <span className="text-sm font-bold">{typeOpt.label}</span>
                <span className="text-sm text-gray-500 font-mono">({count})</span>
              </div>
            )
          })}
        </div>
      )}

      {/* 新建/编辑弹窗 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md border-[3px] border-black shadow-[4px_4px_0px_0px_#000]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">
              {editingTag ? '编辑标签' : '新建标签'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* 标签名称 */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">标签名称 *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="输入标签名称"
                className="border-[2px] border-black focus:ring-0"
                maxLength={100}
              />
            </div>

            {/* 标签类型 */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">标签类型</label>
              <Select
                value={formData.type}
                onValueChange={(value: typeof formData.type) =>
                  setFormData({ ...formData, type: value })
                }
              >
                <SelectTrigger className="border-[2px] border-black">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TAG_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 border border-black"
                          style={{ backgroundColor: opt.color }}
                        />
                        {opt.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 标签颜色 */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">标签颜色</label>
              <div className="flex items-center gap-2">
                <div className="flex gap-1 flex-wrap">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-8 h-8 border-[2px] transition-all ${
                        formData.color === color
                          ? 'border-black scale-110'
                          : 'border-gray-300 hover:border-black'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <Input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-10 h-10 p-1 border-[2px] border-black cursor-pointer"
                />
              </div>
            </div>

            {/* 排序 */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">排序（数字越小越靠前）</label>
              <Input
                type="number"
                value={formData.display_order}
                onChange={(e) =>
                  setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })
                }
                className="border-[2px] border-black focus:ring-0 w-32"
                min={0}
              />
            </div>

            {/* 错误提示 */}
            {submitError && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 border-[2px] border-red-200">
                <AlertCircle className="w-4 h-4" />
                {submitError}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              className="border-[2px] border-black font-bold"
            >
              取消
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-green-500 hover:bg-green-600 text-white font-bold border-[2px] border-black"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                '保存'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
