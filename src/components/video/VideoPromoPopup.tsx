'use client'

import { useState, useEffect } from 'react'
import { X, Gift } from 'lucide-react'

const STORAGE_KEY_PERMANENT = 'video_promo_popup_dismissed_forever'
const STORAGE_KEY_TODAY = 'video_promo_popup_dismissed_today'

const WECHAT_KF_URL = 'https://work.weixin.qq.com/kfid/kfc49c2602e3dbe2fc1'

export function VideoPromoPopup() {
  const [isVisible, setIsVisible] = useState(false)
  const [dontShowAgain, setDontShowAgain] = useState(false)

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]

    const permanentDismissed = localStorage.getItem(STORAGE_KEY_PERMANENT)
    if (permanentDismissed) return

    const todayDismissed = localStorage.getItem(STORAGE_KEY_TODAY)
    if (todayDismissed === today) return

    const timer = setTimeout(() => setIsVisible(true), 1500)
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
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-sm md:max-w-md animate-video-pop-in"
        style={{
          backgroundColor: '#D4FF00',
          border: '3px solid #000000',
          boxShadow: '6px 6px 0px 0px #000000',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 限时角标 */}
        <div
          className="absolute -top-2 -left-2 md:-top-3 md:-left-3 px-3 py-1 md:px-4 md:py-1.5 font-black text-white text-xs md:text-sm z-20"
          style={{
            backgroundColor: '#FF3366',
            border: '2px solid #000000',
            boxShadow: '2px 2px 0px 0px #000000',
          }}
        >
          限时福利
        </div>

        {/* 关闭按钮 */}
        <button
          onClick={handleClose}
          className="absolute top-2 right-2 z-10 w-8 h-8 flex items-center justify-center bg-white transition-all hover:scale-110"
          style={{
            border: '2px solid #000000',
            boxShadow: '2px 2px 0px 0px #000000',
          }}
        >
          <X size={16} className="text-black" strokeWidth={2.5} />
        </button>

        {/* 顶部跑马灯 */}
        <div
          className="py-1 flex overflow-hidden whitespace-nowrap"
          style={{
            backgroundColor: '#000000',
            borderBottom: '3px solid #000000',
          }}
        >
          <div className="flex gap-4 items-center font-black text-[10px] tracking-widest animate-pulse text-white">
            <span>🔥 限时福利</span>
            <span>///</span>
            <span>好评免费送</span>
            <span>///</span>
            <span>🔥 限时福利</span>
            <span>///</span>
            <span>好评免费送</span>
          </div>
        </div>

        {/* 主内容 */}
        <div className="p-4 md:p-6">
          {/* 礼物图标 */}
          <div
            className="w-14 h-14 md:w-16 md:h-16 mx-auto mb-3 flex items-center justify-center"
            style={{
              backgroundColor: '#C084FC',
              border: '3px solid #000000',
              boxShadow: '4px 4px 0px 0px #000000',
            }}
          >
            <Gift size={28} className="text-white" strokeWidth={2.5} />
          </div>

          {/* 标签 */}
          <div
            className="text-center mb-2"
            style={{ transform: 'rotate(-2deg)' }}
          >
            <span
              className="inline-block text-white px-2 py-0.5 font-black text-xs"
              style={{
                backgroundColor: '#FF3366',
                border: '2px solid #000000',
                boxShadow: '2px 2px 0px 0px #000000',
              }}
            >
              0元白嫖！
            </span>
          </div>

          {/* 标题卡片 */}
          <div
            className="p-3 mb-4"
            style={{
              backgroundColor: '#ffffff',
              border: '2px solid #000000',
              boxShadow: '3px 3px 0px 0px #000000',
            }}
          >
            <h3 className="text-lg md:text-xl font-black text-black leading-tight text-center">
              法语<span className="underline decoration-2 underline-offset-2 decoration-black" style={{ color: '#C084FC' }}>原声大礼包</span>
            </h3>
            <div className="text-center mt-1.5">
              <span className="bg-black text-white font-bold text-[10px] px-2 py-0.5 inline-block">
                小红书好评 = 免费解锁 🔓
              </span>
            </div>
          </div>

          {/* 领取按钮 */}
          <button
            onClick={handleClaim}
            className="w-full py-2.5 md:py-3 font-black text-black text-base md:text-lg transition-all hover:translate-y-[2px] hover:translate-x-[2px] flex items-center justify-center gap-2"
            style={{
              backgroundColor: '#C084FC',
              border: '3px solid #000000',
              boxShadow: '3px 3px 0px 0px #000000',
            }}
          >
            <span>🎁</span>
            联系客服领取
          </button>

          {/* 稀缺感 */}
          <div className="text-center font-black text-black text-[10px] mt-2 border-b-2 border-dashed border-black pb-0.5">
            🔥 仅限前 100 名
          </div>

          {/* 不再显示 */}
          <label className="flex items-center justify-center gap-2 mt-3 cursor-pointer select-none">
            <div className="relative flex items-center justify-center">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(e) => setDontShowAgain(e.target.checked)}
                className="w-4 h-4 border-2 border-black bg-white checked:bg-black"
                style={{ appearance: 'none', borderRadius: '2px' }}
              />
              {dontShowAgain && (
                <svg className="absolute w-3 h-3 text-white pointer-events-none" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <span className="text-xs font-semibold text-gray-700">以后不再显示</span>
          </label>
        </div>
      </div>

      {/* 动画 */}
      <style jsx>{`
        @keyframes video-pop-in {
          0% {
            opacity: 0;
            transform: scale(0.9);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-video-pop-in {
          animation: video-pop-in 0.2s ease-out;
        }
      `}</style>
    </div>
  )
}
