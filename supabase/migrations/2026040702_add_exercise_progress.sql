-- 练习答题进度表：持久化用户的每道练习题作答记录
CREATE TABLE user_exercise_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES video_exercises(id) ON DELETE CASCADE,
  is_correct BOOLEAN NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 1,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, exercise_id)
);

-- RLS: 用户只能读写自己的记录
ALTER TABLE user_exercise_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own exercise progress"
  ON user_exercise_progress FOR ALL
  USING (auth.uid() = user_id);
