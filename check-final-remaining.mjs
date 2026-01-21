import { createClient } from '@supabase/supabase-js'
const supabase = createClient('https://snnrjnpcmdsdlyldvvps.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc')

async function check() {
  const { data } = await supabase
    .from('words')
    .select('id, word, definition_en, collocation_en, example_sentence, example_sentence_en')
    .or('collocation_en.is.null,example_sentence_en.is.null')
    .limit(100)

  console.log('Remaining:', data.length)
  for (const w of data) {
    console.log(`id:${w.id} '${w.word}'`)
    console.log(`  def: ${w.definition_en?.substring(0, 40)}`)
    console.log(`  col: ${w.collocation_en}`)
    console.log(`  ex_en: ${w.example_sentence_en}`)
    console.log(`  ex: ${w.example_sentence}`)
    console.log('')
  }
}
check()
