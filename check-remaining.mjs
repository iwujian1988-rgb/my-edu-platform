import { createClient } from '@supabase/supabase-js'
const supabase = createClient('https://snnrjnpcmdsdlyldvvps.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc')

async function check() {
  const { data } = await supabase
    .from('words')
    .select('word, definition_en, collocation_en, example_sentence, example_sentence_en')
    .is('collocation_en', null)
    .limit(100)

  console.log('Need collocation_en:')
  for (const w of data) {
    console.log(`'${w.word}' | def: ${w.definition_en?.substring(0, 30)} | ex: ${w.example_sentence_en?.substring(0, 30)}`)
  }
}
check()
