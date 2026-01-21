# scripts/audit_master_pool.py
import json
import os
import random

# 读取数据
with open('src/assets/data/master_words_pool.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# 1. 全库统计
total_words = len(data)
print('='*70)
print('全库资产大盘点 - Master Words Pool')
print('='*70)
print(f'\n[1] 全库总单词数: {total_words} 词\n')

# 2. 字母统计
print('[2] 字母分类统计 (A-Z):')
print('-'*70)
letter_count = {}
for word in data.keys():
    first_letter = word[0].upper()
    letter_count[first_letter] = letter_count.get(first_letter, 0) + 1

# 按字母顺序输出
for letter in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ':
    count = letter_count.get(letter, 0)
    bar = '*' * (count // 2) if count > 0 else ''
    print(f'{letter}: {count:3d} 词 {bar}')

print('-'*70)
print(f'覆盖字母: {len(letter_count)}/26')
print(f'空缺字母: {26 - len(letter_count)} 个\n')

# 统计空缺字母
missing_letters = [l for l in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' if l not in letter_count]
if missing_letters:
    print(f'空缺字母详情: {", ".join(missing_letters)}\n')

# 3. 质量抽检
print('[3] 质量抽检对比 (随机 10 词):')
print('-'*70)

# A-H 的词
ah_words = [k for k in data.keys() if k[0].lower() in 'abcdefgh']
iz_words = [k for k in data.keys() if k[0].lower() in 'ijklmnopqrstuvwxyz']

sample_ah = random.sample(ah_words, min(5, len(ah_words)))
sample_iz = random.sample(iz_words, min(5, len(iz_words)))

print('\n[A-H 样本] (已存在词库)')
print('='*70)
for word in sample_ah:
    entry = data[word]
    print(f'Word: {word}')
    print(f'  POS: {entry.get("part_of_speech", "N/A")}')
    print(f'  Example: {entry.get("example", "N/A")[:60]}...')
    print()

print('[I-Z 样本] (Stage 4 新增)')
print('='*70)
for word in sample_iz:
    entry = data[word]
    print(f'Word: {word}')
    print(f'  POS: {entry.get("part_of_speech", "N/A")}')
    print(f'  Example: {entry.get("example", "N/A")[:60]}...')
    print()

# 4. 存储预估
file_size = os.path.getsize('src/assets/data/master_words_pool.json')
avg_word_size = file_size / total_words if total_words > 0 else 0

print('[4] 存储空间分析:')
print('-'*70)
print(f'当前文件大小: {file_size:,} bytes ({file_size/1024:.2f} KB)')
print(f'当前单词数量: {total_words}')
print(f'平均每词占用: {avg_word_size:.2f} bytes')
print(f'\n预估 10,000 词占用: {avg_word_size * 10000:,.0f} bytes ({avg_word_size * 10000/1024:.2f} KB, {avg_word_size * 10000/1024/1024:.2f} MB)')
print('='*70)

# 5. 数据质量分析
print('\n[5] 数据完整性分析:')
print('-'*70)
fields = ['word', 'phonetic', 'part_of_speech', 'meaning', 'example', 'translation']
for field in fields:
    complete = sum(1 for entry in data.values() if field in entry and entry[field])
    percentage = (complete / total_words * 100) if total_words > 0 else 0
    print(f'{field:20s}: {complete:4d}/{total_words} ({percentage:5.1f}%)')
print('='*70)
