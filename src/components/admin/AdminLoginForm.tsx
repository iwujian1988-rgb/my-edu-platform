'use client'

/**
 * 管理员登录表单组件
 */

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { login } from '@/app/admin/login/actions'

interface AdminLoginFormProps {
  redirectTo?: string
}

export function AdminLoginForm({ redirectTo }: AdminLoginFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')

    const form = new FormData()
    form.append('email', formData.email)
    form.append('password', formData.password)
    if (redirectTo || searchParams.get('redirect')) {
      form.append('redirect', redirectTo || searchParams.get('redirect') || '')
    }

    startTransition(async () => {
      try {
        const result = await login(form)

        if (result?.error) {
          setError(result.error)
        } else {
          // Server Action 会自动处理重定向
          router.refresh()
        }
      } catch (err) {
        console.error('Login error:', err)
        setError('登录失败，请稍后重试')
      }
    })
  }

  return (
    <div className="bg-white rounded-3xl border-[3px] border-black shadow-[8px_8px_0px_0px_#000] p-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4">
            <p className="text-red-700 font-semibold text-sm">{error}</p>
          </div>
        )}

        {/* 邮箱输入 */}
        <div>
          <label htmlFor="email" className="block text-sm font-bold text-gray-700 mb-2">
            邮箱地址
          </label>
          <input
            id="email"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border-[3px] border-black font-semibold text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-green-200 transition-all"
            placeholder="admin@example.com"
            disabled={isPending}
          />
        </div>

        {/* 密码输入 */}
        <div>
          <label htmlFor="password" className="block text-sm font-bold text-gray-700 mb-2">
            密码
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-3 pr-12 rounded-xl border-[3px] border-black font-semibold text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-green-200 transition-all"
              placeholder="••••••••"
              disabled={isPending}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              disabled={isPending}
            >
              {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
            </button>
          </div>
        </div>

        {/* 登录按钮 */}
        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-gradient-to-br from-green-400 to-green-600 text-white font-bold py-4 px-6 rounded-xl border-[3px] border-black shadow-[4px_4px_0px_0px_#000] hover:shadow-[6px_6px_0px_0px_#000] hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-[4px_4px_0px_0px_#000] disabled:translate-y-0"
        >
          {isPending ? '登录中...' : '登录'}
        </button>
      </form>

      {/* 帮助信息 */}
      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500 font-semibold">
          请使用管理员邮箱和密码登录
        </p>
      </div>
    </div>
  )
}
