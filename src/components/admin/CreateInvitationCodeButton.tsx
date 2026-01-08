'use client'

/**
 * 创建邀请码按钮组件（客户端组件）
 * 支持选择套餐创建
 */

import { useState, useEffect } from 'react'

interface Package {
  id: string
  name: string
  description: string | null
  validity_days: number | null
  is_active: boolean
}

export function CreateInvitationCodeButton() {
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [packages, setPackages] = useState<Package[]>([])
  const [selectedPackage, setSelectedPackage] = useState<string>('')
  const [count, setCount] = useState(1)
  const [description, setDescription] = useState('')

  // 加载套餐列表
  useEffect(() => {
    if (showModal) {
      fetchPackages()
    }
  }, [showModal])

  const fetchPackages = async () => {
    try {
      const response = await fetch('/api/admin/packages?is_active=true')
      const data = await response.json()
      if (data.packages) {
        setPackages(data.packages)
        if (data.packages.length > 0) {
          setSelectedPackage(data.packages[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to fetch packages:', error)
    }
  }

  const handleCreate = async () => {
    if (!selectedPackage) {
      alert('请选择套餐')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/admin/invitation-codes/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          count,
          package_id: selectedPackage,
          description: description || undefined
        })
      })

      if (response.ok) {
        const data = await response.json()
        alert(`成功创建 ${data.codes.length} 个邀请码！\n\n${data.codes.map((c: any) => c.code).join('\n')}`)
        setShowModal(false)
        setDescription('')
        setCount(1)
        window.location.reload()
      } else {
        const errorData = await response.json()
        alert(errorData.error || '创建失败')
      }
    } catch (error) {
      console.error('Error creating invitation codes:', error)
      alert('创建失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const selectedPackageData = packages.find(p => p.id === selectedPackage)

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="px-6 py-3 bg-gradient-to-r from-green-400 to-green-600 text-white rounded-xl border-[2px] border-black font-bold hover:shadow-[4px_4px_0px_0px_#000] hover:-translate-y-1 transition-all"
      >
        + 创建邀请码
      </button>

      {/* 创建邀请码对话框 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">创建邀请码</h2>

            <div className="space-y-4">
              {/* 选择套餐 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  选择套餐 <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedPackage}
                  onChange={e => setSelectedPackage(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {packages.map(pkg => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name}
                      {pkg.validity_days ? ` (${pkg.validity_days}天)` : ' (永久)'}
                    </option>
                  ))}
                </select>
                {selectedPackageData && (
                  <p className="text-xs text-gray-500 mt-1">
                    {selectedPackageData.description}
                  </p>
                )}
              </div>

              {/* 创建数量 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  创建数量 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={count}
                  onChange={e => setCount(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* 备注 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  备注（可选）
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                  placeholder="如：双11活动库存补充"
                />
              </div>

              {/* 套餐信息预览 */}
              {selectedPackageData && (
                <div className="bg-gray-50 rounded p-3 text-sm">
                  <p className="font-medium text-gray-700 mb-1">套餐信息：</p>
                  <p>有效期：{selectedPackageData.validity_days ? `${selectedPackageData.validity_days}天` : '永久有效'}</p>
                  <p>使用次数：1次（一次性）</p>
                </div>
              )}
            </div>

            {/* 按钮 */}
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowModal(false)
                  setDescription('')
                  setCount(1)
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                disabled={loading}
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
