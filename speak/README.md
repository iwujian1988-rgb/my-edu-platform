# 演说家模块 - 开发阶段音频文件说明

## 📁 文件结构

```
my-edu-platform/
├── public/audio/speaker/     # 开发阶段音频文件（本地）
│   ├── level2/               # Level 2 音频（BBC 6 Minute English）
│   │   ├── bbc_01_Why_are_billionaires_building_bunkers.mp3
│   │   ├── bbc_02_Scared_of_speaking_English.mp3
│   │   └── ...
│   └── level3/               # Level 3 音频（NPR）
│       ├── npr_01_Warming_your_house_the_green_way_just_got_more_exp.mp3
│       └── ...
│
├── speak/                     # 原始素材文件
│   ├── level2/level2/
│   │   ├── item_01.json
│   │   ├── item_02.json
│   │   └── ...
│   └── level3/level3/
│       └── ...
```

## 🎵 音频文件清单

### Level 2 (BBC 6 Minute English) - 5篇
1. `bbc_01_Why_are_billionaires_building_bunkers.mp3` (13 MB)
2. `bbc_02_Scared_of_speaking_English.mp3` (6.5 MB)
3. `bbc_03_What_English_phrases_really_mean.mp3` (6.2 MB)
4. `bbc_04_Is_social_media_dead.mp3` (6.2 MB)
5. `bbc_05_Is_it_OK_to_disagree.mp3` (6.5 MB)

### Level 3 (NPR) - 5篇
1. `npr_01_Warming_your_house_the_green_way_just_got_more_exp.mp3` (8.1 MB)
2. `npr_02_Americas_next_top_Fed_Chair.mp3` (8.5 MB)
3. `npr_03_Americas_next_top_Fed_Chair.mp3` (8.7 MB)
4. `npr_04_Hawaiis_worker_shortage_goes_NUTS.mp3` (8.1 MB)
5. `npr_05_Why_isnt_corporate_America_standing_up_to_Trump.mp3` (7.8 MB)

**总计**: 10 个音频文件，约 85 MB

## 🔧 使用方式

### 1. 开发阶段（当前）

音频文件存储在 `public/audio/speaker/` 目录下，通过 `getSpeakerAudioUrl()` 函数访问：

```typescript
import { getSpeakerAudioUrl } from '@/lib/speaker-audio'

const audioUrl = getSpeakerAudioUrl('bbc_01_Why_are_billionaires_building_bunkers.mp3', 2)
// 返回: /audio/speaker/level2/bbc_01_Why_are_billionaires_building_bunkers.mp3
```

### 2. 生产环境（上线后）

#### 方案 A：手动上传到 OSS

```bash
# 使用阿里云 ossutil 上传
ossutil cp public/audio/speaker/ oss://your-bucket/audio/speaker/ -r

# 修改环境变量
NEXT_PUBLIC_SPEAKER_AUDIO_URL=https://your-bucket.oss-cn-hongkong.aliyuncs.com/audio/speaker
```

#### 方案 B：管理后台上传模块（推荐）

在管理后台开发音频上传功能：
- 后端接收音频文件
- 直接上传到阿里云 OSS
- 返回 OSS URL 存储到数据库
- 无需手动操作

## 📊 数据导入

### 导入 JSON 数据到数据库

```bash
# 导入所有文章
npm run speaker:import

# 导入单篇文章
npm run speaker:import:single --file=speak/level2/level2/item_01.json
```

## ⚙️ 环境变量配置

### `.env.local`（开发阶段）
```bash
NEXT_PUBLIC_SPEAKER_AUDIO_URL=/audio/speaker
```

### `.env.production`（生产环境）
```bash
NEXT_PUBLIC_SPEAKER_AUDIO_URL=https://your-bucket.oss-cn-hongkong.aliyuncs.com/audio/speaker
```

## 📝 注意事项

1. **开发阶段**：音频文件放在 `public/` 目录下，可以直接访问
2. **生产环境**：音频文件上传到 OSS，通过 CDN 加速
3. **时间戳数据**：当前 JSON 文件中的 `start_time` 和 `end_time` 均为 `null`，需要后续填充
4. **占位图**：如果没有封面图片，会使用默认占位图 `/images/speaker-placeholder.jpg`

## 🚀 下一步

1. 创建数据库表（见 PRD 文档）
2. 运行数据导入脚本
3. 开始开发前端功能

---

**文档创建时间**: 2026-02-05
