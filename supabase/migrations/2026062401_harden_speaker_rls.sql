-- Harden speaker module RLS after upload/admin iteration restart.
-- Root cause: older migrations used authenticated-role checks for admin writes,
-- which lets any signed-in user mutate speaker content and products.

ALTER TABLE public.speaker_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.speaker_sentences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.speaker_user_language_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.speaker_language_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.speaker_ghost_words ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "已登录用户可查看文章" ON public.speaker_articles;
DROP POLICY IF EXISTS "用户只能查看已购买语言的文章" ON public.speaker_articles;
DROP POLICY IF EXISTS "仅管理员可插入文章" ON public.speaker_articles;
DROP POLICY IF EXISTS "仅管理员可更新文章" ON public.speaker_articles;
DROP POLICY IF EXISTS "speaker_articles_admin_all" ON public.speaker_articles;
DROP POLICY IF EXISTS "speaker_articles_user_read_purchased_published" ON public.speaker_articles;

CREATE POLICY "speaker_articles_user_read_purchased_published"
  ON public.speaker_articles
  FOR SELECT
  USING (
    status IN ('published', 'active')
    AND EXISTS (
      SELECT 1
      FROM public.speaker_user_language_purchases AS purchase
      WHERE purchase.user_id = auth.uid()
        AND purchase.language = speaker_articles.language
        AND purchase.status = 'active'
        AND (purchase.expires_at IS NULL OR purchase.expires_at > NOW())
    )
  );

CREATE POLICY "speaker_articles_admin_all"
  ON public.speaker_articles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.administrators AS admin
      WHERE admin.user_id = auth.uid()
        AND admin.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.administrators AS admin
      WHERE admin.user_id = auth.uid()
        AND admin.is_active = true
    )
  );

DROP POLICY IF EXISTS "已登录用户可查看句子" ON public.speaker_sentences;
DROP POLICY IF EXISTS "仅管理员可插入句子" ON public.speaker_sentences;
DROP POLICY IF EXISTS "speaker_sentences_user_read_purchased_published" ON public.speaker_sentences;
DROP POLICY IF EXISTS "speaker_sentences_admin_all" ON public.speaker_sentences;

CREATE POLICY "speaker_sentences_user_read_purchased_published"
  ON public.speaker_sentences
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.speaker_articles AS article
      WHERE article.id = speaker_sentences.article_id
    )
  );

CREATE POLICY "speaker_sentences_admin_all"
  ON public.speaker_sentences
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.administrators AS admin
      WHERE admin.user_id = auth.uid()
        AND admin.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.administrators AS admin
      WHERE admin.user_id = auth.uid()
        AND admin.is_active = true
    )
  );

DROP POLICY IF EXISTS "系统可插入语言包购买记录" ON public.speaker_user_language_purchases;
DROP POLICY IF EXISTS "用户可更新自己的语言包" ON public.speaker_user_language_purchases;
DROP POLICY IF EXISTS "用户可查看自己的语言包" ON public.speaker_user_language_purchases;
DROP POLICY IF EXISTS "speaker_language_purchases_user_read_own" ON public.speaker_user_language_purchases;
DROP POLICY IF EXISTS "speaker_language_purchases_admin_all" ON public.speaker_user_language_purchases;

CREATE POLICY "speaker_language_purchases_user_read_own"
  ON public.speaker_user_language_purchases
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "speaker_language_purchases_admin_all"
  ON public.speaker_user_language_purchases
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.administrators AS admin
      WHERE admin.user_id = auth.uid()
        AND admin.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.administrators AS admin
      WHERE admin.user_id = auth.uid()
        AND admin.is_active = true
    )
  );

DROP POLICY IF EXISTS "所有人可查看语言包产品" ON public.speaker_language_products;
DROP POLICY IF EXISTS "仅管理员可插入语言包产品" ON public.speaker_language_products;
DROP POLICY IF EXISTS "仅管理员可更新语言包产品" ON public.speaker_language_products;
DROP POLICY IF EXISTS "仅管理员可删除语言包产品" ON public.speaker_language_products;
DROP POLICY IF EXISTS "speaker_language_products_public_read_active" ON public.speaker_language_products;
DROP POLICY IF EXISTS "speaker_language_products_admin_all" ON public.speaker_language_products;

CREATE POLICY "speaker_language_products_public_read_active"
  ON public.speaker_language_products
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "speaker_language_products_admin_all"
  ON public.speaker_language_products
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.administrators AS admin
      WHERE admin.user_id = auth.uid()
        AND admin.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.administrators AS admin
      WHERE admin.user_id = auth.uid()
        AND admin.is_active = true
    )
  );

DROP POLICY IF EXISTS "用户可删除自己的生词" ON public.speaker_ghost_words;
DROP POLICY IF EXISTS "speaker_ghost_words_user_delete_own" ON public.speaker_ghost_words;

CREATE POLICY "speaker_ghost_words_user_delete_own"
  ON public.speaker_ghost_words
  FOR DELETE
  USING (auth.uid() = user_id);
