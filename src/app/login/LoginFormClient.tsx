'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { GraduationCap, Eye, EyeOff, Mail, Lock, Sparkles, Trophy, Target, Zap, HelpCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function LoginFormClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showForgotPassword, setShowForgotPassword] = useState(false)

  // 设置页面标题
  useEffect(() => {
    document.title = '登录 - MAX笔记'
  }, [])

  // Login form state
  const [loginData, setLoginData] = useState({
    phone: '',
    password: ''
  })

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      console.log('[Login] 尝试登录:', loginData.phone)

      // 🔧 Fix: 使用客户端 Supabase 完成登录，确保cookies被正确设置
      const supabase = createClient()
      const email = `${loginData.phone}@phone.xiaoyu.com`

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: loginData.password,
      })

      if (signInError || !data.user) {
        console.error('[Login] 登录失败:', signInError)
        setError('手机号或密码错误')
        setLoading(false)
        return
      }

      console.log('[Login] 登录成功:', data.user.id)

      // 检查用户是否被封禁（需要额外调用API）
      const checkBanResponse = await fetch('/api/auth/check-ban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })
      // 即使检查失败也不影响登录流程

      // 登录成功，检查是否有redirect参数
      const redirectTo = searchParams.get('redirect')
      const targetUrl = redirectTo || '/'

      console.log('[Login] 跳转到:', targetUrl)
      router.push(targetUrl)
      router.refresh()
    } catch (err: unknown) {
      console.error('[Login] 异常:', err)
      const message = err instanceof Error ? err.message : '登录失败，请重试'
      setError(message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex transition-colors duration-300" style={{ backgroundColor: 'var(--bg-secondary)' }}>

      {/* Main Content - Split Layout for iPad */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-2 min-h-screen">

        {/* Left Side - Brand Section (iPad Landscape: 50% width) */}
        <div className="hidden lg:flex flex-col justify-center items-center p-8 lg:p-12 xl:p-16 relative">
          <div className="max-w-xl w-full space-y-6 lg:space-y-8">
            {/* Logo */}
            <div className="text-center">
              <div
                className="inline-flex items-center justify-center w-24 h-24 lg:w-32 lg:h-32 mb-6 lg:mb-8 transition-all duration-300"
                style={{
                  backgroundColor: '#B4F416',
                  border: '3px solid #000000',
                  borderRadius: '16px',
                  boxShadow: '4px 4px 0px 0px #000000'
                }}
              >
                <GraduationCap className="w-12 h-12 lg:w-16 lg:h-16" style={{ color: '#000000' }} strokeWidth={2.5} />
              </div>
              <h1 className="text-4xl lg:text-5xl xl:text-6xl font-black mb-2 lg:mb-4 transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>
                MAX笔记
              </h1>
              <p className="text-xl lg:text-2xl xl:text-3xl font-bold transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>
                智能英语学习平台
              </p>
            </div>

            {/* Feature Highlights */}
            <div className="space-y-4 lg:space-y-6">
              <div className="flex items-start gap-3 lg:gap-4">
                <div
                  className="flex-shrink-0 w-12 h-12 lg:w-14 lg:h-14 flex items-center justify-center transition-all duration-300"
                  style={{
                    backgroundColor: '#ADD8E6',
                    border: '3px solid #000000',
                    borderRadius: '10px',
                    boxShadow: '2px 2px 0px 0px #000000'
                  }}
                >
                  <Target className="w-6 h-6 lg:w-7 lg:h-7" style={{ color: '#3B82F6' }} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-lg lg:text-xl font-black mb-1 lg:mb-2 transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>🎯 多种学习模式</h3>
                  <p className="text-sm lg:text-base font-semibold leading-relaxed transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>
                    单词列表、拼写练习、听写、闪卡等多种模式，告别死记硬背
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 lg:gap-4">
                <div
                  className="flex-shrink-0 w-12 h-12 lg:w-14 lg:h-14 flex items-center justify-center transition-all duration-300"
                  style={{
                    backgroundColor: '#FDBCB4',
                    border: '3px solid #000000',
                    borderRadius: '10px',
                    boxShadow: '2px 2px 0px 0px #000000'
                  }}
                >
                  <Trophy className="w-6 h-6 lg:w-7 lg:h-7" style={{ color: '#FF8C61' }} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-lg lg:text-xl font-black mb-1 lg:mb-2 transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>🏆 学习进度追踪</h3>
                  <p className="text-sm lg:text-base font-semibold leading-relaxed transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>
                    实时记录学习成果，轻松查看每日学习情况和连续天数
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 lg:gap-4">
                <div
                  className="flex-shrink-0 w-12 h-12 lg:w-14 lg:h-14 flex items-center justify-center transition-all duration-300"
                  style={{
                    backgroundColor: '#BBF7D0',
                    border: '3px solid #000000',
                    borderRadius: '10px',
                    boxShadow: '2px 2px 0px 0px #000000'
                  }}
                >
                  <Zap className="w-6 h-6 lg:w-7 lg:h-7" style={{ color: '#22C55E' }} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-lg lg:text-xl font-black mb-1 lg:mb-2 transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>⚡ 科学复习</h3>
                  <p className="text-sm lg:text-base font-semibold leading-relaxed transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>
                    错题本自动收集，针对性复习不会的单词，提高学习效率
                  </p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 lg:gap-4 pt-4 lg:pt-6">
              <div
                className="text-center p-3 lg:p-4 transition-all duration-300"
                style={{
                  backgroundColor: 'var(--card-bg)',
                  border: '3px solid #000000',
                  borderRadius: '10px',
                  boxShadow: '2px 2px 0px 0px #000000'
                }}
              >
                <div className="text-2xl lg:text-3xl font-black mb-1" style={{ color: '#22C55E' }}>丰富</div>
                <p className="text-xs lg:text-sm font-semibold transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>学习模式</p>
              </div>
              <div
                className="text-center p-3 lg:p-4 transition-all duration-300"
                style={{
                  backgroundColor: 'var(--card-bg)',
                  border: '3px solid #000000',
                  borderRadius: '10px',
                  boxShadow: '2px 2px 0px 0px #000000'
                }}
              >
                <div className="text-2xl lg:text-3xl font-black mb-1" style={{ color: '#3B82F6' }}>实时</div>
                <p className="text-xs lg:text-sm font-semibold transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>进度统计</p>
              </div>
              <div
                className="text-center p-3 lg:p-4 transition-all duration-300"
                style={{
                  backgroundColor: 'var(--card-bg)',
                  border: '3px solid #000000',
                  borderRadius: '10px',
                  boxShadow: '2px 2px 0px 0px #000000'
                }}
              >
                <div className="text-2xl lg:text-3xl font-black mb-1" style={{ color: '#FF8C61' }}>便捷</div>
                <p className="text-xs lg:text-sm font-semibold transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>错题管理</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Auth Form (iPad Landscape: 50% width) */}
        <div className="flex flex-col justify-center p-4 sm:p-6 md:p-8 lg:p-12 xl:p-16">
          <div className="w-full max-w-md md:max-w-lg lg:max-w-xl mx-auto">

            {/* Mobile/Tablet Logo - Only visible on small screens */}
            <div className="lg:hidden text-center mb-6 md:mb-8">
              <div
                className="inline-flex items-center justify-center w-16 h-16 md:w-24 md:h-24 transition-all duration-300"
                style={{
                  backgroundColor: '#B4F416',
                  border: '3px solid #000000',
                  borderRadius: '12px',
                  boxShadow: '3px 3px 0px 0px #000000'
                }}
              >
                <GraduationCap className="w-8 h-8 md:w-12 md:h-12" style={{ color: '#000000' }} strokeWidth={2.5} />
              </div>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-black mb-1 md:mb-2 transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>
                MAX笔记
              </h1>
              <p className="text-sm md:text-base lg:text-lg font-semibold transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>
                ✨ 开启你的英语学习之旅 ✨
              </p>
            </div>

            {/* Auth Card */}
            <div
              className="p-5 md:p-6 lg:p-8 xl:p-12 transition-all duration-300"
              style={{
                backgroundColor: 'var(--card-bg)',
                border: '3px solid #000000',
                borderRadius: '16px',
                boxShadow: '6px 6px 0px 0px #000000'
              }}
            >
              {/* Title */}
              <div className="mb-5 md:mb-6 lg:mb-8">
                <h2 className="text-2xl md:text-3xl font-black mb-1 md:mb-2 transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>欢迎回来</h2>
                <p className="text-sm md:text-base font-semibold transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>登录你的账号继续学习</p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 md:mb-6 p-3 md:p-4 transition-all duration-300" style={{ backgroundColor: '#FFF5EE', border: '3px solid #FF8C61', borderRadius: '10px' }}>
                  <p className="text-sm md:text-base font-semibold" style={{ color: '#FF8C61' }}>⚠️ {error}</p>
                </div>
              )}

              {/* Login Form */}
              <form
                onSubmit={handleLogin}
                className="space-y-4 md:space-y-5 lg:space-y-6"
                method="post"
                action={undefined}
              >
                <div>
                  <label className="block text-sm md:text-base font-black mb-2 md:mb-3 flex items-center gap-2 transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>
                    <Mail className="w-4 h-4 md:w-5 md:h-5" style={{ color: '#22C55E' }} strokeWidth={2.5} />
                    手机号
                  </label>
                  <div
                    className="px-4 md:px-5 py-3 md:py-4 flex items-center transition-all duration-300"
                    style={{
                      backgroundColor: 'var(--input-bg, #F3F4F6)',
                      border: '3px solid #000000',
                      borderRadius: '10px',
                      minHeight: '48px'
                    }}
                  >
                    <input
                      type="tel"
                      value={loginData.phone}
                      onChange={(e) => setLoginData({ ...loginData, phone: e.target.value })}
                      placeholder="请输入手机号"
                      className="flex-1 bg-transparent border-none outline-none transition-colors duration-300 text-base md:text-lg font-semibold placeholder:font-normal"
                      style={{ color: 'var(--text-primary)' }}
                      required
                      data-testid="phone-input"
                      name="phone"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm md:text-base font-black mb-2 md:mb-3 flex items-center gap-2 transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>
                    <Lock className="w-4 h-4 md:w-5 md:h-5" style={{ color: '#22C55E' }} strokeWidth={2.5} />
                    密码
                  </label>
                  <div
                    className="px-4 md:px-5 py-3 md:py-4 flex items-center transition-all duration-300"
                    style={{
                      backgroundColor: 'var(--input-bg, #F3F4F6)',
                      border: '3px solid #000000',
                      borderRadius: '10px',
                      minHeight: '48px'
                    }}
                  >
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      placeholder="请输入密码"
                      className="flex-1 bg-transparent border-none outline-none transition-colors duration-300 text-base md:text-lg font-semibold placeholder:font-normal"
                      style={{ color: 'var(--text-primary)' }}
                      required
                      data-testid="password-input"
                      name="password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="ml-2 md:ml-3 hover:opacity-70 transition-opacity p-1.5 md:p-2"
                      style={{ color: '#22C55E' }}
                      data-testid="password-toggle-button"
                      aria-label={showPassword ? "隐藏密码" : "显示密码"}
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5 md:w-6 md:h-6" strokeWidth={2.5} />
                      ) : (
                        <Eye className="w-5 h-5 md:w-6 md:h-6" strokeWidth={2.5} />
                      )}
                    </button>
                  </div>
                </div>

                {/* 忘记密码链接 */}
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-xs md:text-sm font-black flex items-center gap-1 ml-auto transition-colors duration-300"
                    style={{ color: '#22C55E' }}
                  >
                    <HelpCircle className="w-3 h-3 md:w-4 md:h-4" strokeWidth={2.5} />
                    忘记密码？
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full text-base md:text-lg font-black py-3 md:py-4 lg:py-5 flex items-center justify-center gap-2 md:gap-3 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed text-white"
                  style={{
                    backgroundColor: '#22C55E',
                    border: '3px solid #000000',
                    borderRadius: '12px',
                    boxShadow: '4px 4px 0px 0px #000000',
                    minHeight: '52px'
                  }}
                  data-testid="login-submit-button"
                >
                  {loading ? (
                    <>⏳ 登录中...</>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 md:w-6 md:h-6" strokeWidth={2.5} />
                      登录
                    </>
                  )}
                </button>

                {/* 注册链接 */}
                <div className="text-center">
                  <p className="text-sm md:text-base font-semibold transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>
                    没有账号？
                    <Link href="/register" className="font-black ml-1 transition-colors duration-300" style={{ color: '#22C55E' }}>
                      立即注册
                    </Link>
                  </p>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="mt-4 md:mt-6 text-center">
              <div
                className="inline-block px-3 md:px-4 py-2 md:py-3 transition-all duration-300"
                style={{
                  backgroundColor: 'var(--card-bg)',
                  border: '3px solid #000000',
                  borderRadius: '10px',
                  boxShadow: '2px 2px 0px 0px #000000'
                }}
              >
                <p className="text-xs md:text-sm font-semibold transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>
                  🎓 登录即表示您同意我们的<Link href="/privacy" className="underline hover:text-[#22C55E] transition-colors">服务条款和隐私政策</Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 忘记密码提示对话框 */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div
            className="w-full max-w-md p-6 md:p-8 transition-all duration-300"
            style={{
              backgroundColor: 'var(--card-bg)',
              border: '3px solid #000000',
              borderRadius: '16px',
              boxShadow: '6px 6px 0px 0px #000000'
            }}
          >
            <div className="text-center">
              <div
                className="inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 mb-4 md:mb-6 transition-all duration-300"
                style={{
                  backgroundColor: '#ADD8E6',
                  border: '3px solid #000000',
                  borderRadius: '12px',
                  boxShadow: '3px 3px 0px 0px #000000'
                }}
              >
                <HelpCircle className="w-6 h-6 md:w-8 md:h-8" style={{ color: '#3B82F6' }} strokeWidth={2.5} />
              </div>
              <h3 className="text-xl md:text-2xl font-black mb-2 md:mb-3 transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>忘记密码？</h3>
              <p className="text-sm md:text-base lg:text-lg font-semibold mb-5 md:mb-6 transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>
                请联系店铺客服进行密码重置
              </p>
              <button
                onClick={() => setShowForgotPassword(false)}
                className="w-full px-4 md:px-6 py-2 md:py-3 text-base md:text-lg font-black text-white transition-all duration-300"
                style={{
                  backgroundColor: '#22C55E',
                  border: '3px solid #000000',
                  borderRadius: '10px',
                  boxShadow: '3px 3px 0px 0px #000000'
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
