# YouTube 字幕提取完整方案

> 准确提取 YouTube 视频字幕，生成短句格式

---

## 方案对比

| 方案 | 准确度 | 速度 | 适用场景 |
|------|--------|------|---------|
| **yt-dlp 下载官方字幕** | ⭐⭐⭐⭐⭐ | 极快 | 视频有官方字幕 |
| **yt-dlp 自动字幕** | ⭐⭐⭐ | 极快 | 无官方字幕 |
| **Whisper AI 转录** | ⭐⭐⭐⭐ | 慢 | 无任何字幕 |
| **混合方案** | ⭐⭐⭐⭐⭐ | 中 | 最佳实践 |

---

## 一、yt-dlp 方案（推荐首选）

### 1.1 安装

```bash
# Windows
pip install yt-dlp

# Mac
brew install yt-dlp

# Linux
pip install yt-dlp
```

### 1.2 下载字幕

```bash
# 只下载字幕（不下载视频）
yt-dlp --write-subs --skip-download "https://www.youtube.com/watch?v=VIDEO_ID"

# 优先官方字幕，没有则下载自动字幕
yt-dlp --write-subs --write-auto-subs --sub-langs "en" --skip-download "VIDEO_URL"

# 下载所有英文字幕（包括自动生成）
yt-dlp --write-subs --write-auto-subs --sub-langs "en.*,en-US,en-GB" --skip-download "VIDEO_URL"

# 指定输出格式为 SRT
yt-dlp --write-subs --sub-format srt --skip-download "VIDEO_URL"

# 指定输出路径和文件名
yt-dlp --write-subs --skip-download -o "%(title)s.%(ext)s" "VIDEO_URL"
```

### 1.3 字幕格式转换

```bash
# 下载 VTT 格式（YouTube 原生格式）
yt-dlp --write-subs --sub-format vtt --skip-download "VIDEO_URL"

# 转换为 JSON 格式（推荐）
yt-dlp --write-subs --sub-format json3 --skip-download "VIDEO_URL"
```

---

## 二、Whisper AI 转录方案（无字幕时）

### 2.1 安装 Whisper

```bash
# 安装 OpenAI Whisper
pip install openai-whisper

# 或使用 faster-whisper（更快）
pip install faster-whisper
```

### 2.2 使用 Whisper

```python
import whisper

# 加载模型（medium 平衡速度和准确度）
model = whisper.load_model("medium")

# 转录
result = model.transcribe("video.mp4", language="en")

# 输出结果
for segment in result["segments"]:
    print(f"[{segment['start']:.2f} - {segment['end']:.2f}] {segment['text']}")
```

### 2.3 faster-whisper（推荐）

```python
from faster_whisper import WhisperModel

# 加载模型
model = WhisperModel("medium", device="cuda", compute_type="float16")

# 转录
segments, info = model.transcribe("video.mp4", language="en")

for segment in segments:
    print(f"[{segment.start:.2f} - {segment.end:.2f}] {segment.text}")
```

---

## 三、完整自动化脚本

```typescript
// src/lib/youtube-subtitle-extractor.ts

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

interface Subtitle {
  id: number;
  start_time: number;
  end_time: number;
  english_text: string;
}

interface ExtractionResult {
  success: boolean;
  subtitles: Subtitle[];
  source: 'official' | 'auto-generated' | 'whisper';
  error?: string;
}

export class YouTubeSubtitleExtractor {
  private tempDir: string;

  constructor(tempDir: string = './temp') {
    this.tempDir = tempDir;
  }

  /**
   * 提取 YouTube 视频字幕
   */
  async extract(videoUrl: string): Promise<ExtractionResult> {
    // 1. 尝试下载官方字幕
    const officialResult = await this.downloadOfficialSubtitles(videoUrl);
    if (officialResult.success) {
      return { ...officialResult, source: 'official' };
    }

    // 2. 尝试下载自动字幕
    const autoResult = await this.downloadAutoSubtitles(videoUrl);
    if (autoResult.success) {
      return { ...autoResult, source: 'auto-generated' };
    }

    // 3. 使用 Whisper 转录
    const whisperResult = await this.transcribeWithWhisper(videoUrl);
    return { ...whisperResult, source: 'whisper' };
  }

  /**
   * 下载官方字幕
   */
  private async downloadOfficialSubtitles(videoUrl: string): Promise<{ success: boolean; subtitles: Subtitle[] }> {
    const outputFile = path.join(this.tempDir, `subtitle_${Date.now()}.vtt`);

    try {
      // 只下载官方字幕
      await execAsync(
        `yt-dlp --write-subs --sub-langs "en" --sub-format vtt --skip-download ` +
        `-o "${outputFile.replace('.vtt', '')}" "${videoUrl}"`
      );

      const content = await fs.readFile(outputFile, 'utf-8');
      const subtitles = this.parseVTT(content);

      // 清理临时文件
      await fs.unlink(outputFile).catch(() => {});

      return { success: subtitles.length > 0, subtitles };
    } catch (error) {
      return { success: false, subtitles: [] };
    }
  }

  /**
   * 下载自动字幕
   */
  private async downloadAutoSubtitles(videoUrl: string): Promise<{ success: boolean; subtitles: Subtitle[] }> {
    const outputFile = path.join(this.tempDir, `subtitle_${Date.now()}.vtt`);

    try {
      await execAsync(
        `yt-dlp --write-auto-subs --sub-langs "en" --sub-format vtt --skip-download ` +
        `-o "${outputFile.replace('.vtt', '')}" "${videoUrl}"`
      );

      const content = await fs.readFile(outputFile, 'utf-8');
      const subtitles = this.parseVTT(content);

      await fs.unlink(outputFile).catch(() => {});

      return { success: subtitles.length > 0, subtitles };
    } catch (error) {
      return { success: false, subtitles: [] };
    }
  }

  /**
   * 使用 Whisper 转录
   */
  private async transcribeWithWhisper(videoUrl: string): Promise<{ success: boolean; subtitles: Subtitle[]; error?: string }> {
    const videoFile = path.join(this.tempDir, `video_${Date.now()}.mp4`);

    try {
      // 1. 下载视频
      await execAsync(`yt-dlp -f "worst[ext=mp4]" -o "${videoFile}" "${videoUrl}"`);

      // 2. 调用 Whisper API 或本地模型
      const subtitles = await this.callWhisperAPI(videoFile);

      // 3. 清理
      await fs.unlink(videoFile).catch(() => {});

      return { success: subtitles.length > 0, subtitles };
    } catch (error) {
      return { success: false, subtitles: [], error: String(error) };
    }
  }

  /**
   * 调用 Whisper API
   */
  private async callWhisperAPI(videoPath: string): Promise<Subtitle[]> {
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: await this.buildFormData(videoPath),
    });

    const result = await response.json();

    // 转换为标准格式
    return this.convertWhisperResponse(result);
  }

  private async buildFormData(videoPath: string): Promise<FormData> {
    const formData = new FormData();
    const fileBuffer = await fs.readFile(videoPath);
    const blob = new Blob([fileBuffer], { type: 'video/mp4' });

    formData.append('file', blob, 'video.mp4');
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'verbose_json');
    formData.append('timestamp_granularities[]', 'segment');

    return formData;
  }

  /**
   * 解析 VTT 格式字幕
   */
  private parseVTT(content: string): Subtitle[] {
    const lines = content.split('\n');
    const subtitles: Subtitle[] = [];
    let id = 1;
    let currentTime: { start: number; end: number } | null = null;
    let text = '';

    for (const line of lines) {
      // 解析时间戳
      const timeMatch = line.match(/(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})/);
      if (timeMatch) {
        // 保存上一条字幕
        if (currentTime && text.trim()) {
          subtitles.push({
            id: id++,
            start_time: this.parseTime(timeMatch[1]),
            end_time: this.parseTime(timeMatch[2]),
            english_text: text.trim(),
          });
        }

        currentTime = {
          start: this.parseTime(timeMatch[1]),
          end: this.parseTime(timeMatch[2]),
        };
        text = '';
      } else if (line.trim() && !line.includes('WEBVTT') && !line.match(/^\d+$/)) {
        // 累积文本
        text += (text ? ' ' : '') + line.trim();
      }
    }

    // 保存最后一条
    if (currentTime && text.trim()) {
      subtitles.push({
        id: id++,
        start_time: currentTime.start,
        end_time: currentTime.end,
        english_text: text.trim(),
      });
    }

    return this.optimizeSentenceBreaks(subtitles);
  }

  /**
   * 时间字符串转秒
   */
  private parseTime(timeStr: string): number {
    const [hours, minutes, seconds] = timeStr.split(':').map(Number);
    return hours * 3600 + minutes * 60 + seconds;
  }

  /**
   * 优化句子断句
   */
  private optimizeSentenceBreaks(subtitles: Subtitle[]): Subtitle[] {
    const result: Subtitle[] = [];
    let current: Subtitle | null = null;

    for (const sub of subtitles) {
      if (!current) {
        current = { ...sub };
        continue;
      }

      // 判断是否应该合并
      const shouldMerge = this.shouldMergeWithPrevious(current, sub);

      if (shouldMerge) {
        // 合并到当前句子
        current.end_time = sub.end_time;
        current.english_text += ' ' + sub.english_text;
      } else {
        // 保存当前句子，开始新句子
        result.push(current);
        current = { ...sub };
      }
    }

    if (current) {
      result.push(current);
    }

    return result;
  }

  /**
   * 判断是否应该与上一句合并
   */
  private shouldMergeWithPrevious(prev: Subtitle, curr: Subtitle): boolean {
    // 1. 时间间隔太短（< 0.5秒）
    if (curr.start_time - prev.end_time < 0.5) {
      // 检查上一句是否以标点结尾
      if (!/[.!?]$/.test(prev.english_text.trim())) {
        return true;
      }
    }

    // 2. 上一句太短（< 3个词）且没有结束标点
    const prevWordCount = prev.english_text.split(/\s+/).length;
    if (prevWordCount < 3 && !/[.!?]$/.test(prev.english_text.trim())) {
      return true;
    }

    // 3. 当前句子以小写字母开头（可能是续接）
    if (/^[a-z]/.test(curr.english_text.trim())) {
      return true;
    }

    return false;
  }
}
```

---

## 四、短句优化策略

### 4.1 断句规则

```typescript
// 断句规则
const sentenceBreakRules = [
  // 1. 句末标点
  { pattern: /[.!?]$/, priority: 10 },

  // 2. 逗号 + 长暂停（> 1秒）
  { pattern: /,[\s]*$/, minPause: 1.0, priority: 7 },

  // 3. 连词开头（可能开始新句）
  { pattern: /^(And|But|So|Because|When|If|While)/i, priority: 5 },

  // 4. 时间间隔 > 2秒
  { minPause: 2.0, priority: 8 },
];
```

### 4.2 合并规则

```typescript
// 合并规则
const mergeRules = [
  // 1. 太短的片段（< 3词）
  { maxWords: 3, merge: true },

  // 2. 没有结束标点
  { noEndPunctuation: true, merge: true },

  // 3. 时间间隔太短（< 0.3秒）
  { maxPause: 0.3, merge: true },

  // 4. 以小写开头
  { startsWithLowercase: true, merge: true },
];
```

---

## 五、完整工作流

```
┌─────────────────────────────────────────────────────────────┐
│                    字幕提取工作流                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  YouTube URL                                                │
│      │                                                      │
│      ▼                                                      │
│  ┌─────────────────────────────────────┐                    │
│  │  yt-dlp --write-subs --sub-langs en │                    │
│  └─────────────────────────────────────┘                    │
│      │                                                      │
│      ├─▶ 有官方字幕 ─▶ 解析 VTT ─▶ 优化断句 ─▶ 完成         │
│      │                                                      │
│      └─▶ 无官方字幕                                          │
│            │                                                │
│            ├─▶ 有自动字幕 ─▶ 解析 ─▶ 优化断句 ─▶ 完成       │
│            │                                                │
│            └─▶ 无字幕                                        │
│                  │                                          │
│                  ▼                                          │
│            ┌─────────────┐                                  │
│            │  Whisper AI │                                  │
│            └─────────────┘                                  │
│                  │                                          │
│                  ▼                                          │
│            转录 ─▶ 优化断句 ─▶ 完成                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 六、使用示例

```typescript
// 使用示例
const extractor = new YouTubeSubtitleExtractor();

const result = await extractor.extract('https://www.youtube.com/watch?v=xxxxx');

if (result.success) {
  console.log(`提取成功，来源: ${result.source}`);
  console.log(`共 ${result.subtitles.length} 条字幕`);

  // 存储到数据库
  await saveSubtitles(videoId, result.subtitles);
}
```

---

## 七、成本估算

| 方案 | 每分钟成本 | 200视频成本 |
|------|-----------|------------|
| yt-dlp 官方字幕 | **免费** | **免费** |
| yt-dlp 自动字幕 | **免费** | **免费** |
| Whisper API | $0.006/分钟 | ~$120 |
| 本地 Whisper | **免费** | **免费**（需 GPU） |

---

## 八、质量对比

| 来源 | 准确率 | 断句质量 | 备注 |
|------|--------|---------|------|
| 官方字幕 | 99% | ⭐⭐⭐⭐⭐ | 最佳选择 |
| 自动字幕 | 85-95% | ⭐⭐⭐ | 需要后处理 |
| Whisper | 95-98% | ⭐⭐⭐⭐ | 需要断句优化 |

---

## 九、常见问题

### Q1: 字幕时间轴不准怎么办？
使用 Whisper 的 word-level timestamps 进行对齐。

### Q2: 自动字幕质量差怎么办？
先用 Whisper 转录，再人工校对。

### Q3: 如何处理多语言字幕？
```bash
yt-dlp --write-subs --sub-langs "en,zh-Hans" --skip-download "VIDEO_URL"
```

---

**Sources:**
- [yt-dlp GitHub](https://github.com/yt-dlp/yt-dlp)
- [yt-dlp Cheat Sheet](https://www.ditig.com/yt-dlp-cheat-sheet)
- [OpenAI Whisper](https://github.com/openai/whisper)
