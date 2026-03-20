'use client'

/**
 * 套餐管理 - 客户端组件
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
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
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
  Package,
  DollarSign,
  Calendar,
  Video,
} from 'lucide-react'
import type { VideoPackage, VideoLanguage } from '@/types/video'
import { VIDEO_LANGUAGE_LABELS } from '@/types/video'

// SWR fetcher
const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

interface PackageFormData {
  name: string
  description: string
  price: number
  validity_days: number
  language: string
  is_active: boolean
  display_order: number
}

const initialFormData: PackageFormData = {
  name: '',
  description: '',
  price: 0,
  validity_days: 365,
  language: '',
  is_active: true,
  display_order: 0,
}

export function PackageManagementClient() {
  // 弹窗状态
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPackage, setEditingPackage] = useState<VideoPackage | null>(null)
  const [formData, setFormData] = useState<PackageFormData>(initialFormData)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 获取套餐列表
  const { data, error, isLoading, mutate } = useSWR(
    '/api/admin/video-packages',
    fetcher
  )

  // 打开新建弹窗
  const handleCreate = () => {
    setEditingPackage(null)
    setFormData(initialFormData)
    setIsDialogOpen(true)
  }

  // 打开编辑弹窗
  const handleEdit = (pkg: VideoPackage) => {
    setEditingPackage(pkg)
    setFormData({
      name: pkg.name,
      description: pkg.description || '',
      price: pkg.price,
      validity_days: pkg.validity_days,
      language: pkg.language || '',
      is_active: pkg.is_active,
      display_order: pkg.display_order,
    })
    setIsDialogOpen(true)
  }

  // 删除套餐
  const handleDelete = async (packageId: string) => {
    if (!confirm('确定要删除这个套餐吗？')) return

    try {
      await fetch(`/api/admin/video-packages/${packageId}`, { method: 'DELETE' })
      mutate()
    } catch (error) {
      console.error('Failed to delete package:', error)
    }
  }

  // 提交表单
  const handleSubmit = async () => {
    setIsSubmitting(true)

    try {
      if (editingPackage) {
        // 更新
        await fetch(`/api/admin/video-packages/${editingPackage.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
      } else {
        // 创建
        await fetch('/api/admin/video-packages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
      }

      setIsDialogOpen(false)
      mutate()
    } catch (error) {
      console.error('Failed to save package:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container py-6 space-y-6">
      {/* 标题和操作 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">套餐管理</h1>
          <p className="text-muted-foreground mt-1">管理视频学习套餐</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          添加套餐
        </Button>
      </div>

      {/* 加载状态 */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      )}

      {/* 错误状态 */}
      {error && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">加载失败</p>
          <Button variant="outline" className="mt-4" onClick={() => mutate()}>
            重试
          </Button>
        </div>
      )}

      {/* 套餐列表 */}
      {data && (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>套餐名称</TableHead>
                <TableHead className="w-24">价格</TableHead>
                <TableHead className="w-32">有效期</TableHead>
                <TableHead className="w-24">语言</TableHead>
                <TableHead className="w-24">视频数</TableHead>
                <TableHead className="w-20">状态</TableHead>
                <TableHead className="w-24">排序</TableHead>
                <TableHead className="w-24">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data?.map((pkg: VideoPackage & { video_count: number }) => (
                <TableRow key={pkg.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{pkg.name}</p>
                        {pkg.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {pkg.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3 text-muted-foreground" />
                      <span className="font-medium">¥{pkg.price}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Calendar className="w-3 h-3 text-muted-foreground" />
                      <span>{pkg.validity_days} 天</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {pkg.language ? (
                      <Badge variant="outline">
                        {VIDEO_LANGUAGE_LABELS[pkg.language as VideoLanguage]}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">全部</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Video className="w-3 h-3 text-muted-foreground" />
                      <span>{pkg.video_count || 0}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={pkg.is_active ? 'default' : 'secondary'}
                    >
                      {pkg.is_active ? '启用' : '禁用'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {pkg.display_order}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(pkg)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-600"
                        onClick={() => handleDelete(pkg.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {data.data?.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              暂无套餐
            </div>
          )}
        </div>
      )}

      {/* 编辑/新建弹窗 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingPackage ? '编辑套餐' : '添加套餐'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">套餐名称 *</label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="例如：英语入门套餐"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">描述</label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="套餐描述"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">价格（元）*</label>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="99"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">有效期（天）*</label>
                <Input
                  type="number"
                  value={formData.validity_days}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      validity_days: parseInt(e.target.value) || 0,
                    })
                  }
                  placeholder="365"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">语言</label>
              <Select
                value={formData.language}
                onValueChange={(v) => setFormData({ ...formData, language: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择语言（可选）" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">全部语言</SelectItem>
                  {Object.entries(VIDEO_LANGUAGE_LABELS).map(
                    ([code, label]) => (
                      <SelectItem key={code} value={code}>
                        {label}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">排序</label>
              <Input
                type="number"
                value={formData.display_order}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    display_order: parseInt(e.target.value) || 0,
                  })
                }
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">
                数字越小越靠前
              </p>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">启用状态</label>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_active: checked })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isSubmitting}
            >
              取消
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !formData.name}
            >
              {isSubmitting ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
