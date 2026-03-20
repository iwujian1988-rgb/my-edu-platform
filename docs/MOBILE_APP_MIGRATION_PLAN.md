# 移动端 App 适配实施方案

> 基于 Capacitor 框架，最小改动实现 iOS/Android 原生应用
>
> 制定日期: 2026-03-16

---

## 一、项目现状总结

### 1.1 技术栈

| 项目 | 技术 |
|------|------|
| 框架 | Next.js 16.1.1 + React 19.2.3 |
| 样式 | Tailwind CSS 3.4 + CSS Variables |
| 状态 | Zustand 5.0 (仅 typingStore) + React Context |
| 后端 | Supabase (PostgreSQL + Auth) |
| 存储 | 阿里云 OSS (音频文件) |
| TTS | 有道 API + Web Speech API |
| PWA | @ducanh2912/next-pwa (已配置) |

### 1.2 功能模块清单

| 模块 | 页面数 | 核心功能 |
|------|--------|----------|
| **认证** | 3 | 登录、注册、权限验证 |
| **词库** | 3 | 词库列表、详情、创建 |
| **学习计划** | 4 | 计划选择、每日任务、学习流程 |
| **学习模式** | 4 | 闪卡、听写、消消乐、打字 |
| **演说家** | 8 | 盲听、听写、跟读、KTV |
| **管理后台** | 15+ | 用户、词库、套餐管理 |

### 1.3 API 路由统计

| 类别 | 数量 | 关键 API |
|------|------|----------|
| 认证 | 4 | `/api/auth/login`, `/api/signup` |
| 单词 | 6 | `/api/words`, `/api/words/[id]` |
| 学习计划 v3 | 6 | `/api/v3/word-mark`, `/api/v3/daily-task` |
| 进度 | 5 | `/api/word-progress`, `/api/flashcard-progress` |
| 错题 | 3 | `/api/mistakes`, `/api/mistakes/batch-sync` |
| TTS | 2 | `/api/tts`, `/api/learning-plan/tts` |
| Speaker | 8 | `/api/speaker/articles`, `/api/speaker/progress` |
| 管理 | 10+ | `/api/admin/*` |

---

## 二、移动端适配架构

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────┐
│                    移动端 App                            │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐   │
│  │              UI 层 (React + Tailwind)            │   │
│  │  复用现有组件，调整移动端交互                       │   │
│  └─────────────────────────────────────────────────┘   │
│                          │                              │
│  ┌───────────────────────▼─────────────────────────┐   │
│  │              API 服务层 (新增)                    │   │
│  │  src/services/api/* - 统一网络请求封装            │   │
│  └─────────────────────────────────────────────────┘   │
│                          │                              │
│  ┌───────────────────────▼─────────────────────────┐   │
│  │           Capacitor 原生桥接层                    │   │
│  │  @capacitor/core, push, storage, splash-screen  │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              远程服务器 (现有 Next.js)                   │
│  - 所有 /api/* 路由保持不变                              │
│  - Supabase 数据库                                      │
│  - OSS 文件存储                                         │
└─────────────────────────────────────────────────────────┘
```

### 2.2 代码复用率预估

| 层级 | 复用率 | 说明 |
|------|--------|------|
| UI 组件 | 95% | 仅调整交互细节 |
| Hooks | 90% | 去除 DOM 依赖 |
| Services | 80% | 改用统一 API 层 |
| Types | 100% | 完全复用 |
| Stores | 100% | Zustand 完全兼容 |
| API Routes | 0% | 服务端代码不打包 |

---

## 三、详细实施步骤

### 阶段一: 基础设施搭建 (Day 1)

#### Step 1.1: 安装 Capacitor

```bash
# 安装核心依赖
npm install @capacitor/core @capacitor/cli @capacitor/app

# 安装平台
npm install @capacitor/ios @capacitor/android

# 安装必要插件
npm install @capacitor/storage @capacitor/push-notifications
npm install @capacitor/splash-screen @capacitor/status-bar
npm install @capacitor/keyboard @capacitor/haptics

# 初始化
npx cap init "小语笔记" "com.xiaoyu.notes" --web-dir out
```

#### Step 1.2: 配置文件

**capacitor.config.ts** (新建)
```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.xiaoyu.notes',
  appName: '小语笔记',
  webDir: 'out',
  server: {
    // 开发时可指向本地服务器
    // url: 'http://localhost:3000',
    // cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
      showSpinner: false,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#ffffff',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
  ios: {
    contentInset: 'automatic',
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
```

#### Step 1.3: 修改构建配置

**next.config.ts** (修改)
```typescript
// 添加静态导出配置
const nextConfig: NextConfig = {
  output: 'export',  // 新增: 静态导出
  trailingSlash: true,  // 新增: 兼容静态路由
  images: {
    unoptimized: true,  // 静态导出必须
  },
  // ... 其他配置
};
```

#### Step 1.4: 新增构建脚本

**package.json** (添加)
```json
{
  "scripts": {
    "build:static": "next build",
    "build:ios": "npm run build:static && npx cap sync ios",
    "build:android": "npm run build:static && npx cap sync android",
    "open:ios": "npx cap open ios",
    "open:android": "npx cap open android",
    "run:ios": "npx cap run ios",
    "run:android": "npx cap run android"
  }
}
```

---

### 阶段二: API 服务层抽离 (Day 2-3)

#### Step 2.1: 创建 API 配置

**src/lib/api-config.ts** (新建)
```typescript
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();

// 生产环境 API 地址
const PROD_API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://your-domain.com';

// 开发环境 API 地址
const DEV_API_URL = 'http://localhost:3000';

// 原生环境使用远程 API，Web 环境使用相对路径
export const API_BASE_URL = isNative
  ? (process.env.NODE_ENV === 'production' ? PROD_API_URL : DEV_API_URL)
  : '';

export const getApiUrl = (path: string) => `${API_BASE_URL}${path}`;
```

#### Step 2.2: 创建统一请求客户端

**src/services/api/client.ts** (新建)
```typescript
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { getApiUrl } from '@/lib/api-config';

const isNative = Capacitor.isNativePlatform();

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

// 获取存储的 token
async function getAuthToken(): Promise<string | null> {
  if (isNative) {
    const { value } = await Preferences.get({ key: 'auth_token' });
    return value;
  }
  // Web 环境从 cookie 或 localStorage 获取
  return localStorage.getItem('auth_token');
}

// 统一请求函数
export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { skipAuth = false, ...fetchOptions } = options;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (!skipAuth) {
    const token = await getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(getApiUrl(endpoint), {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: '请求失败' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// 便捷方法
export const api = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, data?: unknown, options?: RequestOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T>(endpoint: string, data?: unknown, options?: RequestOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
};
```

#### Step 2.3: 迁移现有 API 调用

**src/services/api/auth.ts** (新建)
```typescript
import { api } from './client';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

export interface LoginResponse {
  success: boolean;
  user?: {
    id: string;
    phone_number: string;
    feature_permissions: string[];
    book_permissions: string[];
  };
  error?: string;
}

export const authApi = {
  // 登录
  login: async (phoneNumber: string, password: string): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/api/auth/login', {
      phone_number: phoneNumber,
      password,
    });

    if (response.success && response.user) {
      // 保存 token (根据实际认证方式调整)
      if (Capacitor.isNativePlatform()) {
        await Preferences.set({ key: 'auth_token', value: response.user.id });
        await Preferences.set({ key: 'user_data', value: JSON.stringify(response.user) });
      }
    }

    return response;
  },

  // 获取用户信息
  getUser: async () => {
    return api.get('/api/auth/user');
  },

  // 检查封禁状态
  checkBan: async () => {
    return api.get('/api/auth/check-ban');
  },

  // 注册
  signup: async (data: {
    phone_number: string;
    password: string;
    invitation_code: string;
  }) => {
    return api.post('/api/signup', data);
  },

  // 登出
  logout: async () => {
    if (Capacitor.isNativePlatform()) {
      await Preferences.remove({ key: 'auth_token' });
      await Preferences.remove({ key: 'user_data' });
    }
    return api.post('/api/admin/auth/logout');
  },
};
```

**src/services/api/words.ts** (新建)
```typescript
import { api } from './client';
import { Word, WordStatus, WordWithProgress } from '@/types/word';

export interface WordsQueryParams {
  bookId: string;
  page?: number;
  limit?: number;
  status?: WordStatus;
  shuffle?: boolean;
  chapterId?: string;
}

export const wordsApi = {
  // 获取单词列表
  getWords: async (params: WordsQueryParams) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });
    return api.get<{ words: WordWithProgress[]; total: number }>(
      `/api/words?${searchParams.toString()}`
    );
  },

  // 获取单个单词
  getWord: async (wordId: string) => {
    return api.get<Word>(`/api/words/${wordId}`);
  },

  // 获取单词统计
  getStats: async (bookId: string) => {
    return api.get(`/api/words/stats?bookId=${bookId}`);
  },

  // 批量移动单词
  batchMove: async (wordIds: string[], targetStatus: WordStatus) => {
    return api.post('/api/words/batch-move', { wordIds, targetStatus });
  },

  // 批量删除
  batchDelete: async (wordIds: string[]) => {
    return api.post('/api/words/batch-delete', { wordIds });
  },
};
```

**src/services/api/learning-plan.ts** (新建)
```typescript
import { api } from './client';

export const learningPlanApi = {
  // 获取学习计划
  getPlan: async () => {
    return api.get('/api/v3/learning-plan');
  },

  // 创建学习计划
  createPlan: async (data: {
    book_ids: string[];
    daily_new_words: number;
    daily_review_words: number;
  }) => {
    return api.post('/api/v3/learning-plan', data);
  },

  // 获取今日任务
  getDailyTask: async () => {
    return api.get('/api/v3/daily-task');
  },

  // 标记单词 (核心 API)
  markWord: async (data: {
    word_id: string;
    book_id: string;
    action: 'know' | 'unknown' | 'fuzzy' | 'mastered';
  }) => {
    return api.post('/api/v3/word-mark', data);
  },

  // 获取进度
  getProgress: async () => {
    return api.get('/api/v3/learning-plan/progress');
  },

  // 获取状态
  getStatus: async () => {
    return api.get('/api/v3/learning-plan/status');
  },

  // 更新状态
  updateStatus: async (status: 'learning' | 'review') => {
    return api.put('/api/v3/learning-plan/status', { status });
  },
};
```

**src/services/api/progress.ts** (新建)
```typescript
import { api } from './client';

export const progressApi = {
  // 获取单词进度
  getWordProgress: async (wordIds: string[]) => {
    return api.post('/api/word-progress/batch-stats', { word_ids: wordIds });
  },

  // 更新进度
  updateProgress: async (data: {
    word_id: string;
    book_id: string;
    status?: string;
    familiarity?: number;
  }) => {
    return api.post('/api/word-progress', data);
  },

  // 批量更新
  batchUpdate: async (updates: Array<{
    word_id: string;
    book_id: string;
    status: string;
  }>) => {
    return api.post('/api/word-progress/batch-update', { updates });
  },

  // 重置进度
  resetProgress: async (bookId: string) => {
    return api.post('/api/word-progress/reset', { book_id: bookId });
  },

  // 闪卡进度
  getFlashcardProgress: async (bookId: string) => {
    return api.get(`/api/flashcard-progress?bookId=${bookId}`);
  },
};
```

**src/services/api/mistakes.ts** (新建)
```typescript
import { api } from './client';

export const mistakesApi = {
  // 获取错题列表
  getMistakes: async (params?: { bookId?: string; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.bookId) searchParams.append('bookId', params.bookId);
    if (params?.limit) searchParams.append('limit', String(params.limit));
    return api.get(`/api/mistakes?${searchParams.toString()}`);
  },

  // 批量同步
  batchSync: async (mistakes: Array<{
    word_id: string;
    book_id: string;
    mistake_type: string;
    count: number;
  }>) => {
    return api.post('/api/mistakes/batch-sync', { mistakes });
  },

  // 获取统计
  getStats: async () => {
    return api.get('/api/stats/mistakes');
  },
};
```

**src/services/api/tts.ts** (新建)
```typescript
import { getApiUrl } from '@/lib/api-config';

export interface TTSOptions {
  text: string;
  lang?: string;
  type?: 1 | 2; // 1=英音, 2=美音
}

export const ttsApi = {
  // 获取 TTS 音频 URL
  getAudioUrl: (options: TTSOptions): string => {
    const params = new URLSearchParams();
    params.append('text', options.text);
    if (options.lang) params.append('lang', options.lang);
    if (options.type) params.append('type', String(options.type));
    return getApiUrl(`/api/tts?${params.toString()}`);
  },

  // 学习计划 TTS
  getLearningPlanTtsUrl: (wordId: string): string => {
    return getApiUrl(`/api/learning-plan/tts?wordId=${wordId}`);
  },
};
```

**src/services/api/speaker.ts** (新建)
```typescript
import { api } from './client';

export const speakerApi = {
  // 获取文章列表
  getArticles: async (params?: { language?: string; difficulty?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.language) searchParams.append('language', params.language);
    if (params?.difficulty) searchParams.append('difficulty', params.difficulty);
    return api.get(`/api/speaker/articles?${searchParams.toString()}`);
  },

  // 获取文章详情
  getArticle: async (id: string) => {
    return api.get(`/api/speaker/articles/${id}`);
  },

  // 获取进度
  getProgress: async (articleId: string) => {
    return api.get(`/api/speaker/progress?articleId=${articleId}`);
  },

  // 保存进度
  saveProgress: async (data: {
    article_id: string;
    step: number;
    data: Record<string, unknown>;
  }) => {
    return api.post('/api/speaker/progress', data);
  },

  // 提交听写
  submitDictation: async (data: {
    article_id: string;
    sentence_id: string;
    user_input: string;
  }) => {
    return api.post('/api/speaker/dictation/submit', data);
  },

  // 保存草稿
  saveDraft: async (data: {
    article_id: string;
    step: number;
    content: string;
  }) => {
    return api.post('/api/speaker/draft', data);
  },

  // 获取听写历史
  getDictationHistory: async (articleId: string) => {
    return api.get(`/api/speaker/dictation/history?articleId=${articleId}`);
  },

  // 获取支持的语种
  getLanguages: async () => {
    return api.get('/api/speaker/languages');
  },

  // 获取单词关联文章
  getWordArticles: async (wordId: string) => {
    return api.get(`/api/speaker/words/articles?wordId=${wordId}`);
  },
};
```

**src/services/api/books.ts** (新建)
```typescript
import { api } from './client';
import { Book } from '@/types/book';

export const booksApi = {
  // 获取词库列表
  getBooks: async (params?: { type?: string; language?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.append('type', params.type);
    if (params?.language) searchParams.append('language', params.language);
    return api.get<{ books: Book[] }>(`/api/books?${searchParams.toString()}`);
  },

  // 获取词库详情
  getBook: async (bookId: string) => {
    return api.get<Book>(`/api/books/${bookId}`);
  },

  // 获取章节
  getChapters: async (bookId: string) => {
    return api.get(`/api/books/${bookId}/chapters`);
  },
};
```

**src/services/api/index.ts** (新建)
```typescript
export { api, apiRequest } from './client';
export { authApi } from './auth';
export { wordsApi } from './words';
export { learningPlanApi } from './learning-plan';
export { progressApi } from './progress';
export { mistakesApi } from './mistakes';
export { ttsApi } from './tts';
export { speakerApi } from './speaker';
export { booksApi } from './books';
```

---

### 阶段三: 认证系统适配 (Day 3)

#### Step 3.1: 创建原生存储适配器

**src/lib/native-storage.ts** (新建)
```typescript
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const isNative = Capacitor.isNativePlatform();

export const nativeStorage = {
  async get(key: string): Promise<string | null> {
    if (isNative) {
      const { value } = await Preferences.get({ key });
      return value;
    }
    return localStorage.getItem(key);
  },

  async set(key: string, value: string): Promise<void> {
    if (isNative) {
      await Preferences.set({ key, value });
    } else {
      localStorage.setItem(key, value);
    }
  },

  async remove(key: string): Promise<void> {
    if (isNative) {
      await Preferences.remove({ key });
    } else {
      localStorage.removeItem(key);
    }
  },

  async clear(): Promise<void> {
    if (isNative) {
      await Preferences.clear();
    } else {
      localStorage.clear();
    }
  },
};
```

#### Step 3.2: 修改认证 Hook

**src/hooks/useAuth.ts** (修改现有或新建)
```typescript
import { useState, useEffect, useCallback } from 'react';
import { authApi } from '@/services/api/auth';
import { nativeStorage } from '@/lib/native-storage';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  phone_number: string;
  feature_permissions: string[];
  book_permissions: string[];
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // 初始化检查登录状态
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const userData = await nativeStorage.get('user_data');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = useCallback(async (phone: string, password: string) => {
    const response = await authApi.login(phone, password);
    if (response.success && response.user) {
      setUser(response.user);
      router.push('/dashboard');
    }
    return response;
  }, [router]);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
    router.push('/login');
  }, [router]);

  return {
    user,
    loading,
    login,
    logout,
    checkAuth,
    isAuthenticated: !!user,
  };
}
```

---

### 阶段四: 中间件适配 (Day 3)

#### Step 4.1: 创建客户端路由守卫

**src/components/AuthGuard.tsx** (新建)
```typescript
'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { nativeStorage } from '@/lib/native-storage';

const PUBLIC_PATHS = ['/login', '/register', '/privacy'];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const check = async () => {
      const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p));

      if (isPublic) {
        setChecking(false);
        return;
      }

      const token = await nativeStorage.get('auth_token');
      if (!token) {
        router.replace('/login');
        return;
      }

      setChecking(false);
    };

    check();
  }, [pathname, router]);

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return <>{children}</>;
}
```

#### Step 4.2: 在布局中使用

**src/app/layout.tsx** (修改)
```typescript
import { AuthGuard } from '@/components/AuthGuard';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <AuthGuard>{children}</AuthGuard>
      </body>
    </html>
  );
}
```

---

### 阶段五: TTS 适配 (Day 4)

#### Step 5.1: 修改 useTTS Hook

**src/hooks/use-tts.ts** (修改关键部分)
```typescript
import { Capacitor } from '@capacitor/core';
import { ttsApi } from '@/services/api/tts';

const isNative = Capacitor.isNativePlatform();

export function useTTS() {
  const play = useCallback(async (text: string, options?: { lang?: string; type?: 1 | 2 }) => {
    if (isNative) {
      // 原生环境: 使用远程 URL
      const audioUrl = ttsApi.getAudioUrl({ text, ...options });
      const audio = new Audio(audioUrl);
      await audio.play();
    } else {
      // Web 环境: 保持现有逻辑
      // ... 现有代码
    }
  }, []);

  // ... 其他代码保持不变
}
```

---

### 阶段六: 原生功能集成 (Day 5)

#### Step 6.1: 推送通知

**src/lib/push-notifications.ts** (新建)
```typescript
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

export async function initPushNotifications() {
  if (!Capacitor.isNativePlatform()) return;

  const permStatus = await PushNotifications.checkPermissions();

  if (permStatus.receive === 'prompt') {
    await PushNotifications.requestPermissions();
  }

  await PushNotifications.register();

  PushNotifications.addListener('registration', (token) => {
    console.log('Push registration success, token:', token.value);
    // 发送 token 到服务器
  });

  PushNotifications.addListener('registrationError', (err) => {
    console.error('Push registration error:', err);
  });

  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('Push received:', notification);
  });

  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    console.log('Push action performed:', action);
  });
}
```

#### Step 6.2: 应用启动初始化

**src/lib/app-init.ts** (新建)
```typescript
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard } from '@capacitor/keyboard';
import { initPushNotifications } from './push-notifications';

export async function initApp() {
  if (!Capacitor.isNativePlatform()) return;

  // 状态栏
  try {
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setBackgroundColor({ color: '#ffffff' });
  } catch (e) {
    console.warn('StatusBar not available');
  }

  // 键盘
  Keyboard.addListener('keyboardWillShow', (info) => {
    document.body.style.setProperty('--keyboard-height', `${info.keyboardHeight}px`);
  });

  Keyboard.addListener('keyboardWillHide', () => {
    document.body.style.setProperty('--keyboard-height', '0px');
  });

  // 推送通知
  await initPushNotifications();

  // 隐藏启动屏
  await SplashScreen.hide();
}
```

#### Step 6.3: 在 App 入口调用

**src/app/layout.tsx** (添加)
```typescript
'use client';

import { useEffect } from 'react';
import { initApp } from '@/lib/app-init';

export default function RootLayout({ children }) {
  useEffect(() => {
    initApp();
  }, []);

  return (/* ... */);
}
```

---

### 阶段七: UI 适配 (Day 5-6)

#### Step 7.1: 安全区域适配

**src/app/globals.css** (添加)
```css
:root {
  --safe-area-top: env(safe-area-inset-top, 0px);
  --safe-area-bottom: env(safe-area-inset-bottom, 0px);
  --safe-area-left: env(safe-area-inset-left, 0px);
  --safe-area-right: env(safe-area-inset-right, 0px);
  --keyboard-height: 0px;
}

/* 页面容器适配 */
.page-container {
  padding-top: var(--safe-area-top);
  padding-bottom: calc(var(--safe-area-bottom) + var(--keyboard-height));
  padding-left: var(--safe-area-left);
  padding-right: var(--safe-area-right);
}

/* 底部导航适配 */
.bottom-nav {
  padding-bottom: var(--safe-area-bottom);
}
```

#### Step 7.2: 修改底部导航

**src/components/MobileBottomNav.tsx** (修改)
```typescript
// 添加 safe-area 适配
<nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 pb-[env(safe-area-inset-bottom)]">
  {/* ... */}
</nav>
```

#### Step 7.3: 触摸反馈优化

**tailwind.config.ts** (添加)
```typescript
module.exports = {
  theme: {
    extend: {
      // 禁用移动端 hover 状态
      extend: {
        screens: {
          'hover-hover': { raw: '(hover: hover)' },
        },
      },
    },
  },
};
```

**使用方式**:
```tsx
<button className="hover-hover:bg-blue-600 active:bg-blue-700 active:scale-95">
  点击
</button>
```

#### Step 7.4: 页面容器统一

**src/components/layout/PageContainer.tsx** (修改)
```typescript
export function PageContainer({ children, className }: Props) {
  return (
    <div className={cn(
      'min-h-screen',
      'pt-[env(safe-area-inset-top)]',
      'pb-[env(safe-area-inset-bottom)]',
      'px-[env(safe-area-inset-left)]',
      'pr-[env(safe-area-inset-right)]',
      className
    )}>
      {children}
    </div>
  );
}
```

---

### 阶段八: 测试与调试 (Day 7)

#### Step 8.1: 真机测试清单

| 测试项 | iOS | Android | 备注 |
|--------|-----|---------|------|
| 登录/注册 | ☐ | ☐ | |
| 词库浏览 | ☐ | ☐ | |
| 闪卡学习 | ☐ | ☐ | 滑动手势 |
| 听写功能 | ☐ | ☐ | 键盘弹出 |
| TTS 播放 | ☐ | ☐ | 后台播放 |
| 学习计划 | ☐ | ☐ | |
| 进度保存 | ☐ | ☐ | |
| 离线功能 | ☐ | ☐ | |
| 推送通知 | ☐ | ☐ | |
| 支付流程 | ☐ | ☐ | 如有 |

#### Step 8.2: 常见问题排查

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 白屏 | 路由问题 | 检查 trailingSlash 配置 |
| API 请求失败 | CORS/HTTPS | 配置 server.url |
| 键盘遮挡 | 未适配 | 使用 Keyboard 插件 |
| 音频不播放 | 自动播放限制 | 用户交互后播放 |
| 状态栏重叠 | 未适配 safe-area | 添加 CSS 变量 |

---

## 四、模块适配清单

### 4.1 用户端模块 (必须适配)

| 模块 | 优先级 | API 依赖 | 特殊处理 |
|------|--------|----------|----------|
| 登录 | P0 | authApi | 原生存储 token |
| 注册 | P0 | authApi | 邀请码验证 |
| 词库列表 | P0 | booksApi | - |
| 词库详情 | P0 | booksApi, wordsApi | - |
| 闪卡 | P0 | wordsApi, progressApi | 手势适配 |
| 听写 | P0 | wordsApi, progressApi | 键盘适配 |
| 学习计划 | P0 | learningPlanApi | - |
| TTS | P0 | ttsApi | 后台播放 |
| 错题本 | P1 | mistakesApi | - |
| 设置 | P1 | authApi | - |

### 4.2 演说家模块 (P1)

| 页面 | API 依赖 | 特殊处理 |
|------|----------|----------|
| 文章列表 | speakerApi | - |
| 盲听 | speakerApi | 音频播放 |
| 听写 | speakerApi | 键盘适配 |
| 跟读 | speakerApi | 录音功能 |
| KTV | speakerApi | 音频对比 |

### 4.3 管理后台 (P2 - 可选)

**建议**: 管理后台保持 Web 端使用，不在 App 中包含

---

## 五、文件改动清单

### 5.1 新建文件

| 文件路径 | 用途 |
|----------|------|
| `capacitor.config.ts` | Capacitor 配置 |
| `src/lib/api-config.ts` | API 地址配置 |
| `src/lib/native-storage.ts` | 原生存储适配 |
| `src/lib/app-init.ts` | App 初始化 |
| `src/lib/push-notifications.ts` | 推送通知 |
| `src/services/api/client.ts` | 请求客户端 |
| `src/services/api/auth.ts` | 认证 API |
| `src/services/api/words.ts` | 单词 API |
| `src/services/api/books.ts` | 词库 API |
| `src/services/api/learning-plan.ts` | 学习计划 API |
| `src/services/api/progress.ts` | 进度 API |
| `src/services/api/mistakes.ts` | 错题 API |
| `src/services/api/tts.ts` | TTS API |
| `src/services/api/speaker.ts` | 演说家 API |
| `src/services/api/index.ts` | 统一导出 |
| `src/components/AuthGuard.tsx` | 路由守卫 |

### 5.2 修改文件

| 文件路径 | 改动内容 |
|----------|----------|
| `package.json` | 添加依赖和脚本 |
| `next.config.ts` | 添加静态导出配置 |
| `tailwind.config.ts` | 添加 hover 媒体查询 |
| `src/app/globals.css` | 添加 safe-area 变量 |
| `src/app/layout.tsx` | 添加 AuthGuard 和初始化 |
| `src/hooks/use-tts.ts` | 适配原生环境 |
| `src/components/MobileBottomNav.tsx` | safe-area 适配 |

---

## 六、构建与发布

### 6.1 iOS 发布

```bash
# 1. 构建
npm run build:ios

# 2. 打开 Xcode
npx cap open ios

# 3. 在 Xcode 中:
#    - 配置 Signing & Capabilities
#    - 添加 Push Notification 能力
#    - 配置 URL Types (如有)
#    - Archive 并上传 App Store Connect
```

### 6.2 Android 发布

```bash
# 1. 构建
npm run build:android

# 2. 打开 Android Studio
npx cap open android

# 3. 在 Android Studio 中:
#    - 配置 signingConfigs
#    - Build > Generate Signed Bundle/APK
#    - 上传 Google Play Console
```

---

## 七、时间规划

| 阶段 | 任务 | 预计时间 |
|------|------|----------|
| Day 1 | 基础设施搭建 | 1 天 |
| Day 2-3 | API 服务层抽离 | 2 天 |
| Day 3 | 认证系统适配 | 0.5 天 |
| Day 4 | TTS 适配 | 0.5 天 |
| Day 5 | 原生功能集成 | 1 天 |
| Day 5-6 | UI 适配 | 1 天 |
| Day 7 | 测试与调试 | 1 天 |
| **总计** | | **7 天** |

---

## 八、风险与应对

| 风险 | 概率 | 应对措施 |
|------|------|----------|
| App Store 审核被拒 | 中 | 添加推送等原生功能 |
| 静态导出路由问题 | 中 | 使用 trailingSlash |
| 音频后台播放限制 | 高 | 配置 background modes |
| 键盘遮挡输入框 | 高 | 使用 Keyboard 插件 |
| 离线功能不完整 | 中 | 优先保证在线功能 |

---

## 九、后续优化

| 功能 | 优先级 | 说明 |
|------|--------|------|
| 离线缓存 | P1 | Service Worker + IndexedDB |
| 生物识别登录 | P2 | Face ID / 指纹 |
| App 内更新 | P2 | 热更新机制 |
| 深度链接 | P2 | Universal Links |
| 微信分享 | P3 | cordova-plugin-wechat |
