import { createClient, getCurrentUser } from '@/lib/supabase/server'

export default async function DebugWordDetailPage() {
  const user = await getCurrentUser()

  if (!user) {
    return <div className="p-8">请先登录</div>
  }

  const supabase = await createClient()

  // 查询那两个"不认识"的单词的完整信息
  const wordIds = [
    '47be1353-ec06-476f-90a1-aa7e9cd7f472',
    'f1b1b221-18d6-4266-a464-34b125339840'
  ]

  // 1. 查询 word_progress 表
  const { data: progressData, error: progressError } = await supabase
    .from('word_progress')
    .select('*')
    .in('word_id', wordIds)
    .eq('user_id', user.id)

  // 2. 查询 words 表，获取单词的详细信息
  const { data: wordsData, error: wordsError } = await supabase
    .from('words')
    .select('*')
    .in('id', wordIds)

  // 3. 对比：查询一个正常单词作为参考
  const { data: referenceWord, error: refError } = await supabase
    .from('words')
    .select('*')
    .eq('id', '978fc887-5cbb-4a6b-9c95-640eccfbe1da')
    .single() as { data: any, error: any }

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: '#F8F5F2' }}>
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-black mb-6">🔍 单词详情检查</h1>

        {/* Word Progress 数据 */}
        <div className="clay-card p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Word Progress 表数据</h2>
          {progressError && <p className="text-red-600">错误: {progressError.message}</p>}
          <div className="space-y-4">
            {progressData?.map((progress: any) => (
              <div key={progress.id} className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><strong>ID:</strong> {progress.id}</div>
                  <div><strong>Word ID:</strong> {progress.word_id}</div>
                  <div><strong>Book ID:</strong> {progress.book_id}</div>
                  <div><strong>Status:</strong> {progress.status}</div>
                  <div><strong>Practice Count:</strong> {progress.practice_count}</div>
                  <div><strong>Correct Count:</strong> {progress.correct_count}</div>
                  <div><strong>Mastery Level:</strong> {progress.mastery_level}</div>
                  <div><strong>Match Count:</strong> {progress.match_count}</div>
                  <div><strong>Fail Count:</strong> {progress.fail_count}</div>
                  <div><strong>Created:</strong> {progress.created_at}</div>
                  <div><strong>Updated:</strong> {progress.updated_at}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Words 表数据 */}
        <div className="clay-card p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Words 表数据</h2>
          {wordsError && <p className="text-red-600">错误: {wordsError.message}</p>}
          <div className="space-y-4">
            {wordsData?.map((word: any) => (
              <div key={word.id} className="bg-blue-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="col-span-2"><strong>Word:</strong> <span className="text-xl font-bold">{word.word}</span></div>
                  <div><strong>ID:</strong> {word.id}</div>
                  <div><strong>Book ID:</strong> {word.book_id}</div>
                  <div><strong>Phonetic:</strong> {word.phonetic || '❌ 缺失'}</div>
                  <div><strong>Part of Speech:</strong> {word.part_of_speech || '❌ 缺失'}</div>
                  <div className="col-span-2"><strong>Definition:</strong> {word.definition || '❌ 缺失'}</div>
                  <div className="col-span-2"><strong>Definition EN:</strong> {word.definition_en || '✅ 正常（可为空）'}</div>
                  <div className="col-span-2"><strong>Collocation:</strong> {word.collocation || '✅ 正常（可为空）'}</div>
                  <div className="col-span-2"><strong>Example:</strong> {word.example_sentence || '✅ 正常（可为空）'}</div>
                  <div><strong>Chapter:</strong> {word.chapter || '❌ 缺失'}</div>
                  <div><strong>Theme:</strong> {word.theme || '✅ 正常（可为空）'}</div>
                  <div><strong>Scene:</strong> {word.scene || '✅ 正常（可为空）'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 参考单词 */}
        <div className="clay-card p-6">
          <h2 className="text-xl font-bold mb-4">参考单词（正常数据）</h2>
          {refError && <p className="text-red-600">错误: {refError.message}</p>}
          {referenceWord && (
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="col-span-2"><strong>Word:</strong> <span className="text-xl font-bold">{referenceWord.word}</span></div>
                <div><strong>ID:</strong> {referenceWord.id}</div>
                <div><strong>Book ID:</strong> {referenceWord.book_id}</div>
                <div><strong>Phonetic:</strong> {referenceWord.phonetic || '❌ 缺失'}</div>
                <div><strong>Part of Speech:</strong> {referenceWord.part_of_speech || '❌ 缺失'}</div>
                <div className="col-span-2"><strong>Definition:</strong> {referenceWord.definition || '❌ 缺失'}</div>
                <div><strong>Chapter:</strong> {referenceWord.chapter || '❌ 缺失'}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
