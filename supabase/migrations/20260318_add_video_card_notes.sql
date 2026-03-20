-- 视频卡片笔记表
-- 用于存储用户对视频卡片（词汇/短语/惯用语）的个人笔记

CREATE TABLE IF NOT EXISTS video_card_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  card_id UUID NOT NULL,
  card_type VARCHAR(20) NOT NULL CHECK (card_type IN ('word', 'phrase', 'expression')),
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, card_id, card_type)
);

-- 索引优化
CREATE INDEX IF NOT EXISTS idx_video_card_notes_user_id ON video_card_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_video_card_notes_video_id ON video_card_notes(video_id);
CREATE INDEX IF NOT EXISTS idx_video_card_notes_card ON video_card_notes(card_id, card_type);

-- 更新时间触发器
CREATE OR REPLACE FUNCTION update_video_card_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_video_card_notes_updated_at
  BEFORE UPDATE ON video_card_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_video_card_notes_updated_at();

-- RLS 策略
ALTER TABLE video_card_notes ENABLE ROW LEVEL SECURITY;

-- 用户只能查看自己的笔记
CREATE POLICY "Users can view own notes" ON video_card_notes
  FOR SELECT USING (auth.uid() = user_id);

-- 用户只能插入自己的笔记
CREATE POLICY "Users can insert own notes" ON video_card_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 用户只能更新自己的笔记
CREATE POLICY "Users can update own notes" ON video_card_notes
  FOR UPDATE USING (auth.uid() = user_id);

-- 用户只能删除自己的笔记
CREATE POLICY "Users can delete own notes" ON video_card_notes
  FOR DELETE USING (auth.uid() = user_id);

COMMENT ON TABLE video_card_notes IS '视频卡片笔记表 - 存储用户对视频卡片的个人笔记';
