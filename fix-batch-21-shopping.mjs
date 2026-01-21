import { createClient } from '@supabase/supabase-js'
const supabase = createClient('https://snnrjnpcmdsdlyldvvps.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc')
const data = [
  { w: 'money', def: 'Coins or notes used for paying.', col: 'spend money, save money', ex_en: 'I need to save more money.', ex: '我需要多存点钱。' },
  { w: 'price', def: 'The amount of money needed.', col: 'high price, low price', ex_en: 'The price is too high.', ex: '价格太高了。' },
  { w: 'buy', def: 'To get something by paying money.', col: 'buy food, go buy', ex_en: 'I will buy some milk.', ex: '我去买点牛奶。' },
  { w: 'sell', def: 'To give something for money.', col: 'sell car, for sale', ex_en: 'They sell fresh vegetables.', ex: '他们卖新鲜蔬菜。' },
  { w: 'pay', def: 'To give money for something.', col: 'pay for, pay money', ex_en: 'I will pay the bill.', ex: '我来付账。' },
  { w: 'cost', def: 'The price of something.', col: 'cost much, how much cost', ex_en: 'How much does it cost?', ex: '这个多少钱？' },
  { w: 'shop', def: 'A place to buy things.', col: 'go shopping, online shop', ex_en: 'I go shopping every weekend.', ex: '我每个周末购物。' },
  { w: 'market', def: 'A place to buy food and goods.', col: 'go to market, open market', ex_en: 'We bought vegetables at the market.', ex: '我们在市场买了蔬菜。' },
  { w: 'store', def: 'A place that sells things.', col: 'department store, grocery store', ex_en: 'The store closes at 10 pm.', ex: '商店晚上10点关门。' },
  { w: 'mall', def: 'A large shopping center.', col: 'go to mall, shopping mall', ex_en: 'Let us go to the mall.', ex: '我们去商场吧。' },
  { w: 'cheap', def: 'Not expensive.', col: 'very cheap, quite cheap', ex_en: 'This shirt is very cheap.', ex: '这件衬衫很便宜。' },
  { w: 'expensive', def: 'Costing a lot of money.', col: 'very expensive, too expensive', ex_en: 'That car is too expensive.', ex: '那辆车太贵了。' },
  { w: 'free', def: 'Costing nothing.', col: 'for free, free of charge', ex_en: 'This book is free.', ex: '这本书是免费的。' },
  { w: 'business', def: 'The activity of making money.', col: 'do business, business man', ex_en: 'He runs a small business.', ex: '他经营一家小生意。' },
  { w: 'job', def: 'Work you do for money.', col: 'find job, full time job', ex_en: 'I have a new job.', ex: '我有了一份新工作。' },
  { w: 'work', def: 'To do a job; or a job itself.', col: 'go to work, hard work', ex_en: 'I work from home.', ex: '我在家工作。' },
  { w: 'office', def: 'A place where people work.', col: 'in office, post office', ex_en: 'The office opens at 9 am.', ex: '办公室上午9点开门。' },
  { w: 'company', def: 'A business organization.', col: 'work for company, big company', ex_en: 'She works for a big company.', ex: '她在一家大公司工作。' },
  { w: 'factory', def: 'A building where things are made.', col: 'work in factory, factory worker', ex_en: 'The factory produces cars.', ex: '这家工厂生产汽车。' },
  { w: 'bank', def: 'A place to keep money.', col: 'in bank, bank account', ex_en: 'I need to go to the bank.', ex: '我需要去银行。' },
  { w: 'cash', def: 'Money in coins or notes.', col: 'pay cash, in cash', ex_en: 'Do you have cash?', ex: '你有现金吗？' },
  { w: 'card', def: 'A plastic card for payment.', col: 'credit card, bank card', ex_en: 'I will pay by card.', ex: '我用卡支付。' },
  { w: 'wallet', def: 'A small thing to hold money.', col: 'leather wallet, empty wallet', ex_en: 'I lost my wallet.', ex: '我的钱包丢了。' },
  { w: 'bag', def: 'A container to carry things.', col: 'plastic bag, hand bag', ex_en: 'Put it in my bag.', ex: '把它放进我的包里。' },
  { w: 'box', def: 'A square container.', col: 'cardboard box, open box', ex_en: 'The box is empty.', ex: '盒子是空的。' },
  { w: 'package', def: 'Something wrapped for sending.', col: 'receive package, send package', ex_en: 'I received a package today.', ex: '我今天收到了一个包裹。' }
]
async function update() {
  const { data: allWords } = await supabase.from('words').select('id, word')
  const wordToId = {}; allWords.forEach(w => { wordToId[w.word] = w.id })
  const toUpdate = data.filter(d => wordToId[d.w]).map(d => ({ id: wordToId[d.w], definition_en: d.def, collocation_en: d.col, example_sentence: d.ex, example_sentence_en: d.ex_en }))
  console.log(`批次21: ${toUpdate.length}个`)
  let ok = 0
  for (const w of toUpdate) {
    const { error } = await supabase.from('words').update({ definition_en: w.definition_en, collocation: w.example_sentence, collocation_en: w.collocation_en, example_sentence: w.example_sentence, example_sentence_en: w.example_sentence_en }).eq('id', w.id)
    if (!error) ok++
  }
  console.log(`批次21完成: ${ok}个\n`)
}
update()
