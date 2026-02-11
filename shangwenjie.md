# 演说家模块产品需求文档 (PRD)

## 文档信息
- **项目名称**：演说家 (The Speaker)
- **文档版本**：v1.0
- **创建日期**：2026-02-05
- **状态**：开发中

---

## 1. 业务流程与模块总览

### 1.1 核心用户路径
```
用户从左侧导航进入【演说家首页】
  → 选择素材
  → 进入【时间轴页】
  → 依次（或跳跃）完成"盲听、听写、背诵、对比"四步
  → 产生错词数据进入【魔鬼生词本】
  → 首页状态更新为"已学完"
```

### 1.2 全局数据定义
- **文章单元 (Article Unit)**：最小学习素材单位，包含音频、原文、分句时间戳
- **进度状态 (Progress Status)**：针对单篇文章的四个阶段（Step 1-4）的完成情况
- **魔鬼错词 (Ghost Words)**：独立于系统词库的、基于"听写"产生的错误数据池

---

## 2. 功能模块详述

### 2.1 模块一：演说家首页 (The Speaker Index)

**页面定位**：素材大厅与状态总览

#### 布局与展示
- 采用网格布局 (Grid Layout)
- 每个卡片展示：
  - 文章标题
  - 难度标签 (Level 2-3)
  - 时长
  - 词汇量
  - 封面图片

#### 状态标识
- **未开始**：常规显示
- **进行中**：显示"进行中"标签
- **已学完**：当且仅当用户在【Step 4】点击"完成学习"后，该卡片右上角显示显眼的"COMPLETED"印章（酸性绿或红色印章风格）

#### 入口跳转
- 点击卡片，跳转至该文章的【时间轴页】

#### 魔鬼生词本入口
- 页面右上角或显著位置，放置【魔鬼生词本】入口按钮
- 点击跳转至生词本独立页

---

### 2.2 模块二：时间轴页 (Timeline Hub)

**页面定位**：单篇文章的学习导航中心

#### 视觉交互
- 展示 4 个卡片（Step 1~4）
- 卡片之间用粗线条（管道）连接，形成时间轴隐喻
  - **Step 1**：整段盲听（默认解锁）
  - **Step 2**：听写训练（核心）
  - **Step 3**：背诵页
  - **Step 4**：原音语速对比

#### 导航逻辑
- 用户可以点击任意卡片进入对应环节
- **允许跳跃**，给予用户自主权

#### 进度反馈
- 每个卡片上需直观显示该步骤是否已完成（如打钩或颜色填充）

---

### 2.3 模块三：Step 1 整段盲听 (Blind Immersion)

**页面定位**：纯听觉输入，建立沉浸感

#### 视觉风格
- 沉浸式设计
- 去除侧边栏，背景暗化或纯色
- 屏幕中央仅保留播放控制区

#### 核心功能

**播放控制**
- 仅显示"播放/暂停"大按钮

**语速调节**
- 提供 0.5x, 0.8x, 1.0x, 1.2x, 1.5x 五档选项

**断点续播 (Breakpoint Resume)**
- **逻辑**：每次离开页面时记录播放时间戳
- **交互**：用户再次进入时，系统判断若有记录，则弹出非模态提示框（Toast）："检测到上次听到 05:23，是否续播？"
- 用户点击确认则跳转，否则从头开始

**鼓励系统**
- 播放器下方设置滚动字幕区域（Marquee）
- 循环展示鼓励语句（如："首次听不出没关系，认真听能听多少就算多少"）

**完成逻辑**
- 播放结束或用户主动点击"下一步"，引导进入 Step 2

---

### 2.4 模块四：Step 2 听写训练 (Dictation Training) —— ⭐核心模块

**页面定位**：左右分栏的高强度交互页

#### A. 布局结构 (Split Layout)

**PC端**：左右分栏
- 左栏（原文/音频区）：宽度约 40%
- 右栏（输入区）：宽度约 60%

**移动端**：上下分栏
- 音频/原文在上
- 输入区在下

#### B. 左栏交互：原文遮罩与播放

**颗粒度**
- 以**"句"**为单位

**默认状态**
- 全遮罩：所有文字默认被半透明色块覆盖（可看到模糊文字）

**播放控制**
- 每一句遮罩层上方悬浮（或固定显示）一个"播放按钮"

**显影逻辑**
1. **PC端**：鼠标悬停在遮罩上时临时透视（显示文字）
2. **移动端**：每句独立的"按住显示"按钮
3. **全局开关**：页面顶部提供全局"显示原文"开关

**联动逻辑**
- 点击左侧某一句的"播放按钮"，右侧对应的输入区域自动获得焦点（Active）
- 其他区域保持非激活状态

**单句播放停止**
- 点击单句播放时，播放器必须在该句时间戳结束点强制暂停
- **绝不允许连播**

#### C. 右栏交互：下划线输入流

**展示形式**
- 不显示完整文本
- 每个单词显示为一个输入框（下划线样式）
- 标点预设：逗号、句号、引号等标点符号由系统预置在下划线之间，用户无需输入

**输入交互（核心）**
1. 用户在下划线上输入单词
2. **空格跳转**：输入完成后按下**【空格键】**，焦点自动跳转至下一个单词输入框
3. **移动端适配**：虚拟键盘的"换行/Enter"键，拦截并映射为"Next"功能

**右键放弃 (Right-Click Skip)**
- 用户在某个输入框上点击鼠标右键
- **反馈**：该输入框立即变为"放弃状态"（如变红、划掉），无需再输入
- **数据**：该词标记为 SKIPPED，并自动加入【魔鬼生词本】
- **跳转**：焦点自动跳至下一个单词
- **反悔机制**：用户可重新点击已放弃的输入框，重新输入，状态重置

**语速调节**
- 页面底部或顶部需复用 Step 1 的语速选择功能

#### D. 双栏同步滚动 (Sync Scrolling)

**正向联动**
- 当右侧输入框的焦点（Focus）移动到第 N 句时
- 左侧原文区域必须自动滚动
- 确保第 N 句原文始终处于可视区域的垂直居中位置

**反向联动**
- 当用户手动滚动左侧原文并点击某一句播放时
- 右侧输入区也应自动滚动该句到视野内

#### E. 状态保存与断点

**草稿保存**
- 用户每次输入后，自动保存草稿到 `speaker_progress.step2_draft`
- 包含：已填写的答案、当前句子索引、放弃的单词

**断点恢复**
- 用户重新进入该页面时，需检查是否有未提交的草稿
- 若有草稿，弹窗提示："发现未完成的听写进度，是否继续？"
  - 选择"是"：恢复所有填空内容
  - 选择"否"：清空重置

#### F. 结果提交与反馈

**提交操作**
- 底部设置"提交"按钮

**判分容错标准**
1. **大小写不敏感**：默认忽略大小写（Case Insensitive），`Apple` = `apple`
2. **缩写不兼容**：不支持 `I'm` = `I am`
   - 页面显眼处提示用户："请使用完整形式拼写，勿用缩写"
   - 对于常见缩写（如 `I'm`），在输入框下方提示"完整形式是 I am"
3. **多空格处理**：用户不小心输入了 `apple `（带尾部空格），提交时系统需自动 `trim()` 去除首尾空格再比对

**训练结果页 (Result Modal/Page)**
- **统计数据**：正确数、放弃数（听不清）、错误数
- **历史切片入口**：页面右上角显示"历史记录"按钮
  - 点击进入时间切片页，展示该用户在不同时间点提交的该文章听写记录（Snapshot）
  - 用于对比进步曲线
- **导出功能**：支持下载 PDF（包含全文、用户填写内容及批改标记）
- **生词本生成**：所有"写错"和"听不清"的词，自动推送到【魔鬼生词本】

---

### 2.5 模块五：魔鬼生词本 (Ghost Word Book)

**页面定位**：独立的错题清洗中心

#### 数据逻辑
- **独立于系统原有的"基于词库的错题本"**
- **数据来源**：Step 2 中产生的 WRONG 和 SKIPPED 单词

#### 列表展示
- 显示单词拼写
- **来源追溯**：显示该词来自哪篇文章、什么时间提交的
- **API 增强**：必须调用有道免费接口，展示接口返回的：
  - 音标
  - 中文释义
  - 例句（如有）
- **原声回放（必须）**：每个单词旁提供播放按钮
  - 点击后播放该单词在原文章中所在的那一句音频（而非机器发音）

#### 上下文回溯
- **来源跳转**：生词卡片上的"文章来源"字段（如：Steve Jobs 2005），必须是可点击的链接
- **锚点定位**：点击后，跳转回该文章的【Step 2 听写页】
  - 并自动定位并高亮到这个单词所在的句子
  - 方便用户进行上下文复盘

#### 消灭逻辑
- 每个单词卡片上有一个**"我已掌握"**按钮
- 点击后，该词从列表中移除（或归档），不再显示

#### 逻辑解耦说明
- **【魔鬼生词本】**是当前待办列表
- **【听写结果页的历史切片】**是历史快照
- **关系**：即使生词本里的词被"消灭"了，历史切片里的那个时间的记录依然保留"错误"状态（因为那是历史事实），两者互不影响

---

### 2.6 模块六：Step 3 背诵页 (Recitation)

**页面定位**：听音复述与自我校验

#### 视觉交互
- **文本展示**：必须展示原文
  - 提供一个开关（如"隐藏/显示文本"），满足盲背需求
- **单句播放**：针对每一句/每一段提供点击播放功能
  - **不支持语速选择，强制原速**
  - **单句播放停止**：点击单句播放时，播放器必须在该句时间戳结束点强制暂停，绝不允许连播

#### 状态标记
1. **已练习**：当某一句被点击播放过，该句的样式需发生变化（如左侧出现绿色竖条，或背景微亮）
   - 帮助用户区分哪些练过，哪些没练过
2. **掌握标记**：
   - 每一句右侧提供一个勾选框 (Checkbox)
   - 用户认为自己背下来了，就手动勾选
   - 勾选后该句变色（如变绿），代表"已攻克"
3. **过关**：全文勾选后，提示可进入下一步

---

### 2.7 模块七：Step 4 原音语速对比 (Sync Challenge)

**页面定位**：KTV 模式的终极考核

#### 核心交互 (KTV Mode)

**静音领跑**
- 点击开始后，音频默认静音（或极小音量），作为时间轴基准

**滚动高亮**
- 文本像 KTV 歌词一样，根据音频时间轴，一行一行自动滚动
- **当前行样式**：正在播放的那一行高亮、放大，提示用户此时应背诵此句
- **实现逻辑**：
  1. 按时间戳计算当前应该在第几行
  2. 监听 `audio.currentTime`，找到对应的句子索引
  3. 高亮 + `scrollIntoView()` 居中显示

#### 完课确认
- 页面底部设置**"我已学完"**按钮
- **逻辑**：此按钮由用户主观点击
- 点击后，系统记录该文章状态为"已学完"，并同步至【演说家首页】

---

## 3. 边际条件与技术备忘 (Technical Notes)

### 3.1 标点处理
- 在 Step 2，前端需根据正则将标点符号剥离为静态文本 `<span>`
- 单词渲染为 `<input>`，确保输入流顺畅

### 3.2 右键屏蔽
- 在 Step 2 的输入框上需屏蔽默认浏览器右键菜单
- 绑定自定义的"标记 Skip"事件

### 3.3 断点存储
- 建议使用 `speaker_progress` 表存储草稿数据
- 支持：`article_id` + `user_id` + `input_draft`，实现轻量级断点续传

### 3.4 API 调用
- 魔鬼生词本需后端代理请求有道 API，避免前端跨域问题
- **Redis 缓存策略**：后端 Redis 缓存已查询过的单词，有效期 7 天

### 3.5 历史快照存储策略
- **Supabase 存储元数据**（时间、正确率）
- **完整答案 JSON 压缩存储**在 `speaker_dictation_submissions.answers` 字段

### 3.6 单句播放的"自动暂停"技术实现
- 用 `timeupdate` 事件监听
- 当 `audio.currentTime >= end` 时 `pause()`
- 误差控制在 ±0.1s 可接受
- **不需要切分 MP3**

### 3.7 移动端键盘适配
- **Scroll Into View**：当软键盘弹起时，当前获焦的 Input 必须自动顶起
  - 保持在键盘上方至少 20px 的位置
- **虚拟键盘适配**：移动端软键盘的"换行/Enter"键
  - 拦截并映射为"Next（下一个）"功能
  - 等同于 PC 端的空格键效果

---

## 4. 数据结构要求

### 4.1 素材格式规范
**必须强制要求上传 LRC 或 SRT 格式的字幕文件，或者是 JSON 数组格式**

#### 数据结构示例
```json
[
  {
    "start": "00:00:01.000",
    "end": "00:00:05.500",
    "text": "I am honored to be with you today."
  },
  {
    "start": "00:00:06.000",
    "end": "00:00:09.300",
    "text": "Truth be told, I never graduated from college."
  }
]
```

**关键**：`start` 和 `end` 必须精确到毫秒，支持单句播放和自动暂停

### 4.2 当前素材状态
- **Level 2**：BBC 6 Minute English（5篇文章）
  - ✅ 完整分句（100+ 句子/篇）
  - ✅ 包含元数据（标题、音频、图片、来源）
  - ⚠️ 时间戳全部为 `null`（后续补充）

- **Level 3**：NPR（5篇文章）
  - ✅ 结构正确
  - ⚠️ 只有 1 个长句（整篇文章）
  - ⚠️ 时间戳为 `null`（后续补充）

### 4.3 时间戳临时方案（开发阶段）
在时间戳数据为 `null` 时，前端使用估算时间：
```javascript
// 如果 start_time === null，用估算时间
const estimatedDuration = sentence.text.length * 0.15; // 每字符 0.15 秒
const startTime = index === 0 ? 0 : sentences[index - 1].end_time;
const endTime = startTime + estimatedDuration;
```

---

## 5. 用户数据关联

### 5.1 用户权限
- **必须登录**才能使用（全站统一用户体系）
- 学习数据计入用户总学习时长

### 5.2 与现有系统的关系
- **暂时不要**与现有的"词库"系统打通
- 魔鬼生词本独立于系统原有词库

---

## 6. 数据库表结构

### 6.1 `speaker_articles` - 文章表
```sql
CREATE TABLE speaker_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  level INTEGER NOT NULL CHECK (level IN (2, 3)),

  -- 元数据
  title TEXT NOT NULL,
  source_url TEXT,
  audio_url TEXT NOT NULL,
  image_url TEXT,
  has_preroll_ad BOOLEAN DEFAULT false,

  -- 统计
  total_sentences INTEGER NOT NULL,
  duration_seconds INTEGER,
  word_count INTEGER,

  -- 时间戳
  json_data JSONB NOT NULL,

  -- 状态
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 6.2 `speaker_sentences` - 句子表
```sql
CREATE TABLE speaker_sentences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id UUID NOT NULL REFERENCES speaker_articles(id) ON DELETE CASCADE,

  sentence_index INTEGER NOT NULL,
  text TEXT NOT NULL,
  start_time DECIMAL(10, 3),
  end_time DECIMAL(10, 3),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(article_id, sentence_index)
);
```

### 6.3 `speaker_progress` - 学习进度表
```sql
CREATE TABLE speaker_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES speaker_articles(id) ON DELETE CASCADE,

  -- 4 步骤完成状态
  step1_completed BOOLEAN DEFAULT false,
  step1_last_position DECIMAL(10, 3),

  step2_completed BOOLEAN DEFAULT false,
  step2_draft JSONB,
  step2_last_sentence_index INTEGER,

  step3_completed BOOLEAN DEFAULT false,
  step3_practiced_sentences INTEGER[],

  step4_completed BOOLEAN DEFAULT false,

  -- 整体状态
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, article_id)
);
```

### 6.4 `speaker_dictation_submissions` - 听写提交记录表
```sql
CREATE TABLE speaker_dictation_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES speaker_articles(id) ON DELETE CASCADE,

  -- 提交数据
  answers JSONB NOT NULL,
  total_sentences INTEGER NOT NULL,
  correct_count INTEGER NOT NULL,
  wrong_count INTEGER NOT NULL,
  skipped_count INTEGER NOT NULL,
  accuracy_rate DECIMAL(5, 2),

  -- 时间
  time_spent_seconds INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 6.5 `speaker_ghost_words` - 魔鬼生词本表
```sql
CREATE TABLE speaker_ghost_words (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 单词数据
  word TEXT NOT NULL,
  article_id UUID NOT NULL REFERENCES speaker_articles(id),
  sentence_id INTEGER NOT NULL,
  sentence_text TEXT NOT NULL,
  start_time DECIMAL(10, 3),

  -- 错误类型
  error_type TEXT NOT NULL CHECK (error_type IN ('wrong', 'skipped')),

  -- 有道 API 数据（缓存）
  phonetic TEXT,
  definition TEXT,
  example_sentence TEXT,
  example_audio_url TEXT,

  -- 状态
  is_mastered BOOLEAN DEFAULT false,
  mastered_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, word, article_id, sentence_id)
);
```

---

## 7. 技术栈确认

- **数据库**：Supabase PostgreSQL（与现有项目一致）
- **音频存储**：阿里云 OSS
- **前端框架**：Next.js + React
- **样式方案**：Tailwind CSS
- **状态管理**：React Hooks (useState, useEffect, useRef)
- **音频处理**：HTML5 Audio API
- **外部 API**：有道词典 API（后端代理 + Redis 缓存）

---

## 8. 开发顺序建议

### 阶段 1：数据层（最关键）
1. ✅ 设计数据库表结构
2. ✅ 创建 SQL 迁移文件
3. ⏳ 开发数据导入脚本（批量导入素材文件）

### 阶段 2：核心模块
1. 首页（简单，快速出效果）
2. Step 1 盲听（验证音频基础能力）
3. **Step 2 听写**（最复杂，重点攻克）
   - 左遮罩实现
   - 右填空流 + 空格跳转 + 右键放弃
   - 双栏同步滚动
   - 判分逻辑
   - 移动端适配

### 阶段 3：辅助模块
1. 魔鬼生词本（依赖 Step 2 数据）
2. Step 3 背诵
3. Step 4 对比
4. 时间轴页

---

## 9. 待确认事项

### 9.1 素材准备
- [ ] 时间戳数据填充（人工或工具标注）
- [ ] 音频文件上传到 OSS
- [ ] 图片文件处理（如有缺失）

### 9.2 后端开发
- [ ] 有道 API 集成
- [ ] Redis 缓存配置
- [ ] 音频文件上传接口

### 9.3 测试准备
- [ ] 准备测试账号
- [ ] 准备不同难度的测试素材
- [ ] 移动端真机测试

---

## 10. 版本历史

| 版本 | 日期 | 修改内容 | 修改人 |
|------|------|---------|--------|
| v1.0 | 2026-02-05 | 初始版本，完整 PRD | Claude |

---

## 附录：关键交互流程图

### A. Step 2 听写完整流程
```
进入页面 → 检查断点 → 恢复草稿/从头开始
  ↓
播放音频 → 左侧遮罩 → 点击句子播放 → 右侧获得焦点
  ↓
输入单词 → 空格跳转 → 继续/右键放弃
  ↓
完成所有句子 → 点击提交 → 判分
  ↓
显示结果页 → 生成生词本 → 保存历史快照
  ↓
跳转到 Step 3 / 返回首页
```

### B. 魔鬼生词本消灭流程
```
从 Step 2 错误 → 自动加入生词本
  ↓
进入生词本 → 查看单词详情 → 调用有道 API
  ↓
原声回放 → 点击上下文 → 跳转回 Step 2
  ↓
练习掌握 → 点击"我已掌握" → 从列表移除
```

---

**文档结束**
