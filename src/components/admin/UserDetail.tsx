'use client'

/**
 * 用户详情组件
 * 显示用户的完整信息和操作选项
 * 包含权限管理功能
 */

import { useState } from 'react'
import { Mail, Calendar, Shield, Ban, ShieldAlert, Key, Clock, BookOpen, TrendingUp, Settings, X, Eye, EyeOff } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface User {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
  last_login_at: string | null
  banned_at: string | null
  ban_reason: string | null
  is_banned: boolean | null
  feature_permissions: string[] | null
  book_permissions: string[] | null
  language_packages: string[] | null
  permission_expires_at: string | null
  invitation_code_id: string | null
  package_id: string | null
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
  validity_days: number | null
  duration_days: number | null
  feature_permissions: string[] | null
  book_permissions: string[] | null
  is_active: boolean
}

interface UserDetailProps {
  user: User
  stats: Stats
  invitationCode: InvitationCode | null
  allBooks: Book[]
  userPackage: Package | null
  allPackages: Package[]
}

const FEATURE_PERMISSIONS = [
  { id: 'match_game', name: '消消乐' },
  { id: 'flashcard', name: '卡片背单词' },
  { id: 'dictation', name: '听写模式' },
  { id: 'custom_book', name: '自定义词库' },
  { id: 'review_mode', name: '复习模式' },
  { id: 'speaker', name: '雯姐学习法' }
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

export function UserDetail({ user, stats, invitationCode, allBooks, userPackage, allPackages }: UserDetailProps) {
  const [loading, setLoading] = useState(false)
  const [showPermissionModal, setShowPermissionModal] = useState(false)
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [showTempPassword, setShowTempPassword] = useState(false)

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
    if (!confirm(`确定要重置用户 ${user.full_name || user.email} 的密码吗？\n\n重置后会生成一个临时密码，旧密码将立即失效！`)) return

    setLoading(true)
    try {
      const response = await fetch('/api/admin/users/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      })

      if (response.ok) {
        const data = await response.json()
        // 保存临时密码到状态，显示在自定义对话框中
        setTempPassword(data.tempPassword)
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

  const copyPassword = async () => {
    if (tempPassword) {
      try {
        await navigator.clipboard.writeText(tempPassword.trim())
        alert('✅ 密码已复制到剪贴板！\n\n请直接粘贴使用，不要手动输入')
      } catch (err) {
        console.error('复制失败:', err)
        alert('复制失败，请手动复制密码')
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* 基本信息 */}
      <div className="bg-white rounded border-[3px] border-black shadow-[4px_4px_0px_0px_#000] p-6">
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
          {user.is_banned ? (
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
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded">
            <Calendar className="text-gray-600" size={20} />
            <div>
              <p className="text-sm text-gray-500 font-semibold">注册时间</p>
              <p className="font-bold text-gray-800">{formatDate(user.created_at)}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded">
            <Clock className="text-gray-600" size={20} />
            <div>
              <p className="text-sm text-gray-500 font-semibold">最后登录</p>
              <p className="font-bold text-gray-800">
                {user.last_login_at ? formatDate(user.last_login_at) : '从未登录'}
              </p>
            </div>
          </div>

          {invitationCode && (
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded border-[2px] border-blue-200">
              <Key className="text-blue-600" size={20} />
              <div>
                <p className="text-sm text-blue-600 font-semibold">注册邀请码</p>
                <p className="font-bold text-gray-800">{invitationCode.code}</p>
              </div>
            </div>
          )}

          {user.is_banned && (
            <div className="flex items-center gap-3 p-4 bg-red-50 rounded border-[2px] border-red-200">
              <Ban className="text-red-600" size={20} />
              <div>
                <p className="text-sm text-red-600 font-semibold">封禁原因</p>
                <p className="font-bold text-gray-800">{user.ban_reason || '未填写原因'}</p>
              </div>
            </div>
          )}

          {userPackage && (
            <div className="flex items-center gap-3 p-4 bg-purple-50 rounded border-[2px] border-purple-200 md:col-span-2">
              <TrendingUp className="text-purple-600" size={20} />
              <div className="flex-1">
                <p className="text-sm text-purple-600 font-semibold">所属套餐</p>
                <p className="font-bold text-gray-800 text-lg">{userPackage.name}</p>
                {userPackage.description && (
                  <p className="text-sm text-gray-600 mt-1">{userPackage.description}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${userPackage.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                    {userPackage.is_active ? '✓ 已启用' : '已停用'}
                  </span>
                  {userPackage.validity_days ? (
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                      {userPackage.validity_days}天有效期
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                      永久有效
                    </span>
                  )}
                  {userPackage.feature_permissions && userPackage.feature_permissions.length > 0 && (
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">
                      {userPackage.feature_permissions.length}项功能
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={() => setShowPermissionModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded border-[2px] border-black font-bold hover:shadow-[4px_4px_0px_0px_#000] hover:-translate-y-1 transition-all"
          >
            <Settings size={18} />
            权限管理
          </button>

          <button
            onClick={handleResetPassword}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded border-[2px] border-black font-bold hover:shadow-[4px_4px_0px_0px_#000] hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Key size={18} />
            {loading ? '处理中...' : '重置密码'}
          </button>

          <BanUserButton userId={user.id} isBanned={!!user.is_banned} />
        </div>

        {/* 权限信息 */}
        <div className="mt-6 p-4 bg-gray-50 rounded">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-gray-800">当前权限</h4>
            {/* 权限来源标识 */}
            {user.feature_permissions && user.feature_permissions.length > 0 ? (
              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded border border-purple-200">
                🎯 用户自定义
              </span>
            ) : userPackage ? (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded border border-blue-200">
                📦 套餐默认
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs font-medium rounded border border-gray-300">
                ⚠️ 无权限
              </span>
            )}
          </div>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-600">功能权限：</span>
              <span className="font-medium">
                {user.feature_permissions && user.feature_permissions.length > 0
                  ? user.feature_permissions.map(p => FEATURE_PERMISSIONS.find(f => f.id === p)?.name || p).join(', ')
                  : userPackage
                  ? '(使用套餐默认权限)'
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
      <div className="bg-white rounded border-[3px] border-black shadow-[4px_4px_0px_0px_#000] p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <TrendingUp className="text-green-600" size={24} />
          学习统计
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-green-50 rounded p-4 border-[2px] border-green-200 text-center">
            <p className="text-3xl font-black text-green-600" style={{ fontFamily: 'Fredoka, sans-serif' }}>
              {stats.learningDays}
            </p>
            <p className="text-sm font-semibold text-gray-600 mt-2">学习天数</p>
          </div>

          <div className="bg-blue-50 rounded p-4 border-[2px] border-blue-200 text-center">
            <p className="text-3xl font-black text-blue-600" style={{ fontFamily: 'Fredoka, sans-serif' }}>
              {stats.totalWords}
            </p>
            <p className="text-sm font-semibold text-gray-600 mt-2">总单词数</p>
          </div>

          <div className="bg-emerald-50 rounded p-4 border-[2px] border-emerald-200 text-center">
            <p className="text-3xl font-black text-emerald-600" style={{ fontFamily: 'Fredoka, sans-serif' }}>
              {stats.wordsLearned}
            </p>
            <p className="text-sm font-semibold text-gray-600 mt-2">已掌握</p>
          </div>

          <div className="bg-yellow-50 rounded p-4 border-[2px] border-yellow-200 text-center">
            <p className="text-3xl font-black text-yellow-600" style={{ fontFamily: 'Fredoka, sans-serif' }}>
              {stats.wordsFuzzy}
            </p>
            <p className="text-sm font-semibold text-gray-600 mt-2">模糊</p>
          </div>

          <div className="bg-red-50 rounded p-4 border-[2px] border-red-200 text-center">
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

      {/* 密码重置成功对话框 */}
      {tempPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Key className="text-green-600" size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">密码重置成功</h2>
                  <p className="text-sm text-gray-500">用户：{user.full_name || user.email}</p>
                </div>
              </div>

              <div className="bg-blue-50 rounded p-4 border-[2px] border-blue-200 mb-4">
                <p className="text-sm font-semibold text-blue-600 mb-2">临时密码（12位字母数字）</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-white px-4 py-3 rounded border-[2px] border-blue-300 font-mono text-lg font-bold text-gray-800 flex items-center justify-between">
                    <span className="tracking-wider">
                      {showTempPassword ? tempPassword : '•'.repeat(12)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowTempPassword(!showTempPassword)}
                      className="ml-2 hover:opacity-70 transition-opacity p-1"
                      title={showTempPassword ? "隐藏密码" : "显示密码"}
                    >
                      {showTempPassword ? (
                        <EyeOff className="w-5 h-5 text-gray-600" />
                      ) : (
                        <Eye className="w-5 h-5 text-gray-600" />
                      )}
                    </button>
                  </div>
                  <button
                    onClick={copyPassword}
                    className="px-4 py-3 bg-blue-500 text-white rounded font-bold hover:bg-blue-600 transition-colors flex items-center gap-2 whitespace-nowrap"
                    title="复制密码"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    复制
                  </button>
                </div>
              </div>

              <div className="bg-yellow-50 rounded p-4 border-[2px] border-yellow-200 mb-4">
                <p className="text-sm text-gray-700">
                  <span className="font-bold text-yellow-700">⚠️ 重要提示：</span>
                </p>
                <ul className="text-sm text-gray-600 mt-2 space-y-2 list-disc list-inside">
                  <li><span className="font-bold text-red-600">点击"复制"按钮，然后在前台登录页面直接粘贴</span></li>
                  <li>请勿手动输入密码，避免复制时多空格或字符错误</li>
                  <li>旧密码已立即失效，用户只能使用此临时密码登录</li>
                  <li>用户登录后可以在个人中心修改密码</li>
                </ul>
              </div>

              <button
                onClick={() => setTempPassword(null)}
                className="w-full px-6 py-3 bg-green-500 text-white rounded font-bold hover:bg-green-600 transition-colors"
              >
                我已复制，关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 权限管理对话框 */}
      {showPermissionModal && (
        <PermissionModal
          user={user}
          allBooks={allBooks}
          allPackages={allPackages}
          currentPackageId={(user as any).package_id || null}
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
      className={`flex items-center gap-2 px-4 py-2 rounded border-[2px] border-black font-bold hover:shadow-[4px_4px_0px_0px_#000] hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
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
  allPackages,
  currentPackageId,
  onClose,
  onSave
}: {
  user: User
  allBooks: Book[]
  allPackages: Package[]
  currentPackageId: string | null
  onClose: () => void
  onSave: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(currentPackageId)
  const [applyPackagePermissions, setApplyPackagePermissions] = useState(false)
  const [applyPackageExpiry, setApplyPackageExpiry] = useState(false)
  const [featurePermissions, setFeaturePermissions] = useState<string[]>(
    user.feature_permissions || []
  )
  const [bookPermissions, setBookPermissions] = useState<string[]>(
    user.book_permissions || []
  )
  const [languagePackages, setLanguagePackages] = useState<string[]>(
    user.language_packages || []
  )
  const [expiresIn, setExpiresIn] = useState<string>('365')
  const [changeReason, setChangeReason] = useState('')

  // 获取选中套餐的信息
  const selectedPackage = allPackages.find(p => p.id === selectedPackageId)

  // 当选择套餐并勾选"应用套餐权限"时，自动填充权限
  const handlePackageChange = (packageId: string) => {
    setSelectedPackageId(packageId || null)
    if (packageId && applyPackagePermissions) {
      const pkg = allPackages.find(p => p.id === packageId)
      if (pkg) {
        setFeaturePermissions((pkg as any).feature_permissions || [])
        setBookPermissions((pkg as any).book_permissions || [])
      }
    }
  }

  // 当勾选"应用套餐权限"时，立即填充
  const handleApplyPackagePermissionsChange = (checked: boolean) => {
    setApplyPackagePermissions(checked)
    if (checked && selectedPackageId) {
      const pkg = allPackages.find(p => p.id === selectedPackageId)
      if (pkg) {
        setFeaturePermissions((pkg as any).feature_permissions || [])
        setBookPermissions((pkg as any).book_permissions || [])
      }
    }
  }

  // 当勾选"应用套餐有效期"时，设置有效期
  const handleApplyPackageExpiryChange = (checked: boolean) => {
    setApplyPackageExpiry(checked)
    if (checked && selectedPackage?.validity_days) {
      setExpiresIn(String(selectedPackage.validity_days))
    }
  }

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

  const toggleLanguagePackage = (langId: string) => {
    setLanguagePackages(prev =>
      prev.includes(langId)
        ? prev.filter(l => l !== langId)
        : [...prev, langId]
    )
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
          language_packages: languagePackages,
          permission_expires_at,
          change_reason: changeReason,
          package_id: selectedPackageId,
          apply_package_permissions: applyPackagePermissions
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
      <div className="bg-white rounded shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white p-6 border-b flex items-center justify-between">
          <h2 className="text-2xl font-bold">权限管理 - {user.full_name || user.email}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* 套餐选择 */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border-2 border-purple-200">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <span className="text-xl">📦</span>
              用户套餐
            </h3>
            <select
              value={selectedPackageId || ''}
              onChange={(e) => handlePackageChange(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-medium"
            >
              <option value="">-- 不关联套餐 --</option>
              {allPackages.map(pkg => (
                <option key={pkg.id} value={pkg.id} disabled={!pkg.is_active}>
                  {pkg.name} {!pkg.is_active ? '(已停用)' : ''} - {pkg.validity_days ? `${pkg.validity_days}天` : '永久'}
                </option>
              ))}
            </select>

            {selectedPackage && (
              <div className="mt-3 p-3 bg-white rounded border text-sm">
                <p className="font-medium text-gray-700">{selectedPackage.description || '暂无描述'}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                    功能权限: {((selectedPackage as any).feature_permissions || []).length} 项
                  </span>
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                    书籍权限: {((selectedPackage as any).book_permissions || []).length} 项
                  </span>
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                    有效期: {selectedPackage.validity_days ? `${selectedPackage.validity_days}天` : '永久'}
                  </span>
                </div>
              </div>
            )}

            {/* 套餐应用选项 */}
            {selectedPackageId && (
              <div className="mt-4 p-3 bg-yellow-50 rounded border border-yellow-200">
                <p className="font-bold text-yellow-800 mb-2">⚡ 快捷操作</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={applyPackagePermissions}
                      onChange={(e) => handleApplyPackagePermissionsChange(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm font-medium">
                      应用套餐默认权限（功能+书籍）
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={applyPackageExpiry}
                      onChange={(e) => handleApplyPackageExpiryChange(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm font-medium">
                      应用套餐有效期（{selectedPackage?.validity_days ? `${selectedPackage.validity_days}天` : '永久'}）
                    </span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* 当前权限 */}
          <div className="bg-gray-50 rounded p-4">
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
                  className={`flex items-center gap-2 p-3 rounded border-2 cursor-pointer transition-colors ${
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
              <label className={`flex items-center gap-2 p-3 rounded border-2 cursor-pointer transition-colors ${
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
                      className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors text-sm ${
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

          {/* 语言包（雯姐学习法） */}
          {featurePermissions.includes('speaker') && (
            <div className="mt-4 p-4 bg-purple-50 rounded border-2 border-purple-200">
              <h3 className="font-bold mb-3 text-purple-900">🌍 雯姐学习法 - 语言包</h3>
              <p className="text-xs text-purple-700 mb-3">
                选择该用户可使用的语言包，保存后立即生效
              </p>
              <div className="grid grid-cols-2 gap-2">
                {LANGUAGE_PACKAGES.map(lang => (
                  <label
                    key={lang.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded border cursor-pointer transition-all ${
                      languagePackages.includes(lang.id)
                        ? 'bg-purple-100 border-purple-500 shadow-sm'
                        : 'bg-white border-purple-300 hover:bg-purple-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={languagePackages.includes(lang.id)}
                      onChange={() => toggleLanguagePackage(lang.id)}
                      className="rounded"
                    />
                    <span className="text-lg">{lang.flag}</span>
                    <span className="text-sm font-medium">{lang.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

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
              className="w-full px-4 py-3 border-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded font-bold hover:bg-gray-300"
            disabled={loading}
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-purple-500 text-white rounded font-bold hover:bg-purple-600 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}
