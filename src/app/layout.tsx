import type { Metadata } from "next";
import { Fredoka, Nunito } from "next/font/google";
import "./globals.css";

// SKILL typography.csv line 6: Playful Creative for Educational apps
// Fredoka for headings (Display) + Nunito for body (Sans)
const fredoka = Fredoka({
  weight: ['400', '500', '600', '700'],
  subsets: ["latin"],
  variable: "--font-fredoka",
  display: 'swap',
});

const nunito = Nunito({
  weight: ['400', '500', '600', '700', '800'],
  subsets: ["latin"],
  variable: "--font-nunito",
  display: 'swap',
});

export const metadata: Metadata = {
  title: "小语笔记 - 英语学习平台",
  description: "小语笔记 - 智能英语单词学习平台，采用 Claymorphism 设计风格",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={`${nunito.variable} ${fredoka.variable}`}>
      <body className={`${nunito.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}
