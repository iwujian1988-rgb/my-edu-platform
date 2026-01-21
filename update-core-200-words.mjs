/**
 * 为所有核心词汇生成高质量数据
 * 包括：时间、数字、颜色、家庭、食物、身体、衣服、交通、学校、住所
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

// 读取单词ID映射
const wordListData = JSON.parse(fs.readFileSync('ket-words-list.json', 'utf-8'))
const wordIdMap = {}
wordListData.words.forEach(w => {
  wordIdMap[w.word] = w.id
})

// 完整的核心词汇高质量数据（200个）
const coreHighQualityData = [
  // ========== 时间类 (30个) ==========
  { word: 'January', definition_en: 'The first month of the year.', collocation_en: 'in January, January cold, January 1st', example_sentence_en: 'New Year is on January 1st.', example_sentence: '新年是1月1日。' },
  { word: 'February', definition_en: 'The second month of the year.', collocation_en: 'in February, February is short', example_sentence_en: 'February is the shortest month of the year.', example_sentence: '二月是一年中最短的月份。' },
  { word: 'March', definition_en: 'The third month of the year.', collocation_en: 'in March, March winds, spring starts', example_sentence_en: 'Spring starts in March and flowers begin to bloom.', example_sentence: '春天从三月开始，花儿开始开放。' },
  { word: 'May', definition_en: 'The fifth month of the year.', collocation_en: 'in May, May Day, May flowers', example_sentence_en: 'Many people have holidays in May because the weather is nice.', example_sentence: '很多人在五月度假，因为天气很好。' },
  { word: 'June', definition_en: 'The sixth month of the year.', collocation_en: 'in June, June weather, summer begins', example_sentence_en: 'School finishes in June and summer holiday begins.', example_sentence: '学校在六月放假，暑假开始了。' },
  { word: 'July', definition_en: 'The seventh month of the year.', collocation_en: 'in July, July hot', example_sentence_en: 'July is usually the hottest month of the year.', example_sentence: '七月通常是一年中最热的月份。' },
  { word: 'September', definition_en: 'The ninth month of the year.', collocation_en: 'in September, September starts school', example_sentence_en: 'School starts again in September after the summer holiday.', example_sentence: '暑假过后学校在九月重新开学。' },
  { word: 'October', definition_en: 'The tenth month of the year.', collocation_en: 'in October, October cool, autumn leaves', example_sentence_en: 'Leaves turn red and yellow in October.', example_sentence: '十月树叶变红变黄。' },
  { word: 'November', definition_en: 'The eleventh month of the year.', collocation_en: 'in November, November cold', example_sentence_en: 'November is getting colder and winter is coming.', example_sentence: '十一月天气变冷了，冬天要来了。' },
  { word: 'December', definition_en: 'The twelfth month of the year.', collocation_en: 'in December, December Christmas', example_sentence_en: 'Christmas is in December and it\'s very cold.', example_sentence: '圣诞节在十二月，天气很冷。' },
  { word: 'Monday', definition_en: 'The second day of the week.', collocation_en: 'on Monday, Monday morning', example_sentence_en: 'I have math and English classes on Monday morning.', example_sentence: '我星期一上午有数学和英语课。' },
  { word: 'Tuesday', definition_en: 'The third day of the week.', collocation_en: 'on Tuesday, Tuesday afternoon', example_sentence_en: 'I play tennis with my friends on Tuesday afternoon.', example_sentence: '我星期二下午和朋友打网球。' },
  { word: 'Wednesday', definition_en: 'The fourth day of the week.', collocation_en: 'on Wednesday', example_sentence_en: 'We have music class and art class on Wednesday.', example_sentence: '我们星期三有音乐课和美术课。' },
  { word: 'Thursday', definition_en: 'The fifth day of the week.', collocation_en: 'on Thursday', example_sentence_en: 'Thursday is my busiest day at school this week.', example_sentence: '这个星期四是我在学校最忙的一天。' },
  { word: 'Friday', definition_en: 'The sixth day of the week.', collocation_en: 'on Friday, Friday evening', example_sentence_en: 'Friday is the last day of the school week, I\'m very happy!', example_sentence: '星期五是学校一周的最后一天，我很开心！' },
  { word: 'Saturday', definition_en: 'The seventh day of the week.', collocation_en: 'on Saturday, Saturday morning', example_sentence_en: 'I don\'t have school on Saturday, so I can play all day.', example_sentence: '我星期六不用上学，可以玩一整天。' },
  { word: 'Sunday', definition_en: 'The first day of the week.', collocation_en: 'on Sunday, Sunday morning', example_sentence_en: 'Many families go to restaurants or parks together on Sunday.', example_sentence: '很多家庭星期天一起去餐馆或公园。' },
  { word: 'yesterday', definition_en: 'The day before today.', collocation_en: 'yesterday morning, yesterday evening', example_sentence_en: 'I went to the park with my friends yesterday.', example_sentence: '昨天我和朋友去了公园。' },
  { word: 'today', definition_en: 'This present day.', collocation_en: 'today is, today morning, today evening', example_sentence_en: 'What day is today? It\'s Monday.', example_sentence: '今天是星期几？今天是星期一。' },
  { word: 'tomorrow', definition_en: 'The day after today.', collocation_en: 'tomorrow morning, see you tomorrow', example_sentence_en: 'See you tomorrow! Have a good night!', example_sentence: '明天见！晚安！' },
  { word: 'morning', definition_en: 'The early part of the day from sunrise to noon.', collocation_en: 'in the morning, morning exercise, early morning', example_sentence_en: 'I eat breakfast and go to school at 7 o\'clock in the morning.', example_sentence: '我早上7点吃早饭然后去学校。' },
  { word: 'evening', definition_en: 'The time from sunset to bedtime.', collocation_en: 'in the evening, evening meal, this evening', example_sentence_en: 'I do my homework and watch TV in the evening.', example_sentence: '我在晚上做作业和看电视。' },
  { word: 'night', definition_en: 'The time of darkness between evening and morning.', collocation_en: 'at night, last night, good night, midnight', example_sentence_en: 'I sleep at about 10 o\'clock at night.', example_sentence: '我晚上大约10点睡觉。' },
  { word: 'week', definition_en: 'A period of seven days.', collocation_en: 'next week, last week, every week, this week', example_sentence_en: 'There are seven days in a week: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, and Sunday.', example_sentence: '一周有七天：星期一、星期二、星期三、星期四、星期五、星期六和星期日。' },
  { word: 'month', definition_en: 'A period of about 30 days.', collocation_en: 'next month, last month, every month, this month', example_sentence_en: 'There are twelve months in a year.', example_sentence: '一年有十二个月。' },
  { word: 'year', definition_en: 'A period of 365 or 366 days.', collocation_en: 'next year, last year, every year, this year', example_sentence_en: 'I am twelve years old this year.', example_sentence: '我今年十二岁。' },
  { word: 'weekend', definition_en: 'Saturday and Sunday.', collocation_en: 'at the weekend, weekend holiday, on weekend', example_sentence_en: 'What do you like to do at the weekend?', example_sentence: '你周末喜欢做什么？' },
  { word: 'holiday', definition_en: 'A day of celebration or rest from work.', collocation_en: 'summer holiday, go on holiday, winter holiday', example_sentence_en: 'We go to the beach for our summer holiday every year.', example_sentence: '我们每年都去海边过暑假。' },
  { word: 'season', definition_en: 'One of the four periods of the year.', collocation_en: 'football season, summer season, all seasons', example_sentence_en: 'My favorite season is spring because flowers bloom.', example_sentence: '我最喜欢的季节是春天，因为花儿开放。' },
  { word: 'spring', definition_en: 'The season between winter and summer.', collocation_en: 'in spring, spring flowers, spring weather', example_sentence_en: 'Flowers start to grow and the weather gets warm in spring.', example_sentence: '花开始生长，天气在春天变暖。' },
  { word: 'summer', definition_en: 'The warmest season of the year.', collocation_en: 'in summer, summer holiday, hot summer', example_sentence_en: 'I love swimming in the sea in summer.', example_sentence: '我喜欢夏天在海里游泳。' },
  { word: 'autumn', definition_en: 'The season between summer and winter.', collocation_en: 'in autumn, autumn leaves, cool autumn', example_sentence_en: 'Leaves fall from the trees in autumn.', example_sentence: '秋天树叶从树上落下。' },
  { word: 'winter', definition_en: 'The coldest season of the year.', collocation_en: 'in winter, winter cold, snowy winter', example_sentence_en: 'It often snows in winter and I can make a snowman.', example_sentence: '冬天经常下雪，我可以堆雪人。' },

  // ========== 数字类 (15个) ==========
  { word: 'one', definition_en: 'The number 1.', collocation_en: 'one book, one day, one person', example_sentence_en: 'I have one brother and one sister.', example_sentence: '我有一个兄弟和一个姐妹。' },
  { word: 'two', definition_en: 'The number 2.', collocation_en: 'two books, two days, two people', example_sentence_en: 'I have two hands and two feet.', example_sentence: '我有两只手和两只脚。' },
  { word: 'three', definition_en: 'The number 3.', collocation_en: 'three books, three days, three people', example_sentence_en: 'There are three meals in a day: breakfast, lunch, and dinner.', example_sentence: '一天有三顿饭：早饭、午饭和晚饭。' },
  { word: 'four', definition_en: 'The number 4.', collocation_en: 'four seasons, four weeks, four people', example_sentence_en: 'There are four seasons in a year: spring, summer, autumn, and winter.', example_sentence: '一年有四个季节：春天、夏天、秋天和冬天。' },
  { word: 'five', definition_en: 'The number 5.', collocation_en: 'five fingers, five days, five people', example_sentence_en: 'I have five fingers on one hand.', example_sentence: '一只手上有五根手指。' },
  { word: 'six', definition_en: 'The number 6.', collocation_en: 'six years old, six o\'clock, six people', example_sentence_en: 'I am six years old and I go to primary school.', example_sentence: '我六岁了，上小学。' },
  { word: 'seven', definition_en: 'The number 7.', collocation_en: 'seven days, seven colors, seven people', example_sentence_en: 'There are seven days in a week.', example_sentence: '一周有七天。' },
  { word: 'eight', definition_en: 'The number 8.', collocation_en: 'eight o\'clock, eight hours, eight people', example_sentence_en: 'I sleep eight hours every night to be healthy.', example_sentence: '我每晚睡八个小时以保持健康。' },
  { word: 'nine', definition_en: 'The number 9.', collocation_en: 'nine months, nine people, nine o\'clock', example_sentence_en: 'A baby is born after nine months in its mother\'s body.', example_sentence: '婴儿在母亲身体里九个月后出生。' },
  { word: 'ten', definition_en: 'The number 10.', collocation_en: 'ten people, ten minutes, ten o\'clock', example_sentence_en: 'Please wait ten minutes for your food.', example_sentence: '请等十分钟你的食物就好。' },
  { word: 'first', definition_en: 'Coming before all others in time or order.', collocation_en: 'first time, first day, first place, first name', example_sentence_en: 'This is my first time in London, I\'m very excited!', example_sentence: '这是我第一次来伦敦，我很兴奋！' },
  { word: 'second', definition_en: 'Coming next after the first.', collocation_en: 'second time, second floor, second place', example_sentence_en: 'February is the second month of the year.', example_sentence: '二月是一年的第二个月。' },
  { word: 'third', definition_en: 'Coming next after the second.', collocation_en: 'third time, third place, third floor', example_sentence_en: 'I came in third place in the running race.', example_sentence: '我在跑步比赛中得了第三名。' },
  { word: 'last', definition_en: 'Coming after all others in time or order.', collocation_en: 'last time, last day, last week, last month', example_sentence_en: 'December is the last month of the year.', example_sentence: '十二月是一年的最后一个月。' },
  { word: 'next', definition_en: 'Coming immediately after in time or order.', collocation_en: 'next week, next day, next year, next time', example_sentence_en: 'See you next week! Have a nice holiday!', example_sentence: '下周见！假期愉快！' },

  // ========== 颜色类 (8个) ==========
  { word: 'red', definition_en: 'The color of blood or fire.', collocation_en: 'red dress, red car, red apple, red wine', example_sentence_en: 'She was wearing a beautiful red dress to the party.', example_sentence: '她穿着一件漂亮的红色连衣裙参加聚会。' },
  { word: 'green', definition_en: 'The color of grass and leaves.', collocation_en: 'green grass, green tea, green light, green eyes', example_sentence_en: 'The grass is green in spring and very beautiful.', example_sentence: '春天的草是绿色的，非常漂亮。' },
  { word: 'yellow', definition_en: 'The color of the sun or gold.', collocation_en: 'yellow flower, yellow bus, yellow banana', example_sentence_en: 'The school bus is yellow and it takes us to school every day.', example_sentence: '校车是黄色的，每天送我们去学校。' },
  { word: 'white', definition_en: 'The color of snow or milk.', collocation_en: 'white shirt, white snow, white teeth, white cloud', example_sentence_en: 'Everything is white after it snows, it\'s beautiful!', example_sentence: '下雪后一切都是白色的，很美！' },
  { word: 'grey', definition_en: 'A color between black and white.', collocation_en: 'grey sky, grey hair, grey clothes', example_sentence_en: 'The sky is grey on rainy days.', example_sentence: '下雨天天空是灰色的。' },
  { word: 'orange', definition_en: 'A color between red and yellow; a citrus fruit.', collocation_en: 'orange juice, orange fruit, orange cat', example_sentence_en: 'I drink a glass of orange juice every morning for breakfast.', example_sentence: '我每天早上喝一杯橙汁当早餐。' },
  { word: 'pink', definition_en: 'A pale red color.', collocation_en: 'pink dress, pink flower, pink pen', example_sentence_en: 'My sister likes pink clothes and toys.', example_sentence: '我妹妹喜欢粉红色的衣服和玩具。' },
  { word: 'purple', definition_en: 'A color between red and blue.', collocation_en: 'purple grapes, purple bag, purple flower', example_sentence_en: 'Grapes can be purple or green, both taste good.', example_sentence: '葡萄可以是紫色或绿色的，都很好吃。' },

  // ========== 家庭类 (15个) ==========
  { word: 'family', definition_en: 'A group of parents and children living together.', collocation_en: 'big family, happy family, family photo, my family', example_sentence_en: 'There are four people in my family: my father, mother, sister, and me.', example_sentence: '我家有四口人：爸爸、妈妈、姐姐和我。' },
  { word: 'mother', definition_en: 'A female parent.', collocation_en: 'my mother, mother and father, become a mother', example_sentence_en: 'My mother is a teacher and she works at a primary school.', example_sentence: '我妈妈是老师，在小学工作。' },
  { word: 'father', definition_en: 'A male parent.', collocation_en: 'my father, father and son, father and daughter', example_sentence_en: 'My father works in an office in the city center.', example_sentence: '我爸爸在市中心的办公室工作。' },
  { word: 'parent', definition_en: 'A mother or father.', collocation_en: 'my parents, parent meeting, single parent', example_sentence_en: 'My parents love me very much and help me with my homework.', example_sentence: '我的父母非常爱我，帮我做作业。' },
  { word: 'sister', definition_en: 'A female sibling.', collocation_en: 'older sister, younger sister, sister and brother', example_sentence_en: 'My older sister helps me with my English homework.', example_sentence: '我姐姐帮我做英语作业。' },
  { word: 'brother', definition_en: 'A male sibling.', collocation_en: 'older brother, younger brother, brother and sister', example_sentence_en: 'My younger brother is five years old and plays with toys.', example_sentence: '我弟弟五岁，喜欢玩玩具。' },
  { word: 'child', definition_en: 'A young human being.', collocation_en: 'young child, only child, child plays', example_sentence_en: 'Every child has the right to go to school and learn.', example_sentence: '每个孩子都有上学的权利。' },
  { word: 'son', definition_en: 'A male child of a parent.', collocation_en: 'my son, son and daughter, have a son', example_sentence_en: 'They have one son and two daughters.', example_sentence: '他们有一个儿子和两个女儿。' },
  { word: 'daughter', definition_en: 'A female child of a parent.', collocation_en: 'my daughter, son and daughter', example_sentence_en: 'Their daughter is very beautiful and clever.', example_sentence: '他们的女儿很漂亮聪明。' },
  { word: 'grandmother', definition_en: 'The mother of a parent.', collocation_en: 'my grandmother, grandmother and grandfather', example_sentence_en: 'My grandmother is 70 years old and lives with us.', example_sentence: '我祖母70岁了，和我们一起住。' },
  { word: 'grandfather', definition_en: 'The father of a parent.', collocation_en: 'my grandfather, grandfather and grandmother', example_sentence_en: 'My grandfather tells great stories about when he was young.', example_sentence: '我祖父讲他年轻时的故事，讲得很好。' },
  { word: 'grandchild', definition_en: 'A child of your son or daughter.', collocation_en: 'my grandchild, grandchild visits', example_sentence_en: 'They love spending time with their grandchild at the weekend.', example_sentence: '他们喜欢周末和孙子在一起。' },
  { word: 'granddaughter', definition_en: 'A daughter of your son or daughter.', collocation_en: 'my granddaughter', example_sentence_en: 'My granddaughter is five years old and starts school this year.', example_sentence: '我孙女五岁了，今年开始上学。' },
  { word: 'uncle', definition_en: 'The brother of a parent.', collocation_en: 'my uncle, uncle and aunt', example_sentence_en: 'My uncle lives in London and visits us every year.', example_sentence: '我叔叔住在伦敦，每年来看我们。' },
  { word: 'aunt', definition_en: 'The sister of a parent.', collocation_en: 'my aunt, aunt and uncle', example_sentence_en: 'My aunt is very kind and gives me presents on my birthday.', example_sentence: '我阿姨非常和蔼，我生日时给我礼物。' },
  { word: 'cousin', definition_en: 'A child of your uncle or aunt.', collocation_en: 'my cousin, cousin and I', example_sentence_en: 'I play with my cousin at family parties.', example_sentence: '我在家庭聚会上和表弟一起玩。' },

  // ========== 食物类 (30个) ==========
  { word: 'food', definition_en: 'Something that people and animals eat to live.', collocation_en: 'fast food, good food, food and drink', example_sentence_en: 'Chinese food is very delicious and I love eating it.', example_sentence: '中国菜很好吃，我喜欢吃。' },
  { word: 'bread', definition_en: 'A basic food made from flour, water, and yeast.', collocation_en: 'eat bread, slice of bread, bread and butter', example_sentence_en: 'I have bread and eggs for breakfast every morning.', example_sentence: '我每天早上吃面包和鸡蛋当早餐。' },
  { word: 'butter', definition_en: 'A yellow food made from cream, spread on bread.', collocation_en: 'bread and butter, peanut butter, melt butter', example_sentence_en: 'Would you like some butter on your toast?', example_sentence: '你的烤面包上要涂点黄油吗？' },
  { word: 'cheese', definition_en: 'A solid food made from milk, usually yellow or white.', collocation_en: 'cheddar cheese, cheese sandwich, eat cheese', example_sentence_en: 'Would you like some cheese on your pasta?', example_sentence: '你想在意面上加点奶酪吗？' },
  { word: 'milk', definition_en: 'A white liquid from cows that is good for bones.', collocation_en: 'drink milk, glass of milk, milk and cookies', example_sentence_en: 'I drink a glass of milk every morning for breakfast.', example_sentence: '我每天早上喝一杯牛奶当早餐。' },
  { word: 'egg', definition_en: 'A round object with a shell, containing a baby bird.', collocation_en: 'eat eggs, boil an egg, fried egg', example_sentence_en: 'I have a boiled egg for breakfast with some bread.', example_sentence: '我早餐吃一个煮鸡蛋和一些面包。' },
  { word: 'meat', definition_en: 'The flesh of animals used as food.', collocation_en: 'eat meat, meat and vegetables', example_sentence_en: 'I don\'t eat much meat, I prefer vegetables and fruits.', example_sentence: '我不怎么吃肉，我更喜欢蔬菜和水果。' },
  { word: 'fish', definition_en: 'A creature that lives in water and has fins.', collocation_en: 'eat fish, catch fish, fish and chips', example_sentence_en: 'We grilled fish for dinner with some vegetables.', example_sentence: '我们晚餐吃了烤鱼和一些蔬菜。' },
  { word: 'chicken', definition_en: 'A bird kept for its meat and eggs; the meat of this bird.', collocation_en: 'fried chicken, roast chicken, chicken soup', example_sentence_en: 'We had roast chicken with potatoes for Sunday lunch.', example_sentence: '我们星期天午饭吃了烤鸡配土豆。' },
  { word: 'fruit', definition_en: 'The sweet part of a plant that contains seeds.', collocation_en: 'eat fruit, fresh fruit, fruit salad', example_sentence_en: 'Apples, bananas, and oranges are my favorite fruit.', example_sentence: '苹果、香蕉和橙子是我最喜欢的水果。' },
  { word: 'vegetable', definition_en: 'A plant or part of a plant used as food.', collocation_en: 'eat vegetables, fresh vegetables, cook vegetables', example_sentence_en: 'You should eat more vegetables, they are very healthy.', example_sentence: '你应该多吃蔬菜，它们很健康。' },
  { word: 'apple', definition_en: 'A round fruit with red or green skin.', collocation_en: 'eat an apple, apple juice, apple tree', example_sentence_en: 'An apple a day keeps the doctor away!', example_sentence: '一天一苹果，医生远离我！' },
  { word: 'banana', definition_en: 'A long curved fruit with yellow skin.', collocation_en: 'eat a banana, banana bread', example_sentence_en: 'Monkeys love to eat bananas in the forest.', example_sentence: '猴子喜欢在森林里吃香蕉。' },
  { word: 'orange', definition_en: 'A round citrus fruit with orange skin.', collocation_en: 'orange juice, eat an orange', example_sentence_en: 'I drink orange juice for breakfast, it\'s very delicious.', example_sentence: '我早餐喝橙汁，很好喝。' },
  { word: 'cake', definition_en: 'A sweet baked food made from flour, sugar, and eggs.', collocation_en: 'birthday cake, chocolate cake, make a cake', example_sentence_en: 'My mother made a delicious chocolate cake for my birthday.', example_sentence: '我妈妈为我的生日做了一个美味的巧克力蛋糕。' },
  { word: 'sugar', definition_en: 'A sweet substance used to flavor food and drinks.', collocation_en: 'add sugar, too much sugar', example_sentence_en: 'Do you take sugar in your coffee or tea?', example_sentence: '你的咖啡或茶里放糖吗？' },
  { word: 'salt', definition_en: 'A white substance used to flavor food.', collocation_en: 'add salt, too much salt', example_sentence_en: 'This soup needs a little more salt to taste better.', example_sentence: '这汤需要再放点盐才更好喝。' },
  { word: 'coffee', definition_en: 'A hot dark drink made from coffee beans.', collocation_en: 'drink coffee, cup of coffee, coffee shop', example_sentence_en: 'Would you like a cup of coffee after dinner?', example_sentence: '晚饭后你想来杯咖啡吗？' },
  { word: 'tea', definition_en: 'A hot drink made from tea leaves.', collocation_en: 'drink tea, green tea, cup of tea', example_sentence_en: 'I like green tea very much, it\'s good for health.', example_sentence: '我非常喜欢绿茶，对身体有好处。' },
  { word: 'juice', definition_en: 'The liquid from fruit.', collocation_en: 'orange juice, apple juice, fresh juice', example_sentence_en: 'Fresh fruit juice is very healthy and delicious.', example_sentence: '新鲜果汁很健康也很好喝。' },
  { word: 'water', definition_en: 'A clear liquid without color or taste.', collocation_en: 'drink water, glass of water', example_sentence_en: 'You should drink more water every day, about 8 glasses.', example_sentence: '你应该每天多喝水，大约8杯。' },
  { word: 'beer', definition_en: 'An alcoholic drink made from grain.', collocation_en: 'drink beer, glass of beer', example_sentence_en: 'My father likes to drink beer with his friends.', example_sentence: '我爸爸喜欢和朋友一起喝啤酒。' },
  { word: 'wine', definition_en: 'An alcoholic drink made from grapes.', collocation_en: 'red wine, white wine, glass of wine', example_sentence_en: 'French wine is very famous all over the world.', example_sentence: '法国葡萄酒在全世界都很有名。' },
  { word: 'breakfast', definition_en: 'The first meal of the day.', collocation_en: 'have breakfast, eat breakfast', example_sentence_en: 'I usually have cereal and milk for breakfast at 7 o\'clock.', example_sentence: '我通常7点吃麦片和牛奶当早餐。' },
  { word: 'lunch', definition_en: 'A meal eaten in the middle of the day.', collocation_en: 'have lunch, eat lunch', example_sentence_en: 'I have lunch at school at 12 o\'clock with my classmates.', example_sentence: '我和同学中午12点在学校吃午饭。' },
  { word: 'dinner', definition_en: 'The main meal of the day.', collocation_en: 'have dinner, cook dinner', example_sentence_en: 'We have dinner together as a family at 7 o\'clock.', example_sentence: '我们一家人晚上7点一起吃晚饭。' },
  { word: 'restaurant', definition_en: 'A place where meals are served to customers.', collocation_en: 'go to a restaurant, Chinese restaurant', example_sentence_en: 'Let\'s go to a restaurant for dinner tonight.', example_sentence: '我们今晚去餐厅吃晚饭吧。' },
  { word: 'chocolate', definition_en: 'A sweet brown food made from cocoa beans.', collocation_en: 'dark chocolate, eat chocolate', example_sentence_en: 'I love drinking hot chocolate in winter when it\'s cold.', example_sentence: '冬天天气冷的时候我喜欢喝热巧克力。' },
  { word: 'ice cream', definition_en: 'A sweet frozen food made from cream and sugar.', collocation_en: 'eat ice cream, chocolate ice cream', example_sentence_en: 'Let\'s get some ice cream! It\'s so hot today.', example_sentence: '我们去买冰淇淋吧！今天太热了。' },
  { word: 'sandwich', definition_en: 'Two pieces of bread with food between them.', collocation_en: 'eat a sandwich, make a sandwich', example_sentence_en: 'I usually have a sandwich for lunch at school.', example_sentence: '我午饭通常在学校吃三明治。' },
  { word: 'soup', definition_en: 'A liquid food made by boiling meat and vegetables.', collocation_en: 'eat soup, vegetable soup', example_sentence_en: 'Hot chicken soup is very good when you have a cold.', example_sentence: '你感冒的时候喝热鸡汤很好。' },
  { word: 'burger', definition_en: 'A flat round piece of meat, eaten in a bread roll.', collocation_en: 'cheese burger, beef burger', example_sentence_en: 'I would like a cheese burger with some French fries, please.', example_sentence: '我想要一个芝士汉堡，再要些薯条。' },
  { word: 'chips', definition_en: 'Long thin pieces of potato fried in oil.', collocation_en: 'fish and chips, eat chips', example_sentence_en: 'Fish and chips is a very popular food in Britain.', example_sentence: '炸鱼薯条在英国是很受欢迎的食物。' },
  { word: 'carrot', definition_en: 'A long orange vegetable that grows underground.', collocation_en: 'eat carrots, carrot cake', example_sentence_en: 'Carrots are very healthy and good for your eyes.', example_sentence: '胡萝卜很健康，对眼睛有好处。' },
  { word: 'potato', definition_en: 'A round vegetable that grows underground.', collocation_en: 'mashed potato, baked potato, potato chips', example_sentence_en: 'We can make mashed potato, baked potato, or potato chips.', example_sentence: '我们可以做土豆泥、烤土豆或薯条。' },

  // ========== 身体类 (15个) ==========
  { word: 'body', definition_en: 'The whole structure of a person.', collocation_en: 'my body, healthy body', example_sentence_en: 'Exercise is good for your body and makes you strong.', example_sentence: '锻炼对你的身体有好处，让你强壮。' },
  { word: 'head', definition_en: 'The top part of the human body.', collocation_en: 'shake your head, nod your head', example_sentence_en: 'My head hurts because I studied too much.', example_sentence: '我头很疼因为我学习太多了。' },
  { word: 'face', definition_en: 'The front part of the head with eyes, nose and mouth.', collocation_en: 'my face, wash your face', example_sentence_en: 'She has a beautiful round face with big eyes.', example_sentence: '她有一张漂亮的圆脸，大眼睛。' },
  { word: 'eye', definition_en: 'An organ on the face for seeing.', collocation_en: 'blue eyes, green eyes', example_sentence_en: 'She has big blue eyes and long blonde hair.', example_sentence: '她有双大大的蓝眼睛和长长的金发。' },
  { word: 'ear', definition_en: 'An organ on the head for hearing.', collocation_en: 'big ears, small ears', example_sentence_en: 'Rabbits have long ears to hear well.', example_sentence: '兔子有长耳朵以便听得清楚。' },
  { word: 'nose', definition_en: 'An organ on the face for smelling and breathing.', collocation_en: 'big nose, small nose', example_sentence_en: 'The nose is in the center of the face.', example_sentence: '鼻子在脸的中央。' },
  { word: 'mouth', definition_en: 'An organ on the face for eating and speaking.', collocation_en: 'open your mouth', example_sentence_en: 'Please close your mouth when you are eating.', example_sentence: '吃东西的时候请闭上嘴。' },
  { word: 'hair', definition_en: 'The thread-like growth on the head.', collocation_en: 'long hair, short hair', example_sentence_en: 'She has long black hair and looks very beautiful.', example_sentence: '她有长长的黑发，看起来很漂亮。' },
  { word: 'hand', definition_en: 'The end part of the arm.', collocation_en: 'wash your hands, left hand', example_sentence_en: 'Wash your hands before dinner.', example_sentence: '晚饭前洗手。' },
  { word: 'arm', definition_en: 'The upper limb of the body from shoulder to hand.', collocation_en: 'left arm, right arm', example_sentence_en: 'My arm is tired from carrying heavy bags.', example_sentence: '提重包把我的胳膊累坏了。' },
  { word: 'finger', definition_en: 'One of the five parts of the hand.', collocation_en: 'five fingers', example_sentence_en: 'I have five fingers on each hand.', example_sentence: '我每只手上有五根手指。' },
  { word: 'thumb', definition_en: 'The short thick finger of the hand.', collocation_en: 'thumbs up', example_sentence_en: 'Thumbs up means good job!', example_sentence: '竖起大拇指意味着干得好！' },
  { word: 'leg', definition_en: 'The lower limb of the body.', collocation_en: 'left leg, right leg', example_sentence_en: 'My legs are tired from walking all day.', example_sentence: '走路走了一整天把我的腿累坏了。' },
  { word: 'foot', definition_en: 'The bottom part of the leg.', collocation_en: 'left foot, right foot', example_sentence_en: 'My left foot hurts from playing football.', example_sentence: '我左脚疼，因为踢足球踢的。' },
  { word: 'toe', definition_en: 'One of the five small parts of the foot.', collocation_en: 'ten toes', example_sentence_en: 'I have ten toes on my two feet.', example_sentence: '我的两只脚上有十个脚趾。' },
  { word: 'heart', definition_en: 'The organ in the chest that pumps blood.', collocation_en: 'broken heart', example_sentence_en: 'Exercise is good for your heart and keeps you healthy.', example_sentence: '锻炼对你的心脏有好处，保持健康。' },

  // ========== 衣服类 (12个) ==========
  { word: 'clothes', definition_en: 'Items worn to cover the body.', collocation_en: 'wear clothes', example_sentence_en: 'Put on your warm clothes, it\'s cold outside!', example_sentence: '穿上你的暖和衣服，外面冷！' },
  { word: 'shirt', definition_en: 'A piece of clothing for the upper body.', collocation_en: 'white shirt, wear a shirt', example_sentence_en: 'He is wearing a blue shirt and black trousers.', example_sentence: '他穿着蓝衬衫和黑裤子。' },
  { word: 'trousers', definition_en: 'Clothing for the legs.', collocation_en: 'wear trousers', example_sentence_en: 'These trousers are too long, I need shorter ones.', example_sentence: '这条裤子太长了，我需要短一点的。' },
  { word: 'dress', definition_en: 'A one-piece garment for a woman or girl.', collocation_en: 'wear a dress', example_sentence_en: 'She looks beautiful in that red dress.', example_sentence: '她穿那条红裙子很漂亮。' },
  { word: 'skirt', definition_en: 'A garment for a woman or girl that hangs from the waist.', collocation_en: 'wear a skirt', example_sentence_en: 'She is wearing a pink skirt today.', example_sentence: '她今天穿着一条粉红色的裙子。' },
  { word: 'shoe', definition_en: 'Footwear.', collocation_en: 'wear shoes', example_sentence_en: 'Put on your shoes, we are going out!', example_sentence: '穿上你的鞋子，我们要出门了！' },
  { word: 'sock', definition_en: 'Clothing for the foot made of cloth.', collocation_en: 'wear socks', example_sentence_en: 'Don\'t forget your socks when you put on your shoes.', example_sentence: '穿鞋时别忘了你的袜子。' },
  { word: 'hat', definition_en: 'Head covering.', collocation_en: 'wear a hat', example_sentence_en: 'It\'s cold outside, put on your hat.', example_sentence: '外面冷，戴上你的帽子。' },
  { word: 'coat', definition_en: 'A long outer garment.', collocation_en: 'wear a coat', example_sentence_en: 'Wear your coat, it\'s very cold today.', example_sentence: '穿上你的外套，今天很冷。' },
  { word: 'jacket', definition_en: 'A short coat.', collocation_en: 'leather jacket', example_sentence_en: 'I like my blue jacket, it\'s very comfortable.', example_sentence: '我喜欢我的蓝色夹克，它很舒服。' },
  { word: 'uniform', definition_en: 'Special clothing for a group.', collocation_en: 'school uniform', example_sentence_en: 'We wear school uniform from Monday to Friday.', example_sentence: '我们从星期一到星期五穿校服。' },
  { word: 'T-shirt', definition_en: 'A short-sleeved casual top.', collocation_en: 'wear a T-shirt', example_sentence_en: 'I\'m wearing a white T-shirt and blue jeans.', example_sentence: '我穿着白色T恤和蓝色牛仔裤。' },
  { word: 'boot', definition_en: 'A strong shoe that covers the foot and part of the leg.', collocation_en: 'winter boots', example_sentence_en: 'Put on your boots because it\'s muddy outside.', example_sentence: '穿上你的靴子，因为外面都是泥。' },

  // ========== 交通类 (15个) ==========
  { word: 'car', definition_en: 'A road vehicle with an engine and four wheels.', collocation_en: 'drive a car', example_sentence_en: 'My father drives a car to work every morning.', example_sentence: '我爸爸每天早上开车上班。' },
  { word: 'bus', definition_en: 'A large motor vehicle for carrying passengers.', collocation_en: 'take a bus', example_sentence_en: 'I go to school by bus every day.', example_sentence: '我每天坐公交车去学校。' },
  { word: 'train', definition_en: 'A connected set of carriages on rails.', collocation_en: 'take a train', example_sentence_en: 'The train is late again today.', example_sentence: '今天火车又晚点了。' },
  { word: 'plane', definition_en: 'A powered flying vehicle with wings.', collocation_en: 'by plane', example_sentence_en: 'We travelled by plane to London and it took 10 hours.', example_sentence: '我们乘飞机去伦敦，花了10个小时。' },
  { word: 'boat', definition_en: 'A small vessel for traveling on water.', collocation_en: 'by boat', example_sentence_en: 'We crossed the river by boat.', example_sentence: '我们乘船过了河。' },
  { word: 'bicycle', definition_en: 'A vehicle with two wheels powered by pedals.', collocation_en: 'ride a bicycle', example_sentence_en: 'I ride my bicycle to school every day.', example_sentence: '我每天骑自行车去学校。' },
  { word: 'bike', definition_en: 'A short word for bicycle.', collocation_en: 'ride a bike', example_sentence_en: 'Let\'s go for a bike ride in the park!', example_sentence: '我们去公园骑自行车兜风吧！' },
  { word: 'taxi', definition_en: 'A car licensed to carry passengers for money.', collocation_en: 'take a taxi', example_sentence_en: 'Let\'s take a taxi home, it\'s too late for the bus.', example_sentence: '我们坐出租车回家吧，太晚了没公交了。' },
  { word: 'ticket', definition_en: 'A paper giving the right to travel or enter.', collocation_en: 'buy a ticket', example_sentence_en: 'I need a ticket for the train to London.', example_sentence: '我需要一张去伦敦的火车票。' },
  { word: 'station', definition_en: 'A place where trains or buses stop.', collocation_en: 'train station', example_sentence_en: 'We met at the station at 9 o\'clock.', example_sentence: '我们9点在车站见面。' },
  { word: 'airport', definition_en: 'A place where airplanes take off and land.', collocation_en: 'go to the airport', example_sentence_en: 'We need to arrive at the airport 2 hours before the flight.', example_sentence: '我们需要在航班起飞前2小时到达机场。' },
  { word: 'driver', definition_en: 'A person who drives a vehicle.', collocation_en: 'bus driver', example_sentence_en: 'The bus driver is very friendly and helpful.', example_sentence: '公交车司机很友好乐于助人。' },
  { word: 'journey', definition_en: 'An act of traveling from one place to another.', collocation_en: 'go on a journey', example_sentence_en: 'Have a safe journey and call me when you arrive!', example_sentence: '旅途平安！到达后给我打电话！' },
  { word: 'travel', definition_en: 'To make a journey.', collocation_en: 'travel by plane', example_sentence_en: 'I like to travel to different countries and learn about their culture.', example_sentence: '我喜欢去不同的国家旅行，了解他们的文化。' },
  { word: 'walk', definition_en: 'To move at a pace by lifting and setting down feet.', collocation_en: 'go for a walk', example_sentence_en: 'I walk to school every day because it\'s good exercise.', example_sentence: '我每天走路去学校，因为这是很好的锻炼。' },
  { word: 'run', definition_en: 'To move quickly on foot.', collocation_en: 'run fast', example_sentence_en: 'He runs very fast and won the race.', example_sentence: '他跑得很快，赢得了比赛。' },

  // ========== 学校类 (15个) ==========
  { word: 'school', definition_en: 'A place where children go to learn.', collocation_en: 'go to school', example_sentence_en: 'I go to school from Monday to Friday.', example_sentence: '我从星期一到星期五去上学。' },
  { word: 'class', definition_en: 'A period of time when students learn together.', collocation_en: 'English class', example_sentence_en: 'I have English class every Monday and Wednesday.', example_sentence: '我每个星期一和星期三都有英语课。' },
  { word: 'lesson', definition_en: 'A period of learning with a teacher.', collocation_en: 'have a lesson', example_sentence_en: 'Our math lesson starts at 9 o\'clock and finishes at 9:40.', example_sentence: '我们的数学课9点开始，9点40结束。' },
  { word: 'homework', definition_en: 'Work that students do at home.', collocation_en: 'do homework', example_sentence_en: 'I do my homework every evening before dinner.', example_sentence: '我每天晚上晚饭前做作业。' },
  { word: 'teacher', definition_en: 'A person who teaches in a school.', collocation_en: 'my teacher', example_sentence_en: 'Our English teacher is very kind and patient.', example_sentence: '我们的英语老师非常和蔼耐心。' },
  { word: 'student', definition_en: 'A person who is learning at a school.', collocation_en: 'good student', example_sentence_en: 'She is a very good student and gets high marks.', example_sentence: '她是一个非常好的学生，拿高分。' },
  { word: 'pen', definition_en: 'A tool for writing with ink.', collocation_en: 'write with a pen', example_sentence_en: 'Can I borrow your pen? Mine is out of ink.', example_sentence: '我可以借用你的钢笔吗？我的没墨水了。' },
  { word: 'pencil', definition_en: 'A tool for writing or drawing.', collocation_en: 'use a pencil', example_sentence_en: 'I write with a pencil in math class so I can erase mistakes.', example_sentence: '我在数学课上用铅笔写字，这样我可以擦掉错误。' },
  { word: 'desk', definition_en: 'A piece of furniture with a flat top for writing.', collocation_en: 'sit at a desk', example_sentence_en: 'I sit at my desk and listen to the teacher carefully.', example_sentence: '我坐在书桌前认真听老师讲课。' },
  { word: 'exam', definition_en: 'A test of knowledge at school.', collocation_en: 'pass an exam', example_sentence_en: 'I have a math exam tomorrow, I need to study tonight.', example_sentence: '我明天有数学考试，我今晚需要学习。' },
  { word: 'test', definition_en: 'A check of knowledge or ability.', collocation_en: 'take a test', example_sentence_en: 'Did you pass the test? What was your score?', example_sentence: '你通过考试了吗？你得了多少分？' },
  { word: 'question', definition_en: 'A sentence that asks for information.', collocation_en: 'ask a question', example_sentence_en: 'Can I ask a question? I don\'t understand this.', example_sentence: '我可以问个问题吗？我不懂这个。' },
  { word: 'answer', definition_en: 'A response to a question.', collocation_en: 'answer the question', example_sentence_en: 'Do you know the answer to this question?', example_sentence: '你知道这个问题的答案吗？' },
  { word: 'learn', definition_en: 'To get knowledge or skill.', collocation_en: 'learn English', example_sentence_en: 'I want to learn to play the guitar this summer.', example_sentence: '我想今年夏天学弹吉他。' },
  { word: 'study', definition_en: 'To learn about something carefully.', collocation_en: 'study hard', example_sentence_en: 'I study English every day for 30 minutes.', example_sentence: '我每天学习英语30分钟。' },
  { word: 'read', definition_en: 'To look at and understand written words.', collocation_en: 'read a book', example_sentence_en: 'I like to read storybooks before going to bed.', example_sentence: '我喜欢睡前看故事书。' },
  { word: 'write', definition_en: 'To mark words on paper with a pen or pencil.', collocation_en: 'write a letter', example_sentence_en: 'Please write your name clearly at the top of the page.', example_sentence: '请在页面顶部清楚地写下你的名字。' },
  { word: 'speak', definition_en: 'To say words to communicate.', collocation_en: 'speak English', example_sentence_en: 'Can you speak English? Yes, a little bit.', example_sentence: '你会说英语吗？会一点点。' },

  // ========== 住所类 (15个) ==========
  { word: 'house', definition_en: 'A building for human habitation.', collocation_en: 'big house', example_sentence_en: 'My house has a small garden with many flowers.', example_sentence: '我的房子有一个小花园，种了很多花。' },
  { word: 'home', definition_en: 'The place where you live.', collocation_en: 'go home', example_sentence_en: 'I want to go home now, I\'m very tired.', example_sentence: '我想现在回家，我很累了。' },
  { word: 'room', definition_en: 'A part of a building with walls and a floor.', collocation_en: 'living room', example_sentence_en: 'My room is small but very tidy and clean.', example_sentence: '我的房间很小但很整洁干净。' },
  { word: 'bedroom', definition_en: 'A room for sleeping.', collocation_en: 'my bedroom', example_sentence_en: 'My bedroom is on the second floor of the house.', example_sentence: '我的卧室在房子的二楼。' },
  { word: 'bathroom', definition_en: 'A room with a toilet and bath or shower.', collocation_en: 'go to the bathroom', example_sentence_en: 'Where is the bathroom? I need to wash my hands.', example_sentence: '洗手间在哪里？我需要洗手。' },
  { word: 'kitchen', definition_en: 'A room where food is cooked.', collocation_en: 'in the kitchen', example_sentence_en: 'My mother is in the kitchen cooking dinner.', example_sentence: '我妈妈在厨房做晚饭。' },
  { word: 'living room', definition_en: 'A room for relaxing and entertaining.', collocation_en: 'in the living room', example_sentence_en: 'We watch TV in the living room in the evening.', example_sentence: '我们晚上在客厅看电视。' },
  { word: 'garden', definition_en: 'A piece of land with flowers and plants.', collocation_en: 'in the garden', example_sentence_en: 'We have many beautiful flowers in our garden.', example_sentence: '我们的花园里有很多美丽的花。' },
  { word: 'bed', definition_en: 'A piece of furniture for sleeping.', collocation_en: 'go to bed', example_sentence_en: 'I go to bed at 10 o\'clock every night.', example_sentence: '我每天晚上10点上床睡觉。' },
  { word: 'table', definition_en: 'A piece of furniture with a flat top.', collocation_en: 'dining table', example_sentence_en: 'Put your books on the table and sit down, please.', example_sentence: '把你的书放在桌子上然后坐下，请。' },
  { word: 'chair', definition_en: 'A seat for one person.', collocation_en: 'sit on a chair', example_sentence_en: 'Please sit on your chair and listen carefully.', example_sentence: '请坐在你的椅子上认真听讲。' },
  { word: 'sofa', definition_en: 'A long comfortable seat for several people.', collocation_en: 'sit on the sofa', example_sentence_en: 'I like to sit on the sofa and read books on weekends.', example_sentence: '我喜欢周末坐在沙发上看书。' },
  { word: 'door', definition_en: 'A movable barrier to close an opening.', collocation_en: 'open the door', example_sentence_en: 'Please close the door, it\'s cold outside.', example_sentence: '请关门，外面冷。' },
  { word: 'window', definition_en: 'An opening in a wall to let in light.', collocation_en: 'open the window', example_sentence_en: 'Open the window, please! It\'s too hot in here.', example_sentence: '请打开窗户！这里太热了。' },
  { word: 'floor', definition_en: 'The lower surface of a room.', collocation_en: 'on the floor', example_sentence_en: 'The book is on the floor, please pick it up.', example_sentence: '书在地板上，请把它捡起来。' },
  { word: 'wall', definition_en: 'The sides of a room or building.', collocation_en: 'on the wall', example_sentence_en: 'There is a beautiful picture on the wall.', example_sentence: '墙上有一幅漂亮的画。' }
]

// 添加ID并更新到数据库
async function updateCoreWords() {
  console.log('🎓 开始更新核心词汇的高质量数据\n')
  console.log(`📊 总共 ${coreHighQualityData.length} 个核心词汇\n`)

  // 为每个单词添加ID
  const wordsWithId = coreHighQualityData.map(item => {
    const id = wordIdMap[item.word]
    if (!id) {
      console.log(`⚠️  Warning: No ID found for "${item.word}"`)
      return null
    }
    return {
      id,
      definition_en: item.definition_en,
      collocation: item.collocation_en,
      collocation_en: item.collocation_en,
      example_sentence: item.example_sentence,
      example_sentence_en: item.example_sentence_en
    }
  }).filter(w => w !== null)

  console.log(`✅ 找到了 ${wordsWithId.length} 个核心词汇的ID\n`)

  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < wordsWithId.length; i++) {
    const word = wordsWithId[i]

    process.stdout.write(`\r📊 进度: ${Math.round((i + 1) / wordsWithId.length * 100)}% (${i + 1}/${wordsWithId.length}) - 成功: ${successCount}, 错误: ${errorCount}`)

    try {
      const { error } = await supabase
        .from('words')
        .update(word)
        .eq('id', word.id)

      if (error) {
        errorCount++
        if (errorCount <= 5) console.log(`\n❌ Error updating word ID ${word.id}: ${error.message}`)
      } else {
        successCount++
      }
    } catch (e) {
      errorCount++
      if (errorCount <= 5) console.log(`\n❌ Exception updating word ID ${word.id}: ${e.message}`)
    }
  }

  console.log('\n\n✅ 核心词汇更新完成！\n')
  console.log('📊 统计：')
  console.log(`  成功: ${successCount} 个`)
  console.log(`  错误: ${errorCount} 个\n`)

  // 验证几个示例
  console.log('🔍 验证示例：\n')
  const samples = ['January', 'Monday', 'red', 'family', 'breakfast']

  for (const w of samples) {
    const { data } = await supabase
      .from('words')
      .select('word, definition_en, collocation_en, example_sentence_en, example_sentence')
      .eq('word', w)
      .single()

    if (data) {
      console.log(`${data.word}:`)
      console.log(`  英文: ${data.definition_en}`)
      console.log(`  搭配: ${data.collocation_en}`)
      console.log(`  例句: ${data.example_sentence_en}`)
      console.log(`  翻译: ${data.example_sentence}`)
      console.log()
    }
  }

  console.log('✨ 核心词汇现在都有了真正高质量的数据！')
  console.log(`\n📊 覆盖率：约 ${wordsWithId.length}/520 (${Math.round(wordsWithId.length/520*100)}%)`)
}

updateCoreWords()
