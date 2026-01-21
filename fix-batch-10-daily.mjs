/**
 * 批次10：日常词汇（30个）
 * chicken, cook, dinner, kitchen, meal, menu, restaurant, snack,
 * breakfast, lunch, plate, bowl, fork, knife, spoon, cup, glass,
 * bottle, drink, water, milk, juice, coffee, tea, sugar, salt, pepper,
 * oil, bread, butter
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

const batch10Data = [
  { word: 'chicken', definition_en: 'A bird kept for its meat or eggs.', collocation_en: 'roast chicken, chicken soup', example_sentence_en: 'We had roast chicken for dinner.', example_sentence: '我们晚饭吃了烤鸡。' },
  { word: 'cook', definition_en: 'To prepare food for eating by using heat.', collocation_en: 'cook dinner, cook book', example_sentence_en: 'My mother loves to cook for the family.', example_sentence: '我妈妈喜欢为家人做饭。' },
  { word: 'dinner', definition_en: 'The main meal of the day, usually eaten in the evening.', collocation_en: 'have dinner, dinner time', example_sentence_en: 'What shall we have for dinner tonight?', example_sentence: '我们今晚晚饭吃什么？' },
  { word: 'kitchen', definition_en: 'A room where food is prepared and cooked.', collocation_en: 'kitchen table, modern kitchen', example_sentence_en: 'The kitchen is well-equipped with modern appliances.', example_sentence: '这个厨房配备了现代化设备。' },
  { word: 'meal', definition_en: 'An occasion when food is eaten.', collocation_en: 'have meal, main meal', example_sentence_en: 'Breakfast is the most important meal of the day.', example_sentence: '早餐是一天中最重要的一餐。' },
  { word: 'menu', definition_en: 'A list of food available at a restaurant.', collocation_en: 'read menu, menu item', example_sentence_en: 'Can I see the menu, please?', example_sentence: '请给我看看菜单。' },
  { word: 'restaurant', definition_en: 'A place where you pay to eat meals.', collocation_en: 'go to restaurant, restaurant owner', example_sentence_en: 'This restaurant serves excellent Italian food.', example_sentence: '这家餐厅的意大利菜很棒。' },
  { word: 'snack', definition_en: 'A small amount of food eaten between meals.', collocation_en: 'eat snack, healthy snack', example_sentence_en: 'I usually have a snack at 10 in the morning.', example_sentence: '我通常早上10点吃点点心。' },
  { word: 'breakfast', definition_en: 'The first meal of the day.', collocation_en: 'have breakfast, breakfast cereal', example_sentence_en: 'I always have coffee and toast for breakfast.', example_sentence: '我早餐总是喝咖啡吃吐司。' },
  { word: 'lunch', definition_en: 'A meal eaten in the middle of the day.', collocation_en: 'have lunch, lunch break', example_sentence_en: 'Let us have lunch together today.', example_sentence: '我们今天一起吃午饭吧。' },
  { word: 'plate', definition_en: 'A flat dish for eating food from.', collocation_en: 'empty plate, paper plate', example_sentence_en: 'Please put your dirty plate in the sink.', example_sentence: '请把你的脏盘子放进水槽。' },
  { word: 'bowl', definition_en: 'A round container for food or liquid.', collocation_en: 'soup bowl, rice bowl', example_sentence_en: 'She filled the bowl with hot soup.', example_sentence: '她往碗里盛满了热汤。' },
  { word: 'fork', definition_en: 'A tool with points for eating food.', collocation_en: 'knife and fork, use fork', example_sentence_en: 'In Western countries, people eat with a fork and knife.', example_sentence: '在西方国家，人们用刀叉吃饭。' },
  { word: 'knife', definition_en: 'A tool with a sharp blade for cutting.', collocation_en: 'sharp knife, pocket knife', example_sentence_en: 'Be careful with that knife; it is very sharp.', example_sentence: '小心那把刀，它非常锋利。' },
  { word: 'spoon', definition_en: 'A tool with a round bowl for eating liquid food.', collocation_en: 'soup spoon, teaspoon', example_sentence_en: 'She stirred her coffee with a spoon.', example_sentence: '她用勺子搅拌咖啡。' },
  { word: 'cup', definition_en: 'A small container for drinking.', collocation_en: 'coffee cup, tea cup', example_sentence_en: 'Would you like a cup of tea?', example_sentence: '你要喝杯茶吗？' },
  { word: 'glass', definition_en: 'A hard transparent material; or a container for drinking.', collocation_en: 'wine glass, drinking glass', example_sentence_en: 'He poured water into the glass.', example_sentence: '他往玻璃杯里倒水。' },
  { word: 'bottle', definition_en: 'A container for liquids with a narrow neck.', collocation_en: 'water bottle, plastic bottle', example_sentence_en: 'Can I have a bottle of mineral water?', example_sentence: '给我一瓶矿泉水好吗？' },
  { word: 'drink', definition_en: 'To take liquid into your body through your mouth.', collocation_en: 'drink water, soft drink', example_sentence_en: 'You should drink plenty of water every day.', example_sentence: '你应该每天喝足够的水。' },
  { word: 'water', definition_en: 'A clear liquid without color or taste that falls as rain.', collocation_en: 'drink water, cold water', example_sentence_en: 'Water is essential for life.', example_sentence: '水对生命至关重要。' },
  { word: 'milk', definition_en: 'A white liquid produced by cows or other animals.', collocation_en: 'drink milk, fresh milk', example_sentence_en: 'Do you take milk with your coffee?', example_sentence: '你咖啡里加牛奶吗？' },
  { word: 'juice', definition_en: 'The liquid that comes from fruit or vegetables.', collocation_en: 'orange juice, fruit juice', example_sentence_en: 'Fresh orange juice is rich in vitamin C.', example_sentence: '鲜橙汁富含维生素C。' },
  { word: 'coffee', definition_en: 'A dark hot drink made from coffee beans.', collocation_en: 'drink coffee, coffee shop', example_sentence_en: 'I need a cup of coffee to wake up in the morning.', example_sentence: '我早上需要一杯咖啡来提神。' },
  { word: 'tea', definition_en: 'A hot drink made by pouring boiling water onto dried leaves.', collocation_en: 'green tea, cup of tea', example_sentence_en: 'Would you like some tea or coffee?', example_sentence: '你想喝茶还是咖啡？' },
  { word: 'sugar', definition_en: 'A sweet substance used to flavor food and drink.', collocation_en: 'add sugar, brown sugar', example_sentence_en: 'Do you take sugar in your tea?', example_sentence: '你的茶里加糖吗？' },
  { word: 'salt', definition_en: 'A white substance used to flavor food.', collocation_en: 'add salt, sea salt', example_sentence_en: 'This soup needs a little more salt.', example_sentence: '这汤需要再加点盐。' },
  { word: 'pepper', definition_en: 'A spice used to add flavor to food.', collocation_en: 'black pepper, add pepper', example_sentence_en: 'Add some pepper to taste.', example_sentence: '加点胡椒调味。' },
  { word: 'oil', definition_en: 'A thick liquid that does not mix with water.', collocation_en: 'olive oil, cooking oil', example_sentence_en: 'Heat some oil in the pan before cooking.', example_sentence: '烹饪前先在锅里热些油。' },
  { word: 'bread', definition_en: 'A common food made from flour, water, and yeast.', collocation_en: 'slice of bread, fresh bread', example_sentence_en: 'Would you like some bread with your soup?', example_sentence: '你要来点面包配汤吗？' },
  { word: 'butter', definition_en: 'A yellow solid food made from cream.', collocation_en: 'bread and butter, melt butter', example_sentence_en: 'Spread some butter on the toast.', example_sentence: '在吐司上涂些黄油。' }
]

async function updateBatch10() {
  console.log('🎓 开始更新批次10：日常词汇（30个）\n')

  const { data: allWords } = await supabase
    .from('words')
    .select('id, word')

  const wordToId = {}
  allWords.forEach(w => {
    wordToId[w.word] = w.id
  })

  const wordsToUpdate = batch10Data
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

  console.log('\n\n✅ 批次10更新完成！\n')
  console.log('📊 统计：')
  console.log(`  成功: ${successCount} 个`)
  console.log(`  错误: ${errorCount} 个`)
}

updateBatch10()
