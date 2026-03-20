# 英语口语视频学习平台 PRD

> **版本**: v1.0
> **日期**: 2026-03-16
> **作者**: 外语学习专家组 + 产品架构团队
> **状态**: 评审中

---

## 文档目录

1. [执行摘要](#一执行摘要)
2. [市场分析](#二市场分析)
3. [竞品深度分析](#三竞品深度分析)
4. [产品定位](#四产品定位)
5. [核心功能规划](#五核心功能规划)
6. [技术架构设计](#六技术架构设计)
7. [内容生产方案](#七内容生产方案)
8. [成本与收益模型](#八成本与收益模型)
9. [风险与应对](#九风险与应对)
10. [路线图](#十路线图)

---

## 一、执行摘要

### 1.1 产品愿景

打造一个**基于真实视频内容的沉浸式英语口语学习平台**，通过 YouTube Vlog 等真实语境素材，帮助用户掌握地道、实用的口语表达，实现从"能看懂"到"能说出来"的跨越。

### 1.2 核心价值主张

| 维度 | 传统方案 | 我们的方案 |
|------|---------|-----------|
| **内容来源** | 教材/课程录制 | 真实 YouTube Vlog |
| **学习重点** | 语法+词汇 | 地道表达+口语场景 |
| **学习方式** | 被动观看 | 互动练习+录音跟读 |
| **内容深度** | 翻译为主 | 结构解析+举一反三 |
| **个性化** | 统一进度 | 标记掌握+智能复习 |

### 1.3 关键指标

| 指标 | Year 1 目标 |
|------|------------|
| 付费用户 | 5,000 人 |
| 内容数量 | 200+ 视频 |
| 用户留存（30天） | 40% |
| 完课率 | 25% |
| MRR | ¥25 万 |

---

## 二、市场分析

### 2.1 市场规模

| 维度 | 数据 |
|------|------|
| 中国英语学习人群 | 3-4 亿 |
| 在线英语教育市场 | 800 亿/年 |
| 口语学习细分市场 | 150 亿/年 |
| 目标用户（18-35岁白领/学生） | 5000 万 |

### 2.2 用户画像

#### 主要用户群体

```
┌─────────────────────────────────────────────────────────────┐
│                      目标用户画像                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  👩‍💼 职场白领 (40%)                                          │
│  ├── 年龄: 25-35 岁                                         │
│  ├── 痛点: 需要商务英语、会议沟通                            │
│  ├── 场景: 午休、通勤、晚上                                  │
│  └── 支付能力: 强 (愿意付 ¥99-299)                          │
│                                                             │
│  🎓 大学生 (35%)                                             │
│  ├── 年龄: 18-24 岁                                         │
│  ├── 痛点: 雅思/托福口语、日常交流                          │
│  ├── 场景: 宿舍、图书馆、碎片时间                            │
│  └── 支付能力: 中等 (愿意付 ¥49-99)                         │
│                                                             │
│  🌍 准备出国 (15%)                                           │
│  ├── 年龄: 22-40 岁                                         │
│  ├── 痛点: 生活场景口语、文化适应                            │
│  ├── 场景: 晚上集中学习                                      │
│  └── 支付能力: 强 (愿意付 ¥199-499)                         │
│                                                             │
│  👨‍💻 程序员/互联网人 (10%)                                   │
│  ├── 年龄: 23-35 岁                                         │
│  ├── 痛点: 技术英语、远程会议                                │
│  ├── 场景: 碎片时间                                          │
│  └── 支付能力: 强                                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 用户核心痛点

| 痛点 | 严重程度 | 当前解决方案 |
|------|---------|-------------|
| 学了不会用 | ⭐⭐⭐⭐⭐ | 背单词、刷题 |
| 口语不地道 | ⭐⭐⭐⭐⭐ | 跟读教材录音 |
| 缺乏真实语境 | ⭐⭐⭐⭐ | 看美剧（效率低）|
| 无法坚持 | ⭐⭐⭐⭐ | 打卡类产品 |
| 不知道学什么 | ⭐⭐⭐ | 各种课程 |

---

## 三、竞品深度分析

### 3.1 竞品概述

| 竞品 | 定位 | 价格 | 用户量 | 核心优势 |
|------|------|------|--------|---------|
| **SpeakVLog** | YouTube 视频口语学习 | ¥49.9 | 1.5万+ | 地道表达解析、录音练习 |
| 流利说 | AI 口语教练 | ¥199/年 | 2000万+ | AI 评分、游戏化 |
| 多邻国 | 趣味学习 | 免费/订阅 | 5亿+ | 游戏化、碎片化 |
| 扇贝听力 | 听力训练 | ¥99 | 500万+ | 内容丰富 |

### 3.2 SpeakVLog 深度拆解

> 基于代码分析 + 账号实测

#### 3.2.1 产品架构

```
┌─────────────────────────────────────────────────────────────┐
│                    SpeakVLog 产品架构                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  前端                                                        │
│  ├── 技术栈: Vite + React 18 + React Router 6              │
│  ├── 样式: 原生 CSS + CSS Variables                         │
│  ├── 状态: React Context                                    │
│  └── 特点: 代码分割、懒加载、PWA                            │
│                                                             │
│  后端                                                        │
│  ├── 技术栈: Python FastAPI                                 │
│  ├── API: api.speakvlog.com                                 │
│  └── 特点: RESTful、JWT 认证                                │
│                                                             │
│  数据存储                                                    │
│  ├── 数据库: Supabase (PostgreSQL)                          │
│  ├── 视频: 腾讯云 CDN (video.speakvlog.com)                 │
│  ├── 录音: 腾讯云 COS (广州)                                │
│  └── 部分旧视频: Cloudflare Stream                          │
│                                                             │
│  第三方服务                                                  │
│  ├── 发音: 有道词典 API (免费)                              │
│  ├── 分析: Google Tag Manager + PostHog                    │
│  └── 支付: (推测) 微信/支付宝个人收款                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 3.2.2 功能模块

| 模块 | 功能 | 完成度 | 亮点 |
|------|------|--------|------|
| **认证系统** | 手机号登录、激活码、多设备管理 | ⭐⭐⭐⭐⭐ | 设备踢出功能 |
| **视频学习** | 视频播放、滚动字幕、进度追踪 | ⭐⭐⭐⭐⭐ | 双源切换（国内/海外）|
| **学习卡片** | 单词、短语、地道表达 | ⭐⭐⭐⭐⭐ | 地道表达是核心差异化 |
| **口语练习** | 跟读录音、回放、离线存储 | ⭐⭐⭐⭐ | IndexedDB 离线队列 |
| **闪卡复习** | 按视频复习、标记掌握 | ⭐⭐⭐⭐ | 移动端手势操作 |
| **收藏系统** | 字幕、单词、短语收藏 | ⭐⭐⭐⭐ | Feed 流展示 |
| **学习追踪** | 日历、统计、记录 | ⭐⭐⭐⭐ | 打卡激励 |
| **管理后台** | 内容管理、用户管理 | ⭐⭐⭐⭐ | SQL 执行器 |

#### 3.2.3 内容结构（核心！）

```
视频内容结构:

1️⃣ 视频基础信息
   ├── title: 标题
   ├── description: 描述（学习价值说明）
   ├── thumbnail_url: 缩略图
   ├── duration: 时长
   ├── difficulty: beginner | intermediate
   ├── creator: 创作者标签 (Kendall Jenner, Vogue, etc.)
   └── topic: 主题标签 (日常生活, 职场经验, etc.)

2️⃣ 字幕数据
   ├── start_time: 开始时间
   ├── end_time: 结束时间
   ├── english_text: 英文字幕
   └── chinese_text: 中文翻译

3️⃣ 单词卡片
   ├── word: 单词
   ├── phonetic: 音标
   ├── chinese_definition: 中文释义
   ├── english_definition: 英文释义
   ├── example_from_video: 视频原句
   ├── example_translation: 原句翻译
   └── user_status: known | unknown | null

4️⃣ 短语卡片
   ├── phrase: 短语
   ├── phonetic: 音标
   ├── chinese_definition: 中文释义
   ├── synonyms: 同义表达
   ├── context: 上下文
   └── context_translation: 上下文翻译

5️⃣ 地道表达（差异化核心！）
   ├── expression: 表达形式 (如 "be craving ...")
   ├── context: 原句
   ├── context_translation: 翻译
   ├── formality_level: neutral | formal | informal
   └── explanation: 结构化解析
       ├── formula: 语法公式
       ├── meaning: 核心含义
       ├── usage_note: 使用说明
       ├── examples: 举一反三（2个例句）
       ├── scenarios: 使用场景
       └── similar_expressions: 相似表达
```

#### 3.2.4 地道表达示例

```json
{
  "expression": "be craving ...",
  "context": "And I was like, I'm craving this for dinner.",
  "context_translation": "我当时就想，我晚饭就想吃这个。",
  "formality_level": "neutral",
  "explanation": {
    "formula": "be craving + 食物/东西",
    "meaning": "当下非常想吃、很想要某样东西",
    "usage_note": "比 I want 更有「馋到了」的身体感，特别适合说宵夜、路过餐厅时突然被勾起的食欲，口语里很自然。",
    "examples": [
      { "en": "I'm craving noodles tonight.", "cn": "我今晚特别想吃面。" },
      { "en": "She's been craving spicy soup all day.", "cn": "她一整天都特别想喝辣汤。" }
    ],
    "scenarios": "突然被某种食物勾起食欲时",
    "similar_expressions": ["really feel like", "be in the mood for"]
  }
}
```

#### 3.2.5 技术亮点

| 亮点 | 实现方式 | 价值 |
|------|---------|------|
| 离线录音队列 | IndexedDB + 后台同步 | 网络不稳定时不影响体验 |
| 双视频源 | 腾讯云 + Cloudflare | 国内外用户都能流畅观看 |
| 有道发音 | 免费 API | 零成本实现发音功能 |
| 区域检测 | IP 判断 + 本地缓存 | 智能选择视频源 |

#### 3.2.6 成本结构

| 项目 | 月成本 | 年成本 |
|------|--------|--------|
| 视频存储 + CDN | ¥200 | ¥2,400 |
| 录音存储 (COS) | ¥10 | ¥120 |
| Supabase | 免费额度内 | ¥0 |
| API 服务器 | ¥200 | ¥2,400 |
| 域名 + 其他 | ¥50 | ¥600 |
| **总计** | **¥460** | **¥5,520** |

#### 3.2.7 商业数据

| 指标 | 数据 |
|------|------|
| 售价 | ¥49.9 |
| 销量 | 15,000+ 份 |
| 总收入 | ~¥75 万 |
| 年成本 | ~¥6 万 |
| 毛利 | ~¥69 万 |
| 毛利率 | **92%** |

#### 3.2.8 关键发现

```
✅ 做得好的：
1. 地道表达的内容质量极高（结构化解析 + 举一反三）
2. 视频分类清晰（创作者 + 主题标签）
3. 成本控制优秀（腾讯云为主）
4. 离线体验好（录音队列）

❌ 可以改进的：
1. 没有个性化推荐
2. 没有社交功能
3. 复习系统较弱（只有闪卡）
4. 没有口语评分

💡 我们的机会：
1. 更好的复习算法（艾宾浩斯）
2. AI 口语评分
3. 社区功能（学习小组）
4. 更精细的内容分类
```

---

## 四、产品定位

### 4.1 定位声明

**面向 18-35 岁英语学习者**，提供**基于真实视频的沉浸式口语学习体验**，通过**地道表达解析 + 跟读练习 + 智能复习**的闭环，帮助用户掌握**真正能说出来的英语**。

### 4.2 差异化策略

| 维度 | SpeakVLog | 我们 |
|------|-----------|------|
| 内容深度 | 地道表达解析 | 地道表达 + **AI 举一反三** |
| 复习系统 | 手动闪卡 | **艾宾浩斯智能复习** |
| 口语练习 | 录音回放 | 录音 + **AI 评分** |
| 个性化 | 无 | **基于掌握程度的推荐** |
| 社交 | 无 | **学习小组 + 排行榜** |
| 定价 | ¥49.9 | ¥99/年（更可持续）|

### 4.3 MVP 范围

```
Phase 1 (MVP) - 3 个月
├── ✅ 视频学习 + 滚动字幕
├── ✅ 单词/短语/地道表达卡片
├── ✅ 录音跟读功能
├── ✅ 学习进度追踪
├── ✅ 激活码系统
└── ✅ 管理后台

Phase 2 - +2 个月
├── 🔄 智能复习算法
├── 🔄 AI 口语评分
└── 🔄 移动端优化

Phase 3 - +3 个月
├── 📋 个性化推荐
├── 📋 学习社区
└── 📋 订阅制转型
```

---

## 五、核心功能规划

### 5.1 功能架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        产品功能架构                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  用户端                                                          │
│  ├── 🎬 视频学习模块                                             │
│  │   ├── 视频播放器 (Cloudflare/腾讯云)                         │
│  │   ├── 滚动字幕 (时间轴同步)                                   │
│  │   ├── 字幕点击查词                                           │
│  │   └── 进度保存                                               │
│  │                                                              │
│  ├── 📚 学习卡片模块                                             │
│  │   ├── 单词卡片 (音标/释义/例句)                               │
│  │   ├── 短语卡片 (搭配/同义)                                   │
│  │   ├── 地道表达 (结构解析/举一反三) ← 核心差异化               │
│  │   └── 掌握标记 (认识/不认识)                                 │
│  │                                                              │
│  ├── 🎤 口语练习模块                                             │
│  │   ├── 跟读录音                                               │
│  │   ├── 录音回放                                               │
│  │   ├── AI 评分 (Phase 2)                                     │
│  │   └── 离线队列                                               │
│  │                                                              │
│  ├── 🗂️ 复习模块                                                │
│  │   ├── 闪卡复习                                               │
│  │   ├── 艾宾浩斯提醒 (Phase 2)                                 │
│  │   └── 错题本                                                 │
│  │                                                              │
│  ├── ⭐ 收藏模块                                                 │
│  │   ├── 字幕收藏                                               │
│  │   ├── 单词收藏                                               │
│  │   └── 收藏 Feed                                              │
│  │                                                              │
│  └── 📊 个人中心                                                 │
│      ├── 学习日历                                               │
│      ├── 学习统计                                               │
│      ├── 学习记录                                               │
│      └── 账户设置                                               │
│                                                                 │
│  管理端                                                          │
│  ├── 📹 视频管理                                                 │
│  │   ├── 视频上传                                               │
│  │   ├── 字幕编辑                                               │
│  │   └── 内容标签                                               │
│  │                                                              │
│  ├── 📝 内容管理                                                 │
│  │   ├── AI 内容生成                                            │
│  │   ├── 卡片编辑                                               │
│  │   └── 批量导入                                               │
│  │                                                              │
│  └── 👥 用户管理                                                 │
│      ├── 用户列表                                               │
│      ├── 激活码管理                                             │
│      └── 数据统计                                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 核心功能详述

#### 5.2.1 视频学习页面

```
页面布局:
┌──────────────────────────────────────────────────────┐
│  [视频播放器]              │  [字幕列表]              │
│                            │                         │
│  ┌────────────────────┐    │  00:00 字幕1            │
│  │                    │    │  00:05 字幕2 (高亮)     │
│  │      Video         │    │  00:10 字幕3            │
│  │                    │    │  00:15 字幕4            │
│  └────────────────────┘    │  ...                    │
│                            │                         │
│  [进度条] [播放/暂停]       │  [录音按钮]             │
└──────────────────────────────────────────────────────┘

交互规则:
1. 字幕自动滚动跟随视频
2. 点击字幕跳转到对应时间
3. 点击单词 → 弹出卡片预览
4. 长按字幕 → 收藏
5. 点击录音 → 录制当前字幕
```

#### 5.2.2 学习卡片设计

**单词卡片:**
```
┌────────────────────────────────────────────┐
│  crave                        [🔊] [⭐]     │
│  /kreɪv/                                   │
│  ──────────────────────────────────────    │
│  v. 很想要；强烈渴望                        │
│                                            │
│  📝 原句:                                   │
│  "And I was like, I'm craving this         │
│   for dinner."                             │
│                                            │
│  🇨🇳 我当时就想，我晚饭就想吃这个。          │
│                                            │
│  [认识] [不认识] [查看更多]                 │
└────────────────────────────────────────────┘
```

**地道表达卡片（核心）:**
```
┌────────────────────────────────────────────┐
│  be craving ...                            │
│  ──────────────────────────────────────    │
│                                            │
│  📝 字幕原句:                               │
│  "And I was like, I'm craving this         │
│   for dinner."                             │
│                                            │
│  💡 结构解析:                               │
│  公式: be craving + 食物/东西              │
│  意思: 当下非常想吃、很想要某样东西         │
│                                            │
│  🔄 举一反三:                               │
│  例1: I'm craving noodles tonight.         │
│      (我今晚特别想吃面。)                   │
│  例2: She's been craving spicy soup.       │
│      (她一整天都特别想喝辣汤。)             │
│                                            │
│  🎯 场景: 突然被某种食物勾起食欲时          │
│                                            │
│  🔄 相似: really feel like / in the mood   │
│                                            │
│  [已掌握] [需要复习]                        │
└────────────────────────────────────────────┘
```

#### 5.2.3 录音功能

```
录音流程:
1. 用户点击字幕旁的录音按钮
2. 播放原音 (可选)
3. 开始录音 (最长 30 秒)
4. 停止录音
5. 自动播放用户录音
6. 可选择: 重录 / 保存 / 对比原音

技术实现:
- MediaRecorder API
- 格式: audio/webm (Chrome) / audio/mp4 (Safari)
- 离线存储: IndexedDB
- 上传: 腾讯云 COS / Supabase Storage
```

---

## 六、技术架构设计

### 6.1 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        技术架构图                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  客户端                                                          │
│  ├── Web (Next.js 14 + React 18)                               │
│  ├── 移动端 Web (响应式)                                        │
│  └── PWA (离线支持)                                             │
│                                                                 │
│  API 层                                                          │
│  ├── Next.js API Routes (主要)                                 │
│  └── Python FastAPI (视频处理/Whisper) ← 可选                   │
│                                                                 │
│  数据层                                                          │
│  ├── Supabase (PostgreSQL + Auth + Storage)                    │
│  └── Redis (缓存/会话) ← 可选                                   │
│                                                                 │
│  存储层                                                          │
│  ├── 视频: 阿里云 VOD / 腾讯云 VOD                              │
│  ├── 录音: Supabase Storage / 阿里云 OSS                       │
│  └── 静态资源: Cloudflare R2 / Vercel                          │
│                                                                 │
│  第三方服务                                                      │
│  ├── AI 内容生成: Claude API                                   │
│  ├── 发音: 有道词典 API (免费)                                  │
│  ├── 支付: 微信/支付宝                                         │
│  └── 分析: PostHog / Google Analytics                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 数据库设计

```sql
-- 用户表
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) UNIQUE,
  email VARCHAR(255) UNIQUE,
  username VARCHAR(50),
  password_hash VARCHAR(255),
  role VARCHAR(20) DEFAULT 'user',
  status VARCHAR(20) DEFAULT 'pending', -- pending/approved/suspended
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ
);

-- 激活码表
CREATE TABLE activation_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE NOT NULL,
  batch_id UUID,
  status VARCHAR(20) DEFAULT 'unused', -- unused/used/disabled
  used_by UUID REFERENCES users(id),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 视频表
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  video_url TEXT, -- CDN 地址
  cloudflare_id VARCHAR(100), -- Cloudflare Stream ID (备用)
  duration INTEGER, -- 秒
  difficulty VARCHAR(20), -- beginner/intermediate/advanced
  status VARCHAR(20) DEFAULT 'draft', -- draft/published
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

-- 字幕表
CREATE TABLE subtitles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  start_time DECIMAL(10,3) NOT NULL, -- 秒，精确到毫秒
  end_time DECIMAL(10,3) NOT NULL,
  english_text TEXT NOT NULL,
  chinese_text TEXT,
  word_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 单词卡片表
CREATE TABLE word_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  subtitle_id UUID REFERENCES subtitles(id),
  word VARCHAR(100) NOT NULL,
  phonetic VARCHAR(100),
  part_of_speech VARCHAR(20),
  chinese_definition TEXT NOT NULL,
  english_definition TEXT,
  example_from_video TEXT,
  example_translation TEXT,
  difficulty_level INTEGER DEFAULT 1, -- 1-5
  first_appearance_time DECIMAL(10,3),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 短语卡片表
CREATE TABLE phrase_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  subtitle_id UUID REFERENCES subtitles(id),
  phrase VARCHAR(255) NOT NULL,
  phonetic VARCHAR(100),
  chinese_definition TEXT NOT NULL,
  synonyms TEXT,
  context TEXT,
  context_translation TEXT,
  difficulty_level INTEGER DEFAULT 1,
  first_appearance_time DECIMAL(10,3),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 地道表达表
CREATE TABLE expression_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  subtitle_id UUID REFERENCES subtitles(id),
  expression VARCHAR(255) NOT NULL,
  context TEXT NOT NULL,
  context_translation TEXT,
  formula TEXT, -- 语法公式
  meaning TEXT, -- 核心含义
  usage_note TEXT, -- 使用说明
  examples JSONB, -- [{en, cn}, {en, cn}]
  scenarios TEXT, -- 使用场景
  similar_expressions TEXT[], -- 相似表达数组
  formality_level VARCHAR(20) DEFAULT 'neutral', -- neutral/formal/informal
  first_appearance_time DECIMAL(10,3),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 用户学习进度表
CREATE TABLE user_learning_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  item_type VARCHAR(20) NOT NULL, -- word/phrase/expression
  item_id UUID NOT NULL,
  status VARCHAR(20), -- known/unknown
  review_count INTEGER DEFAULT 0,
  last_reviewed_at TIMESTAMPTZ,
  next_review_at TIMESTAMPTZ, -- 艾宾浩斯
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, item_type, item_id)
);

-- 视频观看进度表
CREATE TABLE user_video_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  last_position DECIMAL(10,3) DEFAULT 0,
  watch_duration INTEGER DEFAULT 0, -- 累计观看时长(秒)
  max_progress DECIMAL(5,2) DEFAULT 0, -- 最大进度百分比
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, video_id)
);

-- 录音表
CREATE TABLE recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  subtitle_id UUID REFERENCES subtitles(id),
  recording_url TEXT NOT NULL,
  duration DECIMAL(10,3), -- 秒
  file_size INTEGER, -- 字节
  content_type VARCHAR(50), -- audio/webm
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 收藏表
CREATE TABLE user_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  item_type VARCHAR(20) NOT NULL, -- subtitle/word/phrase/expression
  item_id UUID NOT NULL,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, item_type, item_id)
);

-- 学习日历表
CREATE TABLE user_learning_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  learning_date DATE NOT NULL,
  video_count INTEGER DEFAULT 0,
  total_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, learning_date)
);

-- 标签表
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20), -- creator/topic
  category VARCHAR(50),
  color VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 视频标签关联表
CREATE TABLE video_tags (
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (video_id, tag_id)
);

-- 索引
CREATE INDEX idx_subtitles_video ON subtitles(video_id, start_time);
CREATE INDEX idx_word_cards_video ON word_cards(video_id);
CREATE INDEX idx_phrase_cards_video ON phrase_cards(video_id);
CREATE INDEX idx_expression_cards_video ON expression_cards(video_id);
CREATE INDEX idx_user_progress_user ON user_learning_progress(user_id);
CREATE INDEX idx_user_video_progress_user ON user_video_progress(user_id);
```

### 6.3 API 设计

```yaml
# 核心 API 端点

认证:
  POST   /api/auth/register         # 注册
  POST   /api/auth/login            # 登录
  POST   /api/auth/logout           # 退出
  GET    /api/auth/me               # 当前用户
  POST   /api/auth/verify-code/:code # 验证激活码

视频:
  GET    /api/videos                # 视频列表
  GET    /api/videos/:id            # 视频详情
  GET    /api/videos/:id/subtitles  # 视频字幕
  GET    /api/videos/:id/detail     # 视频+字幕

学习内容:
  GET    /api/learning/:videoId/words       # 单词卡片
  GET    /api/learning/:videoId/phrases     # 短语卡片
  GET    /api/learning/:videoId/expressions # 地道表达
  POST   /api/learning/progress             # 更新掌握状态

用户数据:
  GET    /api/user/video-progress    # 视频进度
  POST   /api/user/video-progress/:id # 更新进度
  GET    /api/user/learning-calendar # 学习日历
  GET    /api/user/learning-stats    # 学习统计
  GET    /api/user/favorites         # 收藏列表
  POST   /api/user/favorites         # 添加收藏
  DELETE /api/user/favorites/:id     # 删除收藏

录音:
  POST   /api/recordings             # 上传录音
  GET    /api/recordings             # 录音列表
  GET    /api/recordings/:id         # 录音详情
  DELETE /api/recordings/:id         # 删除录音

管理后台:
  GET    /api/admin/videos           # 视频管理
  POST   /api/admin/videos           # 创建视频
  PUT    /api/admin/videos/:id       # 更新视频
  DELETE /api/admin/videos/:id       # 删除视频
  POST   /api/admin/videos/:id/subtitles # 批量导入字幕
  POST   /api/admin/generate-content # AI 生成内容
  GET    /api/admin/users            # 用户管理
  GET    /api/admin/codes            # 激活码管理
  POST   /api/admin/codes            # 生成激活码
```

---

## 七、内容生产方案

### 7.1 内容来源

| 来源 | 优势 | 劣势 | 推荐度 |
|------|------|------|--------|
| YouTube Vlog | 真实、地道、多样 | 版权风险 | ⭐⭐⭐⭐ |
| 用户上传 | 无版权问题 | 质量不稳定 | ⭐⭐ |
| 自制内容 | 完全可控 | 成本高 | ⭐⭐⭐ |
| 合作创作者 | 原创内容 | 需要分成 | ⭐⭐⭐⭐ |

### 7.2 字幕提取流程

```
YouTube 视频字幕提取:

1. yt-dlp 下载字幕
   ├── 优先官方字幕
   ├── 次选自动字幕
   └── 都没有则 Whisper 转录

2. 字幕解析
   ├── VTT/SRT → JSON
   └── 时间轴对齐

3. 短句优化
   ├── 按语义断句
   ├── 合并碎片
   └── 人工校对

4. 翻译
   ├── DeepL API
   └── 人工校对
```

### 7.3 AI 内容生成

```typescript
// 地道表达生成 Prompt
const EXPRESSION_PROMPT = `
你是一位资深的英语口语教学专家。

从以下字幕中提取 3-6 个最值得学习的地道表达：

字幕：
"""
${subtitles}
"""

输出 JSON 格式：
{
  "expressions": [
    {
      "expression": "表达形式",
      "context": "原句",
      "context_translation": "翻译",
      "formula": "语法公式",
      "meaning": "核心含义",
      "usage_note": "使用说明",
      "examples": [
        {"en": "例句1", "cn": "翻译1"},
        {"en": "例句2", "cn": "翻译2"}
      ],
      "scenarios": "使用场景",
      "similar_expressions": ["相似表达1", "相似表达2"]
    }
  ]
}

要求：
1. 选择口语中常用但教科书少见的表达
2. 解释要简洁但有深度
3. 例句要贴近日常生活
`;
```

### 7.4 内容生产成本

| 内容类型 | 每视频成本 | 200视频成本 |
|---------|-----------|------------|
| 字幕提取 | ¥0 | ¥0 |
| 字幕翻译 | ¥2 (DeepL) | ¥400 |
| AI 内容生成 | ¥0.1 (Claude) | ¥20 |
| 人工校对 | ¥10 (兼职) | ¥2,000 |
| **总计** | **¥12** | **¥2,420** |

---

## 八、成本与收益模型

### 8.1 成本模型

#### 8.1.1 技术成本

| 项目 | 月成本 | 年成本 | 说明 |
|------|--------|--------|------|
| Vercel Pro | $20 | $240 | 前端托管 |
| Supabase Pro | $25 | $300 | 数据库 |
| 阿里云 VOD | ¥200 | ¥2,400 | 视频存储+CDN |
| 阿里云 OSS | ¥50 | ¥600 | 录音存储 |
| Claude API | ¥100 | ¥1,200 | 内容生成 |
| 域名+SSL | ¥10 | ¥120 | |
| **总计** | **¥580** | **¥6,960** | |

#### 8.1.2 运营成本

| 项目 | 月成本 | 年成本 |
|------|--------|--------|
| 内容制作 | ¥2,000 | ¥24,000 |
| 客服支持 | ¥500 | ¥6,000 |
| 营销推广 | ¥3,000 | ¥36,000 |
| **总计** | **¥5,500** | **¥66,000** |

#### 8.1.3 总成本

| 阶段 | 月成本 | 年成本 |
|------|--------|--------|
| MVP (0-6月) | ¥3,000 | ¥36,000 |
| 增长期 (6-12月) | ¥8,000 | ¥96,000 |
| 规模期 (12月+) | ¥20,000 | ¥240,000 |

### 8.2 收益模型

#### 8.2.1 定价策略

| 方案 | 价格 | 目标用户 |
|------|------|---------|
| 单次购买 | ¥99 | 体验用户 |
| 年度会员 | ¥199 | 核心用户 |
| 终身会员 | ¥299 | 忠实用户 |

#### 8.2.2 收入预测

```
Year 1 预测:

Q1 (MVP):
├── 用户: 500
├── 收入: ¥50,000
└── 成本: ¥30,000
    → 净利: ¥20,000

Q2 (增长):
├── 用户: 2,000
├── 收入: ¥200,000
└── 成本: ¥60,000
    → 净利: ¥140,000

Q3 (规模):
├── 用户: 4,000
├── 收入: ¥400,000
└── 成本: ¥100,000
    → 净利: ¥300,000

Q4 (稳定):
├── 用户: 5,000
├── 收入: ¥500,000
└── 成本: ¥120,000
    → 净利: ¥380,000

Year 1 总计:
├── 总收入: ¥1,150,000
├── 总成本: ¥310,000
└── 净利润: ¥840,000 (73% 毛利率)
```

### 8.3 盈亏平衡分析

```
固定成本: ¥8,000/月
平均客单价: ¥150
边际成本: ~¥0 (数字产品)

盈亏平衡点 = 固定成本 / 客单价
           = 8,000 / 150
           = 54 人/月

即每月销售 54 份即可盈亏平衡
```

---

## 九、风险与应对

### 9.1 风险矩阵

| 风险 | 概率 | 影响 | 等级 | 应对措施 |
|------|------|------|------|---------|
| 版权问题 | 中 | 高 | 🔴 | 使用原创/授权内容 |
| 竞品复制 | 高 | 中 | 🟡 | 快速迭代、建立壁垒 |
| 内容质量 | 中 | 高 | 🔴 | 严格审核、AI+人工 |
| 用户流失 | 高 | 中 | 🟡 | 提升体验、社区运营 |
| 技术故障 | 低 | 高 | 🟡 | 高可用架构、备份 |
| 政策风险 | 低 | 高 | 🟡 | 合规运营、备案 |

### 9.2 应对策略

```
版权风险应对:
1. 优先使用 CC 协议内容
2. 与创作者合作获取授权
3. 建立原创内容库
4. 用户生成内容 (UGC)

竞争壁垒构建:
1. 内容质量（地道表达解析深度）
2. 学习效果（艾宾浩斯 + AI 评分）
3. 用户粘性（社区 + 排行榜）
4. 数据积累（用户学习数据）
```

---

## 十、路线图

### 10.1 产品路线图

```
2026 Q2 (4-6月) - MVP
├── Week 1-2: 技术架构搭建
├── Week 3-4: 核心功能开发
├── Week 5-6: 内容生产流程
├── Week 7-8: 内测 + 修复
├── Week 9-10: 20 个视频内容
├── Week 11-12: 正式上线
└── 里程碑: MVP 上线，首批 100 用户

2026 Q3 (7-9月) - 增长
├── 内容扩充到 100 个视频
├── 移动端优化
├── 智能复习算法
├── AI 口语评分 (Beta)
├── 小红书投放
└── 里程碑: 2,000 付费用户

2026 Q4 (10-12月) - 规模
├── 内容扩充到 200 个视频
├── 学习社区功能
├── 个性化推荐
├── 订阅制转型
├── B 端合作
└── 里程碑: 5,000 付费用户

2027 Q1 - 变现
├── 企业版
├── API 开放
├── 品牌合作
└── 里程碑: 盈利
```

### 10.2 团队配置

```
MVP 阶段 (3人):
├── 产品 + 前端: 1人
├── 后端 + 运维: 1人
└── 内容运营: 1人

增长阶段 (5人):
├── 产品: 1人
├── 前端: 1人
├── 后端: 1人
├── 内容: 1人
└── 运营: 1人

规模阶段 (8人):
├── 产品: 1人
├── 前端: 2人
├── 后端: 2人
├── 内容: 2人
└── 运营: 1人
```

---

## 附录

### A. 竞品功能对比表

| 功能 | SpeakVLog | 流利说 | 多邻国 | 我们 |
|------|-----------|--------|--------|------|
| 视频学习 | ✅ | ❌ | ❌ | ✅ |
| 地道表达 | ✅✅ | ⭐ | ❌ | ✅✅ |
| 录音练习 | ✅ | ✅✅ | ⭐ | ✅ |
| AI 评分 | ❌ | ✅✅ | ⭐ | ✅ (P2) |
| 智能复习 | ⭐ | ✅ | ✅ | ✅✅ |
| 社区 | ❌ | ⭐ | ✅ | ✅ (P3) |
| 价格 | ¥49.9 | ¥199/年 | 免费/订阅 | ¥99-299 |

### B. 技术选型对比

| 维度 | Next.js | Nuxt | 纯 React |
|------|---------|------|---------|
| SSR | ✅✅ | ✅✅ | ❌ |
| API Routes | ✅✅ | ✅ | ❌ |
| 学习曲线 | 中 | 中 | 低 |
| 生态 | ✅✅ | ✅ | ✅✅ |
| 部署 | Vercel | Vercel | 任意 |

### C. 参考资料

- [SpeakVLog 竞品分析](./内部文档)
- [YouTube 字幕提取方案](./YOUTUBE_SUBTITLE_EXTRACTION.md)
- [AI 内容生成 Prompt](./CONTENT_GENERATION_PROMPT.md)

---

> **文档版本**: v1.0
> **最后更新**: 2026-03-16
> **下次评审**: 2026-03-23
