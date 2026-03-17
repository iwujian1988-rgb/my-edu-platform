import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 38本英语书 ID
const englishBookIds = [
  "e5545dac-3439-41b4-a2c1-1171004382b5",
  "76495839-7d60-41dc-9daa-3c881ef0fdc7",
  "be7e192a-69a4-47bc-a6e9-be635e220ead",
  "6400349d-7994-4e0c-b4fe-4b04e6830608",
  "4fff1da4-c82e-4528-bdb1-d8e1524eee77",
  "80cb0be5-5fbb-4880-b2d1-f5c1d4576b10",
  "e4f3db95-53a6-48a0-ac95-650f0bb9ebb9",
  "9f2bbc5b-007b-40d1-89ce-808ca6aa531e",
  "388b33f0-c937-4f10-be01-a5b21001cde7",
  "febe706a-b48e-441a-8546-857fea86b09b",
  "7f9b5798-97fb-473c-bbdf-b7e29fbee2a9",
  "85f95fe5-de25-404f-b7b8-32d98dfe9e26",
  "4805392b-4adb-42c2-a472-066bbbae9afb",
  "9f1e6332-979d-4632-a8f6-8bd35246b28d",
  "f5882a18-d087-418a-aff2-81bf7fa6d2ea",
  "35fbe279-8493-428e-a5c6-164a79c09115",
  "b80304a9-b578-4a9f-b7da-0c07b8f0a2e0",
  "ee471901-614c-4f67-8ef2-1dc46422c529",
  "9c8a75dd-f952-42b5-b065-9300e1a8e888",
  "003b4ce0-c3f9-407a-a7d6-5e80ada4eae5",
  "251e8b56-31a9-4a95-9963-f808aac1460c",
  "0de7c5a1-eff0-4911-adb7-28be6863be0c",
  "5d278f51-79d7-4f0d-b7b8-cc6d00632d82",
  "d54d4b91-ae84-48d8-868c-7aefda36779d",
  "f4084a30-f07e-44aa-afe9-70a6400fa62a",
  "2dfcc66a-908e-478d-8b2b-bef98f0547c8",
  "81a7210b-4b24-4e3d-b034-267183ce5eed",
  "00ec921f-df0d-40ee-8003-bf751d65435b",
  "cb25ae4f-92df-46d3-ad60-7dcb7c94911b",
  "20b0873a-3d57-4cfe-9724-0bd7bfeea425",
  "e5c4c876-4768-4f80-82d4-b290934452a3",
  "324a01eb-2f25-4e33-844d-d6b42e99393a",
  "8164828a-8384-4f30-a703-62616751165b",
  "6437eeb7-56a4-4d8b-8fe9-d38c4ca17acf",
  "c8a08259-07ad-40f6-b7a5-28d1e0d0bd64",
  "da0c2f11-19e9-457d-ba7e-014d1de5a6f1",
  "f527cead-74f9-47c2-8a33-928cb20cb785",
  "8c1fcade-0648-4aca-8070-407c7dd3026a"
];

console.log('更新月卡套餐...');
const { data: pkg, error: pkgError } = await supabase
  .from('invitation_packages')
  .update({ book_permissions: englishBookIds })
  .eq('id', '1da77997-da89-4acd-81bb-ce4d2018baa2')
  .select('name');

if (pkgError) {
  console.error('套餐更新失败:', pkgError);
} else {
  console.log('✅ 套餐更新成功:', pkg[0]?.name, `(${englishBookIds.length}本书)`);
}

console.log('\n更新用户 13110244186...');
const { data: user, error: userError } = await supabase
  .from('users')
  .update({ book_permissions: englishBookIds })
  .like('email', '13110244186%')
  .select('email');

if (userError) {
  console.error('用户更新失败:', userError);
} else {
  console.log('✅ 用户更新成功:', user[0]?.email, `(${englishBookIds.length}本书)`);
}
