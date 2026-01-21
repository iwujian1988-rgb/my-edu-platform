"use client"

import { useState, useEffect } from 'react'
import { Shield, Bell, Lock, User, Palette, ChevronRight, Check } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

type SettingsTab = 'appearance' | 'notifications' | 'privacy' | 'account'

interface SettingsItem {
  icon: any
  title: string
  description: string
  tab: SettingsTab
}

const settingsItems: SettingsItem[] = [
  {
    icon: Palette,
    title: '外观',
    description: '主题、颜色、字体',
    tab: 'appearance',
  },
  {
    icon: Bell,
    title: '通知',
    description: '提醒、声音、震动',
    tab: 'notifications',
  },
  {
    icon: Shield,
    title: '隐私与安全',
    description: '密码、数据、权限',
    tab: 'privacy',
  },
  {
    icon: User,
    title: '账号',
    description: '个人信息、登录',
    tab: 'account',
  },
]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance')
  const [isMobile, setIsMobile] = useState(false)
  const [showSaveSuccess, setShowSaveSuccess] = useState(false)
  const { theme } = useTheme() // 获取当前主题

  // 检测是否为移动端
  useEffect(() => {
    setIsMobile(window.innerWidth < 768)
  }, [])

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* 桌面端：左侧导航 + 右侧内容 */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-black">设置</h1>
          <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>管理您的应用偏好和账号信息</p>
        </div>

        <div className="flex gap-6">
          {/* 左侧导航 - 仅桌面端显示 */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <nav className="rounded-2xl border-2 border-black p-2" style={{ backgroundColor: 'var(--card-bg)', borderColor: theme === 'dark' ? 'var(--border)' : '#000' }}>
              {settingsItems.map((item) => {
                const Icon = item.icon
                const isActive = activeTab === item.tab

                return (
                  <button
                    key={item.tab}
                    onClick={() => setActiveTab(item.tab)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-xl
                      transition-all duration-200
                      ${isActive
                        ? 'shadow-md'
                        : 'hover:opacity-80'
                      }
                    `}
                    style={{
                      backgroundColor: isActive ? 'var(--accent)' : 'transparent',
                      color: isActive ? '#fff' : 'var(--text-primary)'
                    }}
                  >
                    <Icon size={20} strokeWidth={2} />
                    <div className="flex-1 text-left">
                      <div className="font-semibold">{item.title}</div>
                      <div className="text-xs" style={{ color: isActive ? 'rgba(255,255,255,0.8)' : 'var(--text-tertiary)' }}>
                        {item.description}
                      </div>
                    </div>
                    {isActive && <ChevronRight size={16} />}
                  </button>
                )
              })}
            </nav>
          </aside>

          {/* 右侧内容区 */}
          <main className="flex-1 min-w-0">
            {activeTab === 'appearance' && <AppearanceSettings onSave={() => {
              setShowSaveSuccess(true)
              setTimeout(() => setShowSaveSuccess(false), 2000)
            }} />}
            {activeTab === 'notifications' && <NotificationSettings />}
            {activeTab === 'privacy' && <PrivacySettings />}
            {activeTab === 'account' && <AccountSettings />}
          </main>
        </div>
      </div>

      {/* 移动端：底部主题切换栏 */}
      {isMobile && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t-2 border-black px-4 py-3 z-50">
          {/* 移动端主题切换 */}
          <MobileThemeToggleContent setActiveTab={setActiveTab} />
        </div>
      )}
    </div>
  )
}

// 移动端主题切换组件（底部固定栏）
function MobileThemeToggleContent({ setActiveTab }: { setActiveTab: (tab: SettingsTab) => void }) {
  const { theme, themeMode, setThemeMode, isNightTime } = useTheme()

  if (!theme) {
    return null
  }

  const modes = [
    { value: 'auto' as const, label: '自动', icon: '🔄' },
    { value: 'light' as const, label: '日间', icon: '☀️' },
    { value: 'dark' as const, label: '夜间', icon: '🌙' },
  ]

  return (
    <div className="flex items-center justify-between">
      <div className="flex gap-4">
        <button
          onClick={() => setActiveTab('privacy')}
          className="text-gray-700 font-semibold text-sm"
        >
          隐私
        </button>
        <button
          onClick={() => setActiveTab('account')}
          className="text-gray-700 font-semibold text-sm"
        >
          账号
        </button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-gray-600">主题</span>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {modes.map((mode) => (
            <button
              key={mode.value}
              onClick={() => setThemeMode(mode.value)}
              className={`
                w-8 h-8 rounded-md flex items-center justify-center text-sm
                transition-all
                ${themeMode === mode.value
                  ? 'bg-white shadow-sm'
                  : 'hover:bg-gray-200'
                }
              `}
            >
              {mode.icon}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// 外观设置组件
function AppearanceSettings({ onSave }: { onSave: () => void }) {
  const { theme, themeMode, setThemeMode } = useTheme()
  const [showSaveSuccess, setShowSaveSuccess] = useState(false)

  if (!theme) {
    return (
      <div className="rounded-2xl border-2 border-black p-6" style={{ backgroundColor: 'var(--card-bg)' }}>
        <h2 className="text-xl font-black mb-4">外观</h2>
        <p style={{ color: 'var(--text-tertiary)' }}>正在加载主题...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border-2 border-black p-6" style={{ backgroundColor: 'var(--card-bg)', borderColor: theme === 'dark' ? 'var(--border)' : '#000' }}>
        <h2 className="text-xl font-black mb-4">外观</h2>

        {/* 主题模式 */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              主题模式
            </label>
            <div className="flex gap-2">
              {[
                { value: 'auto' as const, label: '自动', desc: '18:00-6:00 夜间' },
                { value: 'light' as const, label: '日间', desc: '浅色背景' },
                { value: 'dark' as const, label: '夜间', desc: '蓝黑背景' },
              ].map((mode) => (
                <button
                  key={mode.value}
                  onClick={() => {
                    setThemeMode(mode.value)
                    // 保存到 localStorage
                    localStorage.setItem('themeMode', mode.value)
                    // 显示保存成功提示
                    setShowSaveSuccess(true)
                    setTimeout(() => {
                      setShowSaveSuccess(false)
                      onSave()
                    }, 1000)
                  }}
                  className={`
                    flex-1 px-4 py-3 rounded-xl border-2 transition-all relative
                    ${themeMode === mode.value
                      ? 'border-blue-500'
                      : theme === 'dark' ? 'border-gray-600' : 'border-gray-200'
                    }
                  `}
                  style={{
                    backgroundColor: themeMode === mode.value ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                    color: 'var(--text-primary)'
                  }}
                >
                  <div className="font-semibold">{mode.label}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{mode.desc}</div>
                  {/* 保存成功提示 */}
                  {showSaveSuccess && themeMode === mode.value && (
                    <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 animate-bounce">
                      <Check size={12} />
                      已保存
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 当前主题预览 */}
          <div className="pt-4" style={{ borderTop: `1px solid ${theme === 'dark' ? 'var(--border)' : '#e5e7eb'}` }}>
            <div className="text-sm font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              当前主题
            </div>
            <div className="px-4 py-2 rounded-lg" style={{
              backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.05)',
              color: 'var(--text-primary)'
            }}>
              {theme === 'dark' ? '🌙 夜间模式' : '☀️ 日间模式'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// 通知设置组件
function NotificationSettings() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border-2 border-black p-6">
        <h2 className="text-xl font-black mb-4">通知</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-200">
            <div>
              <div className="font-semibold">学习提醒</div>
              <div className="text-sm text-gray-500">每日定时提醒学习</div>
            </div>
            <button className="px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600">
              配置
            </button>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <div className="font-semibold">声音</div>
              <div className="text-sm text-gray-500">按键音和完成音效</div>
            </div>
            <button className="px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600">
              配置
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// 隐私设置组件
function PrivacySettings() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border-2 border-black p-6">
        <h2 className="text-xl font-black mb-4">隐私与安全</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-200">
            <div>
              <div className="font-semibold">修改密码</div>
              <div className="text-sm text-gray-500">定期更改密码保护账号安全</div>
            </div>
            <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200">
              修改
            </button>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <div className="font-semibold">数据导出</div>
              <div className="text-sm text-gray-500">下载您的所有学习数据</div>
            </div>
            <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200">
              导出
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// 账号设置组件
function AccountSettings() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border-2 border-black p-6">
        <h2 className="text-xl font-black mb-4">账号信息</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-200">
            <div>
              <div className="font-semibold">手机号</div>
              <div className="text-sm text-gray-500">138****8888</div>
            </div>
            <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200">
              修改
            </button>
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-200">
            <div>
              <div className="font-semibold">邮箱</div>
              <div className="text-sm text-gray-500">user@example.com</div>
            </div>
            <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200">
              修改
            </button>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <div className="font-semibold text-red-600">退出登录</div>
              <div className="text-sm text-gray-500">退出后需要重新登录</div>
            </div>
            <button className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-semibold hover:bg-red-200">
              退出
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
