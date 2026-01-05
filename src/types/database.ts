/**
 * TypeScript Type Definitions for 小语笔记 Database Schema
 *
 * This file contains type definitions matching the PostgreSQL schema.
 */

export type Database = {
  public: {
    Tables: {
      users: {
        Row: User
        Insert: UserInsert
        Update: UserUpdate
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
    }
    Enums: {
      book_category: 'exam' | 'scenario' | 'textbook' | 'custom'
      word_status: 'new' | 'known' | 'vague' | 'unknown'
      difficulty_level: 'beginner' | 'intermediate' | 'advanced'
      practice_mode: 'dictation' | 'match_game' | 'flashcard'
    }
  }
}

export type User = {
  id: string
  phone_number: string
  password_hash: string
  created_at: string
  last_login_at: string | null
  is_active: boolean
  metadata: any
}

export type UserInsert = Omit<User, 'id' | 'created_at'>

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
  difficulty_level: Database['public']['Enums']['difficulty_level'] | null
  language: string
  created_at: string
  updated_at: string
}

export interface BookInsert {
  title: string
  description?: string | null
  cover_url?: string | null
  category: Database['public']['Enums']['book_category']
  is_official?: boolean
  created_by?: string | null
  is_published?: boolean
  difficulty_level?: Database['public']['Enums']['difficulty_level'] | null
  language?: string
}

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

export interface Word {
  id: string
  chapter_id: string
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
  updated_at: string
}

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

export interface VocabularyCalendar {
  id: string
  user_id: string
  word_id: string
  book_id: string
  date: string
  status: 'unknown' | 'vague'
  created_at: string
}

// JOIN TYPES
export type BookWithChapters = Book & { chapters: Chapter[] }
export type ChapterWithWords = Chapter & { words: Word[] }
export type WordWithProgress = Word & { progress?: WordProgress }
export type BookWithRelations = Book & {
  chapters: (Chapter & { words: Word[] })[]
}

// ENUMS
export type BookCategory = Database['public']['Enums']['book_category']
export type WordStatus = Database['public']['Enums']['word_status']
export type DifficultyLevel = Database['public']['Enums']['difficulty_level']
export type PracticeMode = Database['public']['Enums']['practice_mode']
