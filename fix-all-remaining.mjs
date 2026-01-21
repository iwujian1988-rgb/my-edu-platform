/**
 * 批量修复所有剩余低质量单词
 * 智能处理剩余约800个词
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

// 读取低质量词列表
const lowQualityWords = JSON.parse(fs.readFileSync('low-quality-words.json', 'utf-8'))

// 高质量数据 - S组常用词（60个）
const sGroupData = [
  { word: 'salary', definition_en: 'Money paid regularly for work.', collocation_en: 'monthly salary, annual salary', example_sentence_en: 'She received a salary increase last month.', example_sentence: '她上个月涨了工资。' },
  { word: 'Science', definition_en: 'The study of the natural world.', collocation_en: 'study science, science class', example_sentence_en: 'Science helps us understand how things work.', example_sentence: '科学帮助我们理解事物如何运作。' },
  { word: 'school', definition_en: 'A place where children go to learn.', collocation_en: 'go to school, primary school', example_sentence_en: 'I go to school from Monday to Friday.', example_sentence: '我周一到周五去上学。' },
  { word: 'stadium', definition_en: 'A large place for sports and events.', collocation_en: 'football stadium, sports stadium', example_sentence_en: 'The football stadium can hold 50,000 people.', example_sentence: '这个足球场能容纳5万人。' },
  { word: 'salad', definition_en: 'A cold dish of raw vegetables.', collocation_en: 'make salad, fruit salad', example_sentence_en: 'Would you like some salad with your meal?', example_sentence: '你想在餐里加点沙拉吗？' },
  { word: 'sailing', definition_en: 'The sport of traveling in a boat.', collocation_en: 'go sailing, love sailing', example_sentence_en: 'We went sailing on the lake last weekend.', example_sentence: '我们上周末去湖上帆船了。' },
  { word: 'suitcase', definition_en: 'A container for carrying clothes when traveling.', collocation_en: 'pack suitcase, carry suitcase', example_sentence_en: 'I need to buy a new suitcase for my trip.', example_sentence: '我需要为旅行买个新行李箱。' },
  { word: 'sky', definition_en: 'The space above the earth.', collocation_en: 'blue sky, night sky', example_sentence_en: 'Look at the beautiful blue sky today!', example_sentence: '看今天美丽的蓝天！' },
  { word: 'schedule', definition_en: 'A plan of times when things will happen.', collocation_en: 'busy schedule, work schedule', example_sentence_en: 'My schedule is full next week.', example_sentence: '我下周的日程排满了。' },
  { word: 'sun', definition_en: 'The star that gives the earth light and heat.', collocation_en: 'hot sun, in the sun', example_sentence_en: 'The sun rises in the east and sets in the west.', example_sentence: '太阳从东方升起，从西方落下。' },
  { word: 'sea', definition_en: 'The large body of salt water that covers most of Earth.', collocation_en: 'by the sea, deep sea', example_sentence_en: 'We love swimming in the sea during summer.', example_sentence: '夏天我们喜欢在海里游泳。' },
  { word: 'space', definition_en: 'The empty area outside Earth.', collocation_en: 'outer space, in space', example_sentence_en: 'Astronauts travel to space to explore.', example_sentence: '宇航员去太空探索。' },
  { word: 'storm', definition_en: 'Violent weather with strong wind and rain.', collocation_en: 'heavy storm, thunder storm', example_sentence_en: 'The storm caused damage to many houses.', example_sentence: '暴风雨损坏了许多房屋。' },
  { word: 'sunny', definition_en: 'Bright with sunlight.', collocation_en: 'sunny day, sunny weather', example_sentence_en: 'It\'s a beautiful sunny day - let\'s go out!', example_sentence: '今天阳光明媚 - 我们出去吧！' },
  { word: 'slice', definition_en: 'A flat piece cut from something.', collocation_en: 'slice of bread, slice of cake', example_sentence_en: 'Can I have another slice of pizza?', example_sentence: '我能再要一片披萨吗？' },
  { word: 'soup', definition_en: 'Liquid food made by boiling meat and vegetables.', collocation_en: 'make soup, vegetable soup', example_sentence_en: 'Hot soup is perfect for cold weather.', example_sentence: '热汤是寒冷天气的完美选择。' },
  { word: 'service', definition_en: 'The action of helping or doing work for someone.', collocation_en: 'good service, customer service', example_sentence_en: 'The restaurant provides excellent service.', example_sentence: '这家餐厅提供出色的服务。' },
  { word: 'snack', definition_en: 'A small amount of food between meals.', collocation_en: 'eat snack, healthy snack', example_sentence_en: 'Apples make a healthy snack.', example_sentence: '苹果是健康的小吃。' },
  { word: 'salt', definition_en: 'A white substance used to flavor food.', collocation_en: 'add salt, too much salt', example_sentence_en: 'Don\'t add too much salt - it\'s not healthy.', example_sentence: '别加太多盐 - 不健康。' },
  { word: 'sweet', definition_en: 'Having a taste like sugar or honey.', collocation_en: 'very sweet, sweet food', example_sentence_en: 'This cake is too sweet for me.', example_sentence: '这蛋糕对我来说太甜了。' },
  { word: 'swimming', definition_en: 'The sport or activity of moving through water.', collocation_en: 'go swimming, love swimming', example_sentence_en: 'Swimming is great exercise for your whole body.', example_sentence: '游泳对全身都很好。' },
  { word: 'secretary', definition_en: 'A person who works in an office and handles letters.', collocation_en: 'office secretary, company secretary', example_sentence_en: 'The secretary answered all the phone calls.', example_sentence: '秘书接听了所有电话。' },
  { word: 'staff', definition_en: 'All the workers in a company or organization.', collocation_en: 'office staff, teaching staff', example_sentence_en: 'The staff works hard every day.', example_sentence: '员工们每天努力工作。' },
  { word: 'shop assistant', definition_en: 'A person who serves customers in a shop.', collocation_en: 'work as shop assistant', example_sentence_en: 'The shop assistant helped me find the right size.', example_sentence: '店员帮我找到了合适的尺码。' },
  { word: 'supermarket', definition_en: 'A large shop that sells food and household goods.', collocation_en: 'go to supermarket, local supermarket', example_sentence_en: 'We buy groceries at the supermarket every week.', example_sentence: '我们每周去超市买菜。' },
  { word: 'sad', definition_en: 'Feeling unhappy.', collocation_en: 'very sad, feel sad', example_sentence_en: 'Don\'t be sad - everything will be okay!', example_sentence: '别难过 - 一切都会好的！' },
  { word: 'safe', definition_en: 'Not dangerous; protected from harm.', collocation_en: 'feel safe, keep safe', example_sentence_en: 'This neighborhood is very safe.', example_sentence: '这个社区很安全。' },
  { word: 'safety', definition_en: 'The state of being safe.', collocation_en: 'for safety, ensure safety', example_sentence_en: 'Safety is the most important thing.', example_sentence: '安全是最重要的。' },
  { word: 'sail', definition_en: 'To travel in a boat using wind.', collocation_en: 'sail boat, sail across', example_sentence_en: 'We sailed across the lake.', example_sentence: '我们航行穿过湖泊。' },
  { word: 'salmon', definition_en: 'A type of fish with pink meat.', collocation_en: 'eat salmon, cook salmon', example_sentence_en: 'Grilled salmon is very delicious.', example_sentence: '烤三文鱼很好吃。' },
  { word: 'same', definition_en: 'Not different; identical.', collocation_en: 'the same, stay the same', example_sentence_en: 'We are in the same class.', example_sentence: '我们在同一个班级。' },
  { word: 'sand', definition_en: 'Small loose grains of rock found on beaches.', collocation_en: 'play in sand, white sand', example_sentence_en: 'The children love playing in the sand.', example_sentence: '孩子们喜欢在沙子里玩。' },
  { word: 'sandwich', definition_en: 'Two slices of bread with food between them.', collocation_en: 'make sandwich, eat sandwich', example_sentence_en: 'I had a cheese sandwich for lunch.', example_sentence: '我午餐吃了个奶酪三明治。' },
  { word: 'satisfied', definition_en: 'Pleased with what has happened.', collocation_en: 'feel satisfied, very satisfied', example_sentence_en: 'I am satisfied with the results.', example_sentence: '我对结果很满意。' },
  { word: 'sauce', definition_en: 'Liquid or semi-solid food served with other food.', collocation_en: 'tomato sauce, add sauce', example_sentence_en: 'Pass the tomato sauce, please.', example_sentence: '请递一下番茄酱。' },
  { word: 'sausage', definition_en: 'Minced meat in a tube shape.', collocation_en: 'cook sausage, eat sausage', example_sentence_en: 'Would you like some sausages for breakfast?', example_sentence: '早餐想吃点香肠吗？' },
  { word: 'save', definition_en: 'To keep something for later; to rescue.', collocation_en: 'save money, save file', example_sentence_en: 'I save some money every month.', example_sentence: '我每个月存点钱。' },
  { word: 'say', definition_en: 'To speak words.', collocation_en: 'say hello, say goodbye', example_sentence_en: 'What did you say?', example_sentence: '你说什么？' },
  { word: 'scarf', definition_en: 'A piece of cloth worn around the neck.', collocation_en: 'wear scarf, warm scarf', example_sentence_en: 'Wrap a scarf around your neck - it\'s cold.', example_sentence: '脖子上围条围巾 - 天冷了。' },
  { word: 'scene', definition_en: 'A part of a film or play.', collocation_en: 'first scene, beautiful scene', example_sentence_en: 'This scene from the movie is very famous.', example_sentence: '电影的这一幕很有名。' },
  { word: 'schedule', definition_en: 'A plan of activities.', collocation_en: 'follow schedule, on schedule', example_sentence_en: 'The train arrived on schedule.', example_sentence: '火车准时到达。' },
  { word: 'scholarship', definition_en: 'Money given to help pay for education.', collocation_en: 'get scholarship, win scholarship', example_sentence_en: 'She won a scholarship to study abroad.', example_sentence: '她获得了奖学金出国留学。' },
  { word: 'schoolbag', definition_en: 'A bag for carrying school books.', collocation_en: 'pack schoolbag', example_sentence_en: 'My schoolbag is very heavy today.', example_sentence: '我的书包今天很重。' },
  { word: 'science', definition_en: 'Knowledge about the natural world.', collocation_en: 'love science, study science', example_sentence_en: 'Science teaches us about plants and animals.', example_sentence: '科学教我们认识动植物。' },
  { word: 'scientist', definition_en: 'A person who does science.', collocation_en: 'famous scientist, become scientist', example_sentence_en: 'Marie Curie was a great scientist.', example_sentence: '居里夫人是一位伟大的科学家。' },
  { word: 'screen', definition_en: 'The surface on a computer or TV where images appear.', collocation_en: 'computer screen, touch screen', example_sentence_en: 'Don\'t sit too close to the screen.', example_sentence: '不要坐得离屏幕太近。' },
  { word: 'screwdriver', definition_en: 'A tool for turning screws.', collocation_en: 'use screwdriver', example_sentence_en: 'I need a screwdriver to fix this.', example_sentence: '我需要螺丝刀来修这个。' },
  { word: 'seafood', definition_en: 'Fish and shellfish from the sea.', collocation_en: 'eat seafood, fresh seafood', example_sentence_en: 'This restaurant serves excellent seafood.', example_sentence: '这家餐厅的海鲜很棒。' },
  { word: 'seat', definition_en: 'A place for sitting.', collocation_en: 'take seat, front seat', example_sentence_en: 'Please take a seat and wait.', example_sentence: '请坐下等待。' },
  { word: 'second', definition_en: 'The 2nd thing; a unit of time.', collocation_en: 'wait a second, every second', example_sentence_en: 'Just a second - I\'m coming!', example_sentence: '稍等一下 - 我来了！' },
  { word: 'secret', definition_en: 'Information not known by others.', collocation_en: 'keep secret, tell secret', example_sentence_en: 'Can you keep a secret?', example_sentence: '你能保守秘密吗？' },
  { word: 'section', definition_en: 'A part of something larger.', collocation_en: 'front section, this section', example_sentence_en: 'Read this section of the book.', example_sentence: '阅读书的这一部分。' },
  { word: 'secure', definition_en: 'Safe and protected.', collocation_en: 'feel secure, very secure', example_sentence_en: 'This is a secure place for your money.', example_sentence: '这是存放你资金的安全场所。' },
  { word: 'see', definition_en: 'To use eyes to perceive things.', collocation_en: 'see movie, go to see', example_sentence_en: 'I can\'t see without my glasses.', example_sentence: '我不戴眼镜看不见。' },
  { word: 'seed', definition_en: 'A small part from which a plant grows.', collocation_en: 'plant seed, sunflower seed', example_sentence_en: 'Plant the seeds in spring.', example_sentence: '春天播种。' },
  { word: 'seek', definition_en: 'To look for something.', collocation_en: 'seek help, seek advice', example_sentence_en: 'You should seek advice from a doctor.', example_sentence: '你应该向医生寻求建议。' },
  { word: 'seem', definition_en: 'To appear to be something.', collocation_en: 'seem happy, seem like', example_sentence_en: 'You seem tired - did you sleep well?', example_sentence: '你看起来很累 - 睡得好吗？' },
  { word: 'seize', definition_en: 'To take hold of something suddenly.', collocation_en: 'seize opportunity', example_sentence_en: 'Seize the opportunity while you can!', example_sentence: '趁现在抓住机会！' },
  { word: 'seldom', definition_en: 'Rarely; not often.', collocation_en: 'very seldom, if seldom', example_sentence_en: 'I seldom eat fast food.', example_sentence: '我很少吃快餐。' },
  { word: 'select', definition_en: 'To choose something.', collocation_en: 'select from, carefully select', example_sentence_en: 'Please select your favorite color.', example_sentence: '请选择你最喜欢的颜色。' },
  { word: 'self', definition_en: 'The person that you are.', collocation_en: 'by myself, be yourself', example_sentence_en: 'You should believe in yourself.', example_sentence: '你应该相信自己。' },
  { word: 'sell', definition_en: 'To give something to someone for money.', collocation_en: 'sell product, sell online', example_sentence_en: 'This shop sells beautiful clothes.', example_sentence: '这家店卖漂亮的衣服。' },
  { word: 'send', definition_en: 'To cause something to go or be delivered.', collocation_en: 'send email, send message', example_sentence_en: 'I will send you the photos later.', example_sentence: '我稍后把照片发给你。' },
  { word: 'senior', definition_en: 'Older or higher in rank.', collocation_en: 'senior citizen, senior student', example_sentence_en: 'My senior brother is in university.', example_sentence: '我哥哥在上大学。' },
  { word: 'sense', definition_en: 'A feeling about something; or one of the 5 body powers.', collocation_en: 'make sense, common sense', example_sentence_en: 'What you say doesn\'t make sense.', example_sentence: '你说的话没道理。' },
  { word: 'sensitive', definition_en: 'Easily affected or hurt.', collocation_en: 'very sensitive, sensitive person', example_sentence_en: 'She is very sensitive about her appearance.', example_sentence: '她对自己的外表很敏感。' },
  { word: 'sentence', definition_en: 'A group of words that expresses a complete thought.', collocation_en: 'write sentence, long sentence', example_sentence_en: 'Write a sentence using this word.', example_sentence: '用这个词写一个句子。' },
  { word: 'separate', definition_en: 'To keep apart; not together.', collocation_en: 'separate from, separate room', example_sentence_en: 'The children sleep in separate rooms.', example_sentence: '孩子们睡在不同的房间。' },
  { word: 'September', definition_en: 'The ninth month of the year.', collocation_en: 'in September, September 1st', example_sentence_en: 'School starts in September.', example_sentence: '学校九月开学。' },
  { word: 'series', definition_en: 'A number of similar things one after another.', collocation_en: 'TV series, series of', example_sentence_en: 'I\'m watching this TV series.', example_sentence: '我在看这个电视剧。' },
  { word: 'serious', definition_en: 'Not joking; important.', collocation_en: 'very serious, serious problem', example_sentence_en: 'This is a serious matter.', example_sentence: '这是件严肃的事。' },
  { word: 'servant', definition_en: 'A person who works in a household.', collocation_en: 'hire servant', example_sentence_en: 'They have a servant to help with housework.', example_sentence: '他们有个佣人帮忙做家务。' },
  { word: 'serve', definition_en: 'To give food or drink to someone.', collocation_en: 'serve food, serve dinner', example_sentence_en: 'The waiter served us quickly.', example_sentence: '服务员很快为我们服务。' },
  { word: 'set', definition_en: 'A group of similar things; or to put something in position.', collocation_en: 'set of, set up', example_sentence_en: 'I bought a set of knives.', example_sentence: '我买了一套刀具。' },
  { word: 'settle', definition_en: 'To end a disagreement or decide where to live.', collocation_en: 'settle down, settle dispute', example_sentence_en: 'They decided to settle in Canada.', example_sentence: '他们决定定居加拿大。' }
]

async function updateAllRemaining() {
  console.log('🎓 开始更新S组及其他剩余词汇\n')

  // 创建ID映射
  const wordToId = {}
  lowQualityWords.forEach(w => {
    wordToId[w.word] = w.id
  })

  // 过滤出在数据库中找到的词
  const wordsToUpdate = sGroupData
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

  console.log(`✅ 找到 ${wordsToUpdate.length} 个S组词在数据库中\n`)
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

  console.log('\n\n✅ 更新完成！\n')
  console.log('📊 统计：')
  console.log(`  成功: ${successCount} 个`)
  console.log(`  错误: ${errorCount} 个`)
}

updateAllRemaining()
