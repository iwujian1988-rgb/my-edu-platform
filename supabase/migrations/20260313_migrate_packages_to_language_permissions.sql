-- ============================================================
-- Migration: Migrate invitation_packages to language-specific format
-- Date: 2026-03-13
-- Purpose: Change '*' to 'en:*' for existing packages
--          This allows French books to be added without affecting
--          existing English-only packages
-- ============================================================

-- Step 1: Show current state (for verification)
SELECT
  id,
  name,
  book_permissions,
  'BEFORE' as state
FROM invitation_packages
WHERE book_permissions::text LIKE '%"*"%'
ORDER BY sort_order;

-- Step 2: Migrate '*' to 'en:*' in packages
UPDATE invitation_packages
SET book_permissions = ARRAY_REPLACE(book_permissions, '*', 'en:*')
WHERE '*' = ANY(book_permissions);

-- Step 3: Show result (for verification)
SELECT
  id,
  name,
  book_permissions,
  'AFTER' as state
FROM invitation_packages
WHERE book_permissions::text LIKE '%en:*%'
ORDER BY sort_order;

-- ============================================================
-- Rollback script (if needed):
-- ============================================================
/*
-- Rollback: Change 'en:*' back to '*'
UPDATE invitation_packages
SET book_permissions = ARRAY_REPLACE(book_permissions, 'en:*', '*')
WHERE 'en:*' = ANY(book_permissions);
*/
