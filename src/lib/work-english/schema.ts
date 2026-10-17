import { z } from 'zod'

// A lesson's progress row is already keyed by lesson_id and version; word and
// question identifiers therefore only need to be valid within that lesson.
const contentId = z.string().regex(/^[a-z][a-z0-9_-]{0,39}$/)
const draft = z.string().max(5_000)
export const lessonStateSchema = z.object({
  words: z.record(contentId, z.boolean()).default({}),
  results: z.record(contentId, z.object({correct: z.boolean(), attempts: z.number().int().min(1).max(100_000)})).default({}),
  review: z.record(contentId, z.object({due: z.number().nonnegative().max(10_000_000_000_000), last: z.string().max(40)})).default({}),
  warmupInput: draft.optional(), practiceInput: draft.optional(),
  c1: z.string().max(100).optional(), c2: z.string().max(100).optional(), c3: z.string().max(100).optional(),
  d1Input: z.string().max(500).optional(), d2Input: z.string().max(500).optional(),
  quizSelection: z.string().regex(/^[a-z0-9]{1,3}$/).optional(),
  complete: z.boolean().optional(),
  self1: z.boolean().optional(), self2: z.boolean().optional(), self3: z.boolean().optional(),
  lastSection: z.enum(['reading','warmup','listening','vocabulary','structure','rewrite','practice','output','review']).optional(),
}).strict()
export const progressRequestSchema = z.object({
  version: z.literal(1), revision: z.number().int().nonnegative(), state: lessonStateSchema,
}).strict()
export type LessonState = z.infer<typeof lessonStateSchema>
export interface ProgressRow {
  user_id: string; lesson_id: string; lesson_version: number; state: LessonState; revision: number; updated_at: string
}
export type WorkEnglishDatabase = {
  public: {
    Tables: {
      work_english_progress: {
        Row: ProgressRow & Record<string, unknown>;
        Insert: Omit<ProgressRow, 'updated_at'> & {updated_at?: string} & Record<string, unknown>;
        Update: Partial<ProgressRow> & Record<string, unknown>; Relationships: []
      }
    };
    Views: Record<string, never>;
    Functions: { work_english_has_access: {Args: Record<string, never>; Returns: boolean} };
    Enums: Record<string, never>; CompositeTypes: Record<string, never>
  }
}
