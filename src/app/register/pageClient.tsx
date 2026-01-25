'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { GraduationCap, Eye, EyeOff, Mail, Lock, Ticket, Sparkles, BookOpen, Trophy, Target, Zap } from 'lucide-react'
import { signup } from '../login/actions'

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 设置页面标题
  useEffect(() => {
    document.title = '注册 - MAX笔记'
  }, [])

  // Signup form state
  const [signupData, setSignupData] = useState({
    phone: '',
    password: '',
    invitationCode: ''
  })

  // 字段验证错误
  const [fieldErrors, setFieldErrors] = useState({
    phone: '',
    password: ''
  })

  // 从 URL 参数读取邀请码
  useEffect(() => {
    const codeParam = searchParams.get('code')
    if (codeParam) {
      setSignupData(prev => ({
        ...prev,
        invitationCode: codeParam.toUpperCase()
      }))
    }
  }, [searchParams])

  // 验证手机号
  const validatePhone = (phone: string) => {
    if (!phone) return '请输入手机号'
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return '请输入正确的11位手机号'
    }
    return ''
  }

  // 验证密码
  const validatePassword = (password: string) => {
    if (!password) return '请输入密码'
    if (password.length < 6) {
      return '密码至少需要6位'
    }
    return ''
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // 验证字段
    const phoneError = validatePhone(signupData.phone)
    const passwordError = validatePassword(signupData.password)

    if (phoneError || passwordError) {
      setFieldErrors({ phone: phoneError, password: passwordError })
      return
    }

    if (!signupData.invitationCode) {
      setError('请输入邀请码')
      return
    }

    setLoading(true)

    try {
      console.log('[Signup] 尝试注册:', signupData.phone)

      // 添加超时处理 (10秒)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('注册超时，请检查网络连接')), 10000)
      )

      const result = await Promise.race([
        signup(signupData),
        timeoutPromise
      ]) as any

      console.log('[Signup] 注册结果:', result)

      if (result.error) {
        console.error('[Signup] 注册失败:', result.error)
        setError(result.error)
        setLoading(false)
        return
      }

      // 注册成功，跳转到首页
      console.log('[Signup] 注册成功，跳转到首页')
      router.push('/')
      router.refresh()
    } catch (err: unknown) {
      console.error('[Signup] 异常:', err)
      const message = err instanceof Error ? err.message : '注册失败，请重试'
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
                智能外语学习平台
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
                className="inline-flex items-center justify-center w-16 h-16 md:w-24 md:h-24 mb-4 md:mb-6 transition-all duration-300"
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
                ✨ 开启你的外语学习之旅 ✨
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
                <h2 className="text-2xl md:text-3xl font-black mb-1 md:mb-2 transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>创建账号</h2>
                <p className="text-sm md:text-base font-semibold transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>加入我们，开始智能学习之旅</p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 md:mb-6 p-3 md:p-4 transition-all duration-300" style={{ backgroundColor: '#FFF5EE', border: '3px solid #FF8C61', borderRadius: '10px' }}>
                  <p className="text-sm md:text-base font-semibold" style={{ color: '#FF8C61' }}>⚠️ {error}</p>
                </div>
              )}

              {/* Signup Form */}
              <form onSubmit={handleSignup} className="space-y-4 md:space-y-5">
                <div>
                  <label className="block text-sm md:text-base font-black mb-2 md:mb-3 flex items-center gap-2 transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>
                    <Mail className="w-4 h-4 md:w-5 md:h-5" style={{ color: '#3B82F6' }} strokeWidth={2.5} />
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
                      value={signupData.phone}
                      onChange={(e) => {
                        setSignupData({ ...signupData, phone: e.target.value })
                        setFieldErrors({ ...fieldErrors, phone: '' })
                      }}
                      onBlur={(e) => {
                        setFieldErrors({ ...fieldErrors, phone: validatePhone(e.target.value) })
                      }}
                      placeholder="请输入11位手机号"
                      className="flex-1 bg-transparent border-none outline-none transition-colors duration-300 text-base md:text-lg font-semibold"
                      style={{ color: 'var(--text-primary)' }}
                      required
                      data-testid="signup-phone-input"
                      name="phone"
                    />
                  </div>
                  {fieldErrors.phone && (
                    <p className="mt-2 text-sm font-semibold transition-colors duration-300" data-testid="phone-error" style={{ color: '#EF4444' }}>
                      {fieldErrors.phone}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm md:text-base font-black mb-2 md:mb-3 flex items-center gap-2 transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>
                    <Lock className="w-4 h-4 md:w-5 md:h-5" style={{ color: '#3B82F6' }} strokeWidth={2.5} />
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
                      value={signupData.password}
                      onChange={(e) => {
                        setSignupData({ ...signupData, password: e.target.value })
                        setFieldErrors({ ...fieldErrors, password: '' })
                      }}
                      onBlur={(e) => {
                        setFieldErrors({ ...fieldErrors, password: validatePassword(e.target.value) })
                      }}
                      placeholder="至少6位密码"
                      className="flex-1 bg-transparent border-none outline-none transition-colors duration-300 text-base md:text-lg font-semibold"
                      style={{ color: 'var(--text-primary)' }}
                      required
                      data-testid="signup-password-input"
                      name="password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="ml-2 md:ml-3 hover:opacity-70 transition-opacity p-1.5 md:p-2"
                      style={{ color: '#3B82F6' }}
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
                  {fieldErrors.password && (
                    <p className="mt-2 text-sm font-semibold transition-colors duration-300" data-testid="password-error" style={{ color: '#EF4444' }}>
                      {fieldErrors.password}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm md:text-base font-black mb-2 md:mb-3 flex items-center gap-2 transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>
                    <Ticket className="w-4 h-4 md:w-5 md:h-5" style={{ color: '#3B82F6' }} strokeWidth={2.5} />
                    邀请码 <span className="text-red-500">*</span>
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
                      type="text"
                      value={signupData.invitationCode}
                      onChange={(e) => setSignupData({ ...signupData, invitationCode: e.target.value.toUpperCase() })}
                      placeholder="请输入邀请码"
                      className="flex-1 bg-transparent border-none outline-none transition-colors duration-300 text-base md:text-lg font-semibold uppercase"
                      style={{ color: 'var(--text-primary)' }}
                      required
                      data-testid="signup-invitation-code-input"
                      name="invitationCode"
                    />
                  </div>
                  {/* 仅在开发环境显示测试邀请码 */}
                  {process.env.NODE_ENV === 'development' && (
                    <div className="mt-2 md:mt-3 flex items-start gap-2 px-2">
                      <Sparkles className="w-4 h-4 md:w-5 md:h-5 mt-0.5 flex-shrink-0" style={{ color: '#22C55E' }} strokeWidth={2.5} />
                      <p className="text-xs md:text-sm font-semibold leading-relaxed transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>
                        测试邀请码（仅开发环境）：<span className="font-black" style={{ color: '#22C55E' }}>TEST1234</span>, <span className="font-black" style={{ color: '#3B82F6' }}>DEMO2024</span>, <span className="font-black" style={{ color: '#FF8C61' }}>BETA5000</span>
                      </p>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full text-base md:text-lg font-black py-3 md:py-4 lg:py-5 flex items-center justify-center gap-2 md:gap-3 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed text-white"
                  style={{
                    backgroundColor: '#3B82F6',
                    border: '3px solid #000000',
                    borderRadius: '12px',
                    boxShadow: '4px 4px 0px 0px #000000',
                    minHeight: '52px'
                  }}
                  data-testid="signup-submit-button"
                >
                  {loading ? (
                    <>⏳ 注册中...</>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 md:w-6 md:h-6" strokeWidth={2.5} />
                      注册
                    </>
                  )}
                </button>

                {/* 登录链接 */}
                <div className="text-center">
                  <p className="text-sm md:text-base font-semibold transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>
                    已有账号？
                    <Link href="/login" className="font-black ml-1 transition-colors duration-300" style={{ color: '#3B82F6' }}>
                      立即登录
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
                  🎓 注册即表示您同意我们的服务条款和隐私政策
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function RegisterPageClient() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8F5F2' }}>加载中...</div>}>
      <RegisterForm />
    </Suspense>
  )
}
