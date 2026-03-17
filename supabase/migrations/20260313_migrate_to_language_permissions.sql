-- ============================================================
-- Migration: Migrate book permissions to language-specific format
-- Date: 2026-03-13
-- Purpose: Change '*' or '全部' to 'en:*' for existing users
--          This allows French books to be added without affecting
--          existing English-only users
-- ============================================================

-- Step 1: Show current state (for verification)
SELECT
  id,
  email,
  book_permissions,
  'BEFORE' as state
FROM profiles
WHERE book_permissions::text LIKE '%"全部"%' OR book_permissions::text LIKE '%"*"%'
LIMIT 10;

-- Step 2: Migrate '全部' to 'en:*'
UPDATE profiles
SET book_permissions = ARRAY_REPLACE(book_permissions, '全部', 'en:*')
WHERE '全部' = ANY(book_permissions);

-- Step 3: Migrate '*' to 'en:*'
UPDATE profiles
SET book_permissions = ARRAY_REPLACE(book_permissions, '*', 'en:*')
WHERE '*' = ANY(book_permissions);

-- Step 4: Show result (for verification)
SELECT
  id,
  email,
  book_permissions,
  'AFTER' as state
FROM profiles
WHERE book_permissions::text LIKE '%en:*%'
LIMIT 10;

-- ============================================================
-- Rollback script (if needed):
-- ============================================================
/*
-- Rollback: Change 'en:*' back to '全部'
UPDATE profiles
SET book_permissions = ARRAY_REPLACE(book_permissions, 'en:*', '全部')
WHERE 'en:*' = ANY(book_permissions);
*/
