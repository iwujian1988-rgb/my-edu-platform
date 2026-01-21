import { createClient } from '@supabase/supabase-js'
const supabase = createClient('https://snnrjnpcmdsdlyldvvps.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc')
const data = [
  { w: 'tree', def: 'A tall plant with a trunk.', col: 'green tree, climb tree', ex_en: 'There is a big tree in the garden.', ex: '花园里有一棵大树。' },
  { w: 'flower', def: 'The colored part of a plant.', col: 'beautiful flower, red flower', ex_en: 'The flowers are blooming.', ex: '花开了。' },
  { w: 'grass', def: 'A common green plant.', col: 'green grass, cut grass', ex_en: 'The grass is wet with dew.', ex: '草地被露水打湿了。' },
  { w: 'leaf', def: 'A flat green part of a plant.', col: 'green leaf, fall leaf', ex_en: 'Leaves fall from trees in autumn.', ex: '秋天叶子从树上落下。' },
  { w: 'fruit', def: 'The part of a plant that contains seeds.', col: 'fresh fruit, eat fruit', ex_en: 'Fresh fruit is healthy.', ex: '新鲜水果很健康。' },
  { w: 'vegetable', def: 'A plant used as food.', col: 'fresh vegetable, cook vegetable', ex_en: 'Eat your vegetables.', ex: '把你的蔬菜吃了。' },
  { w: 'plant', def: 'A living thing that grows in the ground.', col: 'grow plant, water plant', ex_en: 'Plants need water and sunlight.', ex: '植物需要水和阳光。' },
  { w: 'animal', def: 'A living thing that can move.', col: 'wild animal, small animal', ex_en: 'Dogs are my favorite animals.', ex: '狗是我最喜欢的动物。' },
  { w: 'dog', def: 'A common pet animal.', col: 'pet dog, big dog', ex_en: 'My dog loves to play.', ex: '我的狗喜欢玩耍。' },
  { w: 'cat', def: 'A small pet animal.', col: 'pet cat, black cat', ex_en: 'The cat is sleeping on the sofa.', ex: '猫在沙发上睡觉。' },
  { w: 'bird', def: 'An animal with wings and feathers.', col: 'small bird, fly bird', ex_en: 'The bird is singing.', ex: '鸟在唱歌。' },
  { w: 'fish', def: 'An animal that lives in water.', col: 'catch fish, eat fish', ex_en: 'We caught many fish.', ex: '我们抓了很多鱼。' },
  { w: 'horse', def: 'A large animal you can ride.', col: 'ride horse, wild horse', ex_en: 'She rides horses every weekend.', ex: '她每个周末都骑马。' },
  { w: 'cow', def: 'A farm animal that gives milk.', col: 'milk cow, dairy cow', ex_en: 'The cow eats grass in the field.', ex: '牛在田里吃草。' },
  { w: 'pig', def: 'A farm animal.', col: 'pink pig, small pig', ex_en: 'Pigs are very intelligent animals.', ex: '猪是很聪明的动物。' },
  { w: 'sheep', def: 'A farm animal with wool.', col: 'white sheep, flock of sheep', ex_en: 'The sheep are grazing.', ex: '羊群在吃草。' },
  { w: 'chicken', def: 'A farm bird.', col: 'roast chicken, baby chicken', ex_en: 'We keep chickens in our backyard.', ex: '我们在后院养鸡。' },
  { w: 'duck', def: 'A water bird.', col: 'wild duck, baby duck', ex_en: 'The ducks are swimming.', ex: '鸭子在游泳。' },
  { w: 'mountain', def: 'A very high hill.', col: 'climb mountain, high mountain', ex_en: 'The mountain is covered with snow.', ex: '山上覆盖着雪。' },
  { w: 'hill', def: 'A raised area of land.', col: 'small hill, green hill', ex_en: 'We rolled down the hill.', ex: '我们从山上滚下来。' },
  { w: 'river', def: 'Water flowing to the sea.', col: 'cross river, river water', ex_en: 'The river flows into the sea.', ex: '河流入大海。' },
  { w: 'lake', def: 'A large body of water.', col: 'swim in lake, beautiful lake', ex_en: 'We went fishing in the lake.', ex: '我们去湖里钓鱼。' },
  { w: 'sea', def: 'The ocean.', col: 'by sea, deep sea', ex_en: 'We went to the sea for vacation.', ex: '我们去海边度假。' },
  { w: 'ocean', def: 'A very large sea.', col: 'Pacific ocean, ocean view', ex_en: 'The ocean is deep and mysterious.', ex: '海洋深邃而神秘。' },
  { w: 'beach', def: 'Sandy shore by water.', col: 'on the beach, sandy beach', ex_en: 'We walked on the beach.', ex: '我们在沙滩上散步。' },
  { w: 'forest', def: 'A large area with trees.', col: 'in forest, rain forest', ex_en: 'The forest is home to many animals.', ex: '森林是许多动物的家园。' },
  { w: 'sky', def: 'The space above the earth.', col: 'blue sky, night sky', ex_en: 'Look at the beautiful sky.', ex: '看这美丽的天空。' },
  { w: 'star', def: 'A point of light in the night sky.', col: 'bright star, evening star', ex_en: 'The stars shine at night.', ex: '星星在夜晚闪耀。' },
  { w: 'moon', def: 'The round object in the night sky.', col: 'full moon, look at moon', ex_en: 'The moon is bright tonight.', ex: '今晚月亮很亮。' },
  { w: 'sun', def: 'The star that gives us light.', col: 'hot sun, in the sun', ex_en: 'The sun rises in the east.', ex: '太阳从东方升起。' },
  { w: 'earth', def: 'The planet we live on.', col: 'planet earth, on earth', ex_en: 'The earth goes around the sun.', ex: '地球绕着太阳转。' }
]
async function update() {
  const { data: allWords } = await supabase.from('words').select('id, word')
  const wordToId = {}; allWords.forEach(w => { wordToId[w.word] = w.id })
  const toUpdate = data.filter(d => wordToId[d.w]).map(d => ({ id: wordToId[d.w], definition_en: d.def, collocation_en: d.col, example_sentence: d.ex, example_sentence_en: d.ex_en }))
  console.log(`批次20: ${toUpdate.length}个`)
  let ok = 0
  for (const w of toUpdate) {
    const { error } = await supabase.from('words').update({ definition_en: w.definition_en, collocation: w.example_sentence, collocation_en: w.collocation_en, example_sentence: w.example_sentence, example_sentence_en: w.example_sentence_en }).eq('id', w.id)
    if (!error) ok++
  }
  console.log(`批次20完成: ${ok}个\n`)
}
update()
