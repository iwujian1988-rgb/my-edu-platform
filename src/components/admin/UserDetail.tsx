'use client'

/**
 * 用户详情组件
 * 显示用户的完整信息和操作选项
 */

import { useState } from 'react'
import { Mail, Calendar, Shield, Ban, ShieldAlert, Key, Clock, BookOpen, TrendingUp } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface User {
  id: string
  email: string
  nickname: string
  avatar_url: string | null
  created_at: string
  last_login_at: string | null
  banned_at: string | null
  banned_reason: string | null
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

interface UserDetailProps {
  user: User
  stats: Stats
  invitationCode: InvitationCode | null
}

export function UserDetail({ user, stats, invitationCode }: UserDetailProps) {
  const [loading, setLoading] = useState(false)

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
              {user.nickname?.charAt(0)?.toUpperCase() || user.email.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-800 mb-1" style={{ fontFamily: 'Fredoka, sans-serif' }}>
                {user.nickname || '未设置昵称'}
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
        </div>

        {/* 操作按钮 */}
        <div className="mt-6 flex flex-wrap gap-3">
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
