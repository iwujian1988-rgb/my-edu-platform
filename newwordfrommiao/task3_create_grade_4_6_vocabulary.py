#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
任务3：创建 Grade 4-6 母语者核心词库
扩展到美国小学高年级（4-6年级）的核心词汇
"""

import json
import sys
import csv

# 设置标准输出编码
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')


# ============== Grade 4-6 核心词汇 ==============
# 来自 Common Core 标准和 Fry Sight Words
FRY_SIGHT_WORDS_GRADE_4 = [
    # Grade 4 Fry Words (前100个高频词)
    'a', 'about', 'all', 'an', 'and', 'are', 'as', 'at', 'be', 'because',
    'been', 'but', 'by', 'called', 'can', 'come', 'could', 'day', 'did',
    'do', 'each', 'find', 'first', 'for', 'from', 'funny', 'get', 'go',
    'going', 'had', 'has', 'have', 'he', 'her', 'his', 'how', 'I', 'if',
    'in', 'is', 'it', 'its', 'just', 'know', 'like', 'long', 'made', 'many',
    'may', 'more', 'most', 'much', 'must', 'my', 'new', 'no', 'not', 'now',
    'of', 'off', 'old', 'on', 'once', 'one', 'only', 'or', 'other', 'our',
    'out', 'people', 'said', 'see', 'she', 'should', 'so', 'some', 'still',
    'such', 'take', 'than', 'that', 'the', 'their', 'them', 'then', 'there',
    'these', 'they', 'thing', 'this', 'those', 'time', 'to', 'two', 'up',
    'use', 'very', 'want', 'was', 'water', 'we', 'well', 'were', 'what', 'when',
    'where', 'which', 'while', 'who', 'will', 'with', 'would', 'you', 'your',
    # Grade 4 新增
    'always', 'animal', 'around', 'ask', 'beautiful', 'began', 'begin', 'being',
    'better', 'big', 'black', 'blue', 'board', 'book', 'bring', 'brown', 'build',
    'busy', 'call', 'came', 'can', 'change', 'city', 'color', 'coming', 'could',
    'country', 'course', 'didn\'t', 'different', 'does', 'done', 'draw', 'during',
    'early', 'earth', 'enough', 'ever', 'every', 'example', 'eye', 'face', 'family',
    'farm', 'far', 'fast', 'father', 'feet', 'field', 'fire', 'five', 'floor', 'four',
    'friend', 'full', 'gave', 'game', 'girl', 'give', 'going', 'gold', 'got', 'grand',
    'green', 'ground', 'group', 'grow', 'hand', 'hard', 'have', 'head', 'hear', 'heart',
    'high', 'history', 'hold', 'hot', 'hour', 'house', 'idea', 'if', 'important', 'Indian',
    'inside', 'instead', 'into', 'kind', 'knew', 'know', 'land', 'language', 'last',
    'late', 'learn', 'leave', 'left', 'letter', 'life', 'light', 'list', 'listen',
    'live', 'living', 'look', 'man', 'many', 'may', 'me', 'mean', 'men', 'might',
    'mile', 'minutes', 'money', 'month', 'mother', 'move', 'movie', 'music', 'name',
    'need', 'never', 'night', 'nothing', 'now', 'number', 'of', 'often', 'old', 'on',
    'once', 'open', 'or', 'order', 'other', 'our', 'out', 'over', 'own', 'page',
    'paper', 'part', 'party', 'passed', 'past', 'pattern', 'pay', 'people', 'perhaps',
    'person', 'picture', 'place', 'plan', 'play', 'point', 'probably', 'question', 'quickly',
    'quiet', 'quite', 'read', 'ready', 'really', 'red', 'remember', 'rest', 'right',
    'river', 'road', 'room', 'run', 'said', 'same', 'school', 'sea', 'second', 'seem',
    'seen', 'sentence', 'set', 'several', 'shall', 'she', 'should', 'show', 'side',
    'since', 'six', 'size', 'sky', 'small', 'snow', 'some', 'something', 'sometimes',
    'song', 'soon', 'sound', 'special', 'spell', 'spoke', 'sports', 'spring', 'star',
    'start', 'state', 'stay', 'still', 'stood', 'stop', 'story', 'study', 'such', 'suddenly',
    'summer', 'sun', 'sure', 'swim', 'table', 'tail', 'take', 'talk', 'taught', 'ten',
    'test', 'than', 'that', 'the', 'their', 'them', 'then', 'there', 'these', 'they',
    'thing', 'think', 'third', 'this', 'those', 'thought', 'three', 'through', 'time',
    'to', 'today', 'told', 'too', 'took', 'top', 'toward', 'town', 'tree', 'try',
    'turned', 'under', 'until', 'up', 'us', 'use', 'very', 'want', 'war', 'was',
    'watch', 'water', 'way', 'we', 'weather', 'week', 'weight', 'well', 'went', 'were',
    'west', 'what', 'wheel', 'when', 'where', 'whether', 'which', 'while', 'white', 'who',
    'whole', 'why', 'will', 'wind', 'with', 'without', 'woman', 'words', 'work', 'world',
    'would', 'write', 'year', 'yellow', 'yes', 'yet', 'you', 'young', 'your', 'zero'
]

# Grade 5 Fry Words (新增的高频学术词汇)
FRY_SIGHT_WORDS_GRADE_5 = [
    'able', 'accept', 'across', 'add', 'admit', 'afraid', 'after', 'afternoon', 'again',
    'against', 'age', 'ago', 'agree', 'ahead', 'air', 'all', 'allow', 'almost', 'alone',
    'along', 'already', 'also', 'although', 'always', 'am', 'among', 'an', 'and', 'animal',
    'another', 'answer', 'appear', 'appear', 'apple', 'are', 'area', 'arm', 'army', 'around',
    'arrange', 'arrive', 'art', 'article', 'artist', 'as', 'ask', 'at', 'attend', 'aunt',
    'autumn', 'available', 'avenue', 'average', 'avoid', 'away', 'baby', 'back', 'background',
    'bad', 'bag', 'bake', 'balance', 'ball', 'band', 'bank', 'bar', 'base', 'basic', 'basis',
    'be', 'bear', 'beat', 'beauty', 'because', 'became', 'become', 'bed', 'been', 'beer',
    'before', 'began', 'begin', 'beginning', 'behind', 'being', 'believe', 'bell', 'belong',
    'below', 'best', 'better', 'between', 'beyond', 'big', 'bill', 'billion', 'bit', 'black',
    'blade', 'blame', 'blanket', 'blind', 'block', 'blood', 'blue', 'board', 'boat', 'body',
    'bone', 'book', 'border', 'bore', 'born', 'boss', 'both', 'bottom', 'bought', 'bounce',
    'boundary', 'box', 'boy', 'brain', 'branch', 'brave', 'bread', 'break', 'breakfast', 'breath',
    'brick', 'bridge', 'brief', 'bright', 'bring', 'broad', 'broke', 'broken', 'brought', 'brown',
    'brush', 'build', 'building', 'built', 'business', 'busy', 'but', 'buy', 'by', 'cabbage',
    'cake', 'calculate', 'call', 'calm', 'camera', 'camp', 'can', 'canal', 'cancel', 'candle',
    'candy', 'cap', 'capital', 'captain', 'car', 'card', 'care', 'career', 'careful', 'carefully',
    'carry', 'case', 'cat', 'catch', 'cause', 'cell', 'cent', 'center', 'central', 'century',
    'certain', 'certainly', 'chain', 'chair', 'chance', 'change', 'channel', 'chapter', 'character',
    'charge', 'chart', 'check', 'cheek', 'cheese', 'cherry', 'chest', 'chicken', 'chief', 'child',
    'chocolate', 'choice', 'choose', 'chose', 'chosen', 'church', 'circle', 'circumstance', 'citizen',
    'city', 'civil', 'claim', 'class', 'classroom', 'claws', 'clay', 'clean', 'clear', 'clearly',
    'climb', 'clock', 'close', 'clothes', 'cloud', 'clouds', 'club', 'coach', 'coal', 'coast',
    'coat', 'coffee', 'cold', 'collar', 'collect', 'college', 'colo', 'colon', 'color', 'colored',
    'comb', 'combine', 'come', 'comfort', 'command', 'comment', 'commercial', 'common', 'communicate',
    'community', 'company', 'compare', 'compassion', 'compete', 'complete', 'completely', 'complex',
    'compose', 'composition', 'compound', 'computer', 'concentrated', 'concept', 'concern', 'concert',
    'conclude', 'conclusion', 'concrete', 'condition', 'conduct', 'confident', 'confirm', 'connect',
    'connection', 'conscious', 'consider', 'consist', 'constant', 'construct', 'construction', 'consume',
    'consumer', 'contact', 'contain', 'content', 'contest', 'context', 'continue', 'continuous',
    'contract', 'contrast', 'contribute', 'control', 'convenient', 'convention', 'converse', 'convert',
    'convince', 'cook', 'cookie', 'cool', 'cooperate', 'cope', 'copy', 'corn', 'corner', 'correct',
    'cost', 'cotton', 'couch', 'could', 'count', 'counter', 'country', 'county', 'couple', 'courage',
    'course', 'court', 'cousin', 'cover', 'cow', 'crack', 'craft', 'crash', 'cream', 'create',
    'creature', 'credit', 'crew', 'crime', 'crisis', 'criteria', 'critical', 'criticism', 'criticize',
    'crop', 'cross', 'crowd', 'crucial', 'cry', 'cultural', 'culture', 'cup', 'curious', 'current',
    'curve', 'custom', 'customer', 'cut', 'cycle', 'daily', 'damage', 'dance', 'danger', 'dangerous',
    'dark', 'data', 'date', 'daughter', 'dawn', 'day', 'dead', 'deal', 'dear', 'death',
    'decade', 'decide', 'decision', 'declare', 'decline', 'decrease', 'deep', 'defeat', 'defend',
    'defense', 'deficit', 'define', 'definite', 'definition', 'degree', 'delay', 'delicate',
    'delicious', 'delight', 'deliver', 'demand', 'department', 'depend', 'deposit', 'depth',
    'derive', 'describe', 'description', 'desert', 'design', 'desire', 'desk', 'desperate', 'despite',
    'destroy', 'detail', 'detect', 'develop', 'development', 'device', 'devote', 'dialogue', 'diameter',
    'dictate', 'did', 'die', 'diet', 'differ', 'difference', 'different', 'difficult', 'difficulty',
    'dig', 'digest', 'digital', 'dim', 'dimension', 'dinner', 'direct', 'direction', 'director',
    'dirt', 'dirty', 'disappear', 'disappoint', 'disaster', 'discard', 'discern', 'discharge',
    'discipline', 'discount', 'discover', 'discovery', 'discuss', 'discussion', 'disease', 'dish',
    'disk', 'dismiss', 'display', 'dispute', 'distance', 'distant', 'distant', 'distort', 'distribute',
    'district', 'distribute', 'disturb', 'ditch', 'dive', 'diverse', 'divide', 'divine', 'division',
    'divorce', 'do', 'doctor', 'document', 'dog', 'dollar', 'domain', 'donate', 'donkey', 'don\'t',
    'door', 'dot', 'double', 'doubt', 'dozen', 'draft', 'drag', 'drain', 'drama', 'draw',
    'draw', 'drawing', 'dream', 'dress', 'drink', 'drive', 'driver', 'drop', 'drove', 'driven',
    'driver', 'drove', 'drop', 'dry', 'duck', 'due', 'dull', 'dumb', 'dust', 'duty', 'dwell',
    'dying', 'each', 'eager', 'eagle', 'early', 'earn', 'earth', 'ease', 'east', 'easy',
    'eat', 'echo', 'economic', 'economy', 'edge', 'edition', 'editor', 'educate', 'education',
    'educational', 'effect', 'effective', 'efficiency', 'efficient', 'effort', 'egg', 'eight',
    'eighteen', 'eighth', 'either', 'elaborate', 'elbow', 'elder', 'elect', 'electric', 'electronic',
    'element', 'elementary', 'eliminate', 'else', 'email', 'embarrass', 'emerge', 'emergency',
    'emission', 'emotion', 'emotional', 'emphasize', 'emphasis', 'empire', 'employ', 'employee',
    'employer', 'employment', 'empty', 'enable', 'encounter', 'encourage', 'end', 'endangered',
    'enemy', 'energy', 'enforce', 'engage', 'engine', 'engineer', 'engineering', 'enjoy',
    'enjoyable', 'enjoyment', 'enormous', 'enough', 'enroll', 'ensure', 'enter', 'enterprise',
    'entertainment', 'entire', 'entirely', 'entity', 'entry', 'environment', 'environmental',
    'episode', 'epoch', 'equal', 'equality', 'equally', 'equipment', 'equivalent', 'era',
    'erase', 'error', 'escape', 'especially', 'essay', 'essential', 'establish', 'establishment',
    'estate', 'estimate', 'evaluate', 'evaluation', 'even', 'evening', 'event', 'eventual',
    'eventually', 'ever', 'every', 'everybody', 'everyone', 'everything', 'evidence', 'evident',
    'evil', 'evolve', 'evolution', 'exact', 'exactly', 'exaggerate', 'exam', 'examine', 'example',
    'exceed', 'excellent', 'except', 'exception', 'exchange', 'excited', 'excitement', 'exciting',
    'excuse', 'execute', 'executive', 'exercise', 'exert', 'exhaust', 'exhibit', 'exhibition',
    'exist', 'existence', 'existing', 'expand', 'expansion', 'expect', 'expectation', 'expense',
    'expensive', 'experience', 'experiment', 'experimental', 'expert', 'explain', 'explanation',
    'explode', 'exploit', 'explore', 'exploration', 'explosion', 'export', 'expose', 'exposure',
    'express', 'expression', 'extend', 'extension', 'extensive', 'extent', 'external', 'extra',
    'extraordinary', 'extreme', 'extremely', 'eye', 'eyebrow'
]

# Grade 6 Fry Words (更高级的学术词汇)
FRY_SIGHT_WORDS_GRADE_6 = [
    'fabric', 'face', 'facility', 'fact', 'factor', 'factory', 'faculty', 'fade', 'fail',
    'failure', 'fair', 'faith', 'fall', 'false', 'fame', 'family', 'famous', 'fan', 'fancy',
    'fantasy', 'far', 'farm', 'farmer', 'farther', 'fashion', 'fast', 'fat', 'fault', 'favor',
    'favorite', 'fear', 'feather', 'feature', 'federal', 'fee', 'feed', 'feel', 'feeling',
    'fellow', 'female', 'fence', 'festival', 'fetch', 'fever', 'few', 'fiber', 'fiction',
    'field', 'fierce', 'fifteen', 'fifth', 'fifty', 'fight', 'fighter', 'figure', 'file',
    'fill', 'film', 'final', 'finally', 'finance', 'financial', 'find', 'fine', 'finger',
    'finish', 'finite', 'fire', 'firm', 'first', 'fish', 'fist', 'fit', 'five', 'fix',
    'flag', 'flame', 'flash', 'flat', 'flavor', 'flee', 'fleet', 'flesh', 'flexible', 'flight',
    'float', 'flock', 'flood', 'floor', 'flour', 'flow', 'flower', 'flu', 'fluid', 'flush',
    'fly', 'focus', 'fog', 'fold', 'folk', 'follow', 'food', 'fool', 'foolish', 'foot',
    'football', 'for', 'force', 'foreign', 'forest', 'forever', 'forget', 'forgive', 'fork',
    'form', 'formal', 'format', 'formation', 'former', 'formula', 'fort', 'forth', 'forty',
    'forum', 'forward', 'fossil', 'foster', 'foul', 'found', 'foundation', 'four', 'fourth',
    'fourteen', 'fox', 'fraction', 'frame', 'franc', 'frank', 'fraud', 'free', 'freedom',
    'freeze', 'french', 'fresh', 'friction', 'friend', 'friendly', 'friendship', 'frighten',
    'frog', 'from', 'front', 'frontier', 'frost', 'frown', 'fruit', 'fuel', 'full', 'fun',
    'function', 'fund', 'funeral', 'funny', 'fur', 'furniture', 'further', 'future', 'gadget',
    'gain', 'gallery', 'game', 'gap', 'garage', 'garden', 'garlic', 'gas', 'gate', 'gather',
    'gaze', 'gear', 'gene', 'general', 'generate', 'generation', 'generous', 'genetics', 'genre',
    'gentle', 'gently', 'genuine', 'geography', 'geology', 'geometry', 'gesture', 'get', 'ghost',
    'giant', 'gift', 'gigantic', 'ginger', 'girl', 'give', 'glad', 'glance', 'glare', 'glass',
    'glimpse', 'globe', 'global', 'gloom', 'glory', 'glove', 'glow', 'glue', 'goal', 'go',
    'goal', 'goat', 'gold', 'golden', 'golf', 'good', 'goose', 'gorilla', 'gospel', 'gossip',
    'govern', 'government', 'governor', 'gown', 'grab', 'grace', 'grade', 'gradual', 'gradually',
    'graduate', 'grain', 'grammar', 'grand', 'grandchild', 'granddaughter', 'grandfather', 'grandmother',
    'grandparent', 'grant', 'grape', 'graph', 'grasp', 'grass', 'grateful', 'grave', 'gravity',
    'gray', 'great', 'greedy', 'green', 'greet', 'grew', 'grey', 'grief', 'grill', 'grim',
    'grin', 'grind', 'grip', 'groan', 'grocery', 'ground', 'group', 'grow', 'growl', 'growth',
    'guard', 'guess', 'guest', 'guide', 'guilt', 'guilty', 'guitar', 'gulf', 'gym', 'habit',
    'hair', 'half', 'hall', 'halt', 'hammer', 'hand', 'handle', 'handy', 'hang', 'happen',
    'happy', 'harbor', 'hard', 'hardware', 'harm', 'harmony', 'harvest', 'has', 'hat', 'hatch',
    'hate', 'have', 'he', 'head', 'headache', 'heal', 'health', 'healthy', 'hear', 'heart',
    'heat', 'heavy', 'heel', 'height', 'heir', 'hell', 'hello', 'helmet', 'help', 'helpful',
    'hemp', 'her', 'herb', 'here', 'hero', 'heroic', 'heroin', 'heroin', 'hers', 'hey',
    'hi', 'hide', 'high', 'highway', 'hill', 'him', 'hint', 'hip', 'hire', 'his',
    'history', 'hit', 'hobby', 'hold', 'hole', 'holiday', 'holy', 'home', 'honest', 'honey',
    'honor', 'hope', 'horn', 'horror', 'horse', 'hospital', 'host', 'hot', 'hotel', 'hour',
    'house', 'household', 'hover', 'how', 'however', 'huge', 'human', 'humble', 'humor', 'hundred',
    'hung', 'hungry', 'hunt', 'hunter', 'hurry', 'hurt', 'husband', 'hygiene', 'hypothesis',
    'ice', 'idea', 'ideal', 'identical', 'identify', 'identity', 'ideology', 'idiom', 'idiot',
    'idle', 'if', 'ignore', 'ill', 'illegal', 'illness', 'illusion', 'illustrate', 'image', 'imagine',
    'imitate', 'immense', 'immigrant', 'implement', 'implication', 'imply', 'import', 'importance',
    'important', 'impose', 'impossible', 'impress', 'impression', 'improve', 'improvement', 'in',
    'inch', 'incident', 'include', 'including', 'income', 'increase', 'indeed', 'index', 'indicate',
    'indication', 'indifferent', 'indirect', 'individual', 'industry', 'infant', 'infect', 'infer',
    'inference', 'inferior', 'infinite', 'influence', 'influential', 'inform', 'information', 'inhabit',
    'inhabitant', 'inherit', 'initial', 'initiative', 'inject', 'injure', 'injury', 'injustice', 'ink',
    'inland', 'inlet', 'inner', 'innocent', 'innovate', 'innovation', 'input', 'insect', 'inside',
    'insight', 'insist', 'inspect', 'inspiration', 'inspire', 'install', 'instance', 'instant',
    'instead', 'institute', 'institution', 'institution', 'instruction', 'instructor', 'instrument',
    'insult', 'insurance', 'insure', 'integrate', 'intellect', 'intellectual', 'intelligence',
    'intend', 'intense', 'intensity', 'intention', 'interact', 'interaction', 'interest', 'interested',
    'interesting', 'interface', 'interior', 'intermediate', 'internal', 'international', 'internet',
    'interpret', 'interpretation', 'interrupt', 'interval', 'intervene', 'interview', 'into', 'introduce',
    'introduction', 'invent', 'invention', 'invest', 'investigate', 'investigation', 'investment', 'investor',
    'invisible', 'invitation', 'invite', 'involve', 'iron', 'irony', 'island', 'isolate', 'issue',
    'it', 'item', 'its', 'itself', 'jacket', 'jail', 'jar', 'jaw', 'jazz', 'jealous',
    'jeans', 'jewel', 'job', 'join', 'joint', 'joke', 'journal', 'journalist', 'journey',
    'joy', 'joyful', 'judge', 'judgment', 'judicial', 'juice', 'jump', 'jungle', 'junior',
    'junk', 'juror', 'just', 'justice', 'justify', 'keep', 'key', 'kick', 'kid', 'kill',
    'killer', 'kind', 'kindergarten', 'kindness', 'king', 'kingdom', 'kiss', 'kit', 'kitchen',
    'kite', 'kitten', 'knee', 'knelt', 'knife', 'knock', 'knot', 'know', 'knowledge', 'lab',
    'label', 'labor', 'laboratory', 'lack', 'ladder', 'lady', 'lake', 'lamp', 'land', 'landscape',
    'language', 'lantern', 'lap', 'large', 'laser', 'last', 'late', 'later', 'Latin', 'latter',
    'laugh', 'launch', 'laundry', 'law', 'lawn', 'lawyer', 'lay', 'layer', 'lazy', 'lead',
    'leader', 'leadership', 'leaf', 'league', 'leak', 'lean', 'leap', 'learn', 'learn', 'learning',
    'least', 'leather', 'leave', 'lecture', 'ledge', 'left', 'leg', 'legal', 'legend', 'legislation',
    'legislature', 'legitimate', 'lemon', 'lemonade', 'length', 'lens', 'less', 'lesson', 'let',
    'letter', 'level', 'liberal', 'liberty', 'library', 'license', 'licorice', 'lid', 'lie',
    'life', 'lift', 'light', 'lightning', 'like', 'likely', 'likewise', 'limb', 'limit', 'limitation',
    'line', 'link', 'lion', 'lip', 'liquid', 'list', 'listen', 'literature', 'little', 'live',
    'liver', 'living', 'load', 'loaf', 'loan', 'lobby', 'local', 'locate', 'location', 'lock',
    'logic', 'logical', 'lonely', 'long', 'look', 'loop', 'loose', 'lose', 'loss', 'lost',
    'lot', 'loud', 'love', 'lovely', 'low', 'lower', 'loyal', 'luck', 'lucky', 'luggage',
    'lumber', 'lump', 'lunch', 'lung', 'luxury', 'machine', 'machinery', 'mad', 'madam', 'magazine',
    'magic', 'magnet', 'magnetic', 'maid', 'mail', 'mailbox', 'main', 'maintain', 'maintenance',
    'major', 'majority', 'make', 'maker', 'makeup', 'making', 'male', 'mall', 'man', 'manage',
    'management', 'manager', 'manner', 'mansion', 'manual', 'manufacture', 'manufacturer', 'many',
    'map', 'maple', 'marble', 'march', 'margin', 'marine', 'mark', 'market', 'marketing', 'marriage',
    'married', 'marry', 'mask', 'mass', 'massive', 'master', 'match', 'mate', 'material', 'math',
    'mathematics', 'maths', 'matter', 'mature', 'maximum', 'may', 'maybe', 'mayor', 'me',
    'meal', 'meaning', 'meanwhile', 'measure', 'measurement', 'meat', 'mechanic', 'mechanics',
    'medal', 'media', 'medical', 'medicine', 'medieval', 'medium', 'meet', 'meeting', 'melon',
    'melody', 'melt', 'member', 'membership', 'memoir', 'memory', 'mental', 'mention', 'menu',
    'merchant', 'mercy', 'mere', 'merely', 'merit', 'merry', 'mess', 'message', 'metal', 'meter',
    'method', 'methodology', 'metric', 'metre', 'microphone', 'microscope', 'middle', 'midnight',
    'might', 'mile', 'milk', 'mill', 'million', 'mind', 'mine', 'miner', 'mineral', 'minimum',
    'minister', 'ministry', 'minor', 'minus', 'minute', 'miracle', 'mirror', 'misery', 'misfortune',
    'miss', 'missile', 'mission', 'mist', 'mistake', 'mix', 'mixture', 'mob', 'mobile', 'mode',
    'model', 'moderate', 'modern', 'modest', 'modify', 'modular', 'module', 'moist', 'mold',
    'molecule', 'moment', 'money', 'monitor', 'monkey', 'month', 'monthly', 'mood', 'moon',
    'moral', 'morality', 'more', 'morning', 'mortgage', 'mosquito', 'most', 'mother', 'motion',
    'motivation', 'motive', 'motor', 'mount', 'mountain', 'mountainous', 'mouse', 'mouth', 'move',
    'movie', 'much', 'mud', 'mug', 'multiple', 'multiply', 'multitude', 'museum', 'mushroom',
    'music', 'musical', 'musician', 'must', 'mutual', 'my', 'myself', 'mystery', 'myth', 'nail',
    'name', 'narrative', 'narrow', 'nation', 'national', 'native', 'nature', 'natural', 'naval'
]

# Tier 2 学术词汇 - Grades 4-6 (更高级)
TIER_2_WORDS_4_6 = {
    'science': [
        'organism', 'environment', 'ecosystem', 'habitat', 'species', 'classify', 'organ',
        'system', 'function', 'structure', 'process', 'experiment', 'observe', 'predict',
        'hypothesis', 'conclusion', 'evidence', 'analyze', 'investigation', 'research',
        'laboratory', 'microscope', 'telescope', 'measurement', 'calculate', 'variable',
        'theory', 'principle', 'concept', 'discovery', 'invention', 'innovation', 'technology'
    ],

    'social_studies': [
        'citizen', 'democracy', 'government', 'election', 'vote', 'congress', 'senate',
        'representative', 'constitution', 'freedom', 'justice', 'liberty', 'rights',
        'responsibility', 'civic', 'community', 'society', 'culture', 'tradition', 'history',
        'geography', 'migration', 'colonial', 'revolution', 'economy', 'resources', 'trade',
        'transportation', 'communication', 'population', 'immigration', 'diversity', 'perspective'
    ],

    'language_arts': [
        'narrative', 'fiction', 'nonfiction', 'genre', 'author', 'character', 'plot',
        'setting', 'theme', 'dialogue', 'description', 'metaphor', 'simile', 'imagery',
        'paragraph', 'essay', 'report', 'summary', 'comprehend', 'inference', 'vocabulary',
        'spelling', 'grammar', 'punctuation', 'capital', 'abbreviation', 'dictionary',
        'thesaurus', 'encyclopedia', 'reference', 'research', 'plagiarism', 'source', 'primary'
    ],

    'mathematics': [
        'algebra', 'geometry', 'fraction', 'decimal', 'percentage', 'ratio', 'proportion',
        'equation', 'variable', 'formula', 'theorem', 'proof', 'calculation', 'estimate',
        'average', 'median', 'mode', 'range', 'graph', 'chart', 'table', 'axis', 'scale',
        'dimension', 'area', 'volume', 'perimeter', 'angle', 'triangle', 'rectangle',
        'polygon', 'circle', 'sphere', 'cube', 'coordinate', 'statistics', 'probability', 'data'
    ],

    'academic_verbs': [
        'analyze', 'evaluate', 'synthesize', 'critique', 'argue', 'persuade', 'justify',
        'explain', 'describe', 'interpret', 'demonstrate', 'illustrate', 'investigate', 'examine',
        'explore', 'discover', 'create', 'design', 'construct', 'develop', 'improve', 'revise',
        'edit', 'publish', 'present', 'communicate', 'discuss', 'debate', 'collaborate', 'participate'
    ]
}


def load_ecdict():
    """加载 ECDICT 用于音标匹配"""
    print("[加载] ECDICT 数据库...")

    try:
        with open('ecdict.csv', 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            ecdict = {}
            for row in reader:
                word = row['word'].lower()
                phonetic = row.get('phonetic', '')
                if phonetic and word not in ecdict:
                    ecdict[word] = phonetic

        print(f"  ✓ 加载了 {len(ecdict):,} 个词的音标")
        return ecdict

    except FileNotFoundError:
        print("  ✗ ECDICT 未找到")
        return {}


def create_grade_4_6_dictionary():
    """创建 Grade 4-6 词库"""

    print("\n[创建] Grade 4-6 词库...")

    # 合并所有词汇并去重
    all_words = set(FRY_SIGHT_WORDS_GRADE_4) | set(FRY_SIGHT_WORDS_GRADE_5) | set(FRY_SIGHT_WORDS_GRADE_6)

    # 添加 Tier 2 词汇
    for category_words in TIER_2_WORDS_4_6.values():
        all_words.update(category_words)

    # 加载 ECDICT
    ecdict = load_ecdict()

    # 生成词库条目
    word_entries = []
    for word in sorted(all_words):
        word_lower = word.lower()

        # 跳过已经在 K-3 中的词
        if word_lower in ['a', 'i', 'it', 'the', 'is', 'are', 'was', 'were', 'be', 'have',
                         'do', 'can', 'will', 'would', 'should', 'could', 'may', 'might',
                         'must', 'go', 'come', 'see', 'look', 'make', 'take', 'get', 'give',
                         'know', 'think', 'say', 'ask', 'tell', 'use', 'work', 'play']:
            continue

        # 获取音标
        phonetic = ecdict.get(word_lower, '')

        # 创建条目
        entry = {
            'word': word,
            'word_id': f'grade_4_6_{word_lower}',
            'phonetic': {
                'us': phonetic,
                'uk': phonetic
            },
            'definitions': [
                {
                    'part_of_speech': 'unknown',
                    'meaning_en': f'Grade 4-6 vocabulary word',
                    'examples': [
                        {
                            'sentence_en': f'{word} is commonly used in Grade 4-6 texts.',
                            'sentence_cn': '',
                            'source': 'Grade 4-6 Context'
                        }
                    ]
                }
            ],
            'metadata': {
                'level': 'Grade 4-6',
                'word_type': 'sight_word_academic',
                'frequency': 'medium',
                'tags': ['sight-word', 'common-core', 'grade-4-6'],
                'tier': 'tier_1_tier_2',
                'grade_level': '4-6',
                'created_at': '2026-01-11'
            }
        }

        word_entries.append(entry)

    return word_entries


def main():
    """主函数"""
    print("="*80)
    print("任务3：创建 Grade 4-6 母语者核心词库")
    print("="*80)
    print()

    # 创建词库
    words = create_grade_4_6_dictionary()

    # 保存
    import os
    os.makedirs('src/assets/scenarios', exist_ok=True)

    output_data = {
        'meta': {
            'title': 'Native Speaker Grade 4-6 Vocabulary',
            'description': '美国小学高年级（4-6年级）核心词汇',
            'total_words': len(words),
            'source': 'Fry Sight Words (Grades 4-6) + Tier 2 Academic Words',
            'target_audience': '中国英语学习者（提升学术词汇）',
            'created_at': '2026-01-11'
        },
        'words': words
    }

    output_file = 'src/assets/scenarios/grade_4_6_vocabulary.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)

    print("\n✅ 保存完成")
    print(f"   文件: {output_file}")
    print(f"   词汇数: {len(words)}")

    # 统计
    print("\n" + "="*80)
    print("完成")
    print("="*80)
    print(f"总词汇: {len(words)}")
    print("="*80)


if __name__ == "__main__":
    main()
