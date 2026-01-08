'use client'

/**
 * 用户详情组件
 * 显示用户的完整信息和操作选项
 * 包含权限管理功能
 */

import { useState } from 'react'
import { Mail, Calendar, Shield, Ban, ShieldAlert, Key, Clock, BookOpen, TrendingUp, Settings, X } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface User {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
  last_login_at: string | null
  banned_at: string | null
  banned_reason: string | null
  feature_permissions: string[] | null
  book_permissions: string[] | null
  permission_expires_at: string | null
  invitation_code_id: string | null
}

interface Stats {
  learningDays: number
  wordsLearned: number
  wordsFuzzy: number
  wordsUnknown: number
  totalWords: number
}

interface InvitationCode {
  id: string
  code: string
  created_at: string
}

interface Book {
  id: string
  title: string
}

interface Package {
  id: string
  name: string
  description: string | null
  duration_days: number | null
}

interface UserDetailProps {
  user: User
  stats: Stats
  invitationCode: InvitationCode | null
  allBooks: Book[]
  userPackage: Package | null
}

const FEATURE_PERMISSIONS = [
  { id: 'match_game', name: '消消乐' },
  { id: 'flashcard', name: '卡片背单词' },
  { id: 'dictation', name: '听写模式' },
  { id: 'custom_book', name: '自定义词库' },
  { id: 'review_mode', name: '复习模式' }
]

export function UserDetail({ user, stats, invitationCode, allBooks, userPackage }: UserDetailProps) {
  const [loading, setLoading] = useState(false)
  const [showPermissionModal, setShowPermissionModal] = useState(false)

  // 辅助函数：将UUID转换为书名
  const getBookName = (bookId: string) => {
    const book = allBooks.find(b => b.id === bookId)
    if (book) {
      return book.title
    }
    // 如果找不到，返回UUID的前8位
    return `${bookId.substring(0, 8)}...`
  }

  // 计算权限到期信息
  const getExpirationInfo = () => {
    if (!user.permission_expires_at) {
      return { text: '永久有效', isExpired: false, daysLeft: null }
    }

    const now = new Date()
    const expireDate = new Date(user.permission_expires_at)
    const daysLeft = Math.ceil((expireDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (daysLeft < 0) {
      return { text: `已过期 ${Math.abs(daysLeft)} 天`, isExpired: true, daysLeft }
    } else if (daysLeft === 0) {
      return { text: '今天到期', isExpired: false, daysLeft }
    } else if (daysLeft <= 7) {
      return { text: `${daysLeft}天后到期（即将过期）`, isExpired: false, daysLeft }
    } else {
      return { text: `${formatDate(user.permission_expires_at)}（还剩${daysLeft}天）`, isExpired: false, daysLeft }
    }
  }

  const expirationInfo = getExpirationInfo()

  const handleResetPassword = async () => {
    if (!confirm('确定要重置该用户的密码吗？重置后需要用户下次登录时设置新密码。')) return

    setLoading(true)
    try {
      const response = await fetch('/api/admin/users/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      })

      if (response.ok) {
        alert('密码重置成功，用户下次登录时需要设置新密码')
      } else {
        const data = await response.json()
        alert(data.error || '操作失败')
      }
    } catch (error) {
      console.error('Error resetting password:', error)
      alert('操作失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 基本信息 */}
      <div className="bg-white rounded-2xl border-[3px] border-black shadow-[4px_4px_0px_0px_#000] p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-black text-3xl">
              {user.full_name?.charAt(0)?.toUpperCase() || user.email.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-800 mb-1" style={{ fontFamily: 'Fredoka, sans-serif' }}>
                {user.full_name || '未设置昵称'}
              </h2>
              <div className="flex items-center gap-2 text-gray-600">
                <Mail size={16} />
                <span className="font-semibold">{user.email}</span>
              </div>
            </div>
          </div>

          {/* 状态标签 */}
          {user.banned_at ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-red-50 rounded-full border-[2px] border-red-200">
              <Ban className="text-red-600" size={20} />
              <span className="font-bold text-red-600">已封禁</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-full border-[2px] border-green-200">
              <Shield className="text-green-600" size={20} />
              <span className="font-bold text-green-600">正常</span>
            </div>
          )}
        </div>

        {/* 账户信息 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
            <Calendar className="text-gray-600" size={20} />
            <div>
              <p className="text-sm text-gray-500 font-semibold">注册时间</p>
              <p className="font-bold text-gray-800">{formatDate(user.created_at)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
            <Clock className="text-gray-600" size={20} />
            <div>
              <p className="text-sm text-gray-500 font-semibold">最后登录</p>
              <p className="font-bold text-gray-800">
                {user.last_login_at ? formatDate(user.last_login_at) : '从未登录'}
              </p>
            </div>
          </div>

          {invitationCode && (
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border-[2px] border-blue-200">
              <Key className="text-blue-600" size={20} />
              <div>
                <p className="text-sm text-blue-600 font-semibold">注册邀请码</p>
                <p className="font-bold text-gray-800">{invitationCode.code}</p>
              </div>
            </div>
          )}

          {user.banned_at && (
            <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl border-[2px] border-red-200">
              <Ban className="text-red-600" size={20} />
              <div>
                <p className="text-sm text-red-600 font-semibold">封禁原因</p>
                <p className="font-bold text-gray-800">{user.banned_reason || '未填写原因'}</p>
              </div>
            </div>
          )}

          {userPackage && (
            <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-xl border-[2px] border-purple-200 md:col-span-2">
              <TrendingUp className="text-purple-600" size={20} />
              <div className="flex-1">
                <p className="text-sm text-purple-600 font-semibold">套餐信息</p>
                <p className="font-bold text-gray-800">{userPackage.name}</p>
                {userPackage.description && (
                  <p className="text-sm text-gray-600">{userPackage.description}</p>
                )}
              </div>
              {userPackage.duration_days && (
                <div className="text-right">
                  <p className="text-sm text-gray-500">有效期</p>
                  <p className="font-bold text-purple-600">{userPackage.duration_days}天</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={() => setShowPermissionModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-xl border-[2px] border-black font-bold hover:shadow-[4px_4px_0px_0px_#000] hover:-translate-y-1 transition-all"
          >
            <Settings size={18} />
            权限管理
          </button>

          <button
            onClick={handleResetPassword}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl border-[2px] border-black font-bold hover:shadow-[4px_4px_0px_0px_#000] hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Key size={18} />
            {loading ? '处理中...' : '重置密码'}
          </button>

          <BanUserButton userId={user.id} isBanned={!!user.banned_at} />
        </div>

        {/* 权限信息 */}
        <div className="mt-6 p-4 bg-gray-50 rounded-xl">
          <h4 className="font-bold text-gray-800 mb-3">当前权限</h4>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-600">功能权限：</span>
              <span className="font-medium">
                {user.feature_permissions && user.feature_permissions.length > 0
                  ? user.feature_permissions.map(p => FEATURE_PERMISSIONS.find(f => f.id === p)?.name || p).join(', ')
                  : '无'}
              </span>
            </div>
            <div>
              <span className="text-gray-600">单词书权限：</span>
              <span className="font-medium">
                {user.book_permissions && user.book_permissions.length > 0
                  ? (user.book_permissions.includes('*')
                      ? '全部单词书'
                      : user.book_permissions.map(p => getBookName(p)).join(', '))
                  : '无'}
              </span>
            </div>
            <div>
              <span className="text-gray-600">权限到期：</span>
              <span className={`font-medium ${expirationInfo.isExpired ? 'text-red-600' : expirationInfo.daysLeft !== null && expirationInfo.daysLeft <= 7 ? 'text-orange-600' : ''}`}>
                {expirationInfo.text}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 学习统计 */}
      <div className="bg-white rounded-2xl border-[3px] border-black shadow-[4px_4px_0px_0px_#000] p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <TrendingUp className="text-green-600" size={24} />
          学习统计
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-green-50 rounded-xl p-4 border-[2px] border-green-200 text-center">
            <p className="text-3xl font-black text-green-600" style={{ fontFamily: 'Fredoka, sans-serif' }}>
              {stats.learningDays}
            </p>
            <p className="text-sm font-semibold text-gray-600 mt-2">学习天数</p>
          </div>

          <div className="bg-blue-50 rounded-xl p-4 border-[2px] border-blue-200 text-center">
            <p className="text-3xl font-black text-blue-600" style={{ fontFamily: 'Fredoka, sans-serif' }}>
              {stats.totalWords}
            </p>
            <p className="text-sm font-semibold text-gray-600 mt-2">总单词数</p>
          </div>

          <div className="bg-emerald-50 rounded-xl p-4 border-[2px] border-emerald-200 text-center">
            <p className="text-3xl font-black text-emerald-600" style={{ fontFamily: 'Fredoka, sans-serif' }}>
              {stats.wordsLearned}
            </p>
            <p className="text-sm font-semibold text-gray-600 mt-2">已掌握</p>
          </div>

          <div className="bg-yellow-50 rounded-xl p-4 border-[2px] border-yellow-200 text-center">
            <p className="text-3xl font-black text-yellow-600" style={{ fontFamily: 'Fredoka, sans-serif' }}>
              {stats.wordsFuzzy}
            </p>
            <p className="text-sm font-semibold text-gray-600 mt-2">模糊</p>
          </div>

          <div className="bg-red-50 rounded-xl p-4 border-[2px] border-red-200 text-center">
            <p className="text-3xl font-black text-red-600" style={{ fontFamily: 'Fredoka, sans-serif' }}>
              {stats.wordsUnknown}
            </p>
            <p className="text-sm font-semibold text-gray-600 mt-2">未掌握</p>
          </div>
        </div>

        {/* 学习进度可视化 */}
        {stats.totalWords > 0 && (
          <div className="mt-6">
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div className="h-full flex">
                <div
                  className="bg-emerald-500"
                  style={{ width: `${(stats.wordsLearned / stats.totalWords) * 100}%` }}
                  title={`已掌握: ${stats.wordsLearned}`}
                />
                <div
                  className="bg-yellow-500"
                  style={{ width: `${(stats.wordsFuzzy / stats.totalWords) * 100}%` }}
                  title={`模糊: ${stats.wordsFuzzy}`}
                />
                <div
                  className="bg-red-500"
                  style={{ width: `${(stats.wordsUnknown / stats.totalWords) * 100}%` }}
                  title={`未掌握: ${stats.wordsUnknown}`}
                />
              </div>
            </div>
            <div className="flex gap-4 mt-2 text-sm">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-emerald-500 rounded"></div>
                <span className="font-semibold text-gray-600">已掌握 {Math.round((stats.wordsLearned / stats.totalWords) * 100)}%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                <span className="font-semibold text-gray-600">模糊 {Math.round((stats.wordsFuzzy / stats.totalWords) * 100)}%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span className="font-semibold text-gray-600">未掌握 {Math.round((stats.wordsUnknown / stats.totalWords) * 100)}%</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 权限管理对话框 */}
      {showPermissionModal && (
        <PermissionModal
          user={user}
          allBooks={allBooks}
          onClose={() => setShowPermissionModal(false)}
          onSave={() => {
            setShowPermissionModal(false)
            window.location.reload()
          }}
        />
      )}
    </div>
  )
}

/**
 * 封禁/解封用户按钮（内联组件）
 */
function BanUserButton({ userId, isBanned }: { userId: string; isBanned: boolean }) {
  const [loading, setLoading] = useState(false)

  const handleBan = async () => {
    if (!confirm(isBanned ? '确定要解封该用户吗？' : '确定要封禁该用户吗？')) return

    const reason = isBanned ? '' : prompt('请输入封禁原因：')
    if (isBanned === false && reason === null) return

    setLoading(true)
    try {
      const response = await fetch('/api/admin/users/ban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, reason, isBanned: !isBanned })
      })

      if (response.ok) {
        alert(isBanned ? '用户已解封' : '用户已封禁')
        window.location.reload()
      } else {
        const data = await response.json()
        alert(data.error || '操作失败')
      }
    } catch (error) {
      console.error('Error banning user:', error)
      alert('操作失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleBan}
      disabled={loading}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl border-[2px] border-black font-bold hover:shadow-[4px_4px_0px_0px_#000] hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
        isBanned
          ? 'bg-green-500 text-white'
          : 'bg-red-500 text-white'
      }`}
    >
      {loading ? (
        '处理中...'
      ) : isBanned ? (
        <>
          <ShieldAlert size={18} />
          解封用户
        </>
      ) : (
        <>
          <Ban size={18} />
          封禁用户
        </>
      )}
    </button>
  )
}

/**
 * 权限管理对话框
 */
function PermissionModal({
  user,
  allBooks,
  onClose,
  onSave
}: {
  user: User
  allBooks: Book[]
  onClose: () => void
  onSave: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [featurePermissions, setFeaturePermissions] = useState<string[]>(
    user.feature_permissions || []
  )
  const [bookPermissions, setBookPermissions] = useState<string[]>(
    user.book_permissions || []
  )
  const [expiresIn, setExpiresIn] = useState<string>('365')
  const [changeReason, setChangeReason] = useState('')

  const toggleFeature = (permId: string) => {
    setFeaturePermissions(prev =>
      prev.includes(permId)
        ? prev.filter(p => p !== permId)
        : [...prev, permId]
    )
  }

  const toggleBook = (permId: string) => {
    setBookPermissions(prev => {
      if (permId === '*') {
        return prev.includes('*') ? [] : ['*']
      }
      return prev.includes('*')
        ? [permId]
        : prev.includes(permId)
        ? [...prev.filter(p => p !== '*')]
        : [...prev, permId]
    })
  }

  const handleSubmit = async () => {
    if (!changeReason.trim()) {
      alert('请填写变更原因')
      return
    }

    setLoading(true)
    try {
      const permission_expires_at = expiresIn === 'permanent' ? null : new Date(Date.now() + parseInt(expiresIn) * 24 * 60 * 60 * 1000).toISOString()

      const response = await fetch(`/api/admin/users/${user.id}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feature_permissions: featurePermissions,
          book_permissions: bookPermissions,
          permission_expires_at,
          change_reason: changeReason
        })
      })

      if (response.ok) {
        alert('权限修改成功')
        onSave()
      } else {
        const data = await response.json()
        alert(data.error || '操作失败')
      }
    } catch (error) {
      console.error('Error updating permissions:', error)
      alert('操作失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white p-6 border-b flex items-center justify-between">
          <h2 className="text-2xl font-bold">权限管理 - {user.full_name || user.email}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* 当前权限 */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="font-bold mb-2">当前权限</h3>
            <div className="text-sm space-y-1">
              <p><strong>功能权限：</strong>{(user.feature_permissions || []).length} 项</p>
              <p>
                <strong>单词书权限：</strong>
                {(user.book_permissions || []).length > 0
                  ? (user.book_permissions.includes('*')
                      ? '全部单词书'
                      : user.book_permissions.slice(0, 3).map(id => {
                          const book = allBooks.find(b => b.id === id)
                          return book ? book.title : `${id.substring(0, 8)}...`
                        }).join(', ') +
                        ((user.book_permissions || []).length > 3 ? ` 等${(user.book_permissions || []).length}项` : ''))
                  : '无'
                }
              </p>
              <p><strong>到期时间：</strong>{user.permission_expires_at ? formatDate(user.permission_expires_at) : '永久'}</p>
            </div>
          </div>

          {/* 功能权限 */}
          <div>
            <h3 className="font-bold mb-3">功能权限</h3>
            <div className="grid grid-cols-2 gap-2">
              {FEATURE_PERMISSIONS.map(perm => (
                <label
                  key={perm.id}
                  className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                    featurePermissions.includes(perm.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={featurePermissions.includes(perm.id)}
                    onChange={() => toggleFeature(perm.id)}
                    className="rounded"
                  />
                  <span className="font-medium">{perm.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 单词书权限 */}
          <div>
            <h3 className="font-bold mb-3">单词书权限</h3>
            <div className="space-y-2">
              {/* 全部单词书选项 */}
              <label className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                bookPermissions.includes('*')
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}>
                <input
                  type="checkbox"
                  checked={bookPermissions.includes('*')}
                  onChange={() => toggleBook('*')}
                  className="rounded"
                />
                <span className="font-medium">全部单词书</span>
              </label>

              {/* 具体单词书列表 */}
              {!bookPermissions.includes('*') && (
                <div className="grid grid-cols-2 gap-2 ml-4">
                  {allBooks.map(book => (
                    <label
                      key={book.id}
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors text-sm ${
                        bookPermissions.includes(book.id)
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={bookPermissions.includes(book.id)}
                        onChange={() => toggleBook(book.id)}
                        className="rounded"
                      />
                      <span className="font-medium">{book.title}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 有效期 */}
          <div>
            <h3 className="font-bold mb-3">有效期</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="expires"
                  value="30"
                  checked={expiresIn === '30'}
                  onChange={() => setExpiresIn('30')}
                  className="rounded"
                />
                <span>30天</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="expires"
                  value="90"
                  checked={expiresIn === '90'}
                  onChange={() => setExpiresIn('90')}
                  className="rounded"
                />
                <span>90天</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="expires"
                  value="365"
                  checked={expiresIn === '365'}
                  onChange={() => setExpiresIn('365')}
                  className="rounded"
                />
                <span>1年</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="expires"
                  value="permanent"
                  checked={expiresIn === 'permanent'}
                  onChange={() => setExpiresIn('permanent')}
                  className="rounded"
                />
                <span>永久</span>
              </label>
            </div>
          </div>

          {/* 变更原因 */}
          <div>
            <h3 className="font-bold mb-3">变更原因 <span className="text-red-500">*</span></h3>
            <textarea
              value={changeReason}
              onChange={e => setChangeReason(e.target.value)}
              className="w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="请说明修改权限的原因..."
              required
            />
          </div>
        </div>

        {/* 按钮 */}
        <div className="sticky bottom-0 bg-white p-6 border-t flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300"
            disabled={loading}
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-purple-500 text-white rounded-xl font-bold hover:bg-purple-600 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}
