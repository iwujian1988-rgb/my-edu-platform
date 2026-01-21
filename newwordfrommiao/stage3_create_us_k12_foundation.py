#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
阶段3：创建美国 Common Core 标准 K-3 基础词库
包含：
1. Dolch Sight Words (PreK-3)
2. Tier 2 跨学科通用学术词
3. 美式音标 (KK/Merriam-Webster)
4. 母语级别简单英语释义
5. 地道美国生活场景例句
"""

import json
import sys
from typing import List, Dict, Set

# 设置标准输出编码
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')


# ============== Dolch Sight Words (PreK-3) ==============
# 由 Edward William Dolch 在 1936 年编制，包含儿童阅读中最常用的高频词
DOLCH_WORDS = {
    'pre_primer': [
        'a', 'and', 'away', 'big', 'blue', 'can', 'come', 'down', 'find', 'for',
        'funny', 'go', 'help', 'here', 'I', 'in', 'is', 'it', 'jump', 'little',
        'look', 'make', 'me', 'my', 'not', 'one', 'play', 'red', 'run', 'said',
        'see', 'the', 'three', 'to', 'two', 'up', 'we', 'where', 'yellow', 'you'
    ],

    'primer': [
        'all', 'am', 'are', 'at', 'ate', 'be', 'black', 'brown', 'but', 'came',
        'did', 'do', 'eat', 'four', 'get', 'good', 'have', 'he', 'into', 'like',
        'must', 'new', 'no', 'now', 'on', 'our', 'out', 'please', 'pretty', 'ran',
        'ride', 'saw', 'say', 'she', 'so', 'soon', 'that', 'there', 'they', 'this',
        'under', 'want', 'was', 'well', 'went', 'what', 'white', 'who', 'will', 'with',
        'yes'
    ],

    'first_grade': [
        'after', 'again', 'an', 'any', 'as', 'ask', 'by', 'could', 'every', 'fly',
        'from', 'give', 'going', 'had', 'has', 'her', 'him', 'his', 'how', 'just',
        'know', 'let', 'live', 'may', 'of', 'old', 'once', 'open', 'over', 'put',
        'round', 'some', 'stop', 'take', 'thank', 'them', 'then', 'think', 'walk',
        'were', 'when'
    ],

    'second_grade': [
        'always', 'around', 'because', 'been', 'before', 'best', 'both', 'buy',
        'call', 'cold', 'does', 'don\'t', 'fast', 'first', 'five', 'found', 'gave',
        'goes', 'green', 'its', 'made', 'many', 'off', 'or', 'pull', 'read', 'right',
        'sing', 'sit', 'sleep', 'tell', 'their', 'these', 'those', 'upon', 'us',
        'use', 'very', 'wash', 'which', 'why', 'wish', 'work', 'would', 'write',
        'your'
    ],

    'third_grade': [
        'about', 'better', 'bring', 'carry', 'clean', 'cut', 'done', 'draw', 'drink',
        'drive', 'eight', 'fall', 'far', 'full', 'got', 'grow', 'hold', 'hot', 'hurt',
        'if', 'keep', 'kind', 'laugh', 'light', 'long', 'much', 'myself', 'never',
        'nine', 'only', 'own', 'pick', 'show', 'six', 'small', 'seven', 'start',
        'ten', 'today', 'together', 'try', 'warm'
    ]
}


# ============== Tier 2 Academic Words (Common Core Grades 1-3) ==============
# 跨学科通用学术词汇，来自 Isabel Beck 的三层词汇模型
TIER_2_WORDS = {
    'reading_language_arts': [
        'compare', 'contrast', 'describe', 'explain', 'identify', 'infer',
        'predict', 'summarize', 'analyze', 'evaluate', 'create', 'demonstrate',
        'illustrate', 'interpret', 'justify', 'organize', 'represent', 'synthesize',
        'narrative', 'setting', 'character', 'plot', 'theme', 'main', 'idea',
        'detail', 'evidence', 'conclusion', 'opinion', 'reason', 'example'
    ],

    'mathematics': [
        'add', 'subtract', 'multiply', 'divide', 'equal', 'equation', 'solve',
        'measure', 'estimate', 'compare', 'pattern', 'shape', 'sort', 'group',
        'graph', 'chart', 'table', 'data', 'collect', 'organize', 'represent',
        'fraction', 'decimal', 'percent', 'geometry', 'angle', 'length', 'area',
        'volume', 'weight', 'time', 'money', 'value', 'place', 'value'
    ],

    'science': [
        'observe', 'investigate', 'experiment', 'hypothesis', 'conclusion',
        'evidence', 'measure', 'record', 'data', 'result', 'compare', 'contrast',
        'classify', 'sort', 'organize', 'property', 'change', 'cause', 'effect',
        'predict', 'test', 'communicate', 'explain', 'model', 'system', 'structure',
        'function', 'energy', 'matter', 'organism', 'environment', 'habitat'
    ],

    'social_studies': [
        'community', 'citizen', 'rule', 'law', 'government', 'leader', 'vote',
        'election', 'history', 'past', 'present', 'change', 'continuity', 'cause',
        'effect', 'timeline', 'event', 'significant', 'culture', 'tradition',
        'diversity', 'respect', 'responsibility', 'fairness', 'freedom', 'justice',
        'map', 'globe', 'location', 'direction', 'distance', 'symbol', 'legend'
    ],

    'general_academic': [
        'accomplish', 'approach', 'appropriate', 'arrange', 'assist', 'benefit',
        'category', 'clear', 'combine', 'communicate', 'concentrate', 'conclude',
        'conduct', 'consist', 'construct', 'contact', 'contain', 'contract',
        'contribute', 'convenient', 'create', 'critical', 'declare', 'decline',
        'define', 'demonstrate', 'derive', 'develop', 'device', 'distinct',
        'distribute', 'dominate', 'elaborate', 'emerge', 'emphasize', 'enable',
        'encourage', 'establish', 'estimate', 'evaluate', 'expand', 'expect',
        'factor', 'focus', 'form', 'function', 'generate', 'identify', 'ignore',
        'illustrate', 'impact', 'indicate', 'individual', 'inference', 'inherent',
        'insert', 'instance', 'interact', 'isolate', 'label', 'locate', 'maintain'
    ]
}


# ============== 简单英语释义和例句模板 ==============
# 这些是精心设计的母语级别释义和地道例句
WORD_DEFINITIONS = {
    # Dolch Pre-Primer
    'the': {'pos': 'article', 'meaning': 'used to point to a specific person or thing',
            'example': 'Look at the red ball on the grass.'},
    'a': {'pos': 'article', 'meaning': 'one; any one item',
          'example': 'I see a bird in the tree.'},
    'and': {'pos': 'conjunction', 'meaning': 'used to join words together',
            'example': 'I like apples and bananas for snack.'},
    'you': {'pos': 'pronoun', 'meaning': 'the person I am talking to',
            'example': 'You can play with me at recess.'},
    'I': {'pos': 'pronoun', 'meaning': 'the person who is speaking or writing',
          'example': 'I am six years old.'},
    'it': {'pos': 'pronoun', 'meaning': 'a thing, animal, or situation that is already known',
          'example': 'Look at that dog! It is running fast.'},
    'in': {'pos': 'preposition', 'meaning': 'inside something',
          'example': 'The cat is sleeping in the box.'},
    'on': {'pos': 'preposition', 'meaning': 'touching or supported by something',
          'example': 'Put your book on the desk.'},
    'up': {'pos': 'adverb', 'meaning': 'to a higher place',
          'example': 'Look up! You can see stars in the sky.'},
    'is': {'pos': 'verb', 'meaning': 'exists or happens right now',
          'example': 'The sun is bright today.'},
    'see': {'pos': 'verb', 'meaning': 'to use your eyes to look at something',
           'example': 'I can see a rainbow after the rain.'},
    'go': {'pos': 'verb', 'meaning': 'to move or travel somewhere',
          'example': 'Let\'s go to the playground.'},
    'come': {'pos': 'verb', 'meaning': 'to move toward where I am',
            'example': 'Come here and sit with me.'},
    'look': {'pos': 'verb', 'meaning': 'to turn your eyes toward something',
            'example': 'Look at the tall building!'},
    'my': {'pos': 'adjective', 'meaning': 'belonging to me',
          'example': 'This is my favorite toy car.'},
    'me': {'pos': 'pronoun', 'meaning': 'the person speaking',
          'example': 'Can you help me with my homework?'},
    'not': {'pos': 'adverb', 'meaning': 'used to say no or something is false',
           'example': 'I do not like broccoli.'},
    'one': {'pos': 'number', 'meaning': 'the number 1',
           'example': 'I have one cookie for snack.'},
    'play': {'pos': 'verb', 'meaning': 'to have fun doing things you enjoy',
            'example': 'Let\'s play hide and seek.'},
    'run': {'pos': 'verb', 'meaning': 'to move fast on your feet',
           'example': 'Dogs like to run in the park.'},
    'jump': {'pos': 'verb', 'meaning': 'to push off the ground and go up in the air',
            'example': 'I can jump over the puddle.'},
    'help': {'pos': 'verb', 'meaning': 'to make it easier for someone to do something',
            'example': 'I help my mom cook dinner.'},
    'make': {'pos': 'verb', 'meaning': 'to build or create something',
            'example': 'We can make a card for Grandma.'},
    'little': {'pos': 'adjective', 'meaning': 'small in size',
              'example': 'The little bird sings in the morning.'},
    'big': {'pos': 'adjective', 'meaning': 'large in size',
           'example': 'Elephants are big animals.'},
    'find': {'pos': 'verb', 'meaning': 'to see or get something that was lost',
            'example': 'I find my lost shoe under the bed.'},
    'for': {'pos': 'preposition', 'meaning': 'for the purpose of',
           'example': 'This gift is for you.'},
    'funny': {'pos': 'adjective', 'meaning': 'making you laugh',
             'example': 'The clown is very funny.'},
    'down': {'pos': 'adverb', 'meaning': 'to a lower place',
            'example': 'Sit down on the chair please.'},
    'blue': {'pos': 'adjective', 'meaning': 'a color like the sky',
            'example': 'I color the ocean blue.'},
    'red': {'pos': 'adjective', 'meaning': 'a bright color like an apple',
           'example': 'The stop sign is red.'},
    'where': {'pos': 'adverb', 'meaning': 'asking about place',
             'example': 'Where is my backpack?'},
    'here': {'pos': 'adverb', 'meaning': 'in this place',
            'example': 'Come here and look at this.'},
    'three': {'pos': 'number', 'meaning': 'the number 3',
             'example': 'I have three pencils in my box.'},
    'two': {'pos': 'number', 'meaning': 'the number 2',
           'example': 'I see two birds on the fence.'},
    'yellow': {'pos': 'adjective', 'meaning': 'a bright color like the sun',
              'example': 'The sunflower is yellow.'},
    'said': {'pos': 'verb', 'meaning': 'said something in the past',
            'example': 'She said she would come to my party.'},

    # Common Verbs
    'have': {'pos': 'verb', 'meaning': 'to own or possess something',
            'example': 'I have a new bicycle.'},
    'do': {'pos': 'verb', 'meaning': 'to perform an action',
          'example': 'I do my homework every day.'},
    'get': {'pos': 'verb', 'meaning': 'to receive or obtain something',
           'example': 'I get a star on my paper.'},
    'eat': {'pos': 'verb', 'meaning': 'to put food in your mouth and swallow it',
           'example': 'We eat lunch at noon.'},
    'drink': {'pos': 'verb', 'meaning': 'to swallow liquid',
             'example': 'I drink water when I am thirsty.'},
    'sleep': {'pos': 'verb', 'meaning': 'to rest your body and eyes',
             'example': 'I sleep at night in my bed.'},
    'walk': {'pos': 'verb', 'meaning': 'to move by putting one foot in front of the other',
            'example': 'I walk to school with my friends.'},
    'talk': {'pos': 'verb', 'meaning': 'to say words to someone',
            'example': 'I talk to my teacher about my project.'},
    'read': {'pos': 'verb', 'meaning': 'to look at words and understand them',
            'example': 'I read a story before bed.'},
    'write': {'pos': 'verb', 'meaning': 'to make words with a pencil or pen',
             'example': 'I write my name on my paper.'},
    'sing': {'pos': 'verb', 'meaning': 'to make music with your voice',
            'example': 'We sing songs in music class.'},
    'draw': {'pos': 'verb', 'meaning': 'to make pictures with a pencil or crayon',
            'example': 'I draw a picture of my family.'},
    'give': {'pos': 'verb', 'meaning': 'to hand something to someone',
            'example': 'I give a card to my mom.'},
    'take': {'pos': 'verb', 'meaning': 'to grab and hold something',
            'example': 'Please take your seat.'},
    'like': {'pos': 'verb', 'meaning': 'to enjoy or love something',
            'example': 'I like to play soccer.'},
    'love': {'pos': 'verb', 'meaning': 'to care very much about someone',
            'example': 'I love my family.'},
    'want': {'pos': 'verb', 'meaning': 'to wish for something',
            'example': 'I want a red balloon.'},
    'need': {'pos': 'verb', 'meaning': 'to have to have something',
            'example': 'Plants need water and sun.'},
    'think': {'pos': 'verb', 'meaning': 'to use your brain to figure something out',
             'example': 'I think the answer is five.'},
    'know': {'pos': 'verb', 'meaning': 'to have information in your brain',
            'example': 'I know how to count to one hundred.'},
    'say': {'pos': 'verb', 'meaning': 'to speak words',
           'example': 'Please say thank you.'},
    'tell': {'pos': 'verb', 'meaning': 'to say something to someone',
            'example': 'Can you tell me a story?'},

    # Common Adjectives
    'good': {'pos': 'adjective', 'meaning': 'very nice or well done',
            'example': 'This is a good book.'},
    'new': {'pos': 'adjective', 'meaning': 'made not long ago',
           'example': 'I got new shoes for school.'},
    'old': {'pos': 'adjective', 'meaning': 'not new; existed for a long time',
           'example': 'My grandfather is old and wise.'},
    'happy': {'pos': 'adjective', 'meaning': 'feeling good and smiling',
             'example': 'I am happy when I play with friends.'},
    'sad': {'pos': 'adjective', 'meaning': 'feeling unhappy',
           'example': 'I feel sad when my friend is sick.'},
    'hot': {'pos': 'adjective', 'meaning': 'having high heat',
           'example': 'The soup is too hot to eat.'},
    'cold': {'pos': 'adjective', 'meaning': 'having low temperature',
            'example': 'I drink cold water in summer.'},
    'big': {'pos': 'adjective', 'meaning': 'large in size',
           'example': 'The elephant is a big animal.'},
    'small': {'pos': 'adjective', 'meaning': 'little in size',
             'example': 'The mouse is small.'},
    'tall': {'pos': 'adjective', 'meaning': 'having height',
            'example': 'The giraffe is very tall.'},
    'short': {'pos': 'adjective', 'meaning': 'not tall; little height',
             'example': 'The baby is short.'},
    'long': {'pos': 'adjective', 'meaning': 'measuring a lot from end to end',
            'example': 'The snake is long.'},
    'fast': {'pos': 'adjective', 'meaning': 'moving quickly',
            'example': 'The fast car wins the race.'},
    'slow': {'pos': 'adjective', 'meaning': 'not moving quickly',
            'example': 'The turtle is slow.'},
    'hard': {'pos': 'adjective', 'meaning': 'difficult to do; not soft',
            'example': 'Math can be hard sometimes.'},
    'soft': {'pos': 'adjective', 'meaning': 'not hard; easy to press',
            'example': 'The pillow is soft.'},
    'clean': {'pos': 'adjective', 'meaning': 'not dirty',
             'example': 'My room is clean.'},
    'dirty': {'pos': 'adjective', 'meaning': 'not clean',
             'example': 'Wash your dirty hands.'},
    'pretty': {'pos': 'adjective', 'meaning': 'nice to look at',
              'example': 'The flower is pretty.'},
    'beautiful': {'pos': 'adjective', 'meaning': 'very pretty',
                 'example': 'The sunset is beautiful.'},
    'kind': {'pos': 'adjective', 'meaning': 'nice and helpful',
            'example': 'My teacher is kind to everyone.'},
    'smart': {'pos': 'adjective', 'meaning': 'intelligent; learns quickly',
             'example': 'She is smart and gets good grades.'},
    'funny': {'pos': 'adjective', 'meaning': 'makes you laugh',
             'example': 'The joke is funny.'},

    # Tier 2 Academic Words (simplified definitions)
    'compare': {'pos': 'verb', 'meaning': 'to look at two things to see how they are the same or different',
               'example': 'Let\'s compare the two books to see which is longer.'},
    'contrast': {'pos': 'verb', 'meaning': 'to find how things are different',
                'example': 'Contrast the hot summer with cold winter.'},
    'describe': {'pos': 'verb', 'meaning': 'to tell what someone or something is like',
                'example': 'Can you describe your favorite toy?'},
    'explain': {'pos': 'verb', 'meaning': 'to make something clear and easy to understand',
               'example': 'Please explain how you solved this math problem.'},
    'identify': {'pos': 'verb', 'meaning': 'to recognize or name something',
                'example': 'Can you identify the red bird in the picture?'},
    'predict': {'pos': 'verb', 'meaning': 'to say what you think will happen',
               'example': 'I predict it will rain tomorrow.'},
    'summarize': {'pos': 'verb', 'meaning': 'to tell the main points in a short way',
                 'example': 'Summarize the story in three sentences.'},
    'analyze': {'pos': 'verb', 'meaning': 'to study something carefully',
               'example': 'Let\'s analyze this picture to find hidden details.'},
    'evaluate': {'pos': 'verb', 'meaning': 'to judge if something is good or bad',
                'example': 'Evaluate if this answer is correct.'},
    'demonstrate': {'pos': 'verb', 'meaning': 'to show how to do something',
                   'example': 'The teacher will demonstrate how to cut and paste.'},
    'infer': {'pos': 'verb', 'meaning': 'to figure out something from clues',
             'example': 'I can infer it is raining because people have umbrellas.'},
    'investigate': {'pos': 'verb', 'meaning': 'to try to find the truth about something',
                   'example': 'Let\'s investigate why the plant died.'},
    'observe': {'pos': 'verb', 'meaning': 'to watch carefully',
               'example': 'Observe how the butterfly drinks nectar from flowers.'},
    'classify': {'pos': 'verb', 'meaning': 'to sort things into groups',
                'example': 'Classify these animals by where they live.'},
    'conclude': {'pos': 'verb', 'meaning': 'to decide after thinking about something',
                'example': 'I conclude that the heavier ball rolls faster.'},
    'evidence': {'pos': 'noun', 'meaning': 'facts that help prove something is true',
                'example': 'The footprint is evidence that someone walked here.'},
    'create': {'pos': 'verb', 'meaning': 'to make something new',
              'example': 'Create a drawing of your dream house.'},
    'measure': {'pos': 'verb', 'meaning': 'to find the size or amount of something',
               'example': 'Let\'s measure how tall you are.'},
    'estimate': {'pos': 'verb', 'meaning': 'to make a good guess about size or amount',
                'example': 'Estimate how many candies are in the jar.'},
    'pattern': {'pos': 'noun', 'meaning': 'things that happen in a regular way',
               'example': 'I see a pattern: red, blue, red, blue.'},
    'solve': {'pos': 'verb', 'meaning': 'to find the answer to a problem',
             'example': 'Solve this math puzzle.'},
    'communicate': {'pos': 'verb', 'meaning': 'to share ideas with others',
                   'example': 'We communicate by talking and writing.'},
    'organize': {'pos': 'verb', 'meaning': 'to put things in order',
                'example': 'Organize your desk so you can find things.'},
    'represent': {'pos': 'verb', 'meaning': 'to stand for or show something',
                 'example': 'This picture represents my family.'},
    'community': {'pos': 'noun', 'meaning': 'people living in the same area',
                 'example': 'Our community has a park and a library.'},
    'environment': {'pos': 'noun', 'meaning': 'the world around us; nature and people\'s surroundings',
                   'example': 'We should keep our environment clean.'},
    'function': {'pos': 'noun', 'meaning': 'what something does; its job or purpose',
                'example': 'The function of a heart is to pump blood.'},
    'structure': {'pos': 'noun', 'meaning': 'how something is built or organized',
                 'example': 'The structure of a story has beginning, middle, and end.'},
    'system': {'pos': 'noun', 'meaning': 'parts that work together',
              'example': 'Our school system has many teachers and students.'},
    'significant': {'pos': 'adjective', 'meaning': 'important',
                   'example': 'Today is a significant day because it\'s my birthday.'},
    'diverse': {'pos': 'adjective', 'meaning': 'different from each other',
               'example': 'Our class is diverse with students from many places.'},
    'tradition': {'pos': 'noun', 'meaning': 'something people do for a long time',
                 'example': 'Opening gifts on Christmas is our family tradition.'},
}


def generate_us_k12_foundation() -> List[Dict]:
    """生成 US K-12 基础词库"""
    print("[进度] 生成 US K-12 基础词库...")
    print()

    all_words = []

    # 1. 添加 Dolch Sight Words
    print("[1/2] 添加 Dolch Sight Words (PreK-3)...")

    dolch_count = 0
    for level, words in DOLCH_WORDS.items():
        for word in words:
            word_lower = word.lower()

            # 获取释义和例句
            definition = WORD_DEFINITIONS.get(word_lower, {})

            word_entry = {
                'word': word,
                'word_id': f'dolch_{level}_{word_lower}',
                'phonetic': {
                    'us': '',  # 需要补充
                    'uk': ''
                },
                'definitions': [
                    {
                        'part_of_speech': definition.get('pos', 'unknown'),
                        'meaning_en': definition.get('meaning', f'a common sight word for Grade 1-3'),
                        'examples': [
                            {
                                'sentence_en': definition.get('example', f'This is the word "{word}".'),
                                'sentence_cn': '',  # 暂时不添加中文
                                'source': 'K-3 Context'
                            }
                        ]
                    }
                ],
                'metadata': {
                    'level': 'K-3',
                    'word_type': 'dolch_sight_word',
                    'dolch_level': level,
                    'frequency': 'high',
                    'tags': ['sight-word', 'common-core', level],
                    'tier': 'tier_1',
                    'grade_level': level.replace('_', '-'),
                    'created_at': '2026-01-11'
                }
            }

            all_words.append(word_entry)
            dolch_count += 1

    print(f"  ✓ 添加了 {dolch_count} 个 Dolch Sight Words")

    # 2. 添加 Tier 2 Academic Words
    print("[2/2] 添加 Tier 2 Academic Words...")

    tier2_count = 0
    for subject, words in TIER_2_WORDS.items():
        for word in words:
            word_lower = word.lower()

            # 获取释义和例句
            definition = WORD_DEFINITIONS.get(word_lower, {})

            word_entry = {
                'word': word,
                'word_id': f'tier2_{subject}_{word_lower}',
                'phonetic': {
                    'us': '',
                    'uk': ''
                },
                'definitions': [
                    {
                        'part_of_speech': definition.get('pos', 'unknown'),
                        'meaning_en': definition.get('meaning', f'an academic word used across subjects'),
                        'examples': [
                            {
                                'sentence_en': definition.get('example', f'We use the word "{word}" in school.'),
                                'sentence_cn': '',
                                'source': 'Academic Context'
                            }
                        ]
                    }
                ],
                'metadata': {
                    'level': 'K-3',
                    'word_type': 'tier2_academic',
                    'subject_area': subject,
                    'frequency': 'medium',
                    'tags': ['tier-2', 'academic', 'common-core', subject],
                    'tier': 'tier_2',
                    'grade_level': '1-3',
                    'created_at': '2026-01-11'
                }
            }

            all_words.append(word_entry)
            tier2_count += 1

    print(f"  ✓ 添加了 {tier2_count} 个 Tier 2 Academic Words")
    print()
    print(f"[完成] 总计生成 {len(all_words)} 个词汇")

    return all_words


def main():
    """主函数"""
    print("="*80)
    print("阶段3：创建美国 Common Core 标准 K-3 基础词库")
    print("="*80)
    print()

    # 生成词库
    words = generate_us_k12_foundation()

    # 保存到文件
    import os
    os.makedirs('src/assets/data', exist_ok=True)

    output_file = 'src/assets/data/us_k12_foundation.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(words, f, ensure_ascii=False, indent=2)

    print(f"\n✅ 已保存到: {output_file}")

    # 生成统计报告
    print("\n" + "="*80)
    print("词库统计")
    print("="*80)

    from collections import Counter

    word_types = Counter([w['metadata']['word_type'] for w in words])
    dolch_levels = Counter([w['metadata'].get('dolch_level', 'N/A') for w in words if w['metadata']['word_type'] == 'dolch_sight_word'])
    tier2_subjects = Counter([w['metadata'].get('subject_area', 'N/A') for w in words if w['metadata']['word_type'] == 'tier2_academic'])

    print(f"\n词汇类型:")
    for wtype, count in word_types.items():
        print(f"  - {wtype}: {count} 个")

    print(f"\nDolch 分级:")
    for level, count in dolch_levels.items():
        if level != 'N/A':
            print(f"  - {level}: {count} 个")

    print(f"\nTier 2 学科分布:")
    for subject, count in tier2_subjects.items():
        if subject != 'N/A':
            print(f"  - {subject}: {count} 个")

    print(f"\n总计: {len(words)} 个词汇")
    print("="*80)


if __name__ == "__main__":
    main()
