/**
 * 批次14：家庭和人物（25个）
 * family, parent, father, mother, brother, sister, son, daughter,
 * child, baby, boy, girl, man, woman, person, people, friend,
 * teacher, doctor, police, driver, farmer, worker, soldier, someone
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

const batch14Data = [
  { word: 'family', definition_en: 'A group of people related to each other.', collocation_en: 'family member, big family', example_sentence_en: 'My family has five people.', example_sentence: '我家有五口人。' },
  { word: 'parent', definition_en: 'A mother or father of someone.', collocation_en: 'single parent, parent meeting', example_sentence_en: 'Parents love their children very much.', example_sentence: '父母非常爱他们的孩子。' },
  { word: 'father', definition_en: 'A male parent.', collocation_en: 'my father, father and mother', example_sentence_en: 'My father is a doctor.', example_sentence: '我父亲是医生。' },
  { word: 'mother', definition_en: 'A female parent.', collocation_en: 'my mother, mother and father', example_sentence_en: 'My mother works at home.', example_sentence: '我母亲在家工作。' },
  { word: 'brother', definition_en: 'A boy or man who has the same parents as you.', collocation_en: 'older brother, younger brother', example_sentence_en: 'I have one brother and one sister.', example_sentence: '我有一个哥哥和一个姐姐。' },
  { word: 'sister', definition_en: 'A girl or woman who has the same parents as you.', collocation_en: 'older sister, younger sister', example_sentence_en: 'My sister is two years older than me.', example_sentence: '我姐姐比我大两岁。' },
  { word: 'son', definition_en: 'A male child of someone.', collocation_en: 'my son, only son', example_sentence_en: 'Their son goes to primary school.', example_sentence: '他们的儿子上小学。' },
  { word: 'daughter', definition_en: 'A female child of someone.', collocation_en: 'my daughter, only daughter', example_sentence_en: 'She has two daughters.', example_sentence: '她有两个女儿。' },
  { word: 'child', definition_en: 'A young human being.', collocation_en: 'young child, only child', example_sentence_en: 'Every child deserves love and care.', example_sentence: '每个孩子都值得被爱和关怀。' },
  { word: 'baby', definition_en: 'A very young child.', collocation_en: 'new baby, baby boy', example_sentence_en: 'The baby is sleeping now.', example_sentence: '宝宝现在在睡觉。' },
  { word: 'boy', definition_en: 'A male child or young man.', collocation_en: 'little boy, young boy', example_sentence_en: 'The boy is playing football in the park.', example_sentence: '男孩在公园里踢足球。' },
  { word: 'girl', definition_en: 'A female child or young woman.', collocation_en: 'little girl, young girl', example_sentence_en: 'The girl is wearing a red dress.', example_sentence: '女孩穿着红色连衣裙。' },
  { word: 'man', definition_en: 'An adult male human.', collocation_en: 'old man, young man', example_sentence_en: 'That man is my uncle.', example_sentence: '那个男人是我叔叔。' },
  { word: 'woman', definition_en: 'An adult female human.', collocation_en: 'young woman, old woman', example_sentence_en: 'The woman over there is my teacher.', example_sentence: '那边的那个女老师是我的老师。' },
  { word: 'person', definition_en: 'A human being.', collocation_en: 'young person, old person', example_sentence_en: 'There is a person waiting for you.', example_sentence: '有个人在等你。' },
  { word: 'people', definition_en: 'More than one person.', collocation_en: 'many people, young people', example_sentence_en: 'Many people enjoy listening to music.', example_sentence: '很多人喜欢听音乐。' },
  { word: 'friend', definition_en: 'A person you like and trust.', collocation_en: 'best friend, good friend', example_sentence_en: 'She is my best friend.', example_sentence: '她是我最好的朋友。' },
  { word: 'teacher', definition_en: 'A person who teaches.', collocation_en: 'good teacher, math teacher', example_sentence_en: 'Our teacher is very patient.', example_sentence: '我们的老师很耐心。' },
  { word: 'doctor', definition_en: 'A person trained to treat sick people.', collocation_en: 'see doctor, family doctor', example_sentence_en: 'You should see a doctor about that cough.', example_sentence: '你应该去看医生治一下咳嗽。' },
  { word: 'police', definition_en: 'People who enforce laws and keep order.', collocation_en: 'call police, police officer', example_sentence_en: 'Call the police if you see anything suspicious.', example_sentence: '如果你看到任何可疑情况，请报警。' },
  { word: 'driver', definition_en: 'A person who drives a vehicle.', collocation_en: 'bus driver, taxi driver', example_sentence_en: 'The bus driver was very helpful.', example_sentence: '公交车司机很乐于助人。' },
  { word: 'farmer', definition_en: 'A person who grows crops or raises animals.', collocation_en: 'dairy farmer, farmer work', example_sentence_en: 'The farmer gets up early every morning.', example_sentence: '农民每天早上起得很早。' },
  { word: 'worker', definition_en: 'A person who does a job or works.', collocation_en: 'factory worker, hard worker', example_sentence_en: 'Workers built this bridge in six months.', example_sentence: '工人们六个月建成了这座桥。' },
  { word: 'soldier', definition_en: 'A person in the army.', collocation_en: 'young soldier, soldier serve', example_sentence_en: 'The soldier served in the army for ten years.', example_sentence: '这名士兵在军队服役了十年。' },
  { word: 'someone', definition_en: 'A person when you do not know who.', collocation_en: 'help someone, see someone', example_sentence_en: 'Someone is knocking at the door.', example_sentence: '有人在敲门。' }
]

async function updateBatch14() {
  console.log('🎓 开始更新批次14：家庭和人物（25个）\n')

  const { data: allWords } = await supabase
    .from('words')
    .select('id, word')

  const wordToId = {}
  allWords.forEach(w => {
    wordToId[w.word] = w.id
  })

  const wordsToUpdate = batch14Data
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

  console.log('\n\n✅ 批次14更新完成！\n')
  console.log('📊 统计：')
  console.log(`  成功: ${successCount} 个`)
  console.log(`  错误: ${errorCount} 个`)
}

updateBatch14()
