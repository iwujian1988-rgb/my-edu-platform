'use client'

import { useEffect } from 'react'

export default function ClearCachePageClient() {
  useEffect(() => {
    // 卸载残留的 Service Worker（旧 Workbox SW 会拦截 API 请求导致超时）
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((reg) => reg.unregister())
      })
    }

    // 清除所有缓存
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name))
      })
    }

    // 清除 localStorage
    localStorage.clear()
    sessionStorage.clear()

    // 重新加载首页
    setTimeout(() => {
      window.location.href = '/'
    }, 500)
  }, [])

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white border-4 border-black rounded-2xl shadow-[8px_8px_0px_0px_#000] p-8 text-center">
        <div className="w-16 h-16 bg-[#B4F416] border-4 border-black rounded-2xl flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>

        <h1 className="text-3xl font-black text-gray-900 mb-4">
          正在清除缓存...
        </h1>

        <p className="text-gray-600 font-semibold mb-6">
          页面将自动跳转到首页
        </p>

        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div className="bg-[#B4F416] h-full rounded-full animate-pulse" style={{ width: '60%' }} />
        </div>

        <p className="text-sm text-gray-500 font-bold mt-6">
          如果没有自动跳转，请点击下方按钮
        </p>

        <button
          onClick={() => (window.location.href = '/')}
          className="mt-4 w-full bg-[#B4F416] border-3 border-black text-black font-black py-3 px-6 rounded-xl hover:bg-[#a3e214] hover:shadow-[4px_4px_0px_0px_#000] hover:-translate-y-0.5 transition-all"
        >
          返回首页
        </button>
      </div>
    </div>
  )
}
