import { createClient } from '@supabase/supabase-js'
const supabase = createClient('https://snnrjnpcmdsdlyldvvps.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc')
const data = [
  { w: 'clothes', def: 'Items you wear.', col: 'wear clothes, warm clothes', ex_en: 'Put on warm clothes.', ex: '穿上保暖的衣服。' },
  { w: 'shirt', def: 'A piece of clothing for the upper body.', col: 'wear shirt, white shirt', ex_en: 'He is wearing a blue shirt.', ex: '他穿着蓝色衬衫。' },
  { w: 'shoes', def: 'Footwear.', col: 'wear shoes, new shoes', ex_en: 'I need new shoes.', ex: '我需要新鞋子。' },
  { w: 'hat', def: 'Head covering.', col: 'wear hat, straw hat', ex_en: 'Wear a hat in the sun.', ex: '太阳下戴帽子。' },
  { w: 'coat', def: 'Outer clothing.', col: 'wear coat, winter coat', ex_en: 'It is cold; wear your coat.', ex: '天冷，穿上外套。' },
  { w: 'dress', def: 'A one-piece garment for women.', col: 'wear dress, beautiful dress', ex_en: 'She wore a red dress.', ex: '她穿着红色连衣裙。' },
  { w: 'skirt', def: 'A garment for women from waist down.', col: 'wear skirt, short skirt', ex_en: 'She is wearing a short skirt.', ex: '她穿着短裙。' },
  { w: 'pants', def: 'Clothing for the legs.', col: 'wear pants, black pants', ex_en: 'These pants are too long.', ex: '这条裤子太长了。' },
  { w: 'size', def: 'How big something is.', col: 'what size, large size', ex_en: 'What size do you wear?', ex: '你穿多大码？' },
  { w: 'wear', def: 'To have on the body.', col: 'wear glasses, wear clothes', ex_en: 'She wears glasses.', ex: '她戴眼镜。' },
  { w: 'fit', def: 'Right size; or healthy.', col: 'fit well, keep fit', ex_en: 'This shirt does not fit me.', ex: '这件衬衫不合身。' },
  { w: 'comfortable', def: 'Not causing discomfort.', col: 'very comfortable, feel comfortable', ex_en: 'This chair is comfortable.', ex: '这把椅子很舒服。' },
  { w: 'fashion', def: 'Popular style.', col: 'follow fashion, in fashion', ex_en: 'She likes fashion.', ex: '她喜欢时尚。' },
  { w: 'style', def: 'A way of doing something.', col: 'in style, hair style', ex_en: 'I like your style.', ex: '我喜欢你的风格。' },
  { w: 'beautiful', def: 'Very pretty.', col: 'very beautiful, look beautiful', ex_en: 'The view is beautiful.', ex: '风景很美。' },
  { w: 'pretty', def: 'Attractive.', col: 'very pretty, quite pretty', ex_en: 'You look pretty today.', ex: '你今天很漂亮。' },
  { w: 'handsome', def: 'Good-looking man.', col: 'very handsome, handsome man', ex_en: 'He is a handsome actor.', ex: '他是位英俊的演员。' },
  { w: 'ugly', def: 'Not nice to look at.', col: 'very ugly, look ugly', ex_en: 'Do not say that; it is ugly.', ex: '别那么说，那样很丑。' },
  { w: 'clean', def: 'Free from dirt.', col: 'keep clean, very clean', ex_en: 'Keep your room clean.', ex: '保持房间整洁。' },
  { w: 'dirty', def: 'Not clean.', col: 'very dirty, get dirty', ex_en: 'Your shoes are dirty.', ex: '你的鞋脏了。' },
  { w: 'wash', def: 'To clean with water.', col: 'wash clothes, wash hands', ex_en: 'Go wash your hands.', ex: '去洗手。' },
  { w: 'dry', def: 'Not wet.', col: 'keep dry, very dry', ex_en: 'My hair is dry.', ex: '我的头发干了。' },
  { w: 'wet', def: 'Covered with liquid.', col: 'get wet, very wet', ex_en: 'Do not get wet.', ex: '别弄湿了。' },
  { w: 'heavy', def: 'Weighing a lot.', col: 'very heavy, quite heavy', ex_en: 'This box is heavy.', ex: '这个盒子很重。' },
  { w: 'light', def: 'Not weighing much.', col: 'very light, quite light', ex_en: 'This feather is light.', ex: '这根羽毛很轻。' },
  { w: 'new', def: 'Recently made.', col: 'brand new, very new', ex_en: 'I bought a new car.', ex: '我买了辆新车。' },
  { w: 'old', def: 'Existing for a long time.', col: 'very old, look old', ex_en: 'This building is very old.', ex: '这座建筑很古老。' },
  { w: 'young', def: 'Not old.', col: 'very young, look young', ex_en: 'She is young and active.', ex: '她年轻又活泼。' }
]
async function update() {
  const { data: allWords } = await supabase.from('words').select('id, word')
  const wordToId = {}; allWords.forEach(w => { wordToId[w.word] = w.id })
  const toUpdate = data.filter(d => wordToId[d.w]).map(d => ({ id: wordToId[d.w], definition_en: d.def, collocation_en: d.col, example_sentence: d.ex, example_sentence_en: d.ex_en }))
  console.log(`批次23: ${toUpdate.length}个`)
  let ok = 0
  for (const w of toUpdate) {
    const { error } = await supabase.from('words').update({ definition_en: w.definition_en, collocation: w.example_sentence, collocation_en: w.collocation_en, example_sentence: w.example_sentence, example_sentence_en: w.example_sentence_en }).eq('id', w.id)
    if (!error) ok++
  }
  console.log(`批次23完成: ${ok}个\n`)
}
update()
