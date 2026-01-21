/**
 * 使用AI能力补全剩余61个单词的音标
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

// AI生成的音标数据（61个单词）
const phoneticsData = [
  { word: 'waitress', id: '20f3fccf-e50b-4c93-aa6f-c0ee88289855', phonetic: '/ˈweɪtrəs/', uk: '/ˈweɪtrəs/', us: '/ˈweɪtrəs/' },
  { word: 'main course', id: '539a7407-34c1-4632-bf49-61f8920854ba', phonetic: '/meɪn kɔːs/', uk: '/meɪn kɔːs/', us: '/meɪn kɔːrs/' },
  { word: 'table tennis', id: 'c4b3f807-94f4-4c46-ab5b-b51c03efa4c9', phonetic: '/ˈteɪbl̩ ˈtɛnɪs/', uk: '/ˈteɪbl̩ ˈtɛnɪs/', us: '/ˈteɪbl̩ ˈtɛnɪs/' },
  { word: 'centimeter', id: 'e0818875-5a48-4604-b8b3-dbd8c24ff883', phonetic: '/ˈsɛntɪˌmiːtə/', uk: '/ˈsɛntɪˌmiːtə/', us: '/ˈsɛntɪˌmiːtər/' },
  { word: 'project', id: '03b8862c-923a-42a1-88e1-3af452ed4686', phonetic: '/ˈprɒdʒɛkt/', uk: '/ˈprɒdʒɛkt/', us: '/ˈprɑdʒɛkt/' },
  { word: 'police car', id: '2bba2354-bece-47aa-a6ae-b0f15980344c', phonetic: '/pəˈliːs kɑː/', uk: '/pəˈliːs kɑː/', us: '/pəˈliːs kɑːr/' },
  { word: 'petrol station', id: 'f630809d-89e7-4bca-b151-bc62dabb7044', phonetic: '/ˈpɛtrəl ˈsteɪʃən/', uk: '/ˈpɛtrəl ˈsteɪʃən/', us: '/ˈpɛtrəl ˈsteɪʃən/' },
  { word: 'crossroads', id: 'd9545e03-6620-4bff-bb86-72a090543bc5', phonetic: '/ˈkrɒsrəʊdz/', uk: '/ˈkrɒsrəʊdz/', us: '/ˈkrɔsroʊdz/' },
  { word: 'traffic lights', id: '40175b34-0b66-46c2-9aaf-31ca12831e85', phonetic: '/ˈtræfɪk laɪts/', uk: '/ˈtræfɪk laɪts/', us: '/ˈtræfɪk laɪts/' },
  { word: 'driving licence', id: '0b0bc325-1750-4803-bdeb-16f5a85c10f7', phonetic: '/ˈdraɪvɪŋ ˈlaɪsəns/', uk: '/ˈdraɪvɪŋ ˈlaɪsəns/', us: '/ˈdraɪvɪŋ ˈlaɪsəns/' },
  { word: 'dining room', id: 'e3174156-c4f0-4fc9-9b9d-172e6de00d35', phonetic: '/ˈdaɪnɪŋ ruːm/', uk: '/ˈdaɪnɪŋ ruːm/', us: '/ˈdaɪnɪŋ rʊm/' },
  { word: 'living room', id: '1630e620-3029-4fa0-8512-dc45b9eb9bbd', phonetic: '/ˈlɪvɪŋ ruːm/', uk: '/ˈlɪvɪŋ ruːm/', us: '/ˈlɪvɪŋ rʊm/' },
  { word: 'sitting room', id: 'a7a20c88-2217-453b-a916-22eb396f7318', phonetic: '/ˈsɪtɪŋ ruːm/', uk: '/ˈsɪtɪŋ ruːm/', us: '/ˈsɪtɪŋ rʊm/' },
  { word: 'foggy', id: 'e935ff32-278d-4d7b-a247-f37694e20fcf', phonetic: '/ˈfɒɡi/', uk: '/ˈfɒɡi/', us: '/ˈfɑɡi/' },
  { word: 'cassette recorder', id: 'abab0578-4e26-4652-b618-3a0fa783cd7c', phonetic: '/kəˈsɛt rɪˈkɔːdə/', uk: '/kəˈsɛt rɪˈkɔːdə/', us: '/kəˈsɛt rɪˈkɔːrdər/' },
  { word: 'cassette player', id: '1dc059d3-309e-4e83-8d12-c367cc22fa7b', phonetic: '/kəˈsɛt ˈpleɪə/', uk: '/kəˈsɛt ˈpleɪə/', us: '/kəˈsɛt ˈpleɪər/' },
  { word: 'T-shirt', id: 'a6da4190-621d-498e-99c3-f63a8472466a', phonetic: '/ˈtiːʃɜːt/', uk: '/ˈtiːʃɜːt/', us: '/ˈtiːʃɜːrt/' },
  { word: 'mouse', id: 'd09f1f3c-295d-4b4a-b486-29282a245dda', phonetic: '/maʊs/', uk: '/maʊs/', us: '/maʊs/' },
  { word: 'guidebook', id: 'b4c8e566-3820-464e-9087-1d2cdde23f86', phonetic: '/ˈɡaɪdbʊk/', uk: '/ˈɡaɪdbʊk/', us: '/ˈɡaɪdbʊk/' },
  { word: 'mobile phone', id: '21dd76b3-9ba3-49cc-8a7e-3d49b3f05b37', phonetic: '/ˈməʊbaɪl fəʊn/', uk: '/ˈməʊbaɪl fəʊn/', us: '/ˈmoʊbaɪl foʊn/' },
  { word: 'guesthouse', id: '282cdb60-408c-4ac8-b2aa-cfc6fc21b20a', phonetic: '/ˈɡɛsthaʊs/', uk: '/ˈɡɛsthaʊs/', us: '/ˈɡɛsthaʊs/' },
  { word: 'post office', id: 'de1747a9-d3dd-48df-87e1-76b87c8c18d5', phonetic: '/pəʊst ˈɒfɪs/', uk: '/pəʊst ˈɒfɪs/', us: '/poʊst ˈɔfɪs/' },
  { word: 'theatre', id: 'c8be23ee-3efe-4a09-892b-eb7b420a246c', phonetic: '/ˈθɪətə/', uk: '/ˈθɪətə/', us: '/ˈθiːətər/' },
  { word: 'travel agency', id: '18b4e3f6-9ebb-443b-8d5d-9eeb9f2b31d4', phonetic: '/ˈtrævəl ˈeɪdʒənsi/', uk: '/ˈtrævəl ˈeɪdʒənsi/', us: '/ˈtrævəl ˈeɪdʒənsi/' },
  { word: 'newsagent', id: '4892159a-411d-47bc-ac82-a107df90636b', phonetic: '/ˈnjuːzˌeɪdʒənt/', uk: '/ˈnjuːzˌeɪdʒənt/', us: '/ˈnuːzˌeɪdʒənt/' },
  { word: 'sports centre', id: '667e3834-33bc-4219-96ce-506283950609', phonetic: '/spɔːts ˈsɛntə/', uk: '/spɔːts ˈsɛntə/', us: '/spɔrts ˈsɛntər/' },
  { word: 'tourist information centre', id: '535d2d89-4fae-4906-b4cc-a6eee0f4af97', phonetic: '/ˈtʊərɪst ˌɪnfəˈmeɪʃən ˈsɛntə/', uk: '/ˈtʊərɪst ˌɪnfəˈmeɪʃən ˈsɛntə/', us: '/ˈtʊrɪst ˌɪnfərˈmeɪʃən ˈsɛntər/' },
  { word: 'bus station', id: '79d675ac-4cfc-4d09-815b-300c19127568', phonetic: '/bʌs ˈsteɪʃən/', uk: '/bʌs ˈsteɪʃən/', us: '/bʌs ˈsteɪʃən/' },
  { word: 'campsite', id: '2149e9f0-573e-4a50-a0b8-cd90ac73d589', phonetic: '/ˈkæmpsaɪt/', uk: '/ˈkæmpsaɪt/', us: '/ˈkæmpsaɪt/' },
  { word: 'grandchild', id: 'b348332c-f89f-4bd0-bd5b-68f46dc92037', phonetic: '/ˈɡrænˌtʃaɪld/', uk: '/ˈɡrænˌtʃaɪld/', us: '/ˈɡrændˌtʃaɪld/' },
  { word: 'granddaughter', id: 'c1403bc0-0275-46b3-bc0a-144679652705', phonetic: '/ˈɡrænˌdɔːtə/', uk: '/ˈɡrænˌdɔːtə/', us: '/ˈɡrændˌdɔtər/' },
  { word: 'Mr.', id: '81a48b95-73ad-4f60-b13d-191d657c728f', phonetic: '/ˈmɪstə/', uk: '/ˈmɪstə/', us: '/ˈmɪstər/' },
  { word: 'Ms.', id: '0bacbe21-5a48-4c15-955f-e28e0721162c', phonetic: '/mɪz/', uk: '/mɪz/', us: '/mɪz/' },
  { word: 'pen-friend', id: '277fe0f8-0cc4-4d3a-9907-bed153921d93', phonetic: '/pɛn frɛnd/', uk: '/pɛn frɛnd/', us: '/pɛn frɛnd/' },
  { word: 'Mrs.', id: '9f720d40-941d-46d4-936d-8d3947abc415', phonetic: '/ˈmɪsɪz/', uk: '/ˈmɪsɪz/', us: '/ˈmɪsɪz/' },
  { word: 'February', id: '40c391f3-d6d2-4df0-b388-00905671313c', phonetic: '/ˈfɛbruəri/', uk: '/ˈfɛbruəri/', us: '/ˈfɛbrueri/' },
  { word: 'April', id: '4449cdcb-5f08-4ffe-b981-e645bb63fb63', phonetic: '/ˈeɪprəl/', uk: '/ˈeɪprəl/', us: '/ˈeɪprəl/' },
  { word: 'June', id: '76c4aa82-58a0-48f2-b73f-afaf976aa62d', phonetic: '/dʒuːn/', uk: '/dʒuːn/', us: '/dʒuːn/' },
  { word: 'shop assistant', id: 'f2dcbb60-5e51-4e2e-9bf7-a2f54d74b3ea', phonetic: '/ʃɒp əˈsɪstənt/', uk: '/ʃɒp əˈsɪstənt/', us: '/ʃɑp əˈsɪstənt/' },
  { word: 'tour guide', id: 'b367561d-41f1-43a3-9330-a2b9ff23474a', phonetic: '/tʊə ɡaɪd/', uk: '/tʊə ɡaɪd/', us: '/tʊr ɡaɪd/' },
  { word: 'January', id: '96afcadc-50d8-444e-ae64-059a241aee41', phonetic: '/ˈdʒænjuəri/', uk: '/ˈdʒænjuəri/', us: '/ˈdʒænjueri/' },
  { word: 'July', id: '9a57a99e-7f5f-4e4d-b359-6a7d55e00638', phonetic: '/dʒʊˈlaɪ/', uk: '/dʒʊˈlaɪ/', us: '/dʒʊˈlaɪ/' },
  { word: 'September', id: '8541bb14-049a-4e24-8a95-b3145fd57399', phonetic: '/sɛpˈtɛmbə/', uk: '/sɛpˈtɛmbə/', us: '/səpˈtɛmbər/' },
  { word: 'November', id: '728170e3-4f9b-4ed3-848b-a159c3204c45', phonetic: '/nəʊˈvɛmbə/', uk: '/nəʊˈvɛmbə/', us: '/noʊˈvɛmbər/' },
  { word: 'Monday', id: 'a28f7ed9-71e5-4a59-a826-7efc11dcc425', phonetic: '/ˈmʌndeɪ/', uk: '/ˈmʌndeɪ/', us: '/ˈmʌndeɪ/' },
  { word: 'Wednesday', id: '84babfad-a6e4-4f9d-80c1-61d967f6b45d', phonetic: '/ˈwɛnzdeɪ/', uk: '/ˈwɛnzdeɪ/', us: '/ˈwɛnzdeɪ/' },
  { word: 'October', id: 'bbeac8ae-5966-4114-9847-86efce994852', phonetic: '/ɒkˈtəʊbə/', uk: '/ɒkˈtəʊbə/', us: '/ɑkˈtoʊbər/' },
  { word: 'December', id: '3b3b5c8c-6740-4b2e-b147-54a582d8442b', phonetic: '/dɪˈsɛmbə/', uk: '/dɪˈsɛmbə/', us: '/dɪˈsɛmbər/' },
  { word: 'Sunday', id: 'db2218f6-cb14-4c65-9d7c-11d90f2fb4f2', phonetic: '/ˈsʌndeɪ/', uk: '/ˈsʌndeɪ/', us: '/ˈsʌndeɪ/' },
  { word: 'Tuesday', id: 'f3e591e6-55d5-44b3-a01b-65285c87463b', phonetic: '/ˈtjuːzdeɪ/', uk: '/ˈtjuːzdeɪ/', us: '/ˈtuːzdeɪ/' },
  { word: 'Thursday', id: '3c56c55e-518d-48b7-a26f-a8116d1bce61', phonetic: '/ˈθɜːzdeɪ/', uk: '/ˈθɜːzdeɪ/', us: '/ˈθɜːrzdeɪ/' },
  { word: 'Saturday', id: '49d8e832-83b6-4a18-8210-cd38ee0a76dc', phonetic: '/ˈsætədeɪ/', uk: '/ˈsætədeɪ/', us: '/ˈsætərdeɪ/' },
  { word: 'Friday', id: '2513b203-f15e-4ea0-a8a4-683428b3f5f5', phonetic: '/ˈfraɪdeɪ/', uk: '/ˈfraɪdeɪ/', us: '/ˈfraɪdeɪ/' },
  { word: 'bookshop', id: '580a8918-b73f-4818-83c9-8d2bae96f7fc', phonetic: '/ˈbʊkʃɒp/', uk: '/ˈbʊkʃɒp/', us: '/ˈbʊkʃɑp/' },
  { word: 'department store', id: '7eb7454b-a5fc-4681-b99a-050fd8aef5ba', phonetic: '/dɪˈpɑːtmənt stɔː/', uk: '/dɪˈpɑːtmənt stɔː/', us: '/dɪˈpɑrtmənt stɔr/' },
  { word: 'pay for', id: '09199241-a636-4510-a1e8-d9d1021b8854', phonetic: '/peɪ fɔː/', uk: '/peɪ fɔː/', us: '/peɪ fɔr/' },
  { word: 'for sale', id: 'd0dce113-fc06-4148-ae6b-ec2112cb075a', phonetic: '/fɔː seɪl/', uk: '/fɔː seɪl/', us: '/fɔr seɪl/' },
  { word: 'try on', id: '42feab89-ce48-41ae-ac31-ceab9b54cece', phonetic: '/traɪ ɒn/', uk: '/traɪ ɒn/', us: '/traɪ ɑn/' },
  { word: 'credit card', id: '18a679ad-a08d-4a00-9342-08be43da3e7c', phonetic: '/ˈkrɛdɪt kɑːd/', uk: '/ˈkrɛdɪt kɑːd/', us: '/ˈkrɛdɪt kɑrd/' },
  { word: 'heart attack', id: 'ec425a7d-f932-49c8-ab6a-1a6d1eca9833', phonetic: '/hɑːt əˈtæk/', uk: '/hɑːt əˈtæk/', us: '/hɑrt əˈtæk/' },
  { word: 'lie down', id: 'a343f68d-d9c5-4aa8-a86d-ef5d1917eb8e', phonetic: '/laɪ daʊn/', uk: '/laɪ daʊn/', us: '/laɪ daʊn/' }
]

async function main() {
  console.log('🤖 使用AI能力补全剩余61个单词的音标\n')

  let successCount = 0
  let failCount = 0

  for (let i = 0; i < phoneticsData.length; i++) {
    const item = phoneticsData[i]

    process.stdout.write(`\r📊 进度: ${Math.round((i + 1) / phoneticsData.length * 100)}% (${i + 1}/${phoneticsData.length}) - 成功: ${successCount}, 失败: ${failCount}`)

    try {
      const { error } = await supabase
        .from('words')
        .update({
          phonetic: item.phonetic,
          uk_phonetic: item.uk,
          us_phonetic: item.us
        })
        .eq('id', item.id)

      if (error) {
        console.error(`\n❌ 更新 ${item.word} 失败:`, error.message)
        failCount++
      } else {
        successCount++
      }
    } catch (e) {
      console.error(`\n❌ 更新 ${item.word} 异常:`, e.message)
      failCount++
    }
  }

  console.log(`\n\n✅ 更新完成！\n`)
  console.log('📊 统计：')
  console.log(`  成功: ${successCount} 个`)
  console.log(`  失败: ${failCount} 个\n`)

  // 验证最终覆盖率
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

  const { data: allWords } = await supabase
    .from('words')
    .select('phonetic')
    .in('chapter_id', chapterIds)

  const withPhonetic = allWords.filter(w => w.phonetic).length
  console.log(`📊 最终音标覆盖率: ${withPhonetic}/${allWords.length} (${Math.round(withPhonetic/allWords.length*100)}%)`)

  // 显示一些示例
  console.log('\n🔍 验证示例：\n')
  const samples = ['waitress', 'table tennis', 'February', 'Monday', 'T-shirt']

  for (const word of samples) {
    const { data: w } = await supabase
      .from('words')
      .select('word, phonetic, uk_phonetic, us_phonetic')
      .eq('word', word)
      .in('chapter_id', chapterIds)
      .single()

    if (w) {
      console.log(`${w.word}:`)
      console.log(`  主音标: ${w.phonetic}`)
      console.log(`  英式: ${w.uk_phonetic}`)
      console.log(`  美式: ${w.us_phonetic}`)
      console.log()
    }
  }
}

main()
