# RPC函数修复说明

## 问题

RPC函数 `get_book_words_paginated_optimized` 引用了不存在的 `theme` 和 `scene` 列，导致查询失败。

## 解决方案

### 方法1: 通过Supabase控制台执行(推荐)

1. 访问 https://supabase.com/dashboard/project/snnrjnpcmdsdlyldvvps/sql
2. 粘贴以下SQL并点击"Run"

```sql
DROP FUNCTION IF EXISTS get_book_words_paginated_optimized(UUID, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION get_book_words_paginated_optimized(
  book_uuid UUID,
  offset_val INTEGER DEFAULT 0,
  limit_val INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  word TEXT,
  phonetic TEXT,
  uk_phonetic TEXT,
  us_phonetic TEXT,
  definition TEXT,
  definition_en TEXT,
  collocation TEXT,
  collocation_en TEXT,
  example_sentence TEXT,
  example_sentence_en TEXT,
  part_of_speech TEXT,
  chapter TEXT,
  chapter_id UUID,
  order_index INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.id,
    w.word,
    w.phonetic,
    w.uk_phonetic,
    w.us_phonetic,
    w.definition,
    w.definition_en,
    w.collocation,
    w.collocation_en,
    w.example_sentence,
    w.example_sentence_en,
    w.part_of_speech,
    w.chapter,
    w.chapter_id,
    w.order_index
  FROM words w
  WHERE w.book_id = book_uuid
  ORDER BY w.order_index ASC
  LIMIT limit_val
  OFFSET offset_val;
END;
$$;
```

### 方法2: 添加DATABASE_URL后运行脚本

1. 在 `.env.local` 中添加:
```
DATABASE_URL="postgresql://postgres.snnrjnpcmdsdlyldvvps:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
```

2. 运行修复脚本:
```bash
node apply-sql-fix.mjs
```

## 验证

修复后运行测试验证:
```bash
npm test -- resume-state --reporter=line
```

应该能看到单词数据正常加载，测试通过率提升。
