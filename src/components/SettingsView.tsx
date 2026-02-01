'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Palette, User, Lock, LogOut, ChevronRight, Check, AlertCircle } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

type SettingsTab = 'appearance' | 'account'

export function SettingsView() {
  console.log('SettingsView rendered')
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance')
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const { theme, themeMode, setThemeMode, mounted } = useTheme()
  const router = useRouter()
  const isDark = mounted && theme === 'dark'

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' })
      if (response.ok) {
        router.push('/login')
      }
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 页面标题 */}
      <div>
        <h1 className="text-3xl font-black mb-2" style={{ color: 'var(--text-primary)' }}>系统设置</h1>
        <p style={{ color: 'var(--text-secondary)' }}>管理您的应用偏好和账号信息</p>
      </div>

      {/* 移动端标签导航 */}
      <div className="lg:hidden flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('appearance')}
          className={`flex-1 px-4 py-3 rounded border-2 transition-all font-bold duration-200 ${
            activeTab === 'appearance'
              ? isDark
                ? 'bg-[#B4F264] border-[#B4F264] text-black shadow-md'
                : 'bg-[#B4F416] border-black text-black shadow-md'
              : isDark
                ? 'border-[#B4F264]/30 bg-[#B4F264]/10 text-[#B4F264]'
                : 'border-black bg-white text-gray-700'
          }`}
        >
          <Palette size={18} strokeWidth={2} className="inline-block mr-2" />
          外观
        </button>
        <button
          onClick={() => setActiveTab('account')}
          className={`flex-1 px-4 py-3 rounded border-2 transition-all font-bold duration-200 ${
            activeTab === 'account'
              ? isDark
                ? 'bg-[#B4F264] border-[#B4F264] text-black shadow-md'
                : 'bg-[#B4F416] border-black text-black shadow-md'
              : isDark
                ? 'border-[#B4F264]/30 bg-[#B4F264]/10 text-[#B4F264]'
                : 'border-black bg-white text-gray-700'
          }`}
        >
          <User size={18} strokeWidth={2} className="inline-block mr-2" />
          账号
        </button>
      </div>

      <div className="flex gap-6">
        {/* 左侧导航 */}
        <aside className="hidden lg:block w-56 flex-shrink-0">
          <nav className="space-y-2">
            <button
              onClick={() => setActiveTab('appearance')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded border-2 transition-all font-bold duration-200 ${
                activeTab === 'appearance'
                  ? isDark
                    ? 'bg-[#B4F264] border-[#B4F264] text-black shadow-md'
                    : 'bg-[#B4F416] border-black text-black shadow-md'
                  : isDark
                    ? 'border-[#B4F264]/30 bg-[#B4F264]/10 text-[#B4F264] hover:bg-[#B4F264]/20'
                    : 'border-black hover:shadow-[3px_3px_0px_0px_#000]'
              }`}
              style={{ backgroundColor: activeTab === 'appearance' ? undefined : 'var(--card-bg)' }}
            >
              <Palette size={20} strokeWidth={2} />
              <span>外观</span>
              {activeTab === 'appearance' && <ChevronRight size={16} />}
            </button>

            <button
              onClick={() => setActiveTab('account')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded border-2 transition-all font-bold duration-200 ${
                activeTab === 'account'
                  ? isDark
                    ? 'bg-[#B4F264] border-[#B4F264] text-black shadow-md'
                    : 'bg-[#B4F416] border-black text-black shadow-md'
                  : isDark
                    ? 'border-[#B4F264]/30 bg-[#B4F264]/10 text-[#B4F264] hover:bg-[#B4F264]/20'
                    : 'border-black hover:shadow-[3px_3px_0px_0px_#000]'
              }`}
              style={{ backgroundColor: activeTab === 'account' ? undefined : 'var(--card-bg)' }}
            >
              <User size={20} strokeWidth={2} />
              <span>账号</span>
              {activeTab === 'account' && <ChevronRight size={16} />}
            </button>
          </nav>
        </aside>

        {/* 右侧内容区 */}
        <main className="flex-1 min-w-0">
          {activeTab === 'appearance' && (
            <div className="rounded border-2 p-6 space-y-4 transition-colors duration-300"
                 style={{ backgroundColor: 'var(--card-bg)', borderColor: isDark ? 'var(--border)' : '#000' }}>
              <h2 className="text-xl font-black mb-4" style={{ color: 'var(--text-primary)' }}>外观</h2>

              {/* 主题模式选择 */}
              <div>
                <label className="block text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
                  主题模式
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { value: 'auto' as const, label: '自动', desc: '18:00-6:00 夜间' },
                    { value: 'light' as const, label: '日间', desc: '浅色背景' },
                    { value: 'dark' as const, label: '夜间', desc: '蓝黑背景' },
                  ].map((mode) => (
                    <button
                      key={mode.value}
                      onClick={() => {
                        setThemeMode(mode.value)
                        localStorage.setItem('themeMode', mode.value)
                      }}
                      className={`relative px-4 py-4 rounded border-2 transition-all ${
                        themeMode === mode.value
                          ? isDark
                            ? 'border-[#B4F264] bg-[#B4F264]/20'
                            : 'border-blue-500 bg-blue-50'
                          : isDark
                            ? 'border-gray-600'
                            : 'border-gray-200'
                      }`}
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <div className="font-semibold text-base">{mode.label}</div>
                      <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{mode.desc}</div>
                      {themeMode === mode.value && (
                        <div className="absolute -top-2 -right-2 bg-[#B4F264] text-black text-xs px-2 py-1 rounded-full flex items-center gap-1 animate-bounce">
                          <Check size={12} />
                          当前
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* 当前主题预览 */}
              <div className="pt-4" style={{ borderTop: `1px solid ${isDark ? 'var(--border)' : '#e5e7eb'}` }}>
                <div className="text-sm font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                  当前主题
                </div>
                <div className="px-4 py-3 rounded inline-block" style={{
                  backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.05)',
                }}>
                  <span className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {theme === 'dark' ? '🌙 夜间模式' : '☀️ 日间模式'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'account' && (
            <div className="space-y-4">
              {/* 修改密码 */}
              <div className="rounded border-2 p-6 transition-colors duration-300 hover:shadow-lg cursor-pointer"
                   style={{ backgroundColor: 'var(--card-bg)', borderColor: isDark ? 'var(--border)' : '#000' }}
                   onClick={() => setShowPasswordDialog(true)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded flex items-center justify-center"
                         style={{ backgroundColor: isDark ? 'rgba(180, 244, 100, 0.1)' : 'bg-gray-100' }}>
                      <Lock className="w-6 h-6" style={{ color: isDark ? '#B4F264' : '#6b7280' }} />
                    </div>
                    <div>
                      <div className="font-black text-base" style={{ color: 'var(--text-primary)' }}>修改密码</div>
                      <div className="text-sm mt-0.5" style={{ color: 'var(--text-tertiary)' }}>保护账号安全</div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5" style={{ color: 'var(--text-tertiary)' }} />
                </div>
              </div>

              {/* 退出登录 */}
              <button
                onClick={handleLogout}
                className="w-full rounded border-2 p-6 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
                style={{
                  backgroundColor: '#FEF2F2',
                  borderColor: '#FECACA',
                  color: '#DC2626'
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded bg-red-100 flex items-center justify-center">
                      <LogOut className="w-6 h-6 text-red-600" />
                    </div>
                    <div className="text-left">
                      <div className="font-black text-base text-red-600">退出登录</div>
                      <div className="text-sm mt-0.5 text-red-400">退出后需要重新登录</div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-red-400" />
                </div>
              </button>
            </div>
          )}
        </main>
      </div>

      {/* 修改密码对话框 */}
      {showPasswordDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="rounded shadow-xl max-w-md w-full p-8 animate-in fade-in zoom-in duration-200"
               style={{ backgroundColor: 'var(--card-bg)' }}>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                   style={{ backgroundColor: 'rgba(180, 244, 100, 0.1)' }}>
                <AlertCircle className="w-8 h-8 text-[#B4F264]" />
              </div>
              <h3 className="text-xl font-black mb-2" style={{ color: 'var(--text-primary)' }}>修改密码</h3>
              <p className="text-base mb-6" style={{ color: 'var(--text-secondary)' }}>请联系客服修改密码</p>
              <button
                onClick={() => setShowPasswordDialog(false)}
                className="px-6 py-3 rounded font-bold transition-all duration-200 w-full"
                style={{
                  backgroundColor: '#B4F416',
                  color: '#000000',
                  border: '2px solid #000000'
                }}
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
