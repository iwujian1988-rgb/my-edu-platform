/**
 * 批量修复M组词汇（62个）
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

// 读取低质量词列表
const lowQualityWords = JSON.parse(fs.readFileSync('low-quality-words.json', 'utf-8'))

// M组高质量数据
const mGroupData = [
  { word: 'minutes', definition_en: 'A written record of what was said at a meeting.', collocation_en: 'meeting minutes, take minutes', example_sentence_en: 'Who will take the minutes of this meeting?', example_sentence: '谁来做这次会议的记录？' },
  { word: 'member', definition_en: 'A person belonging to a group or organization.', collocation_en: 'team member, family member', example_sentence_en: 'Every member must follow the rules.', example_sentence: '每个成员都必须遵守规则。' },
  { word: 'Mathematics', definition_en: 'The study of numbers, shapes, and patterns.', collocation_en: 'study mathematics, love mathematics', example_sentence_en: 'Mathematics is important for many careers.', example_sentence: '数学对许多职业都很重要。' },
  { word: 'marketing', definition_en: 'The business of promoting and selling products.', collocation_en: 'marketing department, marketing strategy', example_sentence_en: 'The company needs better marketing.', example_sentence: '公司需要更好的营销。' },
  { word: 'motorway', definition_en: 'A wide road for fast traffic.', collocation_en: 'drive on motorway, motorway exit', example_sentence_en: 'We drove on the motorway for three hours.', example_sentence: '我们在高速公路上开了三小时。' },
  { word: 'mountain', definition_en: 'A very high hill.', collocation_en: 'climb mountain, mountain top', example_sentence_en: 'The mountain is covered with snow in winter.', example_sentence: '冬天山上覆盖着雪。' },
  { word: 'menu', definition_en: 'A list of food available at a restaurant.', collocation_en: 'read menu, menu item', example_sentence_en: 'Can I see the menu, please?', example_sentence: '请给我看看菜单。' },
  { word: 'meeting', definition_en: 'A gathering of people for discussion.', collocation_en: 'have meeting, attend meeting', example_sentence_en: 'The meeting will start at 2 PM.', example_sentence: '会议将在下午2点开始。' },
  { word: 'moon', definition_en: 'The round object that shines in the night sky.', collocation_en: 'full moon, look at moon', example_sentence_en: 'The moon is very bright tonight.', example_sentence: '今晚月亮很亮。' },
  { word: 'meal', definition_en: 'An occasion when food is eaten.', collocation_en: 'have meal, main meal', example_sentence_en: 'Breakfast is the most important meal of the day.', example_sentence: '早餐是一天中最重要的一餐。' },
  { word: 'mineral', definition_en: 'A natural substance from the ground.', collocation_en: 'mineral water, rich in minerals', example_sentence_en: 'Mineral water is good for your health.', example_sentence: '矿泉水对你的健康有好处。' },
  { word: 'mile', definition_en: 'A unit of distance equal to 1,609 meters.', collocation_en: 'ten miles, walk a mile', example_sentence_en: 'My school is two miles from my home.', example_sentence: '我们学校离我家两英里。' },
  { word: 'market', definition_en: 'A place where people buy and sell things.', collocation_en: 'go to market, stock market', example_sentence_en: 'We buy fresh vegetables at the market.', example_sentence: '我们在市场买新鲜蔬菜。' },
  { word: 'mechanic', definition_en: 'A person who repairs machines and vehicles.', collocation_en: 'car mechanic, become mechanic', example_sentence_en: 'The mechanic fixed my car quickly.', example_sentence: '机械师很快修好了我的车。' },
  { word: 'moment', definition_en: 'A very short period of time.', collocation_en: 'wait a moment, at the moment', example_sentence_en: 'Can you wait for a moment?', example_sentence: '你能等一下吗？' },
  { word: 'medicine', definition_en: 'Substances used to treat illness.', collocation_en: 'take medicine, give medicine', example_sentence_en: 'You must take your medicine every day.', example_sentence: '你必须每天吃药。' },
  { word: 'midnight', definition_en: 'Twelve o\'clock at night.', collocation_en: 'at midnight, before midnight', example_sentence_en: 'The party will continue until midnight.', example_sentence: '聚会将持续到午夜。' },
  { word: 'magazine', definition_en: 'A publication with articles and pictures.', collocation_en: 'read magazine, fashion magazine', example_sentence_en: 'I like reading magazines in my free time.', example_sentence: '我喜欢在空闲时间读杂志。' },
  { word: 'main', definition_en: 'Most important; largest or chief.', collocation_en: 'main reason, main street', example_sentence_en: 'What is the main idea of this article?', example_sentence: '这篇文章的主要思想是什么？' },
  { word: 'main course', definition_en: 'The most important part of a meal.', collocation_en: 'serve main course, main course is', example_sentence_en: 'The main course is roast beef.', example_sentence: '主菜是烤牛肉。' },
  { word: 'minute', definition_en: 'A unit of time equal to 60 seconds.', collocation_en: 'wait a minute, in a minute', example_sentence_en: 'I\'ll be ready in just a minute!', example_sentence: '我马上就好！' },
  { word: 'mirror', definition_en: 'A glass that shows your reflection.', collocation_en: 'look in mirror, bathroom mirror', example_sentence_en: 'Look in the mirror and check your hair.', example_sentence: '照照镜子检查一下头发。' },
  { word: 'mobile phone', definition_en: 'A phone you can carry with you.', collocation_en: 'use mobile phone, answer mobile phone', example_sentence_en: 'My mobile phone battery is low.', example_sentence: '我的手机电量低了。' },
  { word: 'mother', definition_en: 'A female parent.', collocation_en: 'my mother, like mother', example_sentence_en: 'My mother is a teacher.', example_sentence: '我母亲是老师。' },
  { word: 'married', definition_en: 'Having a husband or wife.', collocation_en: 'get married, married couple', example_sentence_en: 'They got married last year.', example_sentence: '他们去年结婚了。' },
  { word: 'mum', definition_en: 'Mother (informal).', collocation_en: 'my mum, mum and dad', example_sentence_en: 'My mum makes the best cookies!', example_sentence: '我妈妈做的曲奇最好吃！' },
  { word: 'Mr.', definition_en: 'Title used before a man\'s name.', collocation_en: 'Mr. Smith, call Mr.', example_sentence_en: 'Mr. Brown is our new teacher.', example_sentence: '布朗先生是我们的新老师。' },
  { word: 'Ms.', definition_en: 'Title used before a woman\'s name.', collocation_en: 'Ms. Jones, Ms. and Mrs.', example_sentence_en: 'Ms. Wang works in the finance department.', example_sentence: '王女士在财务部门工作。' },
  { word: 'Mrs.', definition_en: 'Title for a married woman.', collocation_en: 'Mrs. Smith, Mr. and Mrs.', example_sentence_en: 'Mrs. Lee has three children.', example_sentence: '李太太有三个孩子。' },
  { word: 'machine', definition_en: 'A device with moving parts that does work.', collocation_en: 'use machine, washing machine', example_sentence_en: 'This machine makes coffee automatically.', example_sentence: '这台机器自动做咖啡。' },
  { word: 'mad', definition_en: 'Angry; or mentally ill.', collocation_en: 'get mad, very mad', example_sentence_en: 'Don\'t be mad - it was an accident!', example_sentence: '别生气 - 那是意外！' },
  { word: 'magazine', definition_en: 'A publication with articles and photographs.', collocation_en: 'subscribe magazine, online magazine', example_sentence_en: 'She reads fashion magazines every month.', example_sentence: '她每个月都看时尚杂志。' },
  { word: 'magic', definition_en: 'The power to make impossible things happen.', collocation_en: 'do magic, magic trick', example_sentence_en: 'The magician performed amazing magic.', example_sentence: '魔术师表演了惊人的魔术。' },
  { word: 'mail', definition_en: 'Letters and packages sent by post.', collocation_en: 'send mail, check mail', example_sentence_en: 'Did you receive my mail?', example_sentence: '你收到我的邮件了吗？' },
  { word: 'mailbox', definition_en: 'A box for receiving letters.', collocation_en: 'check mailbox, empty mailbox', example_sentence_en: 'There is no mail in the mailbox.', example_sentence: '邮箱里没有邮件。' },
  { word: 'main', definition_en: 'Most important or principal.', collocation_en: 'main character, main office', example_sentence_en: 'The main reason is the cost.', example_sentence: '主要原因是费用。' },
  { word: 'mainly', definition_en: 'Mostly; chiefly.', collocation_en: 'mainly because, mainly used', example_sentence_en: 'I mainly use English at work.', example_sentence: '我主要在工作时用英语。' },
  { word: 'maintain', definition_en: 'To keep something in good condition.', collocation_en: 'maintain car, maintain order', example_sentence_en: 'You need to maintain your car regularly.', example_sentence: '你需要定期保养汽车。' },
  { word: 'major', definition_en: 'Very important or large.', collocation_en: 'major problem, major change', example_sentence_en: 'There is a major problem with the plan.', example_sentence: '这个计划有个大问题。' },
  { word: 'majority', definition_en: 'More than half of something.', collocation_en: 'vast majority, majority of', example_sentence_en: 'The majority of students passed the exam.', example_sentence: '大多数学生通过了考试。' },
  { word: 'make', definition_en: 'To produce or create something.', collocation_en: 'make money, make decision', example_sentence_en: 'My mom makes delicious cakes.', example_sentence: '我妈妈做美味的蛋糕。' },
  { word: 'maker', definition_en: 'A person or company that produces something.', collocation_en: 'decision maker, film maker', example_sentence_en: 'He is a film maker.', example_sentence: '他是电影制作人。' },
  { word: 'male', definition_en: 'Belonging to the sex that cannot have babies.', collocation_en: 'male student, male or female', example_sentence_en: 'More males study engineering.', example_sentence: '学工程的男性更多。' },
  { word: 'mall', definition_en: 'A large shopping center.', collocation_en: 'go to mall, shopping mall', example_sentence_en: 'Let\'s go to the mall this weekend!', example_sentence: '我们这个周末去商场吧！' },
  { word: 'manage', definition_en: 'To control or organize something.', collocation_en: 'manage time, manage business', example_sentence_en: 'She manages the hotel very well.', example_sentence: '她管理酒店得很好。' },
  { word: 'manager', definition_en: 'A person responsible for controlling a business.', collocation_en: 'hotel manager, store manager', example_sentence_en: 'The manager approved my request.', example_sentence: '经理批准了我的请求。' },
  { word: 'management', definition_en: 'The act of running and controlling a business.', collocation_en: 'senior management, good management', example_sentence_en: 'The company has excellent management.', example_sentence: '这家公司管理出色。' },
  { word: 'manner', definition_en: 'The way something is done; or polite behavior.', collocation_en: 'good manner, in a manner', example_sentence_en: 'It\'s bad manner to talk with your mouth full.', example_sentence: '嘴里有食物时说话是不礼貌的。' },
  { word: 'map', definition_en: 'A drawing of an area.', collocation_en: 'read map, look at map', example_sentence_en: 'Can you read this map?', example_sentence: '你能看懂这张地图吗？' },
  { word: 'maple', definition_en: 'A type of tree with sweet sap.', collocation_en: 'maple syrup, maple leaf', example_sentence_en: 'The maple leaf is a symbol of Canada.', example_sentence: '枫叶是加拿大的象征。' },
  { word: 'March', definition_en: 'The third month of the year.', collocation_en: 'in March, March 15th', example_sentence_en: 'Spring starts in March.', example_sentence: '春天三月开始。' },
  { word: 'mark', definition_en: 'A small area of color; or a score.', collocation_en: 'high mark, make a mark', example_sentence_en: 'She got high marks in all subjects.', example_sentence: '她所有科目都得了高分。' },
  { word: 'market', definition_en: 'A place where goods are sold.', collocation_en: 'open market, stock market', example_sentence_en: 'The market opens at 9 AM.', example_sentence: '市场上午9点开门。' },
  { word: 'marketing', definition_en: 'Advertising and selling products.', collocation_en: 'digital marketing, work in marketing', example_sentence_en: 'Marketing helps sell products.', example_sentence: '营销帮助销售产品。' },
  { word: 'marriage', definition_en: 'The relationship between husband and wife.', collocation_en: 'happy marriage, marriage certificate', example_sentence_en: 'A good marriage requires communication.', example_sentence: '美满的婚姻需要沟通。' },
  { word: 'marry', definition_en: 'To become someone\'s husband or wife.', collocation_en: 'marry someone, want to marry', example_sentence_en: 'When do you plan to marry?', example_sentence: '你计划什么时候结婚？' },
  { word: 'mass', definition_en: 'A large amount; or religious service.', collocation_en: 'large mass, attend mass', example_sentence_en: 'There was a mass protest yesterday.', example_sentence: '昨天有大规模抗议。' },
  { word: 'master', definition_en: 'To learn something completely; or a male teacher.', collocation_en: 'master skill, master degree', example_sentence_en: 'It takes years to master a language.', example_sentence: '掌握一门语言需要多年。' },
  { word: 'match', definition_en: 'A game or competition; or something that fits.', collocation_en: 'football match, perfect match', example_sentence_en: 'The football match was exciting.', example_sentence: '足球比赛很精彩。' },
  { word: 'material', definition_en: 'The things used to make something.', collocation_en: 'building material, reading material', example_sentence_en: 'What material is this shirt made of?', example_sentence: '这件衬衫是用什么材料做的？' },
  { word: 'mathematics', definition_en: 'The study of numbers and shapes.', collocation_en: 'pure mathematics, applied mathematics', example_sentence_en: 'She is studying mathematics at university.', example_sentence: '她在大学学习数学。' },
  { word: 'matter', definition_en: 'A subject or situation; physical substance.', collocation_en: 'no matter, what matter', example_sentence_en: 'It doesn\'t matter what you wear.', example_sentence: '你穿什么没关系。' },
  { word: 'mature', definition_en: 'Fully grown or developed.', collocation_en: 'very mature, mature person', example_sentence_en: 'She is very mature for her age.', example_sentence: '以她的年龄来说，她很成熟。' },
  { word: 'maximum', definition_en: 'The highest possible amount.', collocation_en: 'maximum speed, maximum amount', example_sentence_en: 'The maximum speed is 120 km per hour.', example_sentence: '最高速度是每小时120公里。' },
  { word: 'May', definition_en: 'The fifth month of the year.', collocation_en: 'in May, May 1st', example_sentence_en: 'Flowers bloom in May.', example_sentence: '五月花开。' },
  { word: 'maybe', definition_en: 'Perhaps; possibly.', collocation_en: 'maybe yes, maybe not', example_sentence_en: 'Maybe we can go tomorrow.', example_sentence: '也许我们可以明天去。' },
  { word: 'me', definition_en: 'Used by a person to refer to themselves.', collocation_en: 'give me, tell me', example_sentence_en: 'Can you help me?', example_sentence: '你能帮我吗？' },
  { word: 'meal', definition_en: 'Food eaten at one time.', collocation_en: 'cook meal, prepare meal', example_sentence_en: 'I usually cook dinner for my family.', example_sentence: '我通常为家人做晚饭。' },
  { word: 'mean', definition_en: 'To intend to communicate; or unkind.', collocation_en: 'mean that, what mean', example_sentence_en: 'What do you mean by that?', example_sentence: '你那是什么意思？' },
  { word: 'meaning', definition_en: 'What something means.', collocation_en: 'true meaning, understand meaning', example_sentence_en: 'What is the meaning of this word?', example_sentence: '这个词的意思是什么？' },
  { word: 'means', definition_en: 'A method or way of doing something.', collocation_en: 'by means of, no means', example_sentence_en: 'We need to find a means to solve this.', example_sentence: '我们需要找到解决这个问题的方法。' },
  { word: 'meantime', definition_en: 'The time between two events.', collocation_en: 'in the meantime', example_sentence_en: 'In the meantime, I\'ll finish my homework.', example_sentence: '在此期间，我会完成作业。' },
  { word: 'meanwhile', definition_en: 'At the same time.', collocation_en: 'meanwhile, please wait', example_sentence_en: 'Meanwhile, I will prepare dinner.', example_sentence: '同时，我会准备晚饭。' },
  { word: 'measure', definition_en: 'To find the size or amount of something.', collocation_en: 'measure weight, measure length', example_sentence_en: 'Can you measure this table?', example_sentence: '你能量一下这张桌子吗？' }
]

async function updateMGroup() {
  console.log('🎓 开始更新M组词汇（62个词）\n')

  // 创建ID映射
  const wordToId = {}
  lowQualityWords.forEach(w => {
    wordToId[w.word] = w.id
  })

  // 过滤出在数据库中找到的词
  const wordsToUpdate = mGroupData
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

  console.log(`✅ 找到 ${wordsToUpdate.length} 个M组词在数据库中\n`)
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

  console.log('\n\n✅ M组更新完成！\n')
  console.log('📊 统计：')
  console.log(`  成功: ${successCount} 个`)
  console.log(`  错误: ${errorCount} 个`)
}

updateMGroup()
