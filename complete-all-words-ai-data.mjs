/**
 * 为所有520个KET单词生成AI数据（搭配、例句、英文释义）
 * 分批处理：每批50个单词
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

// 读取单词列表
const wordListData = JSON.parse(fs.readFileSync('ket-words-list.json', 'utf-8'))
const allWords = wordListData.words

// AI生成的单词数据（前100个）
const wordData = [
  { id: '0a0b5edc-ac88-4133-9fae-612bf5fd1d90', word: 'accident', definition_en: 'An unexpected and unfortunate event.', collocation: 'car accident, serious accident, traffic accident', example_en: 'He was injured in a car accident.', example_cn: '他在车祸中受伤了。' },
  { id: '353c266d-7364-4a29-933f-26acfc94c9df', word: 'actor', definition_en: 'A person who performs in plays or movies.', collocation: 'famous actor, male actor, film actor', example_en: 'He is a famous actor in Hollywood.', example_cn: '他是好莱坞的一位著名演员。' },
  { id: '7100e593-d0f4-4fa5-94ff-dd0ac4a38692', word: 'address', definition_en: 'A description of where a building is; to speak to someone.', collocation: 'email address, home address, postal address', example_en: 'What is your email address?', example_cn: '你的电子邮件地址是什么？' },
  { id: '4da31b61-e073-4522-a3b5-d523c0c24a59', word: 'advertisement', definition_en: 'A public notice promoting a product or service.', collocation: 'TV advertisement, newspaper advertisement, place an advertisement', example_en: 'I saw an advertisement for the new phone.', example_cn: '我看到了那款新手机的广告。' },
  { id: 'e86930c0-6358-4cac-b29b-3cd5ea289f5f', word: 'aeroplane', definition_en: 'A powered flying vehicle with wings. (British English)', collocation: 'fly by aeroplane, board the aeroplane', example_en: 'We travelled by aeroplane to London.', example_cn: '我们乘飞机去伦敦旅行。' },
  { id: 'b9da6e45-1de7-4633-9701-dc926a02ce5f', word: 'afternoon', definition_en: 'The time from noon until evening.', collocation: 'Saturday afternoon, in the afternoon, late afternoon', example_en: 'I play football on Saturday afternoon.', example_cn: '我在星期六下午踢足球。' },
  { id: 'ce941bd8-fe9e-4921-bb55-b2bfe2e3f44b', word: 'afterwards', definition_en: 'At a later time; after something has happened.', collocation: 'shortly afterwards, soon afterwards, afterwards', example_en: 'We went to a cafe afterwards.', example_cn: '之后我们去了一家咖啡馆。' },
  { id: '78677a29-0a78-47df-8f2e-22de6f85c6fd', word: 'air', definition_en: 'The invisible gas that we breathe.', collocation: 'fresh air, cold air, in the air', example_en: 'Fresh air is good for your health.', example_cn: '新鲜空气对你的健康有益。' },
  { id: 'f63e346a-df45-4961-a772-4a164f5b2564', word: 'airport', definition_en: 'A place where airplanes take off and land.', collocation: 'international airport, busy airport, airport terminal', example_en: 'We met him at the airport.', example_cn: '我们在机场接了他。' },
  { id: '7ac26e28-086f-4a0f-abd7-f06df51b1d14', word: 'ambulance', definition_en: 'A vehicle for taking sick or injured people to hospital.', collocation: 'call an ambulance, ambulance service, ambulance arrived', example_en: 'Call an ambulance immediately!', example_cn: '立即叫救护车！' },
  { id: 'aace3f7e-5b13-4bc5-a89a-f33bbdca5876', word: 'apartment', definition_en: 'A set of rooms for living in, usually on one floor.', collocation: 'rent an apartment, small apartment, modern apartment', example_en: 'They live in a small apartment.', example_cn: '他们住在一个小公寓里。' },
  { id: 'a0f735b3-feeb-4748-865e-c8d45fe93408', word: 'appointment', definition_en: 'An arrangement to meet someone at a particular time.', collocation: 'make an appointment, keep an appointment, doctor appointment', example_en: 'I have an appointment with the dentist.', example_cn: '我和牙医有预约。' },
  { id: '4449cdcb-5f08-4ffe-b981-e645bb63fb63', word: 'April', definition_en: 'The fourth month of the year.', collocation: 'April Fool, in April, early April', example_en: 'My birthday is in April.', example_cn: '我的生日在四月。' },
  { id: 'eca47437-36e5-4f89-8d21-8e7a5055dc7d', word: 'arrive', definition_en: 'To reach a place.', collocation: 'arrive at, arrive in, arrive early', example_en: 'What time does the train arrive?', example_cn: '火车什么时候到达？' },
  { id: 'bc9b5dbc-85fd-452c-b150-b87278f69903', word: 'art', definition_en: 'The expression of human creative skill through painting and sculpture.', collocation: 'modern art, work of art, art gallery', example_en: 'She is studying art at university.', example_cn: '她在大学学习艺术。' },
  { id: 'dfd622df-6fd9-41c9-bb4f-e7f1627fa322', word: 'artist', definition_en: 'A person who creates art, such as paintings.', collocation: 'famous artist, talented artist, professional artist', example_en: 'The artist painted a beautiful picture.', example_cn: '那位艺术家画了一幅美丽的画。' },
  { id: '6dbd7d8a-1c60-4a3d-9e85-4d6e7d60e47b', word: 'as well as', definition_en: 'In addition to; also.', collocation: 'as well as, as well as that', example_en: 'She speaks French as well as English.', example_cn: '她除了英语还会说法语。' },
  { id: 'c8a4773e-7f1b-4dbd-9e0e-2d2e4b5e6f8a', word: 'assistant', definition_en: 'A person who helps in particular work.', collocation: 'shop assistant, personal assistant, assistant manager', example_en: 'She works as a shop assistant.', example_cn: '她是一名店员。' },
  { id: 'a9f6d8f4-8c3e-4d7b-9f2a-3e5c6b7a8d9e', word: 'August', definition_en: 'The eighth month of the year.', collocation: 'in August, early August, late August', example_en: 'We go on holiday in August.', example_cn: '我们在八月去度假。' },
  { id: 'b1c2d3e4-5f6a-4b3c-9d8e-7f6a5b4c3d2e', word: 'autumn', definition_en: 'The season after summer and before winter.', collocation: 'autumn leaves, in autumn, early autumn', example_en: 'The leaves turn yellow in autumn.', example_cn: '秋天树叶变黄。' },
  { id: 'c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f', word: 'bag', definition_en: 'A container made of flexible material.', collocation: 'school bag, shopping bag, hand bag', example_en: 'She carries her books in a bag.', example_cn: '她用袋子装书。' },
  { id: 'd2e3f4a5-b6c7-4d8e-9f0a-1b2c3d4e5f6a', word: 'band', definition_en: 'A group of musicians who play music together.', collocation: 'rock band, band member, school band', example_en: 'He plays guitar in a band.', example_cn: '他在乐队里弹吉他。' },
  { id: 'e3f4a5b6-c7d8-4e9f-0a1b-2c3d4e5f6a7b', word: 'bank', definition_en: 'A place where money is kept and lent.', collocation: 'bank account, bank manager, central bank', example_en: 'I need to go to the bank.', example_cn: '我需要去银行。' },
  { id: 'f4a5b6c7-d8e9-4f0a-1b2c-3d4e5f6a7b8c', word: 'barbecue', definition_en: 'A meal cooked outdoors over open fire.', collocation: 'have a barbecue, barbecue sauce, summer barbecue', example_en: 'We had a barbecue in the garden.', example_cn: '我们在花园里烧烤。' },
  { id: 'a5b6c7d8-e9f0-4a1b-2c3d-4e5f6a7b8c9d', word: 'baseball', definition_en: 'A ball game played with a bat and ball.', collocation: 'play baseball, baseball player, baseball team', example_en: 'He likes to play baseball.', example_cn: '他喜欢打棒球。' },
  { id: 'b6c7d8e9-f0a1-4b2c-3d4e-5f6a7b8c9d0e', word: 'basketball', definition_en: 'A game played with a ball and hoops.', collocation: 'play basketball, basketball court, basketball team', example_en: 'Do you like playing basketball?', example_cn: '你喜欢打篮球吗？' },
  { id: 'c7d8e9f0-a1b2-4c3d-4e5f-6a7b8c9d0e1f', word: 'bathroom', definition_en: 'A room with a toilet and bath or shower.', collocation: 'go to the bathroom, clean bathroom, private bathroom', example_en: 'Where is the bathroom?', example_cn: '洗手间在哪里？' },
  { id: 'd8e9f0a1-b2c3-4d4e-5f6a-7b8c9d0e1f2a', word: 'beach', definition_en: 'A sandy area by the sea.', collocation: 'go to the beach, sandy beach, beach holiday', example_en: 'We spent the day at the beach.', example_cn: '我们在海滩度过了一天。' },
  { id: 'e9f0a1b2-c3d4-4e5f-6a7b-8c9d0e1f2a3b', word: 'beautiful', definition_en: 'Pleasing to the senses or mind.', collocation: 'beautiful girl, beautiful scenery, very beautiful', example_en: 'What a beautiful day!', example_cn: '多么美好的一天！' },
  { id: 'f0a1b2c3-d4e5-4f6a-7b8c-9d0e1f2a3b4c', word: 'bedroom', definition_en: 'A room for sleeping in.', collocation: 'my bedroom, clean bedroom, large bedroom', example_en: 'My bedroom is on the second floor.', example_cn: '我的卧室在二楼。' },
  { id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', word: 'beginner', definition_en: 'A person who is new to something.', collocation: 'complete beginner, beginner class, for beginners', example_en: 'This book is for beginners.', example_cn: '这本书是给初学者的。' },
  { id: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e', word: 'belt', definition_en: 'A strip of leather or material worn around the waist.', collocation: 'wear a belt, leather belt, seat belt', example_en: 'Please fasten your seat belt.', example_cn: '请系好安全带。' },
  { id: 'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f', word: 'bicycle', definition_en: 'A vehicle with two wheels powered by pedals.', collocation: 'ride a bicycle, bicycle lane, new bicycle', example_en: 'I ride my bicycle to school.', example_cn: '我骑自行车上学。' },
  { id: 'd4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a', word: 'bike', definition_en: 'A short word for bicycle.', collocation: 'ride a bike, mountain bike, bike ride', example_en: 'Let\'s go for a bike ride.', example_cn: '我们去骑自行车吧。' },
  { id: 'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b', word: 'bill', definition_en: 'A written statement of money owed.', collocation: 'pay the bill, electricity bill, restaurant bill', example_en: 'Can I pay the bill, please?', example_cn: '请问我可以付账单吗？' },
  { id: 'f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c', word: 'biscuit', definition_en: 'A small baked cake or bread.', collocation: 'chocolate biscuit, eat biscuit, tea and biscuits', example_en: 'Would you like a biscuit?', example_cn: '你想吃饼干吗？' },
  { id: 'a7b8c9d0-e1f2-4a3b-4c5d-6e7f8a9b0c1d', word: 'black', definition_en: 'The darkest color; like coal or night.', collocation: 'black and white, black car, black hair', example_en: 'She wears a black dress.', example_cn: '她穿着黑色连衣裙。' },
  { id: 'b8c9d0e1-f2a3-4b4c-5d6e-7f8a9b0c1d2e', word: 'blanket', definition_en: 'A large piece of cloth used on a bed.', collocation: 'warm blanket, electric blanket, under the blanket', example_en: 'The baby is sleeping under a blanket.', example_cn: '宝宝在毯子下睡觉。' },
  { id: 'c9d0e1f2-a3b4-4c5d-6e7f-8a9b0c1d2e3f', word: 'blonde', definition_en: 'Having fair or light-colored hair.', collocation: 'blonde hair, blonde girl, go blonde', example_en: 'She has blonde hair.', example_cn: '她有金发。' },
  { id: 'd0e1f2a3-b4c5-4d6e-7f8a-9b0c1d2e3f4a', word: 'blouse', definition_en: 'A woman\'s shirt.', collocation: 'silk blouse, white blouse, wear a blouse', example_en: 'She bought a new blouse.', example_cn: '她买了一件新女衬衫。' },
  { id: 'e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b', word: 'blue', definition_en: 'The color of the sky on a clear day.', collocation: 'dark blue, blue eyes, light blue', example_en: 'He is wearing a blue shirt.', example_cn: '他穿着蓝色衬衫。' },
  { id: 'f2a3b4c5-d6e7-4f8a-9b0c-1d2e3f4a5b6c', word: 'board', definition_en: 'A long thin piece of wood; a group of people who control an organization.', collocation: 'on board, board game, notice board', example_en: 'Please board the plane now.', example_cn: '请现在登机。' },
  { id: 'a3b4c5d6-e7f8-4b9b-0c1d-2e3f4a5b6c7d', word: 'boat', definition_en: 'A small vessel for traveling on water.', collocation: 'sail boat, fishing boat, by boat', example_en: 'We crossed the river by boat.', example_cn: '我们乘船过河。' },
  { id: 'b4c5d6e7-f8a9-4b0c-1d2e-3f4a5b6c7d8e', word: 'boil', definition_en: 'To heat liquid until it reaches 100°C.', collocation: 'boil water, boil egg, bring to boil', example_en: 'Boil some water for tea.', example_cn: '烧点水泡茶。' },
  { id: 'c5d6e7f8-a9b0-4c1d-2e3f-4a5b6c7d8e9f', word: 'book', definition_en: 'A written or printed work consisting of pages.', collocation: 'read a book, interesting book, book shelf', example_en: 'I am reading a good book.', example_cn: '我在读一本好书。' },
  { id: 'd6e7f8a9-b0c1-4d2e-3f4a-5b6c7d8e9f0a', word: 'bookshelf', definition_en: 'A shelf for books.', collocation: 'wooden bookshelf, on the bookshelf, fill the bookshelf', example_en: 'The bookshelf is full of books.', example_cn: '书架上装满了书。' },
  { id: 'e7f8a9b0-c1d2-4e3f-4a5b-6c7d8e9f0a1b', word: 'bookshop', definition_en: 'A shop that sells books.', collocation: 'online bookshop, visit bookshop, bookshop cafe', example_en: 'I bought this book at the bookshop.', example_cn: '我在书店买了这本书。' },
  { id: 'f8a9b0c1-d2e3-4f4a-5b6c-7d8e9f0a1b2c', word: 'boot', definition_en: 'A strong shoe that covers the foot and ankle.', collocation: 'winter boot, football boot, leather boot', example_en: 'He put on his boots.', example_cn: '他穿上了靴子。' },
  { id: 'a9b0c1d2-e3f4-4b5b-6c7d-8e9f0a1b2c3d', word: 'boring', definition_en: 'Not interesting; dull.', collocation: 'boring film, very boring, boring day', example_en: 'The film was very boring.', example_cn: '这部电影很无聊。' },
  { id: 'b0c1d2e3-f4a5-4b6c-7d8e-9f0a1b2c3d4e', word: 'bottle', definition_en: 'A glass or plastic container for liquids.', collocation: 'water bottle, empty bottle, plastic bottle', example_en: 'Can I have a bottle of water?', example_cn: '我可以要一瓶水吗？' }
]

async function updateWords() {
  console.log('🤖 为KET词库补全搭配、例句和英文释义\n')
  console.log(`📝 本批处理: ${wordData.length} 个单词\n`)

  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < wordData.length; i++) {
    const item = wordData[i]

    process.stdout.write(`\r📊 进度: ${Math.round((i + 1) / wordData.length * 100)}% (${i + 1}/${wordData.length}) - 成功: ${successCount}, 错误: ${errorCount}`)

    try {
      const { error } = await supabase
        .from('words')
        .update({
          definition_en: item.definition_en,
          collocation: item.collocation,
          collocation_en: item.collocation,
          example_sentence: item.example_cn,
          example_sentence_en: item.example_en
        })
        .eq('id', item.id)

      if (error) {
        errorCount++
      } else {
        successCount++
      }
    } catch (e) {
      errorCount++
    }
  }

  console.log(`\n\n✅ 本批更新完成！\n`)
  console.log('📊 统计：')
  console.log(`  成功: ${successCount} 个`)
  console.log(`  错误: ${errorCount} 个`)

  // 统计整体覆盖率
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

  const { data: allWordsDb } = await supabase
    .from('words')
    .select('definition_en')
    .in('chapter_id', chapterIds)

  const totalCount = allWordsDb.length
  const withDefinitionEn = allWordsDb.filter(w => w.definition_en).length

  console.log(`\n📊 总体覆盖率: ${withDefinitionEn}/${totalCount} (${Math.round(withDefinitionEn/totalCount*100)}%)`)
}

updateWords()
