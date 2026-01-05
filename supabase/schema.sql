-- ============================================
-- 小语笔记 - 数据库模式定义
-- ============================================

-- --------------------------------------------
-- books: 单词书表
-- --------------------------------------------
CREATE TABLE books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  cover_url VARCHAR(500),
  category VARCHAR(50) CHECK (category IN ('exam', 'scenario', 'textbook', 'custom')),
  is_official BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id),
  total_words INTEGER DEFAULT 0,
  total_chapters INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_books_category ON books(category);
CREATE INDEX idx_books_created_by ON books(created_by);
CREATE INDEX idx_books_published ON books(is_published, category);

-- --------------------------------------------
-- chapters: 章节表
-- --------------------------------------------
CREATE TABLE chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  order_index INTEGER NOT NULL,
  theme_id UUID REFERENCES themes(id),
  scene_id UUID REFERENCES scenes(id),
  word_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_chapters_book_id ON chapters(book_id);
CREATE INDEX idx_chapters_theme ON chapters(theme_id);
CREATE INDEX idx_chapters_scene ON chapters(scene_id);
