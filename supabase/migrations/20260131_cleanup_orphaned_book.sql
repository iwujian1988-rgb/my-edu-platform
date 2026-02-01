-- 清理孤立的词库数据
-- 问题：词库 68090a64-edc6-4145-bde3-6cd56997868f 删除时失败
-- 原因：user_book_preferences 中仍有记录引用该书，导致外键约束阻塞删除
-- 修复：先删除 user_book_preferences，再删除 book

-- 1. 删除 user_book_preferences 中的记录（解除外键约束）
DELETE FROM public.user_book_preferences
WHERE book_id = '68090a64-edc6-4145-bde3-6cd56997868f';

-- 2. 删除词库本身
DELETE FROM public.books
WHERE id = '68090a64-edc6-4145-bde3-6cd56997868f';

-- 注意：该书的 chapters 和 words 已经在之前的删除操作中被删除了
