"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Headphones, LogOut, X, Key, MessageCircle, Palette, Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { AppSidebar } from '@/components/AppSidebar'
import { MobileBottomNav } from '@/components/MobileBottomNav'

interface SettingsPageClientProps {
  books: any[]
  userId: string
}

export function SettingsPageClient({ books, userId }: SettingsPageClientProps) {
  const router = useRouter()
  const { theme, themeMode, setThemeMode, mounted } = useTheme()
  const [showPasswordModal, setShowPasswordModal] = useState(false)

  // 企业微信客服链接
  const WECHAT_KF_URL = 'https://work.weixin.qq.com/kfid/kfc49c2602e3dbe2fc1'

  // 检测是否为移动端
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  return (
    <>
      {/* 全站左侧导航 - 传递必需的props */}
      <AppSidebar books={books} userId={userId} />

      <div
        className="min-h-screen lg:ml-64 p-4 md:p-8 transition-colors duration-300"
        style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
      >
        <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-black mb-2">设置</h1>
          <p className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>
            管理您的应用偏好和账号信息
          </p>
        </div>

        {/* 设置卡片 */}
        <div className="space-y-4 md:space-y-6">
          {/* 外观设置 */}
          <div
            className="border-[3px] border-black rounded shadow-[3px_3px_0px_0px_#000] md:shadow-[4px_4px_0px_0px_#000] p-6 md:p-8 transition-all duration-300 hover:-translate-y-1"
            style={{ backgroundColor: 'var(--card-bg)' }}
          >
            <div className="flex items-start justify-between gap-4 mb-6">
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 md:w-14 md:h-14 bg-[#9333EA] border-[2px] border-black rounded flex items-center justify-center shrink-0 shadow-[2px_2px_0px_0px_#000]"
                >
                  <Palette size={24} className="text-white" strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-xl md:text-2xl font-black mb-1" style={{ color: 'var(--text-primary)' }}>
                    外观
                  </h3>
                  <p className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>
                    选择您喜欢的主题模式
                  </p>
                </div>
              </div>
            </div>

            {/* 主题切换按钮 */}
            {!mounted ? (
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="px-4 py-3 border-[3px] border-black rounded font-black text-sm"
                    style={{ backgroundColor: 'var(--bg-tertiary)' }}
                  >
                    <div className="w-5 h-5 mx-auto mb-1 opacity-50" />
                    <span className="opacity-50">加载中</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setThemeMode('light')}
                  className={`px-4 py-3 border-[3px] rounded font-black text-sm transition-all ${
                    themeMode === 'light'
                      ? 'bg-[#B4F416] border-black shadow-[3px_3px_0px_0px_#000] -translate-y-0.5'
                      : 'border-black hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5'
                  }`}
                  style={{ backgroundColor: themeMode === 'light' ? undefined : 'var(--bg-tertiary)' }}
                >
                  <Sun className="w-5 h-5 mx-auto mb-1" strokeWidth={2.5} />
                  <span className={themeMode === 'light' ? 'text-black' : ''} style={{ color: themeMode === 'light' ? undefined : 'var(--text-primary)' }}>明亮</span>
                </button>

                <button
                  onClick={() => setThemeMode('dark')}
                  className={`px-4 py-3 border-[3px] rounded font-black text-sm transition-all ${
                    themeMode === 'dark'
                      ? 'bg-[#B4F416] border-black shadow-[3px_3px_0px_0px_#000] -translate-y-0.5'
                      : 'border-black hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5'
                  }`}
                  style={{ backgroundColor: themeMode === 'dark' ? undefined : 'var(--bg-tertiary)' }}
                >
                  <Moon className="w-5 h-5 mx-auto mb-1" strokeWidth={2.5} />
                  <span className={themeMode === 'dark' ? 'text-black' : ''} style={{ color: themeMode === 'dark' ? undefined : 'var(--text-primary)' }}>黑暗</span>
                </button>

                <button
                  onClick={() => setThemeMode('auto')}
                  className={`px-4 py-3 border-[3px] rounded font-black text-sm transition-all ${
                    themeMode === 'auto'
                      ? 'bg-[#B4F416] border-black shadow-[3px_3px_0px_0px_#000] -translate-y-0.5'
                      : 'border-black hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5'
                  }`}
                  style={{ backgroundColor: themeMode === 'auto' ? undefined : 'var(--bg-tertiary)' }}
                >
                  <Monitor className="w-5 h-5 mx-auto mb-1" strokeWidth={2.5} />
                  <span className={themeMode === 'auto' ? 'text-black' : ''} style={{ color: themeMode === 'auto' ? undefined : 'var(--text-primary)' }}>自动</span>
                </button>
              </div>
            )}

            {/* 当前主题说明 */}
            {mounted && (
              <div className="mt-4 p-3 border-[2px] border-black rounded text-xs font-bold" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                {themeMode === 'auto' ? (
                  <span>自动模式：18:00-6:00 使用黑暗主题，其他时间使用明亮主题</span>
                ) : themeMode === 'dark' ? (
                  <span>当前使用黑暗主题</span>
                ) : (
                  <span>当前使用明亮主题</span>
                )}
              </div>
            )}
          </div>

          {/* 账号设置部分标题 */}
          <div className="mt-8 mb-4">
            <h2 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>账号设置</h2>
          </div>

          {/* 修改密码 - 暂时注销 */}
          {/* <div
            className="border-[3px] border-black rounded shadow-[3px_3px_0px_0px_#000] md:shadow-[4px_4px_0px_0px_#000] p-6 md:p-8 transition-all duration-300 hover:-translate-y-1"
            style={{ backgroundColor: 'var(--card-bg)' }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 md:w-14 md:h-14 bg-[#FF6B6B] border-[2px] border-black rounded flex items-center justify-center shrink-0 shadow-[2px_2px_0px_0px_#000]"
                >
                  <Lock size={24} className="text-white" strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-xl md:text-2xl font-black mb-1" style={{ color: 'var(--text-primary)' }}>
                    修改密码
                  </h3>
                  <p className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>
                    定期更改密码保护账号安全
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPasswordModal(true)}
                className="px-6 py-3 bg-[#B4F416] border-[3px] border-black rounded font-black text-sm hover:shadow-[3px_3px_0px_0px_#000] hover:-translate-y-0.5 active:translate-y-0 transition-all"
              >
                修改
              </button>
            </div>
          </div> */}

          {/* 联系客服 */}
          <div
            className="border-[3px] border-black rounded shadow-[3px_3px_0px_0px_#000] md:shadow-[4px_4px_0px_0px_#000] p-6 md:p-8 transition-all duration-300 hover:-translate-y-1"
            style={{ backgroundColor: 'var(--card-bg)' }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 md:w-14 md:h-14 bg-[#4ECDC4] border-[2px] border-black rounded flex items-center justify-center shrink-0 shadow-[2px_2px_0px_0px_#000]"
                >
                  <Headphones size={24} className="text-white" strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-xl md:text-2xl font-black mb-1" style={{ color: 'var(--text-primary)' }}>
                    联系客服
                  </h3>
                  <p className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>
                    需要帮助？随时联系我们的客服团队
                  </p>
                </div>
              </div>
              <button
                onClick={() => window.open('https://work.weixin.qq.com/kfid/kfc49c2602e3dbe2fc1', '_blank')}
                className="px-6 py-3 bg-[#B4F416] border-[3px] border-black rounded font-black text-sm hover:shadow-[3px_3px_0px_0px_#000] hover:-translate-y-0.5 active:translate-y-0 transition-all"
              >
                联系
              </button>
            </div>
          </div>

          {/* 退出登录 */}
          <div
            className="border-[3px] border-black rounded shadow-[3px_3px_0px_0px_#000] md:shadow-[4px_4px_0px_0px_#000] p-6 md:p-8 transition-all duration-300 hover:-translate-y-1"
            style={{ backgroundColor: 'var(--card-bg)' }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 md:w-14 md:h-14 bg-[#FFB800] border-[2px] border-black rounded flex items-center justify-center shrink-0 shadow-[2px_2px_0px_0px_#000]"
                >
                  <LogOut size={24} className="text-black" strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-xl md:text-2xl font-black mb-1" style={{ color: 'var(--text-primary)' }}>
                    退出登录
                  </h3>
                  <p className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>
                    退出后需要重新登录才能使用
                  </p>
                </div>
              </div>
              <button
                onClick={() => router.push('/logout')}
                className="px-6 py-3 bg-[#FF6B6B] border-[3px] border-black rounded font-black text-white text-sm hover:shadow-[3px_3px_0px_0px_#000] hover:-translate-y-0.5 active:translate-y-0 transition-all"
              >
                退出
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 修改密码弹层 */}
      {showPasswordModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={() => setShowPasswordModal(false)}
        >
          <div
            className="relative bg-white overflow-hidden w-full max-w-md"
            style={{
              borderRadius: '12px',
              boxShadow: '4px 4px 0px 0px #000',
              border: '3px solid #000',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between p-6 border-b-[3px] border-black"
              style={{ backgroundColor: '#B4F416' }}
            >
              <div className="flex items-center gap-3">
                <Key size={24} className="text-black" strokeWidth={2.5} />
                <h2 className="text-xl font-black text-black">修改密码</h2>
              </div>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="w-10 h-10 bg-white border-2 border-black rounded flex items-center justify-center hover:bg-gray-100 transition-colors"
              >
                <X size={20} className="text-black" strokeWidth={2.5} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2 text-black">当前密码</label>
                <input
                  type="password"
                  placeholder="请输入当前密码"
                  className="w-full px-4 py-3 border-[2px] border-black rounded focus:outline-none focus:shadow-[2px_2px_0px_0px_#000] focus:bg-[#B4F416] transition-all text-black font-bold"
                  style={{ backgroundColor: '#fff' }}
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2 text-black">新密码</label>
                <input
                  type="password"
                  placeholder="请输入新密码"
                  className="w-full px-4 py-3 border-[2px] border-black rounded focus:outline-none focus:shadow-[2px_2px_0px_0px_#000] focus:bg-[#B4F416] transition-all text-black font-bold"
                  style={{ backgroundColor: '#fff' }}
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2 text-black">确认新密码</label>
                <input
                  type="password"
                  placeholder="请再次输入新密码"
                  className="w-full px-4 py-3 border-[2px] border-black rounded focus:outline-none focus:shadow-[2px_2px_0px_0px_#000] focus:bg-[#B4F416] transition-all text-black font-bold"
                  style={{ backgroundColor: '#fff' }}
                />
              </div>

              {/* 提示信息 */}
              <div className="p-4 border-[2px] border-black rounded" style={{ backgroundColor: '#FEF3C7' }}>
                <div className="flex items-start gap-2">
                  <MessageCircle size={16} className="text-black mt-0.5 shrink-0" strokeWidth={2.5} />
                  <p className="text-xs font-bold text-black leading-relaxed">
                    请联系客服修改密码
                  </p>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 px-6 py-3 border-[3px] border-black rounded font-black text-sm hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5 active:translate-y-0 transition-all"
                  style={{ backgroundColor: '#fff', color: '#000' }}
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    alert('请通过客服渠道修改密码')
                    setShowPasswordModal(false)
                  }}
                  className="flex-1 px-6 py-3 bg-[#B4F416] border-[3px] border-black rounded font-black text-sm hover:shadow-[3px_3px_0px_0px_#000] hover:-translate-y-0.5 active:translate-y-0 transition-all"
                >
                  确认
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* 全站移动端底部导航 - 传递必需的props */}
      <MobileBottomNav books={books} userId={userId} />
    </>
  )
}
