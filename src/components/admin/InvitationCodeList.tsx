'use client'

/**
 * 邀请码列表组件
 * 显示邀请码列表、搜索、筛选、操作等功能
 */

import { useState } from 'react'
import { Search, Ticket, Copy, Trash2, Ban, Check, User, Download } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

interface InvitationCode {
  id: string
  code: string
  max_uses: number
  used_count: number
  is_active: boolean
  created_at: string
  expires_at: string | null
}

interface InvitationCodeListProps {
  codes: InvitationCode[]
  totalCodes: number
  currentPage: number
  totalPages: number
  search: string
  status: string
}

export function InvitationCodeList({
  codes,
  totalCodes,
  currentPage,
  totalPages,
  search,
  status
}: InvitationCodeListProps) {
  const [searchQuery, setSearchQuery] = useState(search)
  const [statusFilter, setStatusFilter] = useState(status)
  const [exporting, setExporting] = useState(false)

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (searchQuery) params.set('search', searchQuery)
    if (statusFilter) params.set('status', statusFilter)
    window.location.href = `/admin/invitation-codes?${params.toString()}`
  }

  // 批量导出当前页的邀请码
  const handleExportCurrentPage = async () => {
    if (codes.length === 0) {
      alert('当前页没有邀请码可导出')
      return
    }

    const confirmed = confirm(`确定要导出当前页的 ${codes.length} 个邀请码吗？`)
    if (!confirmed) return

    setExporting(true)
    try {
      await exportCodes(codes.map((c) => c.id))
    } finally {
      setExporting(false)
    }
  }

  // 导出邀请码为 Excel
  const exportCodes = async (codeIds: string[]) => {
    try {
      const response = await fetch('/api/admin/invitation-codes/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codes: codeIds })
      })

      if (response.ok) {
        // 下载文件
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        const filename = `invitation_codes_${new Date().getTime()}.xlsx`
        a.download = filename
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)

        alert('导出成功！')
      } else {
        const errorData = await response.json()
        alert(`导出失败: ${errorData.error || '未知错误'}`)
      }
    } catch (error) {
      console.error('Error exporting codes:', error)
      alert('导出失败，请稍后重试')
    }
  }

  return (
    <div className="space-y-6">
      {/* 搜索和筛选 */}
      <div className="bg-white rounded-2xl border-[3px] border-black shadow-[4px_4px_0px_0px_#000] p-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* 搜索框 */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="搜索邀请码或备注..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-3 rounded-xl border-[2px] border-gray-300 focus:border-green-500 focus:outline-none font-semibold"
              />
            </div>
          </div>

          {/* 状态筛选 */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 rounded-xl border-[2px] border-gray-300 focus:border-green-500 focus:outline-none font-semibold bg-white"
          >
            <option value="">全部邀请码</option>
            <option value="unused">未使用</option>
            <option value="used">已使用</option>
            <option value="disabled">已禁用</option>
          </select>

          {/* 搜索按钮 */}
          <button
            onClick={handleSearch}
            className="px-6 py-3 bg-gradient-to-r from-green-400 to-green-600 text-white rounded-xl border-[2px] border-black font-bold hover:shadow-[4px_4px_0px_0px_#000] hover:-translate-y-1 transition-all"
          >
            搜索
          </button>

          {/* 批量导出按钮 */}
          <button
            onClick={handleExportCurrentPage}
            disabled={exporting || codes.length === 0}
            className="px-6 py-3 bg-gradient-to-r from-blue-400 to-blue-600 text-white rounded-xl border-[2px] border-black font-bold hover:shadow-[4px_4px_0px_0px_#000] hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Download size={20} />
            {exporting ? '导出中...' : '导出当前页'}
          </button>
        </div>

        {/* 统计信息 */}
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Ticket className="text-purple-600" size={16} />
            <span className="font-semibold text-gray-600">
              总计: {totalCodes} 个邀请码
            </span>
          </div>
          {search && (
            <div className="flex items-center gap-2">
              <span className="text-gray-400">|</span>
              <span className="font-semibold text-green-600">
                搜索: "{search}"
              </span>
            </div>
          )}
          {statusFilter && (
            <div className="flex items-center gap-2">
              <span className="text-gray-400">|</span>
              <span className="font-semibold text-blue-600">
                {statusFilter === 'unused' ? '未使用' : statusFilter === 'used' ? '已使用' : '已禁用'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 邀请码表格 */}
      <div className="bg-white rounded-2xl border-[3px] border-black shadow-[4px_4px_0px_0px_#000] overflow-hidden">
        {codes.length === 0 ? (
          <div className="text-center py-12">
            <Ticket className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-500 font-semibold text-lg">暂无邀请码</p>
            <p className="text-gray-400 text-sm mt-2">点击上方按钮创建邀请码</p>
          </div>
        ) : (
          <>
            {/* 桌面端表格 */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-[2px] border-gray-200">
                  <tr>
                    <th className="text-left py-4 px-6 font-bold text-gray-700">邀请码</th>
                    <th className="text-left py-4 px-6 font-bold text-gray-700">备注</th>
                    <th className="text-left py-4 px-6 font-bold text-gray-700">使用情况</th>
                    <th className="text-left py-4 px-6 font-bold text-gray-700">状态</th>
                    <th className="text-left py-4 px-6 font-bold text-gray-700">创建时间</th>
                    <th className="text-right py-4 px-6 font-bold text-gray-700">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {codes.map((code) => (
                    <tr key={code.id} className="hover:bg-gray-50 transition-colors">
                      {/* 邀请码 */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <code className="px-3 py-1 bg-gray-100 rounded-lg font-mono font-bold text-gray-800">
                            {code.code}
                          </code>
                          <CopyButton code={code.code} />
                        </div>
                      </td>

                      {/* 备注 */}
                      <td className="py-4 px-6">
                        <span className="text-gray-600 font-semibold">
                          -
                        </span>
                      </td>

                      {/* 使用情况 */}
                      <td className="py-4 px-6">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-semibold text-gray-700">
                              {code.used_count} / {code.max_uses === -1 ? '无限' : code.max_uses}
                            </span>
                            <span className="text-gray-500">次使用</span>
                          </div>
                          {code.used_count > 0 && (
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <User size={12} />
                              <span>已被使用</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 状态 */}
                      <td className="py-4 px-6">
                        {!code.is_active ? (
                          <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 rounded-full border-[2px] border-red-200">
                            <Ban className="text-red-600" size={16} />
                            <span className="text-sm font-bold text-red-600">已禁用</span>
                          </div>
                        ) : code.used_count > 0 ? (
                          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-full border-[2px] border-blue-200">
                            <Check className="text-blue-600" size={16} />
                            <span className="text-sm font-bold text-blue-600">已使用</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 rounded-full border-[2px] border-green-200">
                            <Ticket className="text-green-600" size={16} />
                            <span className="text-sm font-bold text-green-600">未使用</span>
                          </div>
                        )}
                      </td>

                      {/* 创建时间 */}
                      <td className="py-4 px-6">
                        <span className="text-sm text-gray-600 font-semibold">
                          {formatDate(code.created_at)}
                        </span>
                      </td>

                      {/* 操作按钮 */}
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-end gap-2">
                          <DisableButton codeId={code.id} code={code.code} isDisabled={!code.is_active} />
                          <DeleteButton codeId={code.id} code={code.code} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 移动端卡片 */}
            <div className="md:hidden space-y-4 p-4">
              {codes.map((code) => (
                <div key={code.id} className="bg-gray-50 rounded-xl p-4 border-[2px] border-gray-200">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 flex-1">
                      <code className="px-3 py-1 bg-white rounded-lg font-mono font-bold text-gray-800">
                        {code.code}
                      </code>
                      <CopyButton code={code.code} />
                    </div>
                    {!code.is_active ? (
                      <div className="px-2 py-1 bg-red-50 rounded-full border-[2px] border-red-200 ml-2">
                        <span className="text-xs font-bold text-red-600">已禁用</span>
                      </div>
                    ) : code.used_count > 0 ? (
                      <div className="px-2 py-1 bg-blue-50 rounded-full border-[2px] border-blue-200 ml-2">
                        <span className="text-xs font-bold text-blue-600">已使用</span>
                      </div>
                    ) : (
                      <div className="px-2 py-1 bg-green-50 rounded-full border-[2px] border-green-200 ml-2">
                        <span className="text-xs font-bold text-green-600">未使用</span>
                      </div>
                    )}
                  </div>

                  {false && (
                    <p className="text-sm text-gray-600 mb-2 font-semibold">备注</p>
                  )}

                  <div className="text-sm text-gray-600 mb-3 font-semibold">
                    使用: {code.used_count} / {code.max_uses === -1 ? '无限' : code.max_uses}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                    <span className="text-xs text-gray-500">{formatDate(code.created_at)}</span>
                    <div className="flex gap-2">
                      <DisableButton codeId={code.id} code={code.code} isDisabled={!code.is_active} />
                      <DeleteButton codeId={code.id} code={code.code} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t-[2px] border-gray-200">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600 font-semibold">
                    第 {(currentPage - 1) * 20 + 1} - {Math.min(currentPage * 20, totalCodes)} 条，共 {totalCodes} 条
                  </p>
                  <div className="flex gap-2">
                    <Link
                      href={`/admin/invitation-codes?page=${Math.max(1, currentPage - 1)}&search=${search}&status=${status}`}
                      className={`px-4 py-2 rounded-lg font-bold transition-all ${
                        currentPage === 1
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-white border-[2px] border-black hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5'
                      }`}
                    >
                      上一页
                    </Link>
                    <span className="px-4 py-2 bg-green-500 text-white rounded-lg font-bold">
                      {currentPage} / {totalPages}
                    </span>
                    <Link
                      href={`/admin/invitation-codes?page=${Math.min(totalPages, currentPage + 1)}&search=${search}&status=${status}`}
                      className={`px-4 py-2 rounded-lg font-bold transition-all ${
                        currentPage === totalPages
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-white border-[2px] border-black hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5'
                      }`}
                    >
                      下一页
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

/**
 * 复制按钮
 */
function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="p-1 text-gray-400 hover:text-green-600 transition-colors"
      title={copied ? '已复制' : '复制'}
    >
      <Copy size={16} />
    </button>
  )
}

/**
 * 禁用/启用按钮
 */
function DisableButton({ codeId, code, isDisabled }: { codeId: string; code: string; isDisabled: boolean }) {
  const [loading, setLoading] = useState(false)

  const handleToggle = async () => {
    if (!confirm(isDisabled ? '确定要启用该邀请码吗？' : '确定要禁用该邀请码吗？')) return

    setLoading(true)
    try {
      const response = await fetch('/api/admin/invitation-codes/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codeId, isDisabled: !isDisabled })
      })

      if (response.ok) {
        alert(isDisabled ? '邀请码已启用' : '邀请码已禁用')
        window.location.reload()
      } else {
        const data = await response.json()
        alert(data.error || '操作失败')
      }
    } catch (error) {
      console.error('Error toggling invitation code:', error)
      alert('操作失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`p-2 rounded-lg transition-colors ${
        isDisabled
          ? 'text-green-600 hover:bg-green-50'
          : 'text-red-600 hover:bg-red-50'
      }`}
      title={isDisabled ? '启用邀请码' : '禁用邀请码'}
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : isDisabled ? (
        <Check size={18} />
      ) : (
        <Ban size={18} />
      )}
    </button>
  )
}

/**
 * 删除按钮
 */
function DeleteButton({ codeId, code }: { codeId: string; code: string }) {
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (!confirm(`确定要删除邀请码 "${code}" 吗？此操作不可恢复！`)) return

    setLoading(true)
    try {
      const response = await fetch('/api/admin/invitation-codes/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codeId })
      })

      if (response.ok) {
        alert('邀请码已删除')
        window.location.reload()
      } else {
        const data = await response.json()
        alert(data.error || '删除失败')
      }
    } catch (error) {
      console.error('Error deleting invitation code:', error)
      alert('删除失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
      title="删除邀请码"
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <Trash2 size={18} />
      )}
    </button>
  )
}
