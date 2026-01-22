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

      // 🔍 Debug: 检查登录后的cookies
      if (typeof document !== 'undefined') {
        const allCookies = document.cookie.split(';').map(c => c.trim())
        const authCookies = allCookies.filter(c => c.includes('sb-'))
        console.log('🍪 [Login] 登录后的Cookies:', {
          totalCookies: allCookies.length,
          authCookiesCount: authCookies.length,
          authCookies: authCookies,
          hasAuthToken: authCookies.some(c => c.includes('auth-token')),
          hasRefreshToken: authCookies.some(c => c.includes('refresh-token')),
        })
      }

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
                <GraduationCap className="w-16 h-16 text-green-600" />
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
                <GraduationCap className="w-12 h-12 text-green-600" />
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
                <h2 className="text-3xl font-black text-gray-800 mb-2">欢迎回来</h2>
                <p className="text-base font-semibold text-gray-600">登录你的账号继续学习</p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 rounded-2xl border-l-4" style={{ backgroundColor: '#FFF5EE', borderColor: '#FF8C61' }}>
                  <p className="text-base font-semibold" style={{ color: '#FF8C61' }}>⚠️ {error}</p>
                </div>
              )}

              {/* Login Form */}
              <form
                onSubmit={handleLogin}
                className="space-y-6"
                method="post"  // 🔒 安全：强制POST，防止密码暴露在URL
                action={undefined}  // 🔒 安全：禁用默认action
              >
                <div>
                  <label className="block text-base font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <Mail className="w-5 h-5 text-green-600" />
                    手机号
                  </label>
                  <div className="clay-icon px-5 py-4" style={{ minHeight: '56px' }}>
                    <input
                      type="tel"
                      value={loginData.phone}
                      onChange={(e) => setLoginData({ ...loginData, phone: e.target.value })}
                      placeholder="请输入手机号"
                      className="w-full bg-transparent border-none outline-none text-gray-800 placeholder-gray-400 font-semibold text-lg"
                      required
                      data-testid="phone-input"
                      name="phone"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-base font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <Lock className="w-5 h-5 text-green-600" />
                    密码
                  </label>
                  <div className="clay-icon px-5 py-4 flex items-center" style={{ minHeight: '56px' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      placeholder="请输入密码"
                      className="flex-1 bg-transparent border-none outline-none text-gray-800 placeholder-gray-400 font-semibold text-lg"
                      required
                      data-testid="password-input"
                      name="password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="ml-3 hover:opacity-70 transition-opacity p-2"
                      style={{ color: '#4CAF50' }}
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
                </div>

                {/* 忘记密码链接 */}
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm font-semibold text-green-600 hover:text-green-700 transition-colors flex items-center gap-1 ml-auto"
                  >
                    <HelpCircle className="w-4 h-4" />
                    忘记密码？
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full clay-button-primary text-lg py-5 shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ minHeight: '64px' }}
                  data-testid="login-submit-button"
                >
                  {loading ? (
                    <>⏳ 登录中...</>
                  ) : (
                    <>
                      <Sparkles className="w-6 h-6" />
                      登录
                    </>
                  )}
                </button>

                {/* 注册链接 */}
                <div className="text-center">
                  <p className="text-gray-600 font-semibold">
                    没有账号？
                    <Link href="/register" className="text-green-600 hover:text-green-700 font-bold ml-1">
                      立即注册
                    </Link>
                  </p>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="mt-6 text-center">
              <div className="badge inline-block">
                <p className="text-base text-gray-700 font-semibold">
                  🎓 登录即表示您同意我们的服务条款和隐私政策
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 忘记密码提示对话框 */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <HelpCircle className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-3">忘记密码？</h3>
              <p className="text-gray-600 font-semibold text-lg mb-6">
                请联系店铺客服进行密码重置
              </p>
              <button
                onClick={() => setShowForgotPassword(false)}
                className="w-full px-6 py-3 bg-gradient-to-r from-green-400 to-green-600 text-white rounded-xl font-bold hover:shadow-lg transition-all"
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}

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
