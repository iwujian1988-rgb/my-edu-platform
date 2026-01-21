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
    <div className="min-h-screen flex relative overflow-hidden" style={{ backgroundColor: '#F8F5F2' }}>
      {/* Animated Background Decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-64 h-64 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob float-animation" style={{ backgroundColor: '#E6E6FA' }} />
        <div className="absolute top-40 right-20 w-72 h-72 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob float-animation" style={{ backgroundColor: '#FDBCB4', animationDelay: '1s' }} />
        <div className="absolute bottom-20 left-1/3 w-80 h-80 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob float-animation" style={{ backgroundColor: '#ADD8E6', animationDelay: '2s' }} />
        <div className="absolute bottom-40 right-1/4 w-64 h-64 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob float-animation" style={{ backgroundColor: '#98FF98', animationDelay: '3s' }} />
      </div>

      {/* Main Content - Split Layout for iPad */}
      <div className="relative z-10 w-full grid grid-cols-1 lg:grid-cols-2 min-h-screen">

        {/* Left Side - Brand Section (iPad Landscape: 50% width) */}
        <div className="hidden lg:flex flex-col justify-center items-center p-12 lg:p-16 relative">
          <div className="max-w-xl w-full space-y-8">
            {/* Logo */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-32 h-32 clay-card clay-icon mb-8 float-animation">
                <GraduationCap className="w-16 h-16 text-blue-600" />
              </div>
              <h1 className="text-5xl lg:text-6xl font-black mb-4" style={{ background: 'linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                MAX笔记
              </h1>
              <p className="text-2xl lg:text-3xl font-bold text-gray-700">
                智能英语学习平台
              </p>
            </div>

            {/* Feature Highlights */}
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-14 h-14 clay-icon flex items-center justify-center">
                  <Target className="w-7 h-7 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">🎯 AI 智能推荐</h3>
                  <p className="text-base text-gray-600 font-medium leading-relaxed">
                    根据学习水平智能推荐最适合的单词，告别无效学习
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-14 h-14 clay-icon flex items-center justify-center">
                  <Trophy className="w-7 h-7 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">🏆 成就系统</h3>
                  <p className="text-base text-gray-600 font-medium leading-relaxed">
                    完成学习目标解锁成就，让学习像游戏一样有趣
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-14 h-14 clay-icon flex items-center justify-center">
                  <Zap className="w-7 h-7 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">⚡ 间隔重复</h3>
                  <p className="text-base text-gray-600 font-medium leading-relaxed">
                    科学的记忆曲线算法，在最佳时机复习，记忆更持久
                  </p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 pt-6">
              <div className="text-center clay-card p-4">
                <div className="text-3xl font-black text-green-600 mb-1">500+</div>
                <p className="text-sm font-semibold text-gray-700">精选课程</p>
              </div>
              <div className="text-center clay-card p-4">
                <div className="text-3xl font-black text-blue-600 mb-1">10万+</div>
                <p className="text-sm font-semibold text-gray-700">词汇总量</p>
              </div>
              <div className="text-center clay-card p-4">
                <div className="text-3xl font-black text-orange-600 mb-1">98%</div>
                <p className="text-sm font-semibold text-gray-700">满意度</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Auth Form (iPad Landscape: 50% width) */}
        <div className="flex flex-col justify-center p-6 lg:p-12 xl:p-16">
          <div className="w-full max-w-2xl mx-auto">

            {/* Mobile/Tablet Logo - Only visible on small screens */}
            <div className="lg:hidden text-center mb-8">
              <div className="inline-flex items-center justify-center w-24 h-24 clay-card clay-icon mb-6 float-animation">
                <GraduationCap className="w-12 h-12 text-blue-600" />
              </div>
              <h1 className="text-4xl font-black mb-2" style={{ background: 'linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                MAX笔记
              </h1>
              <p className="text-lg font-bold text-gray-700">
                ✨ 开启你的英语学习之旅 ✨
              </p>
            </div>

            {/* Auth Card */}
            <div className="clay-card p-8 lg:p-12">
              {/* Title */}
              <div className="mb-8">
                <h2 className="text-3xl font-black text-gray-800 mb-2">创建账号</h2>
                <p className="text-base font-semibold text-gray-600">加入我们，开始智能学习之旅</p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 rounded-2xl border-l-4" style={{ backgroundColor: '#FFF5EE', borderColor: '#FF8C61' }}>
                  <p className="text-base font-semibold" style={{ color: '#FF8C61' }}>⚠️ {error}</p>
                </div>
              )}

              {/* Signup Form */}
              <form onSubmit={handleSignup} className="space-y-5">
                <div>
                  <label className="block text-base font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <Mail className="w-5 h-5 text-blue-600" />
                    手机号
                  </label>
                  <div className="clay-icon px-5 py-4" style={{ minHeight: '56px' }}>
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
                      className="w-full bg-transparent border-none outline-none text-gray-800 placeholder-gray-400 font-semibold text-lg"
                      required
                      data-testid="signup-phone-input"
                      name="phone"
                    />
                  </div>
                  {fieldErrors.phone && (
                    <p className="mt-2 text-sm font-semibold text-red-500" data-testid="phone-error">
                      {fieldErrors.phone}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-base font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <Lock className="w-5 h-5 text-blue-600" />
                    密码
                  </label>
                  <div className="clay-icon px-5 py-4 flex items-center" style={{ minHeight: '56px' }}>
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
                      className="flex-1 bg-transparent border-none outline-none text-gray-800 placeholder-gray-400 font-semibold text-lg"
                      required
                      data-testid="signup-password-input"
                      name="password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="ml-3 hover:opacity-70 transition-opacity p-2"
                      style={{ color: '#87CEEB' }}
                      data-testid="password-toggle-button"
                      aria-label={showPassword ? "隐藏密码" : "显示密码"}
                    >
                      {showPassword ? (
                        <EyeOff className="w-6 h-6" />
                      ) : (
                        <Eye className="w-6 h-6" />
                      )}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p className="mt-2 text-sm font-semibold text-red-500" data-testid="password-error">
                      {fieldErrors.password}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-base font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <Ticket className="w-5 h-5 text-blue-600" />
                    邀请码 <span style={{ color: '#87CEEB' }}>*</span>
                  </label>
                  <div className="clay-icon px-5 py-4" style={{ minHeight: '56px' }}>
                    <input
                      type="text"
                      value={signupData.invitationCode}
                      onChange={(e) => setSignupData({ ...signupData, invitationCode: e.target.value.toUpperCase() })}
                      placeholder="请输入邀请码"
                      className="w-full bg-transparent border-none outline-none text-gray-800 placeholder-gray-400 font-semibold text-lg uppercase"
                      required
                      data-testid="signup-invitation-code-input"
                      name="invitationCode"
                    />
                  </div>
                  {/* 仅在开发环境显示测试邀请码 */}
                  {process.env.NODE_ENV === 'development' && (
                    <div className="mt-3 flex items-start gap-2 px-2">
                      <Sparkles className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#4CAF50' }} />
                      <p className="text-sm text-gray-600 font-medium leading-relaxed">
                        测试邀请码（仅开发环境）：<span className="font-bold" style={{ color: '#4CAF50' }}>TEST1234</span>, <span className="font-bold" style={{ color: '#87CEEB' }}>DEMO2024</span>, <span className="font-bold" style={{ color: '#FF8C61' }}>BETA5000</span>
                      </p>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full clay-button-secondary text-lg py-5 shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ minHeight: '64px' }}
                  data-testid="signup-submit-button"
                >
                  {loading ? (
                    <>⏳ 注册中...</>
                  ) : (
                    <>
                      <Sparkles className="w-6 h-6" />
                      注册
                    </>
                  )}
                </button>

                {/* 登录链接 */}
                <div className="text-center">
                  <p className="text-gray-600 font-semibold">
                    已有账号？
                    <Link href="/login" className="text-blue-600 hover:text-blue-700 font-bold ml-1">
                      立即登录
                    </Link>
                  </p>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="mt-6 text-center">
              <div className="badge inline-block">
                <p className="text-base text-gray-700 font-semibold">
                  🎓 注册即表示您同意我们的服务条款和隐私政策
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
      `}</style>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8F5F2' }}>加载中...</div>}>
      <RegisterForm />
    </Suspense>
  )
}
