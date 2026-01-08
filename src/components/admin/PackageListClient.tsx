'use client'

/**
 * 套餐列表客户端组件
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// 功能权限选项
const FEATURE_PERMISSIONS = [
  { id: 'match_game', name: '消消乐' },
  { id: 'flashcard', name: '卡片背单词' },
  { id: 'dictation', name: '听写模式' },
  { id: 'custom_book', name: '自定义词库' },
  { id: 'review_mode', name: '复习模式' }
]

// 单词书权限选项
const BOOK_PERMISSIONS = [
  { id: 'cet4', name: 'CET4' },
  { id: 'cet6', name: 'CET6' },
  { id: 'toefl', name: '托福' },
  { id: 'ielts', name: '雅思' },
  { id: 'gre', name: 'GRE' },
  { id: 'gmat', name: 'GMAT' },
  { id: 'high_school_3500', name: '高中3500词' },
  { id: '*', name: '全部单词书' }
]

interface Package {
  id: string
  name: string
  description: string | null
  validity_days: number | null
  feature_permissions: string[]
  book_permissions: string[]
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

interface PackageListClientProps {
  initialPackages: Package[]
}

export default function PackageListClient({ initialPackages }: PackageListClientProps) {
  const router = useRouter()
  const [packages, setPackages] = useState<Package[]>(initialPackages)
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingPackage, setEditingPackage] = useState<Package | null>(null)
  const [loading, setLoading] = useState(false)

  // 筛选套餐
  const filteredPackages = packages.filter(pkg => {
    if (filter === 'all') return true
    if (filter === 'active') return pkg.is_active
    if (filter === 'inactive') return !pkg.is_active
    return true
  })

  // 刷新套餐列表
  const refreshPackages = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/packages')
      const data = await response.json()
      if (data.packages) {
        setPackages(data.packages)
      }
    } catch (error) {
      console.error('Failed to refresh packages:', error)
    } finally {
      setLoading(false)
    }
  }

  // 切换套餐启用状态
  const toggleActive = async (pkg: Package) => {
    try {
      const response = await fetch(`/api/admin/packages/${pkg.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !pkg.is_active })
      })

      if (response.ok) {
        refreshPackages()
      }
    } catch (error) {
      console.error('Failed to toggle package status:', error)
    }
  }

  // 删除套餐
  const deletePackage = async (id: string) => {
    if (!confirm('确定删除该套餐吗？删除后无法恢复。')) return

    try {
      const response = await fetch(`/api/admin/packages/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        refreshPackages()
      }
    } catch (error) {
      console.error('Failed to delete package:', error)
    }
  }

  return (
    <div>
      {/* 操作栏 */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">筛选：</span>
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded text-sm ${
              filter === 'all'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            全部
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-3 py-1 rounded text-sm ${
              filter === 'active'
                ? 'bg-green-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            已启用
          </button>
          <button
            onClick={() => setFilter('inactive')}
            className={`px-3 py-1 rounded text-sm ${
              filter === 'inactive'
                ? 'bg-gray-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            已禁用
          </button>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          + 创建套餐
        </button>
      </div>

      {/* 套餐列表 */}
      <div className="grid gap-4">
        {filteredPackages.map(pkg => (
          <div
            key={pkg.id}
            className="bg-white rounded-lg shadow p-4 border border-gray-200"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-gray-900">{pkg.name}</h3>
                  <span
                    className={`px-2 py-0.5 rounded text-xs ${
                      pkg.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {pkg.is_active ? '已启用' : '已禁用'}
                  </span>
                  <span className="text-xs text-gray-500">
                    排序: {pkg.sort_order}
                  </span>
                </div>

                {pkg.description && (
                  <p className="text-sm text-gray-600 mt-1">{pkg.description}</p>
                )}

                <div className="mt-3 space-y-2">
                  {/* 有效期 */}
                  <div className="text-sm">
                    <span className="text-gray-600">有效期：</span>
                    <span className="font-medium">
                      {pkg.validity_days
                        ? `${pkg.validity_days} 天`
                        : '永久有效'}
                    </span>
                  </div>

                  {/* 功能权限 */}
                  <div className="text-sm">
                    <span className="text-gray-600">功能权限：</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {pkg.feature_permissions.length > 0 ? (
                        pkg.feature_permissions.map(perm => (
                          <span
                            key={perm}
                            className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs"
                          >
                            {FEATURE_PERMISSIONS.find(f => f.id === perm)?.name || perm}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400">无</span>
                      )}
                    </div>
                  </div>

                  {/* 单词书权限 */}
                  <div className="text-sm">
                    <span className="text-gray-600">单词书权限：</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {pkg.book_permissions.length > 0 ? (
                        pkg.book_permissions.map(perm => (
                          <span
                            key={perm}
                            className="px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs"
                          >
                            {BOOK_PERMISSIONS.find(b => b.id === perm)?.name || perm}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-400">无</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => setEditingPackage(pkg)}
                  className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  编辑
                </button>
                <button
                  onClick={() => toggleActive(pkg)}
                  className={`px-3 py-1.5 text-sm rounded ${
                    pkg.is_active
                      ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  {pkg.is_active ? '禁用' : '启用'}
                </button>
                <button
                  onClick={() => deletePackage(pkg.id)}
                  className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredPackages.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            暂无套餐数据
          </div>
        )}
      </div>

      {/* 创建/编辑套餐对话框 */}
      {(showCreateModal || editingPackage) && (
        <PackageFormModal
          package={editingPackage}
          onClose={() => {
            setShowCreateModal(false)
            setEditingPackage(null)
          }}
          onSave={() => {
            setShowCreateModal(false)
            setEditingPackage(null)
            refreshPackages()
          }}
        />
      )}
    </div>
  )
}

// 套餐表单对话框组件
function PackageFormModal({
  package: pkg,
  onClose,
  onSave
}: {
  package: Package | null
  onClose: () => void
  onSave: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: pkg?.name || '',
    description: pkg?.description || '',
    validity_days: pkg?.validity_days || 365,
    feature_permissions: pkg?.feature_permissions || [],
    book_permissions: pkg?.book_permissions || [],
    is_active: pkg?.is_active ?? true,
    sort_order: pkg?.sort_order || 0
  })

  // 切换功能权限
  const toggleFeaturePermission = (permId: string) => {
    setFormData(prev => ({
      ...prev,
      feature_permissions: prev.feature_permissions.includes(permId)
        ? prev.feature_permissions.filter(p => p !== permId)
        : [...prev.feature_permissions, permId]
    }))
  }

  // 切换单词书权限
  const toggleBookPermission = (permId: string) => {
    setFormData(prev => {
      // 如果选择"全部"，清除其他选项
      if (permId === '*') {
        return {
          ...prev,
          book_permissions: prev.book_permissions.includes('*')
            ? []
            : ['*']
        }
      }

      // 如果选择其他，清除"全部"
      const newPermissions = prev.book_permissions.includes(permId)
        ? prev.book_permissions.filter(p => p !== permId)
        : prev.book_permissions.filter(p => p !== '*').concat(permId)

      return {
        ...prev,
        book_permissions: newPermissions
      }
    })
  }

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = pkg
        ? `/api/admin/packages/${pkg.id}`
        : '/api/admin/packages'

      const response = await fetch(url, {
        method: pkg ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        onSave()
      } else {
        const error = await response.json()
        alert(error.error || '操作失败')
      }
    } catch (error) {
      console.error('Failed to save package:', error)
      alert('操作失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">
            {pkg ? '编辑套餐' : '创建套餐'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 套餐名称 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                套餐名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="如：1年基础版"
              />
            </div>

            {/* 套餐描述 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                套餐描述
              </label>
              <textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={2}
                placeholder="套餐的详细说明"
              />
            </div>

            {/* 有效期 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                有效期（天）
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={formData.validity_days || ''}
                  onChange={e => setFormData({
                    ...formData,
                    validity_days: e.target.value ? parseInt(e.target.value) : null
                  } as any)}
                  className="w-32 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="365"
                />
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={formData.validity_days === null}
                    onChange={e => setFormData({
                      ...formData,
                      validity_days: e.target.checked ? null : 365
                    } as any)}
                    className="rounded"
                  />
                  <span className="text-sm">永久有效</span>
                </label>
              </div>
            </div>

            {/* 功能权限 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                功能权限
              </label>
              <div className="flex flex-wrap gap-2">
                {FEATURE_PERMISSIONS.map(perm => (
                  <label
                    key={perm.id}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded border cursor-pointer ${
                      formData.feature_permissions.includes(perm.id)
                        ? 'bg-blue-50 border-blue-500'
                        : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.feature_permissions.includes(perm.id)}
                      onChange={() => toggleFeaturePermission(perm.id)}
                      className="rounded"
                    />
                    <span className="text-sm">{perm.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 单词书权限 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                单词书权限
              </label>
              <div className="flex flex-wrap gap-2">
                {BOOK_PERMISSIONS.map(perm => (
                  <label
                    key={perm.id}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded border cursor-pointer ${
                      formData.book_permissions.includes(perm.id)
                        ? 'bg-green-50 border-green-500'
                        : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.book_permissions.includes(perm.id)}
                      onChange={() => toggleBookPermission(perm.id)}
                      className="rounded"
                    />
                    <span className="text-sm">{perm.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 其他选项 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  排序
                </label>
                <input
                  type="number"
                  value={formData.sort_order}
                  onChange={e => setFormData({ ...formData, sort_order: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 mt-6">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">启用套餐</span>
                </label>
              </div>
            </div>

            {/* 按钮 */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                disabled={loading}
              >
                取消
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? '保存中...' : pkg ? '保存' : '创建'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
