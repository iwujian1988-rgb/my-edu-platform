/**
 * 测试英文释义和中文释义的对齐情况
 */

const testWords = ['barbecue', 'form', 'note', 'chips'];

async function testWord(word) {
  const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
  const data = await response.json();
  const entry = data[0];

  console.log(`=== ${word.toUpperCase()} ===`);

  const meanings = entry.meanings || [];
  meanings.forEach(m => {
    const pos = m.partOfSpeech;
    const posShort = posToShort(pos);
    console.log(`[${posShort} / ${pos}]`);
    if (m.definitions && m.definitions.length > 0) {
      console.log(`  ${m.definitions[0].definition.substring(0, 80)}...`);
    }
  });
  console.log();
}

function posToShort(pos) {
  const posMap = {
    'noun': 'n.',
    'verb': 'v.',
    'transitive verb': 'vt.',
    'intransitive verb': 'vi.',
    'adjective': 'adj.',
    'adverb': 'adv.'
  };
  return posMap[pos.toLowerCase()] || pos;
}

(async () => {
  for (const w of testWords) {
    await testWord(w);
  }
})();
