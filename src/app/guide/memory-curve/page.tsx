'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Brain, TrendingUp, Clock, CheckCircle, AlertTriangle, Target, Zap } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

export default function MemoryCurveGuide() {
  const router = useRouter()
  const { theme, mounted } = useTheme()
  const isDark = mounted && theme === 'dark'

  return (
    <div className="min-h-screen py-8 px-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="p-3 border-[3px] border-black rounded-lg hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,0.2)] transition-all"
            style={{ backgroundColor: 'var(--card-bg)' }}
          >
            <ArrowLeft className="w-5 h-5" style={{ color: 'var(--text-primary)' }} />
          </button>
          <div>
            <h1 className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>
              🧠 记忆曲线原理
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              科学复习，告别遗忘
            </p>
          </div>
        </div>

        {/* 核心原理 */}
        <div className="p-6 border-[3px] border-black rounded-lg" style={{
          backgroundColor: 'var(--card-bg)',
          boxShadow: '4px_4px_0px_0px_rgba(0,0,0,0.3)'
        }}>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg flex-shrink-0" style={{ backgroundColor: '#FF8C61' }}>
              <Brain className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-black mb-3" style={{ color: 'var(--text-primary)' }}>
                什么是艾宾浩斯遗忘曲线？
              </h2>
              <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
                德国心理学家艾宾浩斯发现：人类的遗忘速度<strong>先快后慢</strong>。
                学习后的20分钟会遗忘42%，1小时后遗忘56%，1天后遗忘66%...
              </p>
              <div className="p-4 border-[3px] rounded-lg" style={{
                backgroundColor: isDark ? 'rgba(255,200,50,0.1)' : '#FEF08A',
                borderColor: '#F59E0B'
              }}>
                <p className="text-sm font-semibold mb-2" style={{ color: '#92400E' }}>
                  💡 核心发现：
                </p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  通过<strong>及时复习</strong>，可以大幅减缓遗忘速度。
                  在记忆即将消失前复习，可以将记忆保持时间延长数倍！
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 复习间隔计算 */}
        <div className="p-6 border-[3px] border-black rounded-lg" style={{
          backgroundColor: 'var(--card-bg)',
          boxShadow: '4px_4px_0px_0px_#B4F416'
        }}>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg flex-shrink-0" style={{ backgroundColor: '#22C55E' }}>
              <Clock className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-black mb-3" style={{ color: 'var(--text-primary)' }}>
                系统如何计算复习间隔？
              </h2>
              <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
                系统采用<strong>渐进式间隔复习算法</strong>，根据您标记"认识"的次数自动调整复习间隔：
              </p>

              <div className="space-y-3">
                {/* 第1次认识 */}
                <div className="flex items-center gap-4 p-3 border-[3px] rounded-lg" style={{
                  backgroundColor: isDark ? 'rgba(59,130,246,0.1)' : '#EFF6FF',
                  borderColor: '#3B82F6'
                }}>
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg font-black text-lg" style={{ backgroundColor: '#3B82F6', color: 'white' }}>
                    1
                  </div>
                  <div className="flex-1">
                    <div className="font-bold" style={{ color: '#1E40AF' }}>第1次认识</div>
                    <div className="text-sm" style={{ color: '#3B82F6' }}>7天后复习</div>
                  </div>
                  <CheckCircle className="w-5 h-5" style={{ color: '#3B82F6' }} />
                </div>

                {/* 第2次认识 */}
                <div className="flex items-center gap-4 p-3 border-[3px] rounded-lg" style={{
                  backgroundColor: isDark ? 'rgba(34,197,94,0.1)' : '#F0FDF4',
                  borderColor: '#22C55E'
                }}>
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg font-black text-lg" style={{ backgroundColor: '#22C55E', color: 'white' }}>
                    2
                  </div>
                  <div className="flex-1">
                    <div className="font-bold" style={{ color: '#14532D' }}>第2次认识</div>
                    <div className="text-sm" style={{ color: '#22C55E' }}>15天后复习</div>
                  </div>
                  <CheckCircle className="w-5 h-5" style={{ color: '#22C55E' }} />
                </div>

                {/* 第3次+认识 */}
                <div className="flex items-center gap-4 p-3 border-[3px] rounded-lg" style={{
                  backgroundColor: isDark ? 'rgba(139,92,246,0.1)' : '#F5F3FF',
                  borderColor: '#8B5CF6'
                }}>
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg font-black text-lg" style={{ backgroundColor: '#8B5CF6', color: 'white' }}>
                    3+
                  </div>
                  <div className="flex-1">
                    <div className="font-bold" style={{ color: '#5B21B6' }}>第3次及以上认识</div>
                    <div className="text-sm" style={{ color: '#8B5CF6' }}>30天后复习（长期记忆）</div>
                  </div>
                  <CheckCircle className="w-5 h-5" style={{ color: '#8B5CF6' }} />
                </div>
              </div>

              <div className="mt-4 p-3 border-[2px] border-black rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                  ⚡ 进度公式：第N次认识 → intervals[min(N-1, 2)]天后复习
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 为什么模糊会重置 */}
        <div className="p-6 border-[3px] border-black rounded-lg" style={{
          backgroundColor: 'var(--card-bg)',
          boxShadow: '4px_4px_0px_0px_rgba(0,0,0,0.3)'
        }}>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg flex-shrink-0" style={{ backgroundColor: '#EF4444' }}>
              <AlertTriangle className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-black mb-3" style={{ color: 'var(--text-primary)' }}>
                为什么标记"模糊/不认识"会重置间隔？
              </h2>
              <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
                当您标记单词为<strong>"模糊"</strong>或<strong>"不认识"</strong>时，说明记忆不够牢固，系统会：
              </p>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 border-[2px] border-black rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  <div className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold" style={{ backgroundColor: '#F97316', color: 'white' }}>1</div>
                  <div>
                    <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>重置复习次数</div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>review_count 归零，相当于重新开始学习</div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 border-[2px] border-black rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  <div className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold" style={{ backgroundColor: '#F97316', color: 'white' }}>2</div>
                  <div>
                    <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>缩短复习间隔</div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>下次复习时间调整为7天后（重新开始7→15→30循环）</div>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 border-[2px] border-black rounded-lg" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                  <div className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold" style={{ backgroundColor: '#F97316', color: 'white' }}>3</div>
                  <div>
                    <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>增加复习频率</div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>让未掌握的单词更快出现，加强记忆痕迹</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 border-[3px] rounded-lg" style={{
                backgroundColor: isDark ? 'rgba(59,130,246,0.1)' : '#EFF6FF',
                borderColor: '#3B82F6'
              }}>
                <p className="text-xs" style={{ color: '#1E40AF' }}>
                  💡 <strong>科学依据：</strong>当记忆模糊时，需要立即强化才能巩固。延迟复习会导致记忆完全消失，需要重新学习，效率更低。
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 如何高效利用 */}
        <div className="p-6 border-[3px] border-black rounded-lg" style={{
          backgroundColor: 'var(--card-bg)',
          boxShadow: '4px_4px_0px_0px_#B4F416'
        }}>
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg flex-shrink-0" style={{ backgroundColor: '#8B5CF6' }}>
              <Target className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-black mb-3" style={{ color: 'var(--text-primary)' }}>
                如何高效利用记忆曲线？
              </h2>
              <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
                遵循以下原则，让记忆效果最大化：
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-4 border-[3px] rounded-lg" style={{
                  backgroundColor: isDark ? 'rgba(34,197,94,0.1)' : '#F0FDF4',
                  borderColor: '#22C55E'
                }}>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4" style={{ color: '#22C55E' }} />
                    <div className="font-bold" style={{ color: '#14532D' }}>诚实标记</div>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    真正认识才标"认识"，模糊就标"模糊"，系统才能精准安排复习
                  </p>
                </div>

                <div className="p-4 border-[3px] rounded-lg" style={{
                  backgroundColor: isDark ? 'rgba(59,130,246,0.1)' : '#EFF6FF',
                  borderColor: '#3B82F6'
                }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4" style={{ color: '#3B82F6' }} />
                    <div className="font-bold" style={{ color: '#1E40AF' }}>每日坚持</div>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    每天完成学习任务，保持记忆连续性，避免遗忘积累
                  </p>
                </div>

                <div className="p-4 border-[3px] rounded-lg" style={{
                  backgroundColor: isDark ? 'rgba(139,92,246,0.1)' : '#F5F3FF',
                  borderColor: '#8B5CF6'
                }}>
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4" style={{ color: '#8B5CF6' }} />
                    <div className="font-bold" style={{ color: '#5B21B6' }}>多元学习</div>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    卡片、默写、肌肉记忆多种模式结合，多维度强化记忆
                  </p>
                </div>

                <div className="p-4 border-[3px] rounded-lg" style={{
                  backgroundColor: isDark ? 'rgba(249,115,22,0.1)' : '#FFF7ED',
                  borderColor: '#F97316'
                }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4" style={{ color: '#F97316' }} />
                    <div className="font-bold" style={{ color: '#9A3412' }}>及时复习</div>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    优先完成今日复习任务，复习比新学更重要（艾宾浩斯核心）
                  </p>
                </div>
              </div>

              <div className="mt-4 p-4 border-[3px] border-black rounded-lg" style={{
                backgroundColor: '#B4F416'
              }}>
                <p className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                  🎯 最佳实践：
                </p>
                <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                  每天学习30分钟，新学20个+复习30个，坚持3个月可以牢固掌握3000+核心词汇！
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 总结 */}
        <div className="p-6 border-[3px] border-black rounded-lg text-center" style={{
          backgroundColor: '#B4F416',
          boxShadow: '6px_6px_0px_0px_rgba(0,0,0,0.4)'
        }}>
          <Brain className="w-12 h-12 mx-auto mb-3" style={{ color: 'black' }} />
          <h3 className="text-2xl font-black mb-2" style={{ color: 'black' }}>
            记忆曲线 = 科学复习
          </h3>
          <p className="text-sm mb-4" style={{ color: 'black' }}>
            系统会自动安排您在最需要复习的时候复习，让每一分钟都花在刀刃上。
            <br />您只需要<strong>诚实标记、每日坚持</strong>，剩下的交给系统！
          </p>
          <button
            onClick={() => router.back()}
            className="px-6 py-2.5 font-black border-[3px] border-black rounded-lg hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] transition-all"
            style={{ backgroundColor: 'white', color: 'black' }}
          >
            开始学习 🚀
          </button>
        </div>

      </div>
    </div>
  )
}
