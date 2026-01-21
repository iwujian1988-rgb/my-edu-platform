#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
任务1：补充功能词释义
优化 a, I, it, the, is 等功能词的释义，使其更符合母语者儿童学习习惯
"""

import json
import sys

# 设置标准输出编码
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')


# ============== 功能词优化释义库 ==============
# 这些释义专为母语者儿童设计，简单易懂
FUNCTION_WORD_DEFINITIONS = {
    # 冠词
    'a': {
        'pos': 'article',
        'meaning_en': 'used before a word that starts with a consonant sound to talk about one thing',
        'simple_meaning': 'one; any one item of a group',
        'examples': [
            'I see a bird in the tree.',
            'Can I have a cookie?',
            'This is a book about animals.'
        ]
    },
    'an': {
        'pos': 'article',
        'meaning_en': 'used before a word that starts with a vowel sound',
        'simple_meaning': 'one; any one item that starts with a, e, i, o, u',
        'examples': [
            'I ate an apple for lunch.',
            'She has an orange backpack.',
            'An elephant is big.'
        ]
    },
    'the': {
        'pos': 'article',
        'meaning_en': 'used to point to a specific person or thing that both the speaker and listener know about',
        'simple_meaning': 'a particular thing or person we both know',
        'examples': [
            'Look at the red ball on the grass.',
            'Where is the cat?',
            'The sun is bright today.'
        ]
    },

    # 代词
    'I': {
        'pos': 'pronoun',
        'meaning_en': 'used by the person who is speaking or writing to refer to themselves',
        'simple_meaning': 'the person who is talking or writing',
        'examples': [
            'I am six years old.',
            'I like to play soccer.',
            'Can I help you?'
        ]
    },
    'you': {
        'pos': 'pronoun',
        'meaning_en': 'used to talk to the person or people you are speaking to',
        'simple_meaning': 'the person or people I am talking to',
        'examples': [
            'You can play with me.',
            'Do you like ice cream?',
            'Thank you for helping.'
        ]
    },
    'he': {
        'pos': 'pronoun',
        'meaning_en': 'used to talk about a male person or animal',
        'simple_meaning': 'a boy or man who is being talked about',
        'examples': [
            'He is my brother.',
            'He runs fast.',
            'My dad is tall. He is strong.'
        ]
    },
    'she': {
        'pos': 'pronoun',
        'meaning_en': 'used to talk about a female person or animal',
        'simple_meaning': 'a girl or woman who is being talked about',
        'examples': [
            'She is my best friend.',
            'She has long hair.',
            'My teacher is nice. She helps me learn.'
        ]
    },
    'it': {
        'pos': 'pronoun',
        'meaning_en': 'used to talk about a thing, animal, or situation that is already known',
        'simple_meaning': 'that thing or animal we were just talking about',
        'examples': [
            'Look at that dog! It is running fast.',
            'I have a toy car. It is red.',
            'Where is my book? It was here.'
        ]
    },
    'we': {
        'pos': 'pronoun',
        'meaning_en': 'used to talk about yourself and other people together',
        'simple_meaning': 'me and others together',
        'examples': [
            'We are going to the park.',
            'We can share the toys.',
            'We learned about dinosaurs today.'
        ]
    },
    'they': {
        'pos': 'pronoun',
        'meaning_en': 'used to talk about two or more people or things',
        'simple_meaning': 'those people or things over there',
        'examples': [
            'They are playing on the swings.',
            'I like cookies. They are yummy.',
            'Look at the birds! They are flying away.'
        ]
    },
    'my': {
        'pos': 'adjective',
        'meaning_en': 'belonging to me',
        'simple_meaning': 'something that is mine',
        'examples': [
            'This is my favorite toy.',
            'My mom is nice.',
            'Can you see my new shoes?'
        ]
    },
    'your': {
        'pos': 'adjective',
        'meaning_en': 'belonging to you',
        'simple_meaning': 'something that is yours',
        'examples': [
            'Is this your backpack?',
            'Your turn to go first.',
            'I like your drawings.'
        ]
    },
    'his': {
        'pos': 'adjective',
        'meaning_en': 'belonging to a boy or man',
        'simple_meaning': 'something that belongs to him',
        'examples': [
            'His name is Tom.',
            'That is his bike.',
            'His favorite color is blue.'
        ]
    },
    'her': {
        'pos': 'adjective',
        'meaning_en': 'belonging to a girl or woman',
        'simple_meaning': 'something that belongs to her',
        'examples': [
            'Her dress is pretty.',
            'She lost her pencil.',
            'Her cat sleeps all day.'
        ]
    },
    'its': {
        'pos': 'adjective',
        'meaning_en': 'belonging to a thing or animal',
        'simple_meaning': 'something that belongs to it',
        'examples': [
            'The dog wagged its tail.',
            'Our tree lost its leaves.',
            'The bird built its nest.'
        ]
    },
    'me': {
        'pos': 'pronoun',
        'meaning_en': 'used by the person who is speaking to refer to themselves',
        'simple_meaning': 'the person talking',
        'examples': [
            'Can you help me?',
            'Give me that toy.',
            'Mom, read to me.'
        ]
    },
    'him': {
        'pos': 'pronoun',
        'meaning_en': 'used to talk about a male person or animal after a verb or preposition',
        'simple_meaning': 'that boy or man',
        'examples': [
            'I saw him at the park.',
            'Tell him the good news.',
            'Go with him to the store.'
        ]
    },
    'them': {
        'pos': 'pronoun',
        'meaning_en': 'used to talk about two or more people or things after a verb or preposition',
        'simple_meaning': 'those people or things',
        'examples': [
            'I saw them playing.',
            'Give them the cookies.',
            'Did you find them?'
        ]
    },

    # be动词
    'am': {
        'pos': 'verb',
        'meaning_en': 'used with "I" to say who I am or what I am doing',
        'simple_meaning': 'I am; I exist',
        'examples': [
            'I am happy today.',
            'I am six years old.',
            'I am eating lunch.'
        ]
    },
    'is': {
        'pos': 'verb',
        'meaning_en': 'used with "he, she, it" or a singular noun to say what exists or happens',
        'simple_meaning': 'exists; happens right now',
        'examples': [
            'The sun is bright today.',
            'She is my sister.',
            'My cat is sleeping.'
        ]
    },
    'are': {
        'pos': 'verb',
        'meaning_en': 'used with "you, we, they" or plural nouns to say what exists or happens',
        'simple_meaning': 'exist; happen (for more than one)',
        'examples': [
            'You are my best friend.',
            'We are in first grade.',
            'The birds are singing.'
        ]
    },
    'was': {
        'pos': 'verb',
        'meaning_en': 'the past tense of "am" and "is"',
        'simple_meaning': 'existed or happened before',
        'examples': [
            'I was tired yesterday.',
            'It was cold last night.',
            'She was sick last week.'
        ]
    },
    'were': {
        'pos': 'verb',
        'meaning_en': 'the past tense of "are"',
        'simple_meaning': 'existed or happened before (plural)',
        'examples': [
            'We were at the beach.',
            'They were happy to see us.',
            'You were late for school.'
        ]
    },
    'be': {
        'pos': 'verb',
        'meaning_en': 'used to describe what someone or something is like',
        'simple_meaning': 'exist; be like something',
        'examples': [
            'Be a good friend.',
            'You can be anything you want.',
            'Please be quiet.'
        ]
    },

    # 助动词和情态动词
    'do': {
        'pos': 'verb',
        'meaning_en': 'to perform an action or activity',
        'simple_meaning': 'to do something; to perform an action',
        'examples': [
            'I do my homework every day.',
            'Do you like pizza?',
            'What should I do?'
        ]
    },
    'does': {
        'pos': 'verb',
        'meaning_en': 'used with "he, she, it" to ask about or describe an action',
        'simple_meaning': 'performs an action (he/she/it)',
        'examples': [
            'She does her homework after school.',
            'Does he play soccer?',
            'What does your dad do?'
        ]
    },
    'did': {
        'pos': 'verb',
        'meaning_en': 'the past tense of "do"',
        'simple_meaning': 'performed an action before',
        'examples': [
            'I did my best.',
            'Where did you go?',
            'She did a good job.'
        ]
    },
    'can': {
        'pos': 'verb',
        'meaning_en': 'to be able to do something',
        'simple_meaning': 'able to; have the ability to',
        'examples': [
            'I can swim.',
            'Can you help me?',
            'We can play together.'
        ]
    },
    'will': {
        'pos': 'verb',
        'meaning_en': 'used to talk about the future',
        'simple_meaning': 'going to happen later',
        'examples': [
            'I will be seven next year.',
            'It will rain tomorrow.',
            'We will go to the zoo.'
        ]
    },
    'would': {
        'pos': 'verb',
        'meaning_en': 'used to talk about what you want to do or what might happen',
        'simple_meaning': 'want to; might happen',
        'examples': [
            'I would like a cookie.',
            'That would be fun.',
            'What would you do?'
        ]
    },
    'should': {
        'pos': 'verb',
        'meaning_en': 'used to say what is the right thing to do',
        'simple_meaning': 'ought to; supposed to',
        'examples': [
            'You should say thank you.',
            'We should share our toys.',
            'I should do my homework.'
        ]
    },
    'could': {
        'pos': 'verb',
        'meaning_en': 'used to say what was possible or what might be possible',
        'simple_meaning': 'was able to; might be able to',
        'examples': [
            'I could swim when I was five.',
            'Could you open the door?',
            'We could go to the park.'
        ]
    },
    'may': {
        'pos': 'verb',
        'meaning_en': 'used to say something might happen or is allowed',
        'simple_meaning': 'might happen; is allowed to',
        'examples': [
            'It may rain today.',
            'May I have a cookie?',
            'You may go now.'
        ]
    },
    'might': {
        'pos': 'verb',
        'meaning_en': 'used to say something is possible',
        'simple_meaning': 'maybe; possibly',
        'examples': [
            'It might snow tomorrow.',
            'We might go to the party.',
            'That might be true.'
        ]
    },
    'must': {
        'pos': 'verb',
        'meaning_en': 'used to say something is necessary or required',
        'simple_meaning': 'have to; need to',
        'examples': [
            'You must wear your seatbelt.',
            'I must finish my work.',
            'We must be quiet in the library.'
        ]
    },

    # 介词
    'in': {
        'pos': 'preposition',
        'meaning_en': 'inside something; surrounded by something',
        'simple_meaning': 'inside; within',
        'examples': [
            'The cat is in the box.',
            'I live in a house.',
            'There are five pencils in the jar.'
        ]
    },
    'on': {
        'pos': 'preposition',
        'meaning_en': 'touching or supported by something',
        'simple_meaning': 'touching; resting on',
        'examples': [
            'Put your book on the desk.',
            'The picture is on the wall.',
            'I sit on the chair.'
        ]
    },
    'at': {
        'pos': 'preposition',
        'meaning_en': 'used to talk about a place or time',
        'simple_meaning': 'in a place; at a time',
        'examples': [
            'I am at school.',
            'See you at 3 o\'clock.',
            'Who is at the door?'
        ]
    },
    'to': {
        'pos': 'preposition',
        'meaning_en': 'toward; in the direction of',
        'simple_meaning': 'toward; going to',
        'examples': [
            'Go to your seat.',
            'Give it to me.',
            'We walk to school.'
        ]
    },
    'for': {
        'pos': 'preposition',
        'meaning_en': 'for the purpose of; because of',
        'simple_meaning': 'purpose; because',
        'examples': [
            'This gift is for you.',
            'I am waiting for my mom.',
            'We went to the store for milk.'
        ]
    },
    'with': {
        'pos': 'preposition',
        'meaning_en': 'alongside; together with',
        'simple_meaning': 'together; accompanying',
        'examples': [
            'Come with me.',
            'I play with my friends.',
            'I eat pizza with cheese.'
        ]
    },
    'from': {
        'pos': 'preposition',
        'meaning_en': 'starting at a place or time; coming from',
        'simple_meaning': 'starting point; origin',
        'examples': [
            'I am from China.',
            'We walked from home to school.',
            'Pick a card from the pile.'
        ]
    },
    'of': {
        'pos': 'preposition',
        'meaning_en': 'belonging to; connected with; showing what something contains',
        'simple_meaning': 'belonging to; containing',
        'examples': [
            'A cup of tea.',
            'The cover of the book.',
            'A photo of my family.'
        ]
    },
    'about': {
        'pos': 'preposition',
        'meaning_en': 'on the subject of; related to',
        'simple_meaning': 'regarding; concerning',
        'examples': [
            'Tell me about your trip.',
            'What is this movie about?',
            'I learned about dinosaurs.'
        ]
    },
    'by': {
        'pos': 'preposition',
        'meaning_en': 'near; through; before (a time)',
        'simple_meaning': 'near; via; before a time',
        'examples': [
            'I sit by my friend.',
            'We went by car.',
            'Do it by 5 o\'clock.'
        ]
    },

    # 连词
    'and': {
        'pos': 'conjunction',
        'meaning_en': 'used to join words together',
        'simple_meaning': 'also; plus; as well as',
        'examples': [
            'I like apples and bananas.',
            'Mom and Dad are home.',
            'Run and jump.'
        ]
    },
    'or': {
        'pos': 'conjunction',
        'meaning_en': 'used to offer a choice or another possibility',
        'simple_meaning': 'either this or that',
        'examples': [
            'Do you want tea or coffee?',
            'Yes or no?',
            'You can sit or stand.'
        ]
    },
    'but': {
        'pos': 'conjunction',
        'meaning_en': 'used to show a difference or contrast',
        'simple_meaning': 'however; on the other hand',
        'examples': [
            'It is small but heavy.',
            'I want to go but it is raining.',
            'She is smart but shy.'
        ]
    },
    'because': {
        'pos': 'conjunction',
        'meaning_en': 'used to show why something happens',
        'simple_meaning': 'for the reason that',
        'examples': [
            'I stayed home because I was sick.',
            'We eat because we are hungry.',
            'She cried because she was sad.'
        ]
    },
    'so': {
        'pos': 'conjunction',
        'meaning_en': 'used to show a result or purpose',
        'simple_meaning': 'therefore; very',
        'examples': [
            'I was tired, so I went to bed.',
            'It is so big!',
            'Be careful so you don\'t fall.'
        ]
    },
    'if': {
        'pos': 'conjunction',
        'meaning_en': 'used to say that something might happen',
        'simple_meaning': 'on the condition that; whether',
        'examples': [
            'If it rains, we stay inside.',
            'I will help if you need.',
            'I don\'t know if he is coming.'
        ]
    },
    'when': {
        'pos': 'conjunction',
        'meaning_en': 'at what time; at the time that',
        'simple_meaning': 'at what time; while',
        'examples': [
            'When is lunch time?',
            'When I grow up, I want to be a doctor.',
            'I was sleeping when you called.'
        ]
    },

    # 疑问词
    'what': {
        'pos': 'pronoun',
        'meaning_en': 'used to ask about something',
        'simple_meaning': 'asking about a thing',
        'examples': [
            'What is your name?',
            'What do you want to eat?',
            'What time is it?'
        ]
    },
    'where': {
        'pos': 'adverb',
        'meaning_en': 'used to ask about place',
        'simple_meaning': 'asking about place',
        'examples': [
            'Where is my backpack?',
            'Where do you live?',
            'Where are we going?'
        ]
    },
    'who': {
        'pos': 'pronoun',
        'meaning_en': 'used to ask about a person',
        'simple_meaning': 'asking about a person',
        'examples': [
            'Who is that?',
            'Who is your teacher?',
            'Who wants to play?'
        ]
    },
    'when': {
        'pos': 'adverb',
        'meaning_en': 'used to ask about time',
        'simple_meaning': 'asking about time',
        'examples': [
            'When do we eat?',
            'When is your birthday?',
            'When did you arrive?'
        ]
    },
    'why': {
        'pos': 'adverb',
        'meaning_en': 'used to ask about the reason for something',
        'simple_meaning': 'asking for a reason',
        'examples': [
            'Why are you crying?',
            'Why do we sleep?',
            'Why is the sky blue?'
        ]
    },
    'how': {
        'pos': 'adverb',
        'meaning_en': 'used to ask about the way or manner of doing something',
        'simple_meaning': 'asking about manner or method',
        'examples': [
            'How do you spell your name?',
            'How are you today?',
            'How does this work?'
        ]
    },

    # 数字和量词
    'one': {
        'pos': 'number',
        'meaning_en': 'the number 1',
        'simple_meaning': '1; a single thing',
        'examples': [
            'I have one cookie.',
            'Give me one pencil.',
            'There is one sun.'
        ]
    },
    'two': {
        'pos': 'number',
        'meaning_en': 'the number 2',
        'simple_meaning': '2; twice as many as one',
        'examples': [
            'I see two birds.',
            'I have two hands.',
            'Count to two.'
        ]
    },
    'all': {
        'pos': 'adjective',
        'meaning_en': 'the whole amount; every person or thing',
        'simple_meaning': 'everything; everyone; complete',
        'examples': [
            'All the children are playing.',
            'I ate all my vegetables.',
            'All done!'
        ]
    },
    'some': {
        'pos': 'adjective',
        'meaning_en': 'an amount of something; part of something',
        'simple_meaning': 'a certain amount; a part',
        'examples': [
            'I want some water.',
            'Some children like red.',
            'Can I have some candy?'
        ]
    },
    'many': {
        'pos': 'adjective',
        'meaning_en': 'a large number of people or things',
        'simple_meaning': 'a lot of',
        'examples': [
            'Many people came to the party.',
            'How many? Too many to count.',
            'I have many friends.'
        ]
    },
    'much': {
        'pos': 'adjective',
        'meaning_en': 'a large amount of something',
        'simple_meaning': 'a lot of (uncountable)',
        'examples': [
            'There is so much rain!',
            'I don\'t have much money.',
            'Thank you so much.'
        ]
    },
    'more': {
        'pos': 'adjective',
        'meaning_en': 'a greater number or amount',
        'simple_meaning': 'additional; extra',
        'examples': [
            'I want more cake.',
            'One more time!',
            'Who has more?'
        ]
    },
    'most': {
        'pos': 'adjective',
        'meaning_en': 'the majority; the greatest amount',
        'simple_meaning': 'almost all; the greatest amount',
        'examples': [
            'Most children like ice cream.',
            'I like this one the most.',
            'Who has the most?'
        ]
    },

    # 指示词
    'this': {
        'pos': 'pronoun',
        'meaning_en': 'used to point to someone or something near you',
        'simple_meaning': 'this one here; being mentioned',
        'examples': [
            'This is my book.',
            'I like this color.',
            'This way, please.'
        ]
    },
    'that': {
        'pos': 'pronoun',
        'meaning_en': 'used to point to someone or something farther away',
        'simple_meaning': 'that one there; being mentioned',
        'examples': [
            'That is my dad.',
            'Look at that bird!',
            'I don\'t like that.'
        ]
    },
    'these': {
        'pos': 'pronoun',
        'meaning_en': 'used to point to several people or things near you',
        'simple_meaning': 'these ones here',
        'examples': [
            'These are my toys.',
            'I like these cookies.',
            'These are for you.'
        ]
    },
    'those': {
        'pos': 'pronoun',
        'meaning_en': 'used to point to several people or things farther away',
        'simple_meaning': 'those ones there',
        'examples': [
            'Those are big trees.',
            'I want those shoes.',
            'Are those yours?'
        ]
    },

    # 否定词
    'not': {
        'pos': 'adverb',
        'meaning_en': 'used to say no or that something is false',
        'simple_meaning': 'no; the opposite',
        'examples': [
            'I do not like broccoli.',
            'That is not my bag.',
            'It is not raining.'
        ]
    },
    'no': {
        'pos': 'adverb',
        'meaning_en': 'used to refuse or say something is not allowed',
        'simple_meaning': 'refusal; not any',
        'examples': [
            'No, thank you.',
            'There is no more milk.',
            'No running!'
        ]
    },
    'yes': {
        'pos': 'adverb',
        'meaning_en': 'used to agree or say something is true',
        'simple_meaning': 'agreement; that is right',
        'examples': [
            'Yes, please.',
            'Yes, I can.',
            'Is this yours? Yes!'
        ]
    },

    # 其他高频功能词
    'here': {
        'pos': 'adverb',
        'meaning_en': 'in this place',
        'simple_meaning': 'in this place; where I am',
        'examples': [
            'Come here.',
            'We live here.',
            'Sit here, please.'
        ]
    },
    'there': {
        'pos': 'adverb',
        'meaning_en': 'in that place',
        'simple_meaning': 'in that place; over there',
        'examples': [
            'Put it there.',
            'There is my mom.',
            'Go over there.'
        ]
    },
    'now': {
        'pos': 'adverb',
        'meaning_en': 'at this time',
        'simple_meaning': 'right now; at this time',
        'examples': [
            'I am hungry now.',
            'Let\'s go now.',
            'It is 3 o\'clock now.'
        ]
    },
    'then': {
        'pos': 'adverb',
        'meaning_en': 'at that time; next',
        'simple_meaning': 'at that time; after that',
        'examples': [
            'We were at the park, then we went home.',
            'First do this, then do that.',
            'I was young then.'
        ]
    },
    'just': {
        'pos': 'adverb',
        'meaning_en': 'a moment ago; only; simply',
        'simple_meaning': 'a short time ago; only',
        'examples': [
            'I just finished my homework.',
            'Just do it!',
            'It is just a toy.'
        ]
    },
    'very': {
        'pos': 'adverb',
        'meaning_en': 'to a high degree; extremely',
        'simple_meaning': 'extremely; a lot',
        'examples': [
            'It is very hot today.',
            'She is very nice.',
            'Thank you very much.'
        ]
    },
    'well': {
        'pos': 'adjective',
        'meaning_en': 'in good health',
        'simple_meaning': 'healthy; good',
        'examples': [
            'I don\'t feel well.',
            'She is well now.',
            'Well done!'
        ]
    },
    'too': {
        'pos': 'adverb',
        'meaning_en': 'also; more than needed',
        'simple_meaning': 'also; more than enough',
        'examples': [
            'I want to come too.',
            'This is too big.',
            'Too much sugar!'
        ]
    },
    'also': {
        'pos': 'adverb',
        'meaning_en': 'in addition; as well',
        'simple_meaning': 'too; plus',
        'examples': [
            'I can swim too.',
            'She is nice and smart too.',
            'Can I have one too?'
        ]
    },
    'as': {
        'pos': 'preposition',
        'meaning_en': 'used to compare things or say what role something has',
        'simple_meaning': 'in the same way; while',
        'examples': [
            'She is as tall as me.',
            'As I was walking...',
            'Do as I say.'
        ]
    },
    'than': {
        'pos': 'conjunction',
        'meaning_en': 'used to compare things',
        'simple_meaning': 'used for comparison',
        'examples': [
            'Bigger than a cat.',
            'More than I can eat.',
            'Better than before.'
        ]
    },
    'out': {
        'pos': 'adverb',
        'meaning_en': 'away from inside; not inside',
        'simple_meaning': 'away from; outside',
        'examples': [
            'Go out and play.',
            'Look out the window.',
            'The cat is out.'
        ]
    },
    'up': {
        'pos': 'adverb',
        'meaning_en': 'to a higher place',
        'simple_meaning': 'upward; higher',
        'examples': [
            'Look up at the sky.',
            'Stand up, please.',
            'The prices went up.'
        ]
    },
    'down': {
        'pos': 'adverb',
        'meaning_en': 'to a lower place',
        'simple_meaning': 'downward; lower',
        'examples': [
            'Sit down, please.',
            'The sun went down.',
            'Write it down.'
        ]
    },
    'off': {
        'pos': 'adverb',
        'meaning_en': 'away from; removed from',
        'simple_meaning': 'away; no longer on',
        'examples': [
            'Take off your shoes.',
            'Jump off the bed.',
            'Turn off the light.'
        ]
    },
    'over': {
        'pos': 'preposition',
        'meaning_en': 'above; across; finished',
        'simple_meaning': 'above; across; done',
        'examples': [
            'The bird flew over the tree.',
            'Come over to my house.',
            'Class is over.'
        ]
    },
    'under': {
        'pos': 'preposition',
        'meaning_en': 'below; beneath',
        'simple_meaning': 'below; underneath',
        'examples': [
            'The cat is under the table.',
            'Swim under the water.',
            'Who is under the umbrella?'
        ]
    }
}


def optimize_function_words(input_file: str, output_file: str, name: str) -> dict:
    """优化功能词的释义"""

    print(f"[优化] {name} 功能词释义...")

    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # 检查是否有 meta 包装
    if 'words' in data:
        words = data['words']
    else:
        words = data

    optimized_count = 0
    samples = []

    for word_entry in words:
        word_lower = word_entry['word'].lower()

        if word_lower in FUNCTION_WORD_DEFINITIONS:
            definition_data = FUNCTION_WORD_DEFINITIONS[word_lower]

            # 更新或添加优化的定义
            optimized_definition = {
                'part_of_speech': definition_data['pos'],
                'meaning_en_simple': definition_data['simple_meaning'],
                'meaning_en_full': definition_data['meaning_en'],
                'examples': [
                    {
                        'sentence_en': example,
                        'context': 'everyday life',
                        'source': 'native_speaker_context'
                    }
                    for example in definition_data['examples']
                ]
            }

            # 添加到 definitions 列表
            if 'definitions' not in word_entry:
                word_entry['definitions'] = []

            # 检查是否已有定义
            has_existing = False
            for defn in word_entry['definitions']:
                if defn.get('source') == 'function_word_optimized':
                    defn.update(optimized_definition)
                    has_existing = True
                    break

            if not has_existing:
                optimized_definition['source'] = 'function_word_optimized'
                word_entry['definitions'].insert(0, optimized_definition)

            optimized_count += 1

            if len(samples) < 5:
                samples.append({
                    'word': word_entry['word'],
                    'pos': definition_data['pos'],
                    'meaning': definition_data['simple_meaning'],
                    'example_count': len(definition_data['examples'])
                })

    # 保存
    with open(output_file, 'w', encoding='utf-8') as f:
        if 'words' in data:
            data['words'] = words
            json.dump(data, f, ensure_ascii=False, indent=2)
        else:
            json.dump(words, f, ensure_ascii=False, indent=2)

    print(f"  ✓ 优化: {optimized_count} 个功能词")
    print(f"  → 已保存到: {output_file}")

    if samples:
        print(f"\n  优化示例:")
        for sample in samples:
            print(f"    {sample['word']:<10} [{sample['pos']}] {sample['meaning']}")
            print(f"      例句数: {sample['example_count']}")
    print()

    return {
        'total': len(words),
        'optimized': optimized_count,
        'samples': samples
    }


def main():
    """主函数"""
    print("="*80)
    print("任务1：补充功能词释义（a, I, it, the等）")
    print("="*80)
    print()

    # 优化母语者口语核心词库
    result = optimize_function_words(
        'src/assets/scenarios/native_speaker_core.json',
        'src/assets/scenarios/native_speaker_core_optimized.json',
        'Native Speaker Core'
    )

    print("="*80)
    print("完成")
    print("="*80)
    print(f"总词汇: {result['total']}")
    print(f"优化功能词: {result['optimized']}")
    print(f"文件: src/assets/scenarios/native_speaker_core_optimized.json")
    print("="*80)


if __name__ == "__main__":
    main()
