-- 创建视频学习内容表
-- 作者: Claude
-- 创建时间: 2026-03-23

-- ============================================
-- 1. 语法点表
-- ============================================

create table video_grammar_points (
  id uuid primary key default uuid_generatev4() not null,
  video_id uuid not null
    references videos(id) on delete cascade,
  display_order integer,
  name text not null,
  structure text,
  example_french text,
  example_chinese text,
  example_ipa text,
  purpose text,
  note text,
  created_at timestamp with default timezone,
  updated_at timestamp with default timezone
);

-- ============================================
-- 2. 发音要点表
-- ============================================

create table video_pronunciation_tips (
  id uuid primary key default uuid_generatev4() not null,
  video_id uuid not null
    references videos(id) on delete cascade,
  display_order integer,
  sound_symbol text not null,
  example_words text[],
  instruction text,
  practice_tip text,
  created_at timestamp with default timezone
  updated_at timestamp with default timezone
);

-- ============================================
-- 3. 词汇网络表
-- ============================================

create table video_vocabulary_networks (
  id uuid primary key default uuid_generatev4() not null,
  video_id uuid not null
    references videos(id) on delete cascade,
  theme text,
  structure text,
  created_at timestamp with default timezone
  updated_at timestamp with default timezone
);

-- ============================================
-- 4. RLS 策略
-- ============================================

-- 4.1 grammar_points 表 - 允许所有认证用户查看已发布的视频的学习内容
create policy "Grammar points are viewable by authenticated users"
  on video_grammar_points for select
  using (
    exists (
      select 1 from videos v
      where v.id = video_grammar_points.video_id
      and v.status = 'published'
    )
  );

-- 4.2 pronunciation_tips 表 - 允许所有认证用户查看已发布的视频的学习内容
create policy "Pronunciation tips are viewable by authenticated users"
  on video_pronunciation_tips for select
  using (
    exists (
      select 1 from videos v
      where v.id = video_pronunciation_tips.video_id
      and v.status = 'published'
    )
  );

-- 4.3 vocabulary_networks 表 - 允许所有认证用户查看已发布的视频的学习内容
create policy "Vocabulary networks are viewable by authenticated users"
  on video_vocabulary_networks for select
  using (
    exists (
      select 1 from videos v
      where v.id = video_vocabulary_networks.video_id
      and v.status = 'published'
    )
  );

-- 4.4 添加管理员完全访问的 RLS 策略
create policy "Admin can manage all grammar points"
  on video_grammar_points for all
  using (
    exists (
      select 1 from user_roles ur
      where ur.user_id = auth.uid()
      and ur.role = 'admin'
    )
  );

create policy "Admin can manage all pronunciation tips"
  on video_pronunciation_tips for all
  using (
    exists (
      select 1 from user_roles ur
      where ur.user_id = auth.uid()
      and ur.role = 'admin'
    )
  );

create policy "Admin can manage all vocabulary networks"
  on video_vocabulary_networks for all
  using (
    exists (
      select 1 from user_roles ur
      where ur.user_id = auth.uid()
      and ur.role = 'admin'
    )
  );
