/**
 * TypeScript Type Definitions for 小语笔记 Database Schema
 *
 * This file contains type definitions matching the PostgreSQL schema.
 * Updated: 2026-01-08 - Added invitation_packages table, made words.chapter_id optional
 */

export type Database = {
  public: {
    Tables: {
      users: {
        Row: User
        Insert: UserInsert
        Update: UserUpdate
      }
      administrators: {
        Row: Administrator
        Insert: AdministratorInsert
        Update: AdministratorUpdate
      }
      admin_audit_logs: {
        Row: AdminAuditLog
        Insert: AdminAuditLogInsert
        Update: AdminAuditLogUpdate
      }
      invitation_codes: {
        Row: InvitationCode
        Insert: InvitationCodeInsert
        Update: InvitationCodeUpdate
      }
      invitation_packages: {
        Row: InvitationPackage
        Insert: InvitationPackageInsert
        Update: InvitationPackageUpdate
      }
      user_quotas: {
        Row: UserQuota
        Insert: UserQuotaInsert
        Update: UserQuotaUpdate
      }
      themes: {
        Row: Theme
        Insert: ThemeInsert
        Update: ThemeUpdate
      }
      scenes: {
        Row: Scene
        Insert: SceneInsert
        Update: SceneUpdate
      }
      books: {
        Row: Book
        Insert: BookInsert
        Update: BookUpdate
      }
      chapters: {
        Row: Chapter
        Insert: ChapterInsert
        Update: ChapterUpdate
      }
      words: {
        Row: Word
        Insert: WordInsert
        Update: WordUpdate
      }
      word_progress: {
        Row: WordProgress
        Insert: WordProgressInsert
        Update: WordProgressUpdate
      }
      mistakes: {
        Row: Mistake
        Insert: MistakeInsert
        Update: MistakeUpdate
      }
      vocabulary_calendar: {
        Row: VocabularyCalendar
        Insert: VocabularyCalendarInsert
        Update: VocabularyCalendarUpdate
      }
      learning_records: {
        Row: LearningRecord
        Insert: LearningRecordInsert
        Update: LearningRecordUpdate
      }
      user_book_preferences: {
        Row: UserBookPreference
        Insert: UserBookPreferenceInsert
        Update: UserBookPreferenceUpdate
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      book_category: 'exam' | 'scenario' | 'textbook' | 'custom'
      word_status: 'new' | 'known' | 'fuzzy' | 'unknown'
      difficulty_level: 'beginner' | 'intermediate' | 'advanced'
      practice_mode: 'dictation' | 'match_game' | 'flashcard'
      admin_role: 'super_admin' | 'content_admin' | 'support'
      review_status: 'pending' | 'approved' | 'rejected'
    }
  }
}

// ============================================
// Core User System
// ============================================

export type User = {
  id: string
  phone_number: string
  password_hash: string
  created_at: string
  last_login_at: string | null
  is_active: boolean
  is_banned: boolean
  banned_at: string | null
  banned_by: string | null
  ban_reason: string | null
  ban_expires_at: string | null
  metadata: any
}

export type UserInsert = Omit<User, 'id' | 'created_at'>
export type UserUpdate = Partial<UserInsert>

// ============================================
// Administrator System
// ============================================

export type Administrator = {
  id: string
  user_id: string | null
  role: Database['public']['Enums']['admin_role']
  name: string
  email: string
  is_active: boolean
  last_login_at: string | null
  created_at: string
  updated_at: string
}

export type AdministratorInsert = Omit<Administrator, 'id' | 'created_at' | 'updated_at'>
export type AdministratorUpdate = Partial<AdministratorInsert>

export type AdminAuditLog = {
  id: string
  admin_id: string | null
  action: string
  target_type: string | null
  target_id: string | null
  details: any
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export type AdminAuditLogInsert = Omit<AdminAuditLog, 'id' | 'created_at'>
export type AdminAuditLogUpdate = Partial<AdminAuditLogInsert>

// ============================================
// Invitation System
// ============================================

export type InvitationCode = {
  id: string
  code: string
  max_uses: number
  used_count: number
  created_by: string | null
  created_by_admin: string | null
  expires_at: string | null
  is_active: boolean
  created_at: string
  description: string | null
}

export type InvitationCodeInsert = Omit<InvitationCode, 'id' | 'created_at'>
export type InvitationCodeUpdate = Partial<InvitationCodeInsert>

export type UserQuota = {
  id: string
  user_id: string
  daily_smart_import_limit: number
  daily_smart_import_used: number
  last_reset_date: string
  created_at: string
  updated_at: string
}

export type UserQuotaInsert = Omit<UserQuota, 'id' | 'created_at' | 'updated_at'>
export type UserQuotaUpdate = Partial<UserQuotaInsert>

// ============================================
// Invitation Packages
// ============================================

export type InvitationPackage = {
  id: string
  name: string
  description: string | null
  validity_days: number | null
  feature_permissions: string[]
  book_permissions: string[]  // book_id数组，或["*"]表示全部
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export type InvitationPackageInsert = Omit<InvitationPackage, 'id' | 'created_at' | 'updated_at'>
export type InvitationPackageUpdate = Partial<InvitationPackageInsert>

// ============================================
// Content Classification
// ============================================

export type Theme = {
  id: string
  name: string
  description: string | null
  created_at: string
}

export type ThemeInsert = Omit<Theme, 'id' | 'created_at'>
export type ThemeUpdate = Partial<ThemeInsert>

export type Scene = {
  id: string
  theme_id: string | null
  name: string
  description: string | null
  created_at: string
}

export type SceneInsert = Omit<Scene, 'id' | 'created_at'>
export type SceneUpdate = Partial<SceneInsert>

// ============================================
// Book System
// ============================================

export interface Book {
  id: string
  title: string
  description: string | null
  cover_url: string | null
  category: Database['public']['Enums']['book_category']
  is_official: boolean
  created_by: string | null
  total_words: number
  total_chapters: number
  is_published: boolean
  created_at: string
  updated_at: string
  review_status: Database['public']['Enums']['review_status']
  review_reason: string | null
  reviewed_by: string | null
  reviewed_at: string | null
}

export interface BookInsert {
  title: string
  description?: string | null
  cover_url?: string | null
  category: Database['public']['Enums']['book_category']
  is_official?: boolean
  created_by?: string | null
  is_published?: boolean
  review_status?: Database['public']['Enums']['review_status']
}

export type BookUpdate = Partial<BookInsert>

export interface Chapter {
  id: string
  book_id: string
  title: string
  order_index: number
  theme_id: string | null
  scene_id: string | null
  word_count: number
  created_at: string
}

export interface ChapterInsert {
  book_id: string
  title: string
  order_index: number
  theme_id?: string | null
  scene_id?: string | null
}

export type ChapterUpdate = Partial<ChapterInsert>

export interface Word {
  id: string
  chapter_id: string | null  // 可选，支持无章节模式
  book_id: string            // 新增，用于无章节模式
  word: string
  phonetic: string | null
  definition: string
  definition_en: string | null
  collocation: string | null
  collocation_en: string | null
  example_sentence: string | null
  example_sentence_en: string | null
  part_of_speech: string | null
  audio_url: string | null
  image_url: string | null
  difficulty_score: number | null
  frequency_rank: number | null
  order_index: number
  created_at: string
  updated_at: string | null
}

export interface WordInsert {
  chapter_id?: string | null  // 可选
  book_id: string
  word: string
  phonetic?: string | null
  definition: string
  definition_en?: string | null
  collocation?: string | null
  collocation_en?: string | null
  example_sentence?: string | null
  example_sentence_en?: string | null
  part_of_speech?: string | null
  audio_url?: string | null
  order_index?: number
}

export type WordUpdate = Partial<WordInsert>

// ============================================
// Learning Progress System
// ============================================

export interface WordProgress {
  id: string
  user_id: string
  word_id: string
  book_id: string
  status: Database['public']['Enums']['word_status']
  practice_count: number
  correct_count: number
  last_practiced_at: string | null
  next_review_at: string | null
  mastery_level: number
  created_at: string
  updated_at: string
}

export interface WordProgressInsert {
  user_id: string
  word_id: string
  book_id: string
  status?: Database['public']['Enums']['word_status']
  practice_count?: number
  correct_count?: number
  mastery_level?: number
}

export type WordProgressUpdate = Partial<WordProgressInsert>

export interface Mistake {
  id: string
  user_id: string
  word_id: string
  book_id: string
  wrong_count: number
  last_wrong_at: string
  is_resolved: boolean
  resolved_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface MistakeInsert {
  user_id: string
  word_id: string
  book_id: string
  wrong_count?: number
}

export type MistakeUpdate = Partial<MistakeInsert>

export interface VocabularyCalendar {
  id: string
  user_id: string
  word_id: string
  book_id: string
  date: string
  status: 'unknown' | 'fuzzy'
  created_at: string
}

export interface VocabularyCalendarInsert {
  user_id: string
  word_id: string
  book_id: string
  date: string
  status: 'unknown' | 'fuzzy'
}

export type VocabularyCalendarUpdate = Partial<VocabularyCalendarInsert>

export interface LearningRecord {
  id: string
  user_id: string
  book_id: string | null
  word_id: string | null
  action: string
  practice_mode: Database['public']['Enums']['practice_mode'] | null
  is_correct: boolean | null
  time_spent_seconds: number | null
  device_info: any
  created_at: string
}

export interface LearningRecordInsert {
  user_id: string
  book_id?: string | null
  word_id?: string | null
  action: string
  practice_mode?: Database['public']['Enums']['practice_mode'] | null
  is_correct?: boolean | null
  time_spent_seconds?: number | null
  device_info?: any
}

export type LearningRecordUpdate = Partial<LearningRecordInsert>

// ============================================
// User Preferences
// ============================================

export interface UserBookPreference {
  id: string
  user_id: string
  book_id: string
  hide_chinese: boolean
  created_at: string
  updated_at: string
}

export interface UserBookPreferenceInsert {
  user_id: string
  book_id: string
  hide_chinese?: boolean
}

export type UserBookPreferenceUpdate = Partial<UserBookPreferenceInsert>

// ============================================
// JOIN TYPES
// ============================================

export type BookWithChapters = Book & { chapters: Chapter[] }
export type ChapterWithWords = Chapter & { words: Word[] }
export type WordWithProgress = Word & { progress?: WordProgress }
export type BookWithRelations = Book & {
  chapters: (Chapter & { words: Word[] })[]
}

// ============================================
// ENUMS
// ============================================

export type BookCategory = Database['public']['Enums']['book_category']
export type WordStatus = Database['public']['Enums']['word_status']
export type DifficultyLevel = Database['public']['Enums']['difficulty_level']
export type PracticeMode = Database['public']['Enums']['practice_mode']
export type AdminRole = Database['public']['Enums']['admin_role']
export type ReviewStatus = Database['public']['Enums']['review_status']
