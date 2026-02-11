const words = "Spring Festival, Lunar New Year, Chinese New Year, celebration, tradition, custom, culture, heritage, lunar calendar, solar calendar, New Year's Eve, Lantern Festival, reunion, gathering, family, relatives, ancestors, worship, prayer, temple, fair, market, decoration, red, gold, yellow, lucky, auspicious, fortune, wealth, prosperity, longevity, happiness, health, peace, success, harmony, blessing, wish, greeting, visit, guest, host, gift, present, red envelope, lucky money, packet, cash, dumpling, jiaozi, spring roll, rice cake, nian gao, glutinous rice ball, tangyuan, fish, surplus, chicken, pork, beef, duck, seafood, noodles, vegetable, fruit, tangerine, orange, pomelo, kumquat, peach blossom, peony, narcissus, plant, flower, tree, bamboo, plum, orchid, candy, sweet, snack, seed, peanut, melon seed, walnut, almond, date, tea, wine, liquor, toast, feast, banquet, dinner, lunch, breakfast, cook, boil, steam, fry, bake, wrap, eat, drink, hungry, full, delicious, tasty, flavor, spicy, salty, sour, bitter, firecracker, firework, sparkler, noise, loud, bang, explode, light, burn, incense, candle, lantern, lamp, couplet, scroll, banner, paper-cut, window grille, painting, picture, character, Fu, knot, tassel, art, craft, performance, show, dance, lion dance, dragon dance, parade, costume, mask, drum, gong, cymbal, music, song, opera, gala, TV, watch, play, game, mahjong, cards, gambling, entertainment, travel, trip, journey, transport, train, plane, bus, car, ticket, station, airport, crowd, rush, traffic, migration, hometown, city, village, return, leave, arrive, depart, stay, wait, clean, sweep, dust, wash, scrub, new, clothes, haircut, bath, shower, superstition, taboo, avoid, bad luck, evil, spirit, monster, Nian, legend, myth, story, zodiac, animal, sign, Rat, Ox, Tiger, Rabbit, Dragon, Snake, Horse, Goat, Monkey, Rooster, Dog, Pig, year, cycle, element, wood, fire, earth, metal, water, spring, season, winter, weather, cold, warm, festive, lively, bustling, joyous, colorful, bright, shiny, traditional, ancient, modern, global, international, community, society, people, generation, children, adult, senior, elderly, respect, filial piety, love, care, share, help, give, receive";

const wordList = words.split(',').map(w => w.trim().toLowerCase());
const total = wordList.length;
const unique = new Set(wordList).size;
const duplicates = total - unique;

console.log(`总数: ${total}`);
console.log(`唯一: ${unique}`);
console.log(`重复: ${duplicates}`);

if (duplicates > 0) {
  const counts = {};
  wordList.forEach(w => {
    counts[w] = (counts[w] || 0) + 1;
  });

  const dupes = Object.entries(counts).filter(([w, c]) => c > 1);
  console.log('重复项:');
  dupes.sort((a, b) => b[1] - a[1]).forEach(([w, c]) => {
    console.log(`  ${w}: ${c}次`);
  });
}
