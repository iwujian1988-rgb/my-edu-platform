import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FFFBEB" }}>
      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-block mb-8">
            <span
              className="inline-block px-4 py-2 text-sm font-bold border-brutal shadow-brutal bg-[#FFEB3B]"
              style={{ fontSize: "14px" }}
            >
              ✨ 重新定义英语学习
            </span>
          </div>

          {/* Headline */}
          <h1
            className="text-5xl md:text-7xl font-brutal mb-6 leading-tight"
            style={{ fontWeight: 900, letterSpacing: "-0.02em" }}
          >
            Little Language Notes
          </h1>

          {/* Subheadline */}
          <p className="text-xl md:text-2xl mb-8 max-w-2xl mx-auto" style={{ lineHeight: "1.6" }}>
            集"高效录入"、"结构化记忆"、"数据可视化"于一体的<br />
            <span style={{ color: "#22C55E", fontWeight: 700 }}>智能英语学习平台</span>
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <button className="btn-brutal btn-brutal-primary text-lg px-8 py-4">
              开始学习 🚀
            </button>
            <button className="btn-brutal btn-brutal-secondary text-lg px-8 py-4">
              了解更多 →
            </button>
          </div>

          {/* Features Card */}
          <Card className="max-w-3xl mx-auto border-brutal shadow-brutal rounded-brutal p-8 bg-white">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-2xl font-brutal mb-2">
                核心特色
              </CardTitle>
              <CardDescription className="text-base">
                为什么选择小语笔记？
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6 text-left">
                {/* Feature 1 */}
                <div className="space-y-2">
                  <div className="inline-block px-3 py-1 border-brutal bg-[#22C55E] text-white text-sm font-bold">
                    🎯 结构化记忆
                  </div>
                  <p className="text-sm" style={{ lineHeight: "1.6" }}>
                    科学的复习算法，基于艾宾浩斯遗忘曲线优化学习效果
                  </p>
                </div>

                {/* Feature 2 */}
                <div className="space-y-2">
                  <div className="inline-block px-3 py-1 border-brutal bg-[#2196F3] text-white text-sm font-bold">
                    📊 数据可视化
                  </div>
                  <p className="text-sm" style={{ lineHeight: "1.6" }}>
                    生词日历、学习进度分析，让学习成果一目了然
                  </p>
                </div>

                {/* Feature 3 */}
                <div className="space-y-2">
                  <div className="inline-block px-3 py-1 border-brutal bg-[#FFEB3B] text-black text-sm font-bold">
                    🎮 游戏化学习
                  </div>
                  <p className="text-sm" style={{ lineHeight: "1.6" }}>
                    听写、消消乐、卡片背单词等多种练习模式
                  </p>
                </div>

                {/* Feature 4 */}
                <div className="space-y-2">
                  <div className="inline-block px-3 py-1 border-brutal bg-[#EF4444] text-white text-sm font-bold">
                    🔄 多端同步
                  </div>
                  <p className="text-sm" style={{ lineHeight: "1.6" }}>
                    WebSocket 实时同步学习进度，随时随地无缝衔接
                  </p>
                </div>

                {/* Feature 5 */}
                <div className="space-y-2">
                  <div className="inline-block px-3 py-1 border-brutal bg-[#CBA6F7] text-white text-sm font-bold">
                    🤖 智能录入
                  </div>
                  <p className="text-sm" style={{ lineHeight: "1.6" }}>
                    API 自动匹配单词释义、音标，500词/日智能配额
                  </p>
                </div>

                {/* Feature 6 */}
                <div className="space-y-2">
                  <div className="inline-block px-3 py-1 border-brutal bg-[#76E0C2] text-black text-sm font-bold">
                    ⚡ 高效学习
                  </div>
                  <p className="text-sm" style={{ lineHeight: "1.6" }}>
                    Web Speech API 发音，虚拟列表优化，秒级响应
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Version Badge */}
          <div className="mt-12">
            <span
              className="inline-block px-4 py-2 text-sm font-bold border-brutal shadow-brutal"
              style={{ backgroundColor: "#22C55E", color: "white" }}
            >
              v3.2.1
            </span>
          </div>

          {/* Tech Stack */}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {["Next.js 16", "TypeScript", "Tailwind CSS", "Supabase", "React 19"].map((tech) => (
              <span
                key={tech}
                className="px-3 py-1 text-xs font-bold border-brutal shadow-brutal bg-white"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-brutal border-t py-6 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm font-bold">
            © 2024 小语笔记. All rights reserved.
          </p>
          <p className="text-xs mt-2" style={{ color: "#6B7280" }}>
            Made with ❤️ for English learners worldwide
          </p>
        </div>
      </footer>
    </div>
  );
}
