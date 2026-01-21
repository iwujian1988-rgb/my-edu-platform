/**
 * 使用AI能力为KET词库补全搭配、例句和英文释义
 *
 * 策略：分批处理，每批20个单词
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

// AI生成的单词数据（首批20个常见单词）
const wordData = [
  {
    word: 'abbreviation',
    definition_cn: '缩写，缩写词',
    definition_en: 'A shortened form of a word or phrase.',
    collocation: 'common abbreviation, standard abbreviation',
    example_en: '"TV" is a common abbreviation for "television."',
    example_cn: '"TV"是"television"的常见缩写。'
  },
  {
    word: 'ability',
    definition_cn: '能力，才能',
    definition_en: 'The power or skill to do something.',
    collocation: 'natural ability, musical ability, ability to do something',
    example_en: 'She has the ability to speak three languages.',
    example_cn: '她有说三种语言的能力。'
  },
  {
    word: 'about',
    definition_cn: '关于；大约',
    definition_en: 'On the subject of; approximately.',
    collocation: 'talk about, think about, all about',
    example_en: 'This book is about dinosaurs.',
    example_cn: '这本书是关于恐龙的。'
  },
  {
    word: 'above',
    definition_cn: '在...上方；超过',
    definition_en: 'At a higher level or layer than.',
    collocation: 'above all, above average, well above',
    example_en: 'The bird flew above the trees.',
    example_cn: '鸟在树上方飞翔。'
  },
  {
    word: 'address',
    definition_cn: '地址；演讲；向...说话',
    definition_en: 'A description of the location of a building; to speak to someone.',
    collocation: 'email address, home address, postal address',
    example_en: 'What is your home address?',
    example_cn: '你的家庭地址是什么？'
  },
  {
    word: 'adult',
    definition_cn: '成年人',
    definition_en: 'A person who has reached the age of maturity.',
    collocation: 'young adult, adult education, grown adult',
    example_en: 'You must be an adult to vote.',
    example_cn: '你必须成年才能投票。'
  },
  {
    word: 'after',
    definition_cn: '在...之后',
    definition_en: 'At a time later than.',
    collocation: 'soon after, day after, shortly after',
    example_en: 'We went home after the movie.',
    example_cn: '电影结束后我们回了家。'
  },
  {
    word: 'afternoon',
    definition_cn: '下午',
    definition_en: 'The time of day from noon until evening.',
    collocation: 'Saturday afternoon, in the afternoon, late afternoon',
    example_en: 'I play football on Saturday afternoon.',
    example_cn: '我在星期六下午踢足球。'
  },
  {
    word: 'again',
    definition_cn: '再一次',
    definition_en: 'Once more; another time.',
    collocation: 'try again, again and again, time and time again',
    example_en: 'Can you say that again?',
    example_cn: '你能再说一遍吗？'
  },
  {
    word: 'against',
    definition_cn: '反对；倚靠；对抗',
    definition_en: 'In opposition to; in contact with.',
    collocation: 'play against, fight against, lean against',
    example_en: 'Our team played against their team yesterday.',
    example_cn: '昨天我们队和他们队比赛了。'
  },
  {
    word: 'age',
    definition_cn: '年龄；时代',
    definition_en: 'The length of time that someone has lived.',
    collocation: 'old age, middle age, same age',
    example_en: 'What is your age?',
    example_cn: '你几岁了？'
  },
  {
    word: 'ago',
    definition_cn: '以前',
    definition_en: 'Used to show how far in the past something happened.',
    collocation: 'long ago, a few days ago, many years ago',
    example_en: 'I visited London two years ago.',
    example_cn: '我两年前去过伦敦。'
  },
  {
    word: 'agree',
    definition_cn: '同意；赞成',
    definition_en: 'To have the same opinion; to say yes.',
    collocation: 'agree with, agree to, agree on',
    example_en: 'I agree with your opinion.',
    example_cn: '我同意你的观点。'
  },
  {
    word: 'agreement',
    definition_cn: '协议；同意',
    definition_en: 'A arrangement or decision made by two or more people.',
    collocation: 'reach an agreement, trade agreement, verbal agreement',
    example_en: 'They reached an agreement after a long discussion.',
    example_cn: '经过长时间讨论后他们达成了协议。'
  },
  {
    word: 'air',
    definition_cn: '空气；大气',
    definition_en: 'The invisible gas that we breathe.',
    collocation: 'fresh air, cold air, in the air',
    example_en: 'Fresh air is good for your health.',
    example_cn: '新鲜空气对你的健康有益。'
  },
  {
    word: 'airport',
    definition_cn: '机场',
    definition_en: 'A place where airplanes take off and land.',
    collocation: 'international airport, busy airport, airport terminal',
    example_en: 'We met him at the airport.',
    example_cn: '我们在机场接了他。'
  },
  {
    word: 'all',
    definition_cn: '全部；所有',
    definition_en: 'The whole quantity or extent of something.',
    collocation: 'all day, all night, all over',
    example_en: 'I worked all day yesterday.',
    example_cn: '昨天我工作了一整天。'
  },
  {
    word: 'allow',
    definition_cn: '允许；让',
    definition_en: 'To give permission for something to happen.',
    collocation: 'allow someone to do, allow smoking, allow pets',
    example_en: 'My parents don\'t allow me to watch TV late at night.',
    example_cn: '我父母不允许我深夜看电视。'
  },
  {
    word: 'almost',
    definition_cn: '几乎；差不多',
    definition_en: 'Very nearly but not exactly.',
    collocation: 'almost everyone, almost never, almost ready',
    example_en: 'The bottle is almost empty.',
    example_cn: '瓶子几乎空了。'
  },
  {
    word: 'alone',
    definition_cn: '单独；独自',
    definition_en: 'Without anyone else; on one\'s own.',
    collocation: 'live alone, all alone, go alone',
    example_en: 'She likes to live alone.',
    example_cn: '她喜欢独自生活。'
  }
]

async function main() {
  console.log('🤖 使用AI能力为KET词库补全搭配、例句和英文释义\n')
  console.log('📝 首批处理: 20个常见单词\n')

  // 获取KET词库ID
  const { data: ketBook } = await supabase
    .from('books')
    .select('id')
    .ilike('title', '%KET%')
    .single()

  const { data: chapters } = await supabase
    .from('chapters')
    .select('id')
    .eq('book_id', ketBook.id)

  const chapterIds = chapters.map(c => c.id)

  let successCount = 0
  let notFoundCount = 0
  let errorCount = 0

  for (let i = 0; i < wordData.length; i++) {
    const item = wordData[i]

    process.stdout.write(`\r📊 进度: ${Math.round((i + 1) / wordData.length * 100)}% (${i + 1}/${wordData.length}) - 成功: ${successCount}, 未找到: ${notFoundCount}, 错误: ${errorCount}`)

    try {
      // 先查找这个单词在数据库中的记录
      const { data: existingWord } = await supabase
        .from('words')
        .select('id')
        .eq('word', item.word)
        .in('chapter_id', chapterIds)
        .single()

      if (!existingWord) {
        notFoundCount++
        continue
      }

      // 更新记录
      const { error } = await supabase
        .from('words')
        .update({
          definition_en: item.definition_en,
          collocation: item.collocation,
          collocation_en: item.collocation,
          example_sentence: item.example_cn,
          example_sentence_en: item.example_en
        })
        .eq('id', existingWord.id)

      if (error) {
        console.error(`\n❌ 更新 ${item.word} 失败:`, error.message)
        errorCount++
      } else {
        successCount++
      }
    } catch (e) {
      console.error(`\n❌ 处理 ${item.word} 异常:`, e.message)
      errorCount++
    }
  }

  console.log(`\n\n✅ 首批更新完成！\n`)
  console.log('📊 统计：')
  console.log(`  成功: ${successCount} 个`)
  console.log(`  未找到: ${notFoundCount} 个`)
  console.log(`  错误: ${errorCount} 个\n`)

  // 验证结果
  console.log('🔍 验证示例：\n')
  const samples = ['abbreviation', 'ability', 'afternoon', 'allow', 'alone']

  for (const word of samples) {
    const { data: w } = await supabase
      .from('words')
      .select('word, definition, definition_en, collocation_en, example_sentence_en, example_sentence')
      .eq('word', word)
      .in('chapter_id', chapterIds)
      .single()

    if (w) {
      console.log(`${w.word}:`)
      console.log(`  中文: ${w.definition}`)
      console.log(`  英文: ${w.definition_en}`)
      console.log(`  搭配: ${w.collocation_en}`)
      console.log(`  例句: ${w.example_sentence_en}`)
      console.log(`  翻译: ${w.example_sentence}`)
      console.log()
    }
  }

  // 统计更新后的覆盖率
  const { data: allWords } = await supabase
    .from('words')
    .select('definition_en, example_sentence, example_sentence_en, collocation_en')
    .in('chapter_id', chapterIds)

  const totalCount = allWords.length
  const withDefinitionEn = allWords.filter(w => w.definition_en).length
  const withExampleEn = allWords.filter(w => w.example_sentence_en).length
  const withExampleCn = allWords.filter(w => w.example_sentence).length
  const withCollocationEn = allWords.filter(w => w.collocation_en).length

  console.log('📊 当前字段覆盖率：')
  console.log(`  英文释义: ${withDefinitionEn}/${totalCount} (${Math.round(withDefinitionEn/totalCount*100)}%)`)
  console.log(`  例句(英): ${withExampleEn}/${totalCount} (${Math.round(withExampleEn/totalCount*100)}%)`)
  console.log(`  例句(中): ${withExampleCn}/${totalCount} (${Math.round(withExampleCn/totalCount*100)}%)`)
  console.log(`  搭配(英): ${withCollocationEn}/${totalCount} (${Math.round(withCollocationEn/totalCount*100)}%)`)

  console.log('\n💡 提示：这是首批20个单词的示例。')
  console.log('   如需处理全部520个单词，我可以继续生成剩余500个单词的数据。')
}

main()
