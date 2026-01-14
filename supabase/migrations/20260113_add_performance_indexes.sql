-- Performance Index Migration
-- Add indexes to improve query performance

-- Index for word_progress lookups by user_id and book_id
CREATE INDEX IF NOT EXISTS idx_word_progress_user_book
  ON word_progress(user_id, book_id);

-- Index for word_progress lookups by user_id, book_id, and status
CREATE INDEX IF NOT EXISTS idx_word_progress_user_book_status
  ON word_progress(user_id, book_id, status);

-- Index for words by chapter_id and order_index
CREATE INDEX IF NOT EXISTS idx_words_chapter_order
  ON words(chapter_id, order_index);

-- Index for books lookup by ID
CREATE INDEX IF NOT EXISTS idx_books_id
  ON books(id);

-- Index for chapters by book_id
CREATE INDEX IF NOT EXISTS idx_chapters_book
  ON chapters(book_id);

-- Index for user_book_preferences lookups
CREATE INDEX IF NOT EXISTS idx_user_book_prefs_user
  ON user_book_preferences(user_id);

CREATE INDEX IF NOT EXISTS idx_user_book_prefs_user_book
  ON user_book_preferences(user_id, book_id);

-- Index for user_book_preferences by last_accessed_at
CREATE INDEX IF NOT EXISTS idx_user_book_prefs_last_accessed
  ON user_book_preferences(user_id, last_accessed_at DESC)
  WHERE last_accessed_at IS NOT NULL;
