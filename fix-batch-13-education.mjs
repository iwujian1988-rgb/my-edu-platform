/**
 * 批次13：学校和教育（30个）
 * school, teacher, student, class, lesson, homework, exam, test,
 * study, learn, read, write, draw, paint, count, measure, question,
 * answer, correct, wrong, pass, fail, grade, mark, score, subject,
 * math, English, science, history
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

const batch13Data = [
  { word: 'school', definition_en: 'A place where children go to learn.', collocation_en: 'go to school, primary school', example_sentence_en: 'Children go to school from Monday to Friday.', example_sentence: '孩子们周一到周五上学。' },
  { word: 'teacher', definition_en: 'A person whose job is to teach.', collocation_en: 'good teacher, teacher training', example_sentence_en: 'Our English teacher is very kind.', example_sentence: '我们的英语老师很和蔼。' },
  { word: 'student', definition_en: 'A person who is studying at a school or college.', collocation_en: 'good student, university student', example_sentence_en: 'She is a hard-working student.', example_sentence: '她是个勤奋的学生。' },
  { word: 'class', definition_en: 'A period of time when students are taught.', collocation_en: 'have class, attend class', example_sentence_en: 'We have a math class at 9 am.', example_sentence: '我们上午9点有数学课。' },
  { word: 'lesson', definition_en: 'A period of learning.', collocation_en: 'learn lesson, give lesson', example_sentence_en: 'Today we learned an important lesson about history.', example_sentence: '今天我们学了一堂重要的历史课。' },
  { word: 'homework', definition_en: 'Work that students do at home.', collocation_en: 'do homework, homework assignment', example_sentence_en: 'I have a lot of homework tonight.', example_sentence: '我今晚有很多家庭作业。' },
  { word: 'exam', definition_en: 'A formal test of knowledge.', collocation_en: 'take exam, pass exam', example_sentence_en: 'The final exam is next week.', example_sentence: '期末考试在下周。' },
  { word: 'test', definition_en: 'A set of questions to check knowledge.', collocation_en: 'take test, test paper', example_sentence_en: 'We have a math test tomorrow.', example_sentence: '我们明天有数学测验。' },
  { word: 'study', definition_en: 'To learn about a subject.', collocation_en: 'study hard, study for', example_sentence_en: 'I need to study for the exam.', example_sentence: '我需要为考试复习。' },
  { word: 'learn', definition_en: 'To get knowledge or skill.', collocation_en: 'learn English, learn from', example_sentence_en: 'Children learn quickly through games.', example_sentence: '孩子们通过游戏学得很快。' },
  { word: 'read', definition_en: 'To look at and understand written words.', collocation_en: 'read book, read aloud', example_sentence_en: 'I like to read before going to sleep.', example_sentence: '我喜欢睡前阅读。' },
  { word: 'write', definition_en: 'To make words or letters on paper.', collocation_en: 'write down, write letter', example_sentence_en: 'Please write your name at the top of the page.', example_sentence: '请在页面顶部写下你的名字。' },
  { word: 'draw', definition_en: 'To make a picture with a pen or pencil.', collocation_en: 'draw picture, learn to draw', example_sentence_en: 'The child loves to draw animals.', example_sentence: '这个孩子喜欢画动物。' },
  { word: 'paint', definition_en: 'To cover something with color; or to make art.', collocation_en: 'paint picture, paint wall', example_sentence_en: 'She likes to paint landscapes.', example_sentence: '她喜欢画风景画。' },
  { word: 'count', definition_en: 'To say numbers in order.', collocation_en: 'count money, count from', example_sentence_en: 'Can you count from one to ten?', example_sentence: '你能从一数到十吗？' },
  { word: 'measure', definition_en: 'To find the size or amount of something.', collocation_en: 'measure weight, measure length', example_sentence_en: 'Let me measure your height.', example_sentence: '让我量一下你的身高。' },
  { word: 'question', definition_en: 'A sentence that asks something.', collocation_en: 'ask question, answer question', example_sentence_en: 'Do you have any questions about the lesson?', example_sentence: '关于这节课你有什么问题吗？' },
  { word: 'answer', definition_en: 'A reply to a question; or to solve a problem.', collocation_en: 'answer question, correct answer', example_sentence_en: 'What is the correct answer?', example_sentence: '正确答案是什么？' },
  { word: 'correct', definition_en: 'Right or accurate.', collocation_en: 'correct answer, correct mistake', example_sentence_en: 'Your answer is correct.', example_sentence: '你的答案正确。' },
  { word: 'wrong', definition_en: 'Not correct or true.', collocation_en: 'wrong answer, get wrong', example_sentence_en: 'I am afraid your answer is wrong.', example_sentence: '恐怕你的答案是错的。' },
  { word: 'pass', definition_en: 'To succeed in an exam or test.', collocation_en: 'pass exam, pass test', example_sentence_en: 'Did you pass your driving test?', example_sentence: '你通过驾驶考试了吗？' },
  { word: 'fail', definition_en: 'To not succeed or pass.', collocation_en: 'fail exam, fail test', example_sentence_en: 'She failed the math test.', example_sentence: '她数学测验不及格。' },
  { word: 'grade', definition_en: 'A level of quality or mark.', collocation_en: 'good grade, get grade', example_sentence_en: 'She got excellent grades this term.', example_sentence: '她这学期成绩优秀。' },
  { word: 'mark', definition_en: 'A score for work or an exam.', collocation_en: 'high mark, full marks', example_sentence_en: 'He got full marks in the test.', example_sentence: '他测验得了满分。' },
  { word: 'score', definition_en: 'The number of points in a test or game.', collocation_en: 'high score, good score', example_sentence_en: 'What was your score in the test?', example_sentence: '你测验得了多少分？' },
  { word: 'subject', definition_en: 'An area of knowledge that you study.', collocation_en: 'school subject, favorite subject', example_sentence_en: 'Math is my favorite subject.', example_sentence: '数学是我最喜欢的科目。' },
  { word: 'math', definition_en: 'The study of numbers and shapes.', collocation_en: 'learn math, math problem', example_sentence_en: 'We have math homework today.', example_sentence: '我们今天有数学作业。' },
  { word: 'English', definition_en: 'The language of Britain, America, etc.', collocation_en: 'speak English, learn English', example_sentence_en: 'English is spoken all over the world.', example_sentence: '英语在世界各地都被使用。' },
  { word: 'science', definition_en: 'The study of the natural world.', collocation_en: 'study science, science class', example_sentence_en: 'Science helps us understand how things work.', example_sentence: '科学帮助我们理解事物如何运作。' },
  { word: 'history', definition_en: 'The study of past events.', collocation_en: 'study history, history lesson', example_sentence_en: 'We learned about ancient Rome in history class.', example_sentence: '我们在历史课上学习了古罗马。' }
]

async function updateBatch13() {
  console.log('🎓 开始更新批次13：学校和教育（30个）\n')

  const { data: allWords } = await supabase
    .from('words')
    .select('id, word')

  const wordToId = {}
  allWords.forEach(w => {
    wordToId[w.word] = w.id
  })

  const wordsToUpdate = batch13Data
    .map(item => {
      const id = wordToId[item.word]
      if (!id) return null
      return {
        id,
        definition_en: item.definition_en,
        collocation: item.example_sentence,
        collocation_en: item.collocation_en,
        example_sentence: item.example_sentence,
        example_sentence_en: item.example_sentence_en
      }
    })
    .filter(w => w !== null)

  console.log(`✅ 找到 ${wordsToUpdate.length} 个单词在数据库中\n`)
  console.log('📊 开始更新...\n')

  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < wordsToUpdate.length; i++) {
    const word = wordsToUpdate[i]

    process.stdout.write(`\r📊 进度: ${Math.round((i + 1) / wordsToUpdate.length * 100)}% (${i + 1}/${wordsToUpdate.length}) - 成功: ${successCount}, 错误: ${errorCount}`)

    try {
      const { error } = await supabase
        .from('words')
        .update({
          definition_en: word.definition_en,
          collocation: word.collocation,
          collocation_en: word.collocation_en,
          example_sentence: word.example_sentence,
          example_sentence_en: word.example_sentence_en
        })
        .eq('id', word.id)

      if (error) {
        errorCount++
      } else {
        successCount++
      }
    } catch (e) {
      errorCount++
    }
  }

  console.log('\n\n✅ 批次13更新完成！\n')
  console.log('📊 统计：')
  console.log(`  成功: ${successCount} 个`)
  console.log(`  错误: ${errorCount} 个`)
}

updateBatch13()
