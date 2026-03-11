'use client'

import { useState, useEffect } from 'react'
import { X, Gift } from 'lucide-react'

const STORAGE_KEY_PERMANENT = 'promo_popup_dismissed_forever'
const STORAGE_KEY_TODAY = 'promo_popup_dismissed_today'

const WECHAT_KF_URL = 'https://work.weixin.qq.com/kfid/kfc49c2602e3dbe2fc1'

export function PromoPopup() {
  const [isVisible, setIsVisible] = useState(false)
  const [dontShowAgain, setDontShowAgain] = useState(false)

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]

    const permanentDismissed = localStorage.getItem(STORAGE_KEY_PERMANENT)
    if (permanentDismissed) return

    const todayDismissed = localStorage.getItem(STORAGE_KEY_TODAY)
    if (todayDismissed === today) return

    const timer = setTimeout(() => setIsVisible(true), 1000)
    return () => clearTimeout(timer)
  }, [])

  const handleClose = () => {
    const today = new Date().toISOString().split('T')[0]

    if (dontShowAgain) {
      localStorage.setItem(STORAGE_KEY_PERMANENT, 'true')
    } else {
      localStorage.setItem(STORAGE_KEY_TODAY, today)
    }
    setIsVisible(false)
  }

  const handleClaim = () => {
    window.open(WECHAT_KF_URL, '_blank')
    handleClose()
  }

  if (!isVisible) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-sm md:max-w-md animate-pop-in"
        style={{
          backgroundColor: '#FFF9C4',
          border: '3px solid #000000',
          borderRadius: '4px',
          boxShadow: '6px 6px 0px 0px #000000'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 限时角标 */}
        <div
          className="absolute -top-2 -left-2 md:-top-3 md:-left-3 px-3 py-1 md:px-4 md:py-1.5 font-black text-white text-xs md:text-sm z-20"
          style={{
            backgroundColor: '#EF4444',
            border: '2px solid #000000',
            borderRadius: '4px',
            boxShadow: '2px 2px 0px 0px #000000'
          }}
        >
          限时福利
        </div>

        {/* 关闭按钮 */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center transition-all hover:scale-110"
          style={{
            backgroundColor: '#ffffff',
            border: '2px solid #000000',
            borderRadius: '4px',
            boxShadow: '2px 2px 0px 0px #000000'
          }}
        >
          <X size={16} className="text-black" strokeWidth={2.5} />
        </button>

        <div className="px-6 py-8 md:px-10 md:py-10 text-center">
          {/* 图标 */}
          <div
            className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 flex items-center justify-center"
            style={{
              backgroundColor: '#FF8C61',
              border: '3px solid #000000',
              borderRadius: '4px',
              boxShadow: '4px 4px 0px 0px #000000'
            }}
          >
            <Gift size={32} className="text-white md:w-10 md:h-10" strokeWidth={2.5} />
          </div>

          {/* 标题 */}
          <h2 className="text-2xl md:text-3xl font-black text-black mb-2">
            好评送好礼
          </h2>
          <p className="text-sm md:text-base font-semibold text-gray-600 mb-6">
            小红书写好评即可免费领取
          </p>

          {/* 礼品内容 */}
          <div
            className="p-4 md:p-5 mb-6"
            style={{
              backgroundColor: '#ffffff',
              border: '3px solid #000000',
              borderRadius: '4px',
              boxShadow: '3px 3px 0px 0px #000000'
            }}
          >
            {/* 标签 */}
            <div
              className="inline-block px-2 py-0.5 text-xs font-black mb-2"
              style={{
                backgroundColor: '#B4F416',
                border: '2px solid #000000',
                borderRadius: '2px'
              }}
            >
              内部专供
            </div>
            <p className="text-lg md:text-xl font-black text-black">
              TED 百大必练神级资料
            </p>
            <p className="text-base md:text-lg font-black mt-1" style={{ color: '#EF4444' }}>
              原价 ¥99 → 免费
            </p>
          </div>

          {/* 领取按钮 */}
          <button
            onClick={handleClaim}
            className="w-full py-3 md:py-4 font-black text-white text-lg md:text-xl transition-all hover:-translate-y-1 active:translate-y-0"
            style={{
              backgroundColor: '#FF8C61',
              border: '3px solid #000000',
              borderRadius: '4px',
              boxShadow: '4px 4px 0px 0px #000000'
            }}
          >
            立即领取
          </button>

          {/* 不再显示 */}
          <label className="flex items-center justify-center gap-2 mt-4 cursor-pointer select-none">
            <div className="relative flex items-center justify-center">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-5 h-5 border-2 border-black rounded appearance-none bg-white checked:bg-black"
                style={{ borderRadius: '2px' }}
              />
              {dontShowAgain && (
                <svg className="absolute w-3 h-3 text-white pointer-events-none" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
            <span className="text-sm font-semibold text-gray-700">以后不再显示</span>
          </label>
        </div>
      </div>

      {/* 动画样式 */}
      <style jsx>{`
        @keyframes pop-in {
          0% {
            opacity: 0;
            transform: scale(0.9);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-pop-in {
          animation: pop-in 0.2s ease-out;
        }
      `}</style>
    </div>
  )
}
