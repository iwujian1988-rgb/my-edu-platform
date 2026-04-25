// 🔧 日志控制（必须在最前面引入）
import '@/lib/disable-logs'

import type { Metadata } from "next";
import "./globals.css";
import { SoundEffects } from "@/components/SoundEffects";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { InstallPWAButton } from "@/components/InstallPWAButton";

export const metadata: Metadata = {
  title: "MAX笔记 - AI智能外语学习平台",
  description: "MAX笔记 - AI驱动的智能外语学习平台，支持英语、日语、法语等多语种，提供视频学习、跟读练习、听写训练、智能知识点卡片等沉浸式学习体验",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.png",
    shortcut: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        {/* 🔥 防止主题闪烁：在页面渲染前就设置正确的主题 */}
        {/* 清理残留 Service Worker：旧 Workbox SW 拦截 API 请求导致手机端超时 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(rs) {
                  rs.forEach(function(r) { r.unregister(); });
                });
              }
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const themeMode = localStorage.getItem('themeMode') || 'auto';
                  const hour = new Date().getHours();
                  const isNight = hour >= 18 || hour < 6;
                  const isDark = themeMode === 'dark' || (themeMode === 'auto' && isNight);

                  if (isDark) {
                    document.documentElement.classList.add('dark');
                    document.documentElement.style.setProperty('--bg-primary', '#111827');
                    document.documentElement.style.setProperty('--bg-secondary', '#1f2937');
                    document.documentElement.style.setProperty('--bg-tertiary', '#374151');
                    document.documentElement.style.setProperty('--text-primary', '#f9fafb');
                    document.documentElement.style.setProperty('--text-secondary', '#d1d5db');
                    document.documentElement.style.setProperty('--text-tertiary', '#9ca3af');
                    document.documentElement.style.setProperty('--accent', '#818cf8');
                    document.documentElement.style.setProperty('--border', '#374151');
                    document.documentElement.style.setProperty('--card-bg', '#1f2937');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {
                  console.error('Theme init error:', e);
                }
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <ThemeProvider>
          <SoundEffects />
          <LoadingOverlay />
          {children}
          <InstallPWAButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
