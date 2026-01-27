/**
 * 隐私协议和用户协议页面
 * 包含隐私政策和用户协议两部分内容
 * 遵循项目 Neo-Brutalism 设计风格
 */

import Link from 'next/link'
import { ArrowLeft, Shield, FileText, Mail, AlertCircle } from 'lucide-react'
import { Suspense } from 'react'

// 强制动态渲染，避免预渲染问题
export const dynamic = 'force-dynamic'

function PrivacyContent() {
  return (
    <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="max-w-4xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-3 px-6 py-4 bg-[#CCFF00] border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_#000]">
            <Shield className="w-8 h-8" strokeWidth={2.5} />
            <h1 className="text-3xl md:text-4xl font-black text-black">
              Privacy & Terms
            </h1>
          </div>
          <p className="mt-4 text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>
            隐私政策与用户协议 · 最后更新：2026年1月20日
          </p>
        </div>

        {/* 第一部分：隐私政策 */}
        <section className="mb-8">
          <div className="border-2 border-black rounded-xl shadow-[6px_6px_0px_0px_#000] overflow-hidden" style={{ backgroundColor: 'var(--card-bg)' }}>
            {/* 标题栏 */}
            <div className="flex items-center gap-3 p-6 border-b-2 border-black bg-[#CCFF00]">
              <FileText className="w-6 h-6" strokeWidth={2.5} />
              <h2 className="text-2xl font-black text-black">隐私政策</h2>
            </div>

            {/* 内容 */}
            <div className="p-6 space-y-6">
              {/* 引言 */}
              <div>
                <h3 className="text-xl font-black mb-3" style={{ color: 'var(--text-primary)' }}>引言</h3>
                <div className="p-4 border-2 border-black rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <p className="text-sm font-bold leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
                    欢迎使用 <span className="text-black bg-[#CCFF00] px-2 py-0.5 rounded">MAX自习室</span>（以下简称"本应用"或"本服务"）。本服务由 MAX自习室（以下简称"开发者"或"我们"）独立开发并运营。
                  </p>
                  <p className="text-sm font-bold leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    我们深知个人信息对您的重要性，并会尽全力保护您的个人信息安全可靠。本政策旨在向您说明，在使用本服务时，我们如何收集、使用、存储您的信息。
                  </p>
                </div>
              </div>

              {/* 一、我们收集的信息及用途 */}
              <div>
                <h3 className="text-xl font-black mb-3" style={{ color: 'var(--text-primary)' }}>一、我们收集的信息及用途</h3>
                <p className="text-sm font-bold mb-4" style={{ color: 'var(--text-secondary)' }}>
                  作为个人开发者，我们遵循<span className="bg-[#CCFF00] text-black px-2 py-0.5 rounded">"最小化收集"</span>原则，仅收集提供服务所必需的信息：
                </p>

                {/* 设备与日志信息 */}
                <div className="mb-4 p-4 border-2 border-black rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <h4 className="font-black text-base mb-2" style={{ color: 'var(--text-primary)' }}>1. 设备与日志信息</h4>
                  <p className="text-sm font-bold leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    为了保障服务的正常运行和网络安全，服务器会自动记录您的IP地址、访问日期、浏览器类型等日志信息。这是互联网服务的标准技术要求。
                  </p>
                </div>

                {/* 用户主动提供的信息 */}
                <div className="mb-4 p-4 border-2 border-black rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <h4 className="font-black text-base mb-2" style={{ color: 'var(--text-primary)' }}>2. 用户主动提供的信息</h4>
                  <ul className="list-disc list-inside text-sm font-bold space-y-1" style={{ color: 'var(--text-secondary)' }}>
                    <li>账号信息：如果您选择注册（如有），我们可能会收集您的电子邮箱或手机号码（用于接收验证码）。</li>
                    <li>反馈信息：当您通过邮件或后台反馈问题时，我们会收集您的联系方式和反馈内容，以便与您沟通。</li>
                  </ul>
                </div>

                {/* 第三方服务收集的信息 */}
                <div className="p-4 border-2 border-black rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <h4 className="font-black text-base mb-2" style={{ color: 'var(--text-primary)' }}>3. 第三方服务收集的信息</h4>
                  <p className="text-sm font-bold leading-relaxed mb-2" style={{ color: 'var(--text-secondary)' }}>
                    本服务可能集成了第三方SDK（如：微信登录、支付宝支付、友盟统计等）。这些第三方可能会收集您的设备信息（如IMEI/IDFA）、网络状态等。
                  </p>
                  <p className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                    [请在此处列出您使用的关键第三方服务]
                  </p>
                </div>
              </div>

              {/* 二、信息的存储与保护 */}
              <div>
                <h3 className="text-xl font-black mb-3" style={{ color: 'var(--text-primary)' }}>二、信息的存储与保护</h3>
                <div className="space-y-3">
                  <div className="p-3 border-2 border-black rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                    <p className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>
                      <span className="text-black bg-[#CCFF00] px-2 py-0.5 rounded mr-2">存储地点</span>
                      我们收集的个人信息将存储在中华人民共和国境内的服务器上。
                    </p>
                  </div>
                  <div className="p-3 border-2 border-black rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                    <p className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>
                      <span className="text-black bg-[#CCFF00] px-2 py-0.5 rounded mr-2">存储期限</span>
                      我们仅在提供服务所需的期限内保留您的数据。如果您注销账号或本服务停止运营，我们将及时删除您的个人信息。
                    </p>
                  </div>
                  <div className="p-3 border-2 border-black rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                    <p className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>
                      <span className="text-black bg-[#CCFF00] px-2 py-0.5 rounded mr-2">安全保护</span>
                      尽管作为个人开发者资源有限，但我们会采取合理的技术手段（如HTTPS加密传输）来保护您的数据安全。
                    </p>
                  </div>
                </div>
              </div>

              {/* 三、您的权利 */}
              <div>
                <h3 className="text-xl font-black mb-3" style={{ color: 'var(--text-primary)' }}>三、您的权利</h3>
                <div className="space-y-3">
                  <div className="p-3 border-2 border-black rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                    <p className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>
                      <span className="text-black bg-[#CCFF00] px-2 py-0.5 rounded mr-2">查询与更正</span>
                      您可以通过应用内的设置页面查询或修改您的基本信息。
                    </p>
                  </div>
                  <div className="p-3 border-2 border-black rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                    <p className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>
                      <span className="text-black bg-[#CCFF00] px-2 py-0.5 rounded mr-2">账号注销</span>
                      您有权随时注销账号。您可以通过 [设置-注销账号] 功能自助注销，或发送邮件至 imwujianfei@163.com 申请注销。注销后，您的数据将被删除或匿名化。
                    </p>
                  </div>
                </div>
              </div>

              {/* 四、联系我们 */}
              <div>
                <h3 className="text-xl font-black mb-3" style={{ color: 'var(--text-primary)' }}>四、联系我们</h3>
                <div className="flex items-start gap-3 p-4 bg-[#CCFF00] border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_#000]">
                  <Mail className="w-5 h-5 flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                  <div>
                    <p className="text-sm font-bold mb-1 text-black">如果您对本隐私政策有任何疑问，请联系开发者：</p>
                    <p className="text-base font-black text-black">imwujianfei@163.com</p>
                    <p className="text-xs font-bold mt-1 text-black">我们将在15个工作日内予以回复</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 第二部分：用户协议 */}
        <section className="mb-8">
          <div className="border-2 border-black rounded-xl shadow-[6px_6px_0px_0px_#000] overflow-hidden" style={{ backgroundColor: 'var(--card-bg)' }}>
            {/* 标题栏 */}
            <div className="flex items-center gap-3 p-6 border-b-2 border-black bg-[#CCFF00]">
              <FileText className="w-6 h-6" strokeWidth={2.5} />
              <h2 className="text-2xl font-black text-black">用户协议</h2>
            </div>

            {/* 内容 */}
            <div className="p-6 space-y-6">
              {/* 一、特别提示 */}
              <div>
                <h3 className="text-xl font-black mb-3" style={{ color: 'var(--text-primary)' }}>一、特别提示</h3>
                <div className="space-y-3">
                  <div className="p-3 border-2 border-black rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                    <p className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>
                      本协议是您（用户）与开发者（MAX自习室）之间关于使用 MAX自习室 所订立的协议。
                    </p>
                  </div>
                  <div className="p-3 border-2 border-black rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                    <p className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>
                      本服务为个人开发作品，受限于开发者的精力和资源，我们无法保证服务永远不中断或完全没有错误。
                    </p>
                  </div>
                  <div className="p-3 border-2 border-black rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                    <p className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>
                      您使用本服务即视为您已阅读并同意受本协议的约束。
                    </p>
                  </div>
                </div>
              </div>

              {/* 二、服务内容与变更 */}
              <div>
                <h3 className="text-xl font-black mb-3" style={{ color: 'var(--text-primary)' }}>二、服务内容与变更</h3>
                <div className="space-y-3">
                  <div className="p-3 border-2 border-black rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                    <p className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>
                      MAX自习室的具体服务内容由开发者根据实际情况提供（例如：线上自习室功能、专注计时、数据统计等）。
                    </p>
                  </div>
                  <div className="p-3 border-2 border-black rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                    <p className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>
                      <span className="text-black bg-[#CCFF00] px-2 py-0.5 rounded mr-2">服务变更与终止</span>
                      鉴于个人项目的特殊性，开发者保留随时修改、中断或终止服务（包括收费服务）的权利。
                    </p>
                  </div>
                  <div className="p-3 border-2 border-black rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                    <p className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>
                      对于免费服务，开发者无需通知即可暂停或终止。
                    </p>
                  </div>
                  <div className="p-3 border-2 border-black rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                    <p className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>
                      对于付费服务（如有），若终止服务，开发者将尽力通过公告等形式提前通知，并处理相关善后事宜。
                    </p>
                  </div>
                </div>
              </div>

              {/* 三、用户行为规范 */}
              <div>
                <h3 className="text-xl font-black mb-3" style={{ color: 'var(--text-primary)' }}>三、用户行为规范</h3>
                <div className="p-4 border-2 border-black rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <p className="text-sm font-bold mb-3" style={{ color: 'var(--text-secondary)' }}>
                    您在使用本服务时，必须遵守中华人民共和国相关法律法规。严禁利用本服务进行以下活动：
                  </p>
                  <ul className="list-disc list-inside text-sm font-bold space-y-2" style={{ color: 'var(--text-secondary)' }}>
                    <li>发布、传送、传播、储存违反国家法律法规的内容（如：色情、暴力、赌博、政治敏感信息等）</li>
                    <li>侵犯他人知识产权、肖像权、隐私权等合法权益</li>
                    <li>进行任何可能对互联网正常运转造成不利影响的行为（如：DDoS攻击、恶意扫描）</li>
                  </ul>
                  <div className="mt-3 p-3 bg-black/5 border-l-4 border-black">
                    <p className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
                      若您违反上述规定，开发者有权立即暂停或终止对您的服务，并保存相关记录向有关部门报告。
                    </p>
                  </div>
                </div>
              </div>

              {/* 四、知识产权 */}
              <div>
                <h3 className="text-xl font-black mb-3" style={{ color: 'var(--text-primary)' }}>四、知识产权</h3>
                <div className="space-y-3">
                  <div className="p-3 border-2 border-black rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                    <p className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>
                      MAX自习室的所有代码、UI设计、Logo、文字内容等知识产权均归开发者所有（用户自行发布的内容除外）。
                    </p>
                  </div>
                  <div className="p-3 border-2 border-black rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                    <p className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>
                      未经开发者书面许可，任何人不得对本应用进行反向工程、反向汇编或通过爬虫技术抓取数据。
                    </p>
                  </div>
                </div>
              </div>

              {/* 五、免责声明 */}
              <div>
                <h3 className="text-xl font-black mb-3" style={{ color: 'var(--text-primary)' }}>五、免责声明</h3>
                <div className="flex items-start gap-3 p-4 border-2 border-black rounded-lg bg-[#CCFF00]/20" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-black mb-1" style={{ color: 'var(--text-primary)' }}>"按原样"提供</p>
                      <p className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>
                        本服务按"现状"和"可获得"的状态提供。开发者不保证服务一定能满足您的要求，也不保证服务不会中断。
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-black mb-1" style={{ color: 'var(--text-primary)' }}>数据安全</p>
                      <p className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>
                        虽然我们会尽力保护数据，但对于因不可抗力、黑客攻击、系统不稳定等原因导致的数据丢失或泄露，开发者在法律允许的范围内免责。建议您自行备份重要数据。
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 六、法律适用 */}
              <div>
                <h3 className="text-xl font-black mb-3" style={{ color: 'var(--text-primary)' }}>六、法律适用</h3>
                <div className="space-y-3">
                  <div className="p-3 border-2 border-black rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                    <p className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>
                      本协议适用中华人民共和国法律。
                    </p>
                  </div>
                  <div className="p-3 border-2 border-black rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                    <p className="text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>
                      如发生争议，双方应友好协商解决；协商不成的，任何一方均可向开发者所在地人民法院提起诉讼。
                    </p>
                  </div>
                </div>
              </div>

              {/* 七、联系方式 */}
              <div>
                <h3 className="text-xl font-black mb-3" style={{ color: 'var(--text-primary)' }}>七、联系方式</h3>
                <div className="p-4 border-2 border-black rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                  <p className="text-sm font-bold mb-2" style={{ color: 'var(--text-secondary)' }}>
                    如您对本协议有任何疑问，请联系：
                  </p>
                  <p className="text-base font-black" style={{ color: 'var(--text-primary)' }}>
                    购买渠道官方客服
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 返回首页按钮 */}
        <div className="flex justify-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#CCFF00] border-2 border-black text-black rounded-xl hover:shadow-[6px_6px_0px_0px_#000] hover:-translate-x-[6px] hover:-translate-y-[6px] transition-all font-black text-lg shadow-[4px_4px_0px_0px_#000] active:translate-x-0 active:translate-y-0 active:shadow-none"
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
            返回首页
          </Link>
        </div>

        {/* 底部信息 */}
        <div className="mt-8 text-center">
          <p className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>
            © 2026 MAX自习室 · 版本生效日期：2026年1月20日
          </p>
        </div>
      </div>
    </div>
  )
}

export default function PrivacyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <p className="text-lg font-bold" style={{ color: 'var(--text-secondary)' }}>加载中...</p>
      </div>
    }>
      <PrivacyContent />
    </Suspense>
  )
}
