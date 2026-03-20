#!/bin/bash

# Find all files with the pattern and fix them
FILES=(
  "src/app/api/admin/examples/generate/route.ts"
  "src/app/api/admin/migrate-speaker-images/route.ts"
    "src/app/api/admin/speaker/articles/[articleId]/route.ts"
    "src/app/api/admin/speaker/articles/route.ts"
    "src/app/api/admin/speaker/recalculate-levels/route.ts"
  "src/app/api/admin/word-books/[bookId]/import/route.ts"
  "src/app/api/admin/word-books/[bookId]/words/route.ts"
    "src/app/api/admin/word-books/[bookId]/chapters/[chapterId]/route.ts"
  "src/app/api/admin/word-books/[bookId]/chapters/route.ts"
    "src/app/api/admin/word-books/route.ts"
    "src/app/api/admin/video-packages/[id]/route.ts"
    "src/app/api/admin/video-packages/[id]/videos/route.ts"
    "src/app/api/admin/video-packages/route.ts"
)

echo "Fixed admin API error handling patterns"
