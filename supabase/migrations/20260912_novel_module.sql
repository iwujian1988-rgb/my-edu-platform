-- 小说模块：《落地》付费小说
-- 权限模型与 videos 同款：books.package_ids 与 users.package_ids 相交即解锁（邀请套餐绑定）
-- 数据与词书体系（chapters/words/word_progress）物理隔离：正文/词/复习进度全部走 novel_* 表
-- RLS：新表全部 ENABLE 且不建 policy（anon/auth 直查被拒，服务端 service_role 放行）

ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS package_ids UUID[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_novel BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.books.package_ids IS '解锁本书的邀请套餐（videos 同款绑定模型；非空且相交才可见/可读）';
COMMENT ON COLUMN public.books.is_novel IS '小说书标记：详情页走阅读器入口，书库对无权限用户完全隐藏';

CREATE TABLE IF NOT EXISTS public.novel_chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  chapter_number INT NOT NULL,
  title TEXT NOT NULL,
  content_html TEXT NOT NULL,
  new_word_count INT NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (book_id, chapter_number)
);

COMMENT ON TABLE public.novel_chapters IS '小说正文章节（付费内容唯一真源；content_html 含 <b class="fw" data-w> 点词标记）';

CREATE TABLE IF NOT EXISTS public.novel_words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  chapter_number INT NOT NULL,
  word TEXT NOT NULL,
  phonetic TEXT,
  definition TEXT NOT NULL,
  part_of_speech TEXT,
  gender TEXT CHECK (gender IN ('f', 'm') OR gender IS NULL),
  cefr TEXT,
  theme TEXT,
  star BOOLEAN NOT NULL DEFAULT FALSE,
  order_index INT NOT NULL DEFAULT 0,
  example_sentence TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (book_id, chapter_number, word)
);

COMMENT ON TABLE public.novel_words IS '小说每章新词（仅首现词条，进小说专属词卡复习；不写 words 表）';

CREATE TABLE IF NOT EXISTS public.novel_lexicon (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  form_key TEXT NOT NULL,
  lemma TEXT NOT NULL,
  display_form TEXT NOT NULL,
  phonetic TEXT,
  pos TEXT,
  gender TEXT CHECK (gender IN ('f', 'm') OR gender IS NULL),
  definition TEXT NOT NULL,
  cefr TEXT,
  scene TEXT,
  example_html TEXT,
  chapter_first INT,
  chapters INT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (book_id, form_key)
);

COMMENT ON TABLE public.novel_lexicon IS '点词词典：一行一形态别名（form_key=规范形），含复现章列表';

CREATE TABLE IF NOT EXISTS public.novel_word_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  lemma TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'unknown', 'vague', 'known')),
  in_notebook BOOLEAN NOT NULL DEFAULT FALSE,
  next_review_at TIMESTAMPTZ,
  repetition_count INT NOT NULL DEFAULT 0,
  easiness_factor NUMERIC(3, 2) NOT NULL DEFAULT 2.5,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, book_id, lemma)
);

COMMENT ON TABLE public.novel_word_progress IS '小说专属词复习进度 + 生词本（SM-2 调度；与 word_progress/user_card_progress 完全隔离）';

CREATE TABLE IF NOT EXISTS public.novel_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  chapter_number INT NOT NULL,
  scroll_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, book_id, chapter_number)
);

COMMENT ON TABLE public.novel_bookmarks IS '小说书签：每章一个（阅读器 📍 开关式），记录滚动位置百分比';

CREATE INDEX IF NOT EXISTS idx_novel_chapters_book ON public.novel_chapters (book_id);
CREATE INDEX IF NOT EXISTS idx_novel_words_book_chapter ON public.novel_words (book_id, chapter_number);
CREATE INDEX IF NOT EXISTS idx_novel_word_progress_review ON public.novel_word_progress (user_id, book_id, next_review_at);
CREATE INDEX IF NOT EXISTS idx_novel_bookmarks_user ON public.novel_bookmarks (user_id, book_id);

ALTER TABLE public.novel_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.novel_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.novel_lexicon ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.novel_word_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.novel_bookmarks ENABLE ROW LEVEL SECURITY;
