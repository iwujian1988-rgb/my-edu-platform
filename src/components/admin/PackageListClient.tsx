'use client'

/**
 * 套餐列表客户端组件
 * Neo-brutalism 风格
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'

// 功能权限选项
const FEATURE_PERMISSIONS = [
  { id: 'match_game', name: '消消乐' },
  { id: 'flashcard', name: '卡片背单词' },
  { id: 'dictation', name: '听写模式' },
  { id: 'custom_book', name: '自定义词库' },
  { id: 'review_mode', name: '复习模式' },
  { id: 'speaker', name: '雯姐学习法' },
  { id: 'video', name: '视频学习' }
]

// 语言包选项（雯姐学习法）
const LANGUAGE_PACKAGES = [
  { id: 'en', name: '英语', flag: '🇬🇧' },
  { id: 'pl', name: '波兰语', flag: '🇵🇱' },
  { id: 'es', name: '西班牙语', flag: '🇪🇸' },
  { id: 'fr', name: '法语', flag: '🇫🇷' },
  { id: 'de', name: '德语', flag: '🇩🇪' },
  { id: 'ja', name: '日语', flag: '🇯🇵' }
]

// 单词书类型
interface BookOption {
  id: string
  name: string
  language: string
}

// "全部单词书"选项
const ALL_BOOKS_OPTION: BookOption = { id: '*', name: '全部单词书', language: '*' }

// 视频套餐选项
interface VideoPackageOption {
  id: string
  name: string
  language: string | null
}

interface Package {
  id: string
  name: string
  description: string | null
  validity_days: number | null
  feature_permissions: string[]
  book_permissions: string[]
  language_packages: string[]
  video_package_ids: string[]
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
  const [bookOptions, setBookOptions] = useState<BookOption[]>([ALL_BOOKS_OPTION])
  const [videoPackageOptions, setVideoPackageOptions] = useState<VideoPackageOption[]>([])

  // 加载单词书列表和视频套餐列表
  useEffect(() => {
    const fetchData = async () => {
      // 加载单词书
      try {
        const response = await fetch('/api/books?all=true')
        const data = await response.json()
        if (data.books) {
          const options = data.books
            .filter((book: any) => book.is_official)
            .map((book: any) => ({ id: book.id, name: book.title, language: book.language || 'en' }))
            .sort((a: BookOption, b: BookOption) => a.name.localeCompare(b.name, 'zh-CN'))
          setBookOptions([ALL_BOOKS_OPTION, ...options])
        }
      } catch (error) {
        console.error('Failed to fetch books:', error)
      }

      // 加载视频套餐
      try {
        const response = await fetch('/api/admin/video-packages')
        const data = await response.json()
        if (data.packages || data.items) {
          const videoPkgs = (data.packages || data.items || []).map((pkg: any) => ({
            id: pkg.id,
            name: pkg.name,
            language: pkg.language
          }))
          setVideoPackageOptions(videoPkgs)
        }
      } catch (error) {
        console.error('Failed to fetch video packages:', error)
      }
    }
    fetchData()
  }, [])

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

  // 打开编辑弹窗
  const handleEdit = (pkg: Package) => {
    setEditingPackage(pkg)
  }

  // 关闭弹窗
  const handleCloseModal = () => {
    setShowCreateModal(false)
    setEditingPackage(null)
  }

  // 保存成功回调
  const handleSaveSuccess = () => {
    handleCloseModal()
    refreshPackages()
  }

  return (
    <div>
      {/* 操作栏 */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-black dark:text-white">筛选：</span>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 font-bold border-[3px] border-black dark:border-gray-600 transition-all ${
              filter === 'all'
                ? 'bg-blue-500 text-white shadow-[3px_3px_0px_0px_#000] dark:shadow-[3px_3px_0px_0px_#666]'
                : 'bg-white dark:bg-gray-800 text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            全部
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 font-bold border-[3px] border-black dark:border-gray-600 transition-all ${
              filter === 'active'
                ? 'bg-green-500 text-white shadow-[3px_3px_0px_0px_#000] dark:shadow-[3px_3px_0px_0px_#666]'
                : 'bg-white dark:bg-gray-800 text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            已启用
          </button>
          <button
            onClick={() => setFilter('inactive')}
            className={`px-4 py-2 font-bold border-[3px] border-black dark:border-gray-600 transition-all ${
              filter === 'inactive'
                ? 'bg-gray-500 text-white shadow-[3px_3px_0px_0px_#000] dark:shadow-[3px_3px_0px_0px_#666]'
                : 'bg-white dark:bg-gray-800 text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            已禁用
          </button>
        </div>

        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-green-500 hover:bg-green-600 text-white font-bold border-[3px] border-black shadow-[3px_3px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5 transition-all"
        >
          <Plus className="w-4 h-4 mr-2" />
          创建套餐
        </Button>
      </div>

      {/* 套餐列表 */}
      <div className="grid gap-4">
        {filteredPackages.map(pkg => (
          <div
            key={pkg.id}
            className="bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-600 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666] p-6 transition-all hover:shadow-[6px_6px_0px_0px_#000] dark:hover:shadow-[6px_6px_0px_0px_#666] hover:-translate-y-1"
          >
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-xl font-black text-black dark:text-white">{pkg.name}</h3>
                  <span
                    className={`px-3 py-1 font-bold text-sm border-2 border-black dark:border-gray-500 ${
                      pkg.is_active
                        ? 'bg-green-400 text-black'
                        : 'bg-gray-300 text-gray-700 dark:bg-gray-600 dark:text-gray-300'
                    }`}
                  >
                    {pkg.is_active ? '已启用' : '已禁用'}
                  </span>
                  <span className="text-sm font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 border-2 border-gray-300 dark:border-gray-600">
                    排序: {pkg.sort_order}
                  </span>
                </div>

                {pkg.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{pkg.description}</p>
                )}

                <div className="mt-4 space-y-3">
                  {/* 有效期 */}
                  <div className="text-sm">
                    <span className="font-bold text-gray-700 dark:text-gray-300">有效期：</span>
                    <span className="font-black text-black dark:text-white">
                      {pkg.validity_days
                        ? `${pkg.validity_days} 天`
                        : '永久有效'}
                    </span>
                  </div>

                  {/* 功能权限 */}
                  <div className="text-sm">
                    <span className="font-bold text-gray-700 dark:text-gray-300">功能权限：</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {pkg.feature_permissions.length > 0 ? (
                        pkg.feature_permissions.map(perm => (
                          <span
                            key={perm}
                            className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 font-bold text-xs border-2 border-blue-300 dark:border-blue-700"
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
                    <span className="font-bold text-gray-700 dark:text-gray-300">单词书权限：</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {pkg.book_permissions.length > 0 ? (
                        pkg.book_permissions.map(perm => (
                          <span
                            key={perm}
                            className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 font-bold text-xs border-2 border-green-300 dark:border-green-700"
                          >
                            {bookOptions.find(b => b.id === perm)?.name || perm}
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
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEdit(pkg)}
                  className="px-4 py-2 font-bold text-sm bg-yellow-400 text-black border-[3px] border-black shadow-[2px_2px_0px_0px_#000] hover:shadow-[3px_3px_0px_0px_#000] hover:-translate-y-0.5 transition-all"
                >
                  <Pencil className="w-4 h-4 inline mr-1" />
                  编辑
                </button>
                <button
                  onClick={() => toggleActive(pkg)}
                  className={`px-4 py-2 font-bold text-sm border-[3px] border-black shadow-[2px_2px_0px_0px_#000] hover:shadow-[3px_3px_0px_0px_#000] hover:-translate-y-0.5 transition-all ${
                    pkg.is_active
                      ? 'bg-orange-400 text-black'
                      : 'bg-green-400 text-black'
                  }`}
                >
                  {pkg.is_active ? (
                    <><ToggleRight className="w-4 h-4 inline mr-1" />禁用</>
                  ) : (
                    <><ToggleLeft className="w-4 h-4 inline mr-1" />启用</>
                  )}
                </button>
                <button
                  onClick={() => deletePackage(pkg.id)}
                  className="px-4 py-2 font-bold text-sm bg-red-500 text-white border-[3px] border-black shadow-[2px_2px_0px_0px_#000] hover:shadow-[3px_3px_0px_0px_#000] hover:-translate-y-0.5 transition-all"
                >
                  <Trash2 className="w-4 h-4 inline mr-1" />
                  删除
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredPackages.length === 0 && (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-600">
            暂无套餐数据
          </div>
        )}
      </div>

      {/* 创建套餐弹窗 */}
      <PackageFormDialog
        open={showCreateModal}
        package={null}
        bookOptions={bookOptions}
        videoPackageOptions={videoPackageOptions}
        onClose={handleCloseModal}
        onSave={handleSaveSuccess}
      />

      {/* 编辑套餐弹窗 */}
      <PackageFormDialog
        open={editingPackage !== null}
        package={editingPackage}
        bookOptions={bookOptions}
        videoPackageOptions={videoPackageOptions}
        onClose={handleCloseModal}
        onSave={handleSaveSuccess}
      />
    </div>
  )
}

// 套餐表单弹窗组件
function PackageFormDialog({
  open,
  package: pkg,
  bookOptions,
  videoPackageOptions,
  onClose,
  onSave
}: {
  open: boolean
  package: Package | null
  bookOptions: BookOption[]
  videoPackageOptions: VideoPackageOption[]
  onClose: () => void
  onSave: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    validity_days: 365,
    feature_permissions: [] as string[],
    book_permissions: [] as string[],
    language_packages: [] as string[],
    video_package_ids: [] as string[],
    is_active: true,
    sort_order: 0
  })

  // 当编辑的套餐变化时，更新表单数据
  useEffect(() => {
    if (pkg) {
      setFormData({
        name: pkg.name,
        description: pkg.description || '',
        validity_days: pkg.validity_days ?? null,
        feature_permissions: pkg.feature_permissions || [],
        book_permissions: pkg.book_permissions || [],
        language_packages: pkg.language_packages || [],
        video_package_ids: pkg.video_package_ids || [],
        is_active: pkg.is_active,
        sort_order: pkg.sort_order || 0
      })
    } else {
      setFormData({
        name: '',
        description: '',
        validity_days: 365,
        feature_permissions: [],
        book_permissions: [],
        language_packages: [],
        video_package_ids: [],
        is_active: true,
        sort_order: 0
      })
    }
  }, [pkg, open])

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
      if (permId === '*') {
        return {
          ...prev,
          book_permissions: prev.book_permissions.includes('*')
            ? []
            : ['*']
        }
      }

      const newPermissions = prev.book_permissions.includes(permId)
        ? prev.book_permissions.filter(p => p !== permId)
        : prev.book_permissions.filter(p => p !== '*').concat(permId)

      return {
        ...prev,
        book_permissions: newPermissions
      }
    })
  }

  // 切换语言包权限
  const toggleLanguagePackage = (langId: string) => {
    setFormData(prev => ({
      ...prev,
      language_packages: prev.language_packages.includes(langId)
        ? prev.language_packages.filter(l => l !== langId)
        : [...prev.language_packages, langId]
    }))
  }

  // 切换视频套餐权限
  const toggleVideoPackage = (pkgId: string) => {
    setFormData(prev => ({
      ...prev,
      video_package_ids: prev.video_package_ids.includes(pkgId)
        ? prev.video_package_ids.filter(id => id !== pkgId)
        : [...prev.video_package_ids, pkgId]
    }))
  }

  // 语言名称映射
  const languageNames: Record<string, string> = {
    'en': '英语',
    'fr': '法语',
    'de': '德语',
    'es': '西班牙语',
    'ja': '日语',
    'it': '意大利语',
    'ru': '俄语'
  }

  // 检测词库语言与语言权限的错配
  const getMismatchWarning = (): string | null => {
    // 没选语言权限，不需要校验
    if (formData.language_packages.length === 0) return null
    // 选了所有语言权限（通配符），不需要校验
    if (formData.language_packages.includes('*')) return null
    // 没选词库，不需要校验
    if (formData.book_permissions.length === 0) return null
    // 选了"全部词库"，按语言权限过滤
    if (formData.book_permissions.includes('*') || formData.book_permissions.includes('全部')) {
      return null // 全部词库由语言权限控制，不会错配
    }

    // 找出选中词库的语言
    const selectedBookLanguages = new Set<string>()
    for (const bookId of formData.book_permissions) {
      const book = bookOptions.find(b => b.id === bookId)
      if (book) selectedBookLanguages.add(book.language || 'en')
    }

    // 找出词库有但语言权限没有的语言
    const mismatchLangs = [...selectedBookLanguages].filter(
      lang => !formData.language_packages.includes(lang)
    )

    if (mismatchLangs.length === 0) return null

    const langNames = mismatchLangs.map(l => languageNames[l] || l).join('、')
    return `选中的词库包含${langNames}内容，但语言权限未勾选${langNames}，用户将无法看到这些词库`
  }

  const mismatchWarning = getMismatchWarning()

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
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 border-[3px] border-black dark:border-gray-600 shadow-[6px_6px_0px_0px_#000] dark:shadow-[6px_6px_0px_0px_#666]">
        <DialogHeader className="border-b-[3px] border-black dark:border-gray-700 pb-4">
          <DialogTitle className="text-2xl font-black text-black dark:text-white">
            {pkg ? '编辑套餐' : '创建套餐'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* 套餐名称 */}
          <div>
            <label className="block text-sm font-bold text-black dark:text-white mb-2">
              套餐名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 border-[3px] border-black dark:border-gray-600 bg-white dark:bg-gray-800 text-black dark:text-white font-semibold focus:ring-2 focus:ring-green-500 focus:outline-none"
              placeholder="如：1年基础版"
            />
          </div>

          {/* 套餐描述 */}
          <div>
            <label className="block text-sm font-bold text-black dark:text-white mb-2">
              套餐描述
            </label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 border-[3px] border-black dark:border-gray-600 bg-white dark:bg-gray-800 text-black dark:text-white font-semibold focus:ring-2 focus:ring-green-500 focus:outline-none resize-none"
              rows={2}
              placeholder="套餐的详细说明"
            />
          </div>

          {/* 有效期 */}
          <div>
            <label className="block text-sm font-bold text-black dark:text-white mb-2">
              有效期（天）
            </label>
            <div className="flex items-center gap-4">
              <input
                type="number"
                value={formData.validity_days || ''}
                onChange={e => setFormData({
                  ...formData,
                  validity_days: e.target.value ? parseInt(e.target.value) : null
                } as any)}
                className="w-32 px-4 py-3 border-[3px] border-black dark:border-gray-600 bg-white dark:bg-gray-800 text-black dark:text-white font-semibold focus:ring-2 focus:ring-green-500 focus:outline-none"
                placeholder="365"
              />
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.validity_days === null}
                  onChange={e => setFormData({
                    ...formData,
                    validity_days: e.target.checked ? null : 365
                  } as any)}
                  className="w-5 h-5 border-[3px] border-black dark:border-gray-600"
                />
                <span className="font-bold text-black dark:text-white">永久有效</span>
              </label>
            </div>
          </div>

          {/* 功能权限 */}
          <div>
            <label className="block text-sm font-bold text-black dark:text-white mb-3">
              功能权限
            </label>
            <div className="flex flex-wrap gap-2">
              {FEATURE_PERMISSIONS.map(perm => (
                <label
                  key={perm.id}
                  className={`flex items-center gap-2 px-4 py-2 font-bold border-[3px] border-black dark:border-gray-600 cursor-pointer transition-all ${
                    formData.feature_permissions.includes(perm.id)
                      ? 'bg-blue-500 text-white shadow-[2px_2px_0px_0px_#000]'
                      : 'bg-white dark:bg-gray-800 text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.feature_permissions.includes(perm.id)}
                    onChange={() => toggleFeaturePermission(perm.id)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{perm.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 单词书权限 */}
          <div>
            <label className="block text-sm font-bold text-black dark:text-white mb-3">
              单词书权限
            </label>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-4 border-[3px] border-black dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
              {bookOptions.map(perm => (
                <label
                  key={perm.id}
                  className={`flex items-center gap-2 px-4 py-2 font-bold border-[3px] cursor-pointer transition-all ${
                    perm.id === '*'
                      ? 'border-yellow-500 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                      : formData.book_permissions.includes(perm.id)
                        ? 'border-green-500 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                        : 'border-black dark:border-gray-600 bg-white dark:bg-gray-700 text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.book_permissions.includes(perm.id)}
                    onChange={() => toggleBookPermission(perm.id)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{perm.name}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 font-semibold">
              共 {bookOptions.length - 1} 本单词书可选，选择"全部单词书"将自动授权所有单词书
            </p>
          </div>

          {/* 语言权限配置 - 控制用户可访问的词库/视频语言 */}
          <div className="p-4 bg-blue-100 dark:bg-blue-900 border-[3px] border-blue-500">
            <label className="block text-sm font-bold text-blue-900 dark:text-blue-200 mb-2">
              语言权限
            </label>
            <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
              选择该套餐包含的语言。用户只能访问已授权语言的词库和学习材料
            </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {LANGUAGE_PACKAGES.map(lang => (
                  <label
                    key={lang.id}
                    className={`flex items-center gap-2 px-3 py-2 font-bold border-[3px] cursor-pointer transition-all ${
                      formData.language_packages.includes(lang.id)
                        ? 'border-blue-500 bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-blue-100 shadow-[2px_2px_0px_0px_#3b82f6]'
                        : 'border-blue-300 dark:border-blue-700 bg-white dark:bg-gray-800 text-blue-900 dark:text-blue-100 hover:bg-blue-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.language_packages.includes(lang.id)}
                      onChange={() => toggleLanguagePackage(lang.id)}
                      className="w-4 h-4"
                    />
                    <span className="text-lg">{lang.flag}</span>
                    <span className="text-sm">{lang.name}</span>
                  </label>
                ))}
              </div>
            </div>

          {/* 视频套餐关联 - 复用视频模块的套餐系统 */}
          {formData.feature_permissions.includes('video') && (
            <div className="p-4 bg-red-100 dark:bg-red-900 border-[3px] border-red-500">
              <label className="block text-sm font-bold text-red-900 dark:text-red-200 mb-2">
                视频学习 - 关联视频套餐
              </label>
              <p className="text-xs text-red-700 dark:text-red-300 mb-3">
                用户购买此邀请码套餐后，自动获得以下视频套餐的访问权限
              </p>
              {videoPackageOptions.length > 0 ? (
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                  {videoPackageOptions.map(videoPkg => (
                    <label
                      key={videoPkg.id}
                      className={`flex items-center gap-2 px-4 py-2 font-bold border-[3px] cursor-pointer transition-all ${
                        formData.video_package_ids.includes(videoPkg.id)
                          ? 'border-red-500 bg-red-200 dark:bg-red-800 text-red-900 dark:text-red-100 shadow-[2px_2px_0px_0px_#ef4444]'
                          : 'border-red-300 dark:border-red-700 bg-white dark:bg-gray-800 text-red-900 dark:text-red-100 hover:bg-red-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.video_package_ids.includes(videoPkg.id)}
                        onChange={() => toggleVideoPackage(videoPkg.id)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">
                        {videoPkg.name}
                        {videoPkg.language && (
                          <span className="ml-1 text-xs opacity-70">
                            ({languageNames[videoPkg.language] || videoPkg.language})
                          </span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-red-600 dark:text-red-400">
                  暂无视频套餐可选，请先在"视频套餐管理"中创建视频套餐
                </p>
              )}
              <p className="text-xs text-red-600 dark:text-red-400 mt-2 font-semibold">
                已选择 {formData.video_package_ids.length} 个视频套餐
              </p>
            </div>
          )}

          {/* 其他选项 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-black dark:text-white mb-2">
                排序
              </label>
              <input
                type="number"
                value={formData.sort_order}
                onChange={e => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
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
                <span className="font-bold text-black dark:text-white">启用套餐</span>
              </label>
            </div>
          </div>

          {/* 配置冲突警告 */}
          {mismatchWarning && (
            <div className="p-4 bg-yellow-100 dark:bg-yellow-900 border-[3px] border-yellow-500 shadow-[3px_3px_0px_0px_#eab308]">
              <p className="text-sm font-bold text-yellow-900 dark:text-yellow-100">
                ⚠️ {mismatchWarning}
              </p>
            </div>
          )}

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
              {loading ? '保存中...' : pkg ? '保存' : '创建'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
