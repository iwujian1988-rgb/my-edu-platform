/**
 * 添加 uk_phonetic 和 us_phonetic 字段的自动化脚本
 *
 * 使用方法：
 * 1. 复制下面生成的SQL
 * 2. 打开 Supabase 控制台：https://snnrjnpcmdsdlyldvvps.supabase.co
 * 3. 点击左侧 "SQL Editor"
 * 4. 粘贴SQL并点击 "Run"
 */

console.log(`
╔══════════════════════════════════════════════════════════════════╗
║  添加英式和美式音标字段                                          ║
╚══════════════════════════════════════════════════════════════════╝

📋 请复制以下SQL到Supabase控制台执行：

─────────────────────────────────────────────────────────────────────
ALTER TABLE words
ADD COLUMN IF NOT EXISTS uk_phonetic text,
ADD COLUMN IF NOT EXISTS us_phonetic text;
─────────────────────────────────────────────────────────────────────

📍 步骤：
   1. 打开: https://snnrjnpcmdsdlyldvvps.supabase.co
   2. 点击左侧菜单 "SQL Editor"
   3. 点击 "New query"
   4. 粘贴上面的SQL
   5. 点击 "Run" ▶️

✅ 完成后，音标补全脚本会自动更新这些字段！
`)
