# 视频模块数据流分析

> 生成时间: 2026-03-18
> 状态: 待审核

---

## 一、整体架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                           管理后台 (Admin)                           │
│  /admin/videos - 视频CRUD、字幕上传、AI生成卡片、审核                │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │      API Layer        │
                    │  /api/admin/videos/*  │
                    │  /api/videos/*        │
                    └───────────┬───────────┘
                                │
                    ┌───────────▼───────────┐
                    │     Supabase DB       │
                    │  videos, subtitles,   │
                    │  cards, packages...   │
                    └───────────┬───────────┘
                                │
┌───────────────────────────────┴─────────────────────────────────────┐
│                           前台展示 (User)                            │
│  /videos - 视频列表、播放、学习卡片、练习                            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 二、管理后台数据流

### 2.1 创建视频

```
用户填写表单
    │
    ├── 标题 (title) *
    ├── 语言 (language) *
    ├── 难度 (difficulty)
    ├── 视频文件 (video_url) * ──→ VideoUploadField ──→ OSS 上传
    │                              │
    │                              └── 自动获取时长 (duration) ✓
    │
    ├── 缩略图 (thumbnail_url) ──→ ImageUploadModal ──→ OSS 上传
    │
    ├── 描述 (description)
    ├── 创作者 (creator_name)
    ├── 来源URL (source_url)
    ├── 关联套餐 (package_ids[]) ──→ 从 invitation_packages 选择
    └── 标签 (tags[])
    │
    ▼
POST /api/admin/videos
    │
    ├── checkAdminForAPI() ──→ 验证管理员权限
    ├── createAdminClient() ──→ 使用 service role 绕过 RLS ✓ (刚修复)
    │
    └── INSERT INTO videos (...)
        │
        ├── status = 'draft' (默认草稿)
        ├── package_ids = UUID[] (直接存储)
        │
        └── INSERT INTO video_tag_relations (tags)
```

### 2.2 上传字幕

```
POST /api/admin/videos/[id]/subtitles
    │
    ├── 验证管理员权限
    ├── DELETE 现有字幕
    │
    └── INSERT INTO video_subtitles (video_id, start_time, end_time, original_text, ...)
```

**字幕格式要求:**
```json
{
  "sentences": [
    { "id": 1, "text": "Hello world", "start_time": 0.123, "end_time": 2.456 }
  ]
}
```

### 2.3 AI 生成卡片

```
POST /api/admin/videos/[id]/generate-cards
    │
    ├── 获取视频信息 (language)
    ├── 获取字幕 (original_text)
    │
    └── 调用 Anthropic Claude API
        │
        ├── 根据 language 选择提示词模板
        ├── 发送字幕内容
        │
        └── 解析返回 JSON，插入数据库:
            ├── video_word_cards (单词卡片)
            ├── video_phrase_cards (短语卡片)
            └── video_expression_cards (表达卡片)
```

### 2.4 审核卡片

```
GET /api/admin/videos/[id]/cards ──→ 获取所有卡片

PATCH /api/admin/videos/[id]/cards
    │
    └── 批量更新 is_reviewed = true/false
        ├── reviewed_at = NOW()
        └── reviewed_by = user.id
```

### 2.5 发布视频

```
PUT /api/admin/videos/[id]
    │
    ├── status = 'published'
    ├── published_at = NOW()
    │
    └── 检查: 必须关联至少一个套餐 (package_ids.length > 0)
```

---

## 三、前台展示数据流

### 3.1 视频列表

```
GET /api/videos?limit=20&offset=0
    │
    ├── getCurrentUser() ──→ 检查登录状态
    │
    ├── getAccessibleVideoIds(userId) ──→ 获取用户可访问的视频ID
    │   │
    │   ├── 检查 feature_permissions 是否包含 'video'
    │   ├── 检查 user.package_id 是否在 video.package_ids 中
    │   └── 包含公开视频 (package_ids 为空)
    │
    └── 返回:
        ├── items[] (视频列表，含 tags, packages, user_progress)
        ├── total
        └── user_packages[]
```

### 3.2 视频详情

```
GET /api/videos/[id]/full
    │
    ├── hasVideoAccess(userId, videoId) ──→ 权限检查
    │   │
    │   ├── 视频未发布 → 无权限
    │   ├── 公开视频 → 有权限
    │   ├── 用户有 'video' 功能权限 → 有权限
    │   └── 用户的 package_id 在视频的 package_ids 中 → 有权限
    │
    └── 返回:
        ├── video (基本信息)
        ├── subtitles[] (字幕 + 高亮位置)
        ├── cards: { words[], phrases[], expressions[] }
        ├── exercises[] (练习题)
        └── difficulty_analysis (难度分析)
```

---

## 四、数据库表结构

### 核心表

| 表名 | 用途 | 关键字段 |
|------|------|----------|
| `videos` | 视频主表 | package_ids UUID[], status, language |
| `video_subtitles` | 字幕 | video_id, original_text, chinese_text |
| `video_word_cards` | 单词卡片 | video_id, word, chinese_definition, is_reviewed |
| `video_phrase_cards` | 短语卡片 | video_id, phrase, chinese_definition, is_reviewed |
| `video_expression_cards` | 表达卡片 | video_id, expression, meaning, is_reviewed |
| `video_tags` | 标签 | name, type, color |
| `video_tag_relations` | 视频-标签关联 | video_id, tag_id |

### 权限相关

| 表名 | 用途 | 关键字段 |
|------|------|----------|
| `invitation_packages` | 邀请码套餐 | feature_permissions[], book_permissions[] |
| `users` | 用户表 | package_id, feature_permissions[], permission_expires_at |

---

## 五、发现的问题与断点

### 🔴 已修复

| 问题 | 文件 | 状态 |
|------|------|------|
| Admin API 使用 createClient() 导致 RLS 阻止写入 | route.ts | ✅ 已修复 |
| pageClient 期望 data.data 是数组，实际是 data.data.items | pageClient.tsx | ✅ 已修复 |
| ImageUploadModal z-index 与 Dialog 冲突 | ImageUploadModal.tsx | ✅ 已修复 |
| requireAdminForAPI 返回类型与调用方式不匹配 | admin-auth.ts | ✅ 已修复 |
| /api/videos 仍引用已删除的 package_video_relations | route.ts | ✅ 已修复 |

### 🟡 待检查

| 问题 | 文件 | 说明 |
|------|------|------|
| generate-cards 使用 createClient() | [id]/generate-cards/route.ts | 应使用 createAdminClient() |
| subtitles API 使用 createClient() | [id]/subtitles/route.ts | 应使用 createAdminClient() |
| cards API 使用 createClient() | [id]/cards/route.ts | 应使用 createAdminClient() |
| 前台视频列表接口响应慢 | /api/videos | 多次数据库查询 |

### 🟢 建议优化

| 建议 | 说明 |
|------|------|
| 添加视频删除的级联检查 | 删除视频前检查是否有用户学习记录 |
| 添加卡片审核统计 | 在视频列表显示待审核卡片数量 |
| 缓存套餐列表 | packages 列表可以缓存，减少请求 |

---

## 六、数据流完整图

```
┌────────────────────────────────────────────────────────────────────────────┐
│                              创建视频流程                                   │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  1. 填写表单 ──→ 2. 上传视频到OSS ──→ 3. 自动获取时长                      │
│        │              │                    │                               │
│        │              └── ali-oss ──→ OSS Bucket                           │
│        │                    │                                              │
│        │              返回 URL                                             │
│        │                    │                                              │
│        └────────────────────┼──────────────────────────────────────────┐   │
│                             │                                          │   │
│  4. POST /api/admin/videos  │                                          │   │
│        │                    │                                          │   │
│        ├── 验证管理员权限   │                                          │   │
│        ├── INSERT videos    ◄──────────────────────────────────────────┘   │
│        └── INSERT video_tag_relations                                      │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│                              内容制作流程                                   │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  5. 上传字幕 ──→ 6. AI生成卡片 ──→ 7. 审核卡片                             │
│        │                │                  │                               │
│  POST /subtitles   POST /generate-cards   PATCH /cards                     │
│        │                │                  │                               │
│  video_subtitles   调用 Claude API    is_reviewed = true                    │
│                     │                                                      │
│                     ├── video_word_cards                                   │
│                     ├── video_phrase_cards                                 │
│                     └── video_expression_cards                             │
│                                                                            │
│  8. 发布视频                                                               │
│        │                                                                   │
│  PUT /api/admin/videos/[id]                                                │
│        │                                                                   │
│  status = 'published', published_at = NOW()                                │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│                              用户观看流程                                   │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  GET /api/videos                                                           │
│        │                                                                   │
│        ├── 检查用户登录                                                    │
│        ├── 获取可访问视频ID列表                                            │
│        │     ├── feature_permissions 包含 'video'                         │
│        │     └── user.package_id 在 video.package_ids 中                  │
│        │                                                                   │
│        └── 返回视频列表                                                    │
│                                                                            │
│  GET /api/videos/[id]/full                                                 │
│        │                                                                   │
│        ├── 权限检查 (hasVideoAccess)                                       │
│        ├── 获取字幕 + 高亮                                                 │
│        ├── 获取卡片 (仅 is_reviewed=true)                                  │
│        └── 获取练习题                                                      │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 七、API 端点汇总

### 管理端 API

| 方法 | 端点 | 用途 |
|------|------|------|
| GET | /api/admin/videos | 获取视频列表 |
| POST | /api/admin/videos | 创建视频 |
| GET | /api/admin/videos/[id] | 获取视频详情 |
| PUT | /api/admin/videos/[id] | 更新视频 |
| DELETE | /api/admin/videos/[id] | 删除视频 |
| POST | /api/admin/videos/[id]/subtitles | 上传字幕 |
| GET | /api/admin/videos/[id]/subtitles | 获取字幕列表 |
| POST | /api/admin/videos/[id]/generate-cards | AI生成卡片 |
| GET | /api/admin/videos/[id]/cards | 获取卡片列表 |
| PATCH | /api/admin/videos/[id]/cards | 批量审核卡片 |
| DELETE | /api/admin/videos/[id]/cards | 删除卡片 |

### 前台 API

| 方法 | 端点 | 用途 |
|------|------|------|
| GET | /api/videos | 获取视频列表 |
| GET | /api/videos/[id]/full | 获取视频详情 |
| GET | /api/videos/[id]/access | 检查访问权限 |
| GET | /api/videos/[id]/exercises | 获取练习题 |
| GET | /api/videos/[id]/difficulty-analysis | 获取难度分析 |

---

## 八、待修复问题清单

### 高优先级

1. **generate-cards API** - 改用 createAdminClient()
2. **subtitles API** - 改用 createAdminClient()
3. **cards API** - 改用 createAdminClient()

### 中优先级

4. 前台 API 响应优化 - 减少数据库查询次数
5. 添加错误提示 - 目前很多 API 静默处理错误

### 低优先级

6. 添加操作日志 - 记录管理员的视频操作
7. 添加缓存 - 减少重复请求

---

*文档结束*
