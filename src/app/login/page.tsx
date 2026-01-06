'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { GraduationCap, Eye, EyeOff, Mail, Lock, Ticket, Sparkles, BookOpen, Trophy, Target, Zap } from 'lucide-react'
import { login, signup } from './actions'

export default function LoginPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // 设置页面标题
  useEffect(() => {
    document.title = '登录 / 注册 - 小语笔记'
  }, [])

  // Login form state
  const [loginData, setLoginData] = useState({
    phone: '',
    password: ''
  })

  // Signup form state
  const [signupData, setSignupData] = useState({
    phone: '',
    password: '',
    confirmPassword: '',
    invitationCode: ''
  })

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const result = await login(loginData)
      if (result.error) {
        setError(result.error)
        setLoading(false)
      } else {
        // 立即跳转，不等待
        router.push('/')
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message || '登录失败，请重试')
      setLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Validation
    if (signupData.password !== signupData.confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    if (signupData.password.length < 6) {
      setError('密码长度至少为6位')
      return
    }

    if (!/^[0-9]{11}$/.test(signupData.phone)) {
      setError('请输入正确的11位手机号')
      return
    }

    if (!signupData.invitationCode) {
      setError('请输入邀请码')
      return
    }

    setLoading(true)

    try {
      const result = await signup(signupData)
      if (result.error) {
        setError(result.error)
        setLoading(false)
      } else {
        // 立即跳转，不等待
        router.push('/')
        router.refresh()
      }
    } catch (err: any) {
      setError(err.message || '注册失败，请重试')
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
                小语笔记
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
                小语笔记
              </h1>
              <p className="text-lg font-bold text-gray-700">
                ✨ 开启你的英语学习之旅 ✨
              </p>
            </div>

            {/* Auth Card */}
            <div className="clay-card p-8 lg:p-12">
              {/* Tabs */}
              <div className="flex gap-3 mb-8 p-2 rounded-2xl" style={{
                background: '#F7FAFC',
                border: '2px solid #E2E8F0'
              }}>
                <button
                  onClick={() => { setActiveTab('login'); setError(''); setSuccess('') }}
                  className={`flex-1 py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 min-h-[56px] ${
                    activeTab === 'login'
                      ? 'text-white shadow-lg'
                      : 'text-gray-500 hover:text-green-600'
                  }`}
                  style={
                    activeTab === 'login' ? {
                      background: 'linear-gradient(135deg, #4CAF50 0%, #45A049 100%)',
                      boxShadow: '0 4px 8px rgba(76, 175, 80, 0.3)'
                    } : {}
                  }
                >
                  登录
                </button>
                <button
                  onClick={() => { setActiveTab('signup'); setError(''); setSuccess('') }}
                  className={`flex-1 py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 min-h-[56px] ${
                    activeTab === 'signup'
                      ? 'text-gray-800 shadow-lg'
                      : 'text-gray-500 hover:text-blue-600'
                  }`}
                  style={
                    activeTab === 'signup' ? {
                      background: 'linear-gradient(135deg, #87CEEB 0%, #7DD3E8 100%)',
                      boxShadow: '0 4px 8px rgba(135, 206, 235, 0.3)'
                    } : {}
                  }
                >
                  注册
                </button>
              </div>

              {/* Forms */}
              <div>
                {/* Error & Success Messages */}
                {error && (
                  <div className="mb-6 p-4 rounded-2xl border-l-4" style={{ backgroundColor: '#FFF5EE', borderColor: '#FF8C61' }}>
                    <p className="text-base font-semibold" style={{ color: '#FF8C61' }}>⚠️ {error}</p>
                  </div>
                )}

                {success && (
                  <div className="mb-6 p-4 rounded-2xl border-l-4" style={{ backgroundColor: '#F0FFF4', borderColor: '#4CAF50' }}>
                    <p className="text-base font-semibold" style={{ color: '#4CAF50' }}>🎉 {success}</p>
                  </div>
                )}

                {activeTab === 'login' ? (
                  /* Login Form */
                  <form onSubmit={handleLogin} className="space-y-6">
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
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="ml-3 hover:opacity-70 transition-opacity p-2"
                          style={{ color: '#4CAF50' }}
                        >
                          {showPassword ? (
                            <EyeOff className="w-6 h-6" />
                          ) : (
                            <Eye className="w-6 h-6" />
                          )}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full clay-button-primary text-lg py-5 shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      style={{ minHeight: '64px' }}
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
                  </form>
                ) : (
                  /* Signup Form */
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
                          onChange={(e) => setSignupData({ ...signupData, phone: e.target.value })}
                          placeholder="请输入11位手机号"
                          className="w-full bg-transparent border-none outline-none text-gray-800 placeholder-gray-400 font-semibold text-lg"
                          required
                        />
                      </div>
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
                          onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                          placeholder="至少6位密码"
                          className="flex-1 bg-transparent border-none outline-none text-gray-800 placeholder-gray-400 font-semibold text-lg"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="ml-3 hover:opacity-70 transition-opacity p-2"
                          style={{ color: '#87CEEB' }}
                        >
                          {showPassword ? (
                            <EyeOff className="w-6 h-6" />
                          ) : (
                            <Eye className="w-6 h-6" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-base font-bold text-gray-700 mb-3 flex items-center gap-2">
                        <Lock className="w-5 h-5 text-blue-600" />
                        确认密码
                      </label>
                      <div className="clay-icon px-5 py-4" style={{ minHeight: '56px' }}>
                        <input
                          type="password"
                          value={signupData.confirmPassword}
                          onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
                          placeholder="再次输入密码"
                          className="w-full bg-transparent border-none outline-none text-gray-800 placeholder-gray-400 font-semibold text-lg"
                          required
                        />
                      </div>
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
                        />
                      </div>
                      <div className="mt-3 flex items-start gap-2 px-2">
                        <Sparkles className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#4CAF50' }} />
                        <p className="text-sm text-gray-600 font-medium leading-relaxed">
                          测试邀请码：<span className="font-bold" style={{ color: '#4CAF50' }}>TEST1234</span>, <span className="font-bold" style={{ color: '#87CEEB' }}>DEMO2024</span>, <span className="font-bold" style={{ color: '#FF8C61' }}>BETA5000</span>
                        </p>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full clay-button-secondary text-lg py-5 shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      style={{ minHeight: '64px' }}
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
                  </form>
                )}
              </div>
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
