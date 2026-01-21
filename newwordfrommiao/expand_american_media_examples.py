#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
扩展美国主流媒体风格例句库
使用模式匹配和规则生成更多符合 NYT/WSJ 风格的例句
"""

import json
import sys
import re

# 设置标准输出编码
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')


# ============== 扩展的美媒风格例句生成规则 ==============
# 使用模板和模式匹配生成更多例句
MEDIA_TEMPLATES = {
    # 商业/经济动词
    'verbs_business': [
        'The company {verb} its strategy to remain competitive.',
        'Investors {verb} as the market reacted to the news.',
        'The bank {verb} a new policy for retail customers.',
        'Economists {verb} the impact of inflation on consumer spending.',
        'The CEO {verb} plans to expand into international markets.',
    ],

    # 政治动词
    'verbs_political': [
        'Lawmakers {verb} over the proposed legislation.',
        'The president {verb} the bill from the White House.',
        'Senators {verb} the administration\'s handling of the crisis.',
        'The committee {verb} the witness for three hours.',
        'Voters {verb} in record numbers this election.',
    ],

    # 科技动词
    'verbs_tech': [
        'The app {verb} users to track their daily activities.',
        'Tech giants {verb} AI to improve their services.',
        'Researchers {verb} a breakthrough in quantum computing.',
        'The platform {verb} millions of users worldwide.',
        'Engineers {verb} the software to prevent security breaches.',
    ],

    # 基础动词
    'verbs_common': [
        '{Verb} the changes will affect your taxes.',
        'Experts {verb} the economy remains strong.',
        'The report {verb} concerns about privacy.',
        'Officials {verb} they are monitoring the situation.',
        'Most Americans {verb} the country is heading in the wrong direction.',
    ],

    # 形容词
    'adjectives': [
        'The {adjective} trend reflects changing consumer habits.',
        'A {adjective} majority supports the measure, polls show.',
        'The {adjective} decision could reshape the industry.',
        'Experts describe the situation as {adjective}.',
        '{Adjective} challenges remain for policymakers.',
    ],

    # 名词
    'nouns': [
        'The {noun} faces increasing scrutiny from regulators.',
        'A new {noun} could transform how we work.',
        'The {noun} reached a record high this quarter.',
        'Investors focus on the {noun} as a key indicator.',
        'The {noun} requires congressional approval.',
    ],
}


def generate_media_example_for_word(word: str, word_type: str = 'unknown') -> str:
    """为特定单词生成美国媒体风格的例句"""

    word_lower = word.lower()

    # 特殊词汇库
    if word_lower in ['increase', 'rise', 'grow', 'expand']:
        return f'Experts expect the economy to {word_lower} next quarter.'
    elif word_lower in ['decrease', 'fall', 'decline', 'drop']:
        return f'Sto prices {word_lower} following the earnings report.'
    elif word_lower in 'change':
        return 'The policy change takes effect next month.'
    elif word_lower in ['use', 'utilize', 'employ']:
        return f'Many companies {word_lower} data analytics to drive decisions.'
    elif word_lower in ['create', 'make', 'produce', 'generate']:
        return f'The program {word_lower}s opportunities for small businesses.'
    elif word_lower in ['help', 'assist', 'support', 'aid']:
        return f'Federal funding will {word_lower} communities recover from the disaster.'
    elif word_lower in ['show', 'demonstrate', 'reveal', 'indicate']:
        return f'Data {word_lower}s a shift in consumer preferences.'
    elif word_lower in ['say', 'state', 'announce', 'declare']:
        return f'Officials {word_lower}ed the investigation is ongoing.'
    elif word_lower in ['need', 'require', 'demand']:
        return f'The legislation {word_lower}s approval from both chambers.'
    elif word_lower in ['want', 'seek', 'pursue', 'look']:
        return f'The company {word_lower}s to acquire a competitor.'
    elif word_lower in ['think', 'believe', 'consider', 'regard']:
        return f'Analysts {word_lower} the merger faces regulatory hurdles.'
    elif word_lower in ['know', 'understand', 'realize', 'recognize']:
        return f'Most investors {word_lower} the risks of market volatility.'
    elif word_lower in ['give', 'provide', 'offer', 'supply']:
        return f'The foundation {word_lower}s grants to arts organizations.'
    elif word_lower in ['take', 'have', 'hold', 'possess']:
        return f'The court {word} jurisdiction in federal cases.'
    elif word_lower in ['come', 'arrive', 'reach', 'approach']:
        return f'New guidelines {word} into effect this week.'
    elif word_lower in ['go', 'proceed', 'continue', 'advance']:
        return f'The trial {word_lower}es despite defense objections.'
    elif word_lower in ['see', 'witness', 'observe', 'notice']:
        return f'The city {word_lower}ed a surge in tourism this summer.'
    elif word_lower in ['keep', 'maintain', 'retain', 'preserve']:
        return f'The central bank {word_lower}s interest rates unchanged.'
    elif word_lower in ['begin', 'start', 'commence', 'initiate']:
        return f'The summit {word_lower}s tomorrow in Geneva.'
    elif word_lower in ['end', 'finish', 'complete', 'conclude']:
        return f'The meeting {word_lower}ed with no agreement reached.'
    elif word_lower in ['work', 'operate', 'function', 'perform']:
        return f'The system {word_lower}s seamlessly with existing software.'
    elif word_lower in ['call', 'contact', 'reach', 'communicate']:
        return f'Constituents {word_lower}ed their representatives to protest.'
    elif word_lower in ['try', 'attempt', 'strive', 'endeavor']:
        return f'The startup {word_lower}ies to disrupt traditional banking.'
    elif word_lower in ['leave', 'depart', 'exit', 'withdraw']:
        return f'Several lawmakers {word} before the final vote.'
    elif word_lower in ['put', 'place', 'position', 'locate']:
        return f'Regulators {word} the company on probation for two years.'
    elif word_lower in ['mean', 'signify', 'indicate', 'denote']:
        return f'The ruling {word_lower}s a precedent for future cases.'
    elif word_lower in ['move', 'shift', 'transfer', 'relocate']:
        return f'Market analysts {word} their ratings on the stock.'
    elif word_lower in ['live', 'reside', 'dwell', 'inhabit']:
        return f'Most employees {word_lower} in the suburbs now.'
    elif word_lower in ['bring', 'fetch', 'carry', 'transport']:
        return f'The ruling {word_lower}s relief to affected consumers.'
    elif word_lower in ['pay', 'compensate', 'remunerate', 'reimburse']:
        return f'Insurance companies will {word} for damages up to policy limits.'
    elif word_lower in ['meet', 'encounter', 'face', 'confront']:
        return f'The president will {word} with allies next week.'
    elif word_lower in ['learn', 'study', 'educate', 'train']:
        return f'Students {word} about civics and government.'
    elif word_lower in ['change', 'alter', 'modify', 'adjust']:
        return f'Companies {word} their benefits to attract workers.'
    elif word_lower in ['lead', 'direct', 'guide', 'conduct']:
        return f'The senator {word_lower}s the committee on oversight.'
    elif word_lower in ['understand', 'comprehend', 'grasp', 'appreciate']:
        return f'We must {word_lower} the complexities of global trade.'
    elif word_lower in ['watch', 'observe', 'monitor', 'surveil']:
        return f'Analysts {word} the company\'s stock price closely.'
    elif word_lower in ['follow', 'pursue', 'chase', 'track']:
        return f'The index {word_lower}ed broader market trends downward.'
    elif word_lower in ['stop', 'cease', 'halt', 'discontinue']:
        return f'The court {word_lower}ed the merger from proceeding.'
    elif word_lower in ['create', 'produce', 'generate', 'make']:
        return f'The deal {word_lower}ed thousands of jobs.'
    elif word_lower in ['speak', 'talk', 'communicate', 'converse']:
        return f'The governor {word_lower} at the press conference.'
    elif word_lower in ['read', 'peruse', 'examine', 'review']:
        return f'Judges {word} the brief before oral arguments.'
    elif word_lower in ['allow', 'permit', 'let', 'authorize']:
        return f'The new law {word_lower}s remote voting permanently.'
    elif word_lower in ['add', 'increase', 'augment', 'supplement']:
        return f'The amendment {word_lower}ed protections for whistle-blowers.'
    elif word_lower in ['spend', 'expend', 'consume', 'use']:
        return f'Consumers {word} more on experiences than goods.'
    elif word_lower in ['grow', 'expand', 'increase', 'multiply']:
        return f'The economy {word_lower}ed at a slower pace than expected.'
    elif word_lower in ['open', 'start', 'launch', 'begin']:
        return f'The festival {word_lower}s with a parade downtown.'
    elif word_lower in ['walk', 'stroll', 'march', 'hike']:
        return f'Protesters {word_lower}ed through the capital building.'
    elif word_lower in ['win', 'succeed', 'triumph', 'prevail']:
        return f'The candidate {word_lower} the endorsement of the union.'
    elif word_lower in ['offer', 'propose', 'present', 'submit']:
        return f'The university {word_lower}ed him a full scholarship.'
    elif word_lower in ['remember', 'recall', 'recollect', 'reminisce']:
        return f'Americans {word_lower} the pandemic as a turning point.'
    elif word_lower in ['love', 'enjoy', 'like', 'appreciate']:
        return f'Readers {word_lower}ed the author\'s previous bestseller.'
    elif word_lower in ['consider', 'think', 'ponder', 'contemplate']:
        return f'The board {word_lower}ed several proposals for restructuring.'
    elif word_lower in ['appear', 'seem', 'look', 'appear']:
        return f'New evidence {word_lower}ed in the investigation.'
    elif word_lower in ['buy', 'purchase', 'acquire', 'obtain']:
        return f'Retail giants {word} smaller competitors to expand.'
    elif word_lower in ['wait', 'await', 'expect', 'anticipate']:
        return f'Investors {word} for the Federal Reserve\'s decision.'
    elif word_lower in ['serve', 'function', 'operate', 'work']:
        return f'He {word_lower}d in the military before entering politics.'
    elif word_lower in ['die', 'pass', 'perish', 'decease']:
        return f'The renowned author {word_lower}d at age 87.'
    elif word_lower in ['send', 'transmit', 'dispatch', 'deliver']:
        return f'The agency {word_lower}ed warnings to consumers about fraud.'
    elif word_lower in ['expect', 'anticipate', 'foresee', 'predict']:
        return f'Analysts {word_lower} strong earnings this quarter.'
    elif word_lower in ['build', 'construct', 'erect', 'assemble']:
        return f'Developers {word} luxury apartments in the neighborhood.'
    elif word_lower in ['stay', 'remain', 'abide', 'linger']:
        return f'Unemployment rates {word_lower}ed near historic lows.'
    elif word_lower in ['fall', 'drop', 'decline', 'decrease']:
        return f'Housing {word_lower}ed in most major markets last month.'
    elif word_lower in ['cut', 'reduce', 'slash', 'trim']:
        return f'Congress {word} funding for the program.'
    elif word_lower in ['reach', 'attain', 'achieve', 'accomplish']:
        return f'The deal {word_lower}ed an impasse in negotiations.'
    elif word_lower in ['kill', 'eliminate', 'eradicate', 'destroy']:
        return f'The vaccine {word_lower}ed the virus in laboratory tests.'
    elif word_lower in ['remain', 'stay', 'continue', 'persist']:
        return f'Mask mandates {word} in effect in healthcare settings.'
    elif word_lower in ['suggest', 'imply', 'indicate', 'propose']:
        return f'Data {word_lower}s consumer confidence is improving.'
    elif word_lower in ['report', 'announce', 'declare', 'state']:
        return f'The network {word_lower}ed record viewership for the debate.'
    elif word_lower in ['decide', 'determine', 'resolve', 'settle']:
        return f'Jurors {word_lower}ed the case after deliberating for days.'
    elif word_lower in ['pull', 'draw', 'tug', 'haul']:
        return f'The network {word}ed the show amid declining ratings.'
    elif word_lower in ['break', 'fracture', 'shatter', 'crack']:
        return f'The scandal {word}ed during the reelection campaign.'
    elif word_lower in ['thank', 'express gratitude', 'appreciate', 'acknowledge']:
        return f'The CEO {word_lower}ed employees in a memo.'
    elif word_lower in ['accept', 'take', 'approve', 'endorse']:
        return f'The board {word_lower}ed the resignation offer.'
    elif word_lower in ['check', 'examine', 'inspect', 'verify']:
        return f'Border agents {word} shipments for contraband.'
    elif word_lower in ['prepare', 'ready', 'organize', 'arrange']:
        return f'Emergency crews {word_lower}ed for the hurricane landfall.'
    elif word_lower in ['pass', 'approve', 'enact', 'ratify']:
        return f'Lawmakers {word_lower}ed the spending bill late Friday.'
    elif word_lower in ['save', 'rescue', 'preserve', 'conserve']:
        return f'The policy {word_lower}d taxpayers millions annually.'
    elif word_lower in ['lose', 'misplace', 'drop', 'shed']:
        return f'The party {word} seats in the midterm elections.'
    elif word_lower in ['lose', 'fail', 'fall short', 'miss']:
        return f'The team {word} the championship game in overtime.'
    else:
        # 通用模式
        if word_type == 'verb' or word_type == 'v':
            return f'The company will {word_lower} its strategy next quarter.'
        elif word_type == 'noun' or word_type == 'n':
            return f'The {word_lower} became a key issue in the campaign.'
        elif word_type == 'adjective' or word_type == 'adj' or word_type == 'a':
            return f'The {word_lower} trend reflects changing consumer habits.'
        else:
            return f'Experts {word_lower} the situation remains uncertain.'


def expand_media_examples_for_dictionary(input_file: str, output_file: str, name: str) -> dict:
    """为词库中的每个词生成美媒风格例句"""

    print(f"[扩展] {name} 词库美媒例句...")

    with open(input_file, 'r', encoding='utf-8') as f:
        words = json.load(f)

    generated_count = 0
    skipped_count = 0
    samples = []

    for word_entry in words:
        word = word_entry['word']

        # 尝试推断词性
        word_type = 'unknown'
        if 'pos' in word_entry:
            word_type = word_entry['pos']
        elif 'definitions' in word_entry and word_entry['definitions']:
            # 从第一个定义获取词性
            if 'part_of_speech' in word_entry['definitions'][0]:
                word_type = word_entry['definitions'][0]['part_of_speech']

        # 生成例句
        example = generate_media_example_for_word(word, word_type)

        if example:
            # 添加或更新美媒风格例句
            if 'definitions' not in word_entry:
                word_entry['definitions'] = []

            # 查找是否已有美媒例句
            has_media_example = False
            for defn in word_entry['definitions']:
                if defn.get('source') == 'american_media':
                    has_media_example = True
                    break

            if not has_media_example:
                media_definition = {
                    'source': 'american_media',
                    'meaning_en': '',
                    'examples': [
                        {
                            'sentence_en': example,
                            'sentence_cn': '',
                            'source': 'NYT/WSJ Generated'
                        }
                    ]
                }
                word_entry['definitions'].append(media_definition)
                generated_count += 1

                if len(samples) < 10:
                    samples.append({
                        'word': word,
                        'type': word_type,
                        'example': example
                    })
            else:
                skipped_count += 1

    # 保存更新后的词库
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(words, f, ensure_ascii=False, indent=2)

    print(f"  ✓ 生成例句: {generated_count} 个")
    print(f"  - 跳过（已有）: {skipped_count} 个")
    print(f"  → 已保存到: {output_file}")

    if samples:
        print(f"\n  例句示例:")
        for sample in samples:
            example_short = sample['example'][:70]
            print(f"    {sample['word']:<15} [{sample['type']}] {example_short}...")
    print()

    return {
        'total': len(words),
        'generated': generated_count,
        'skipped': skipped_count,
        'samples': samples
    }


def main():
    """主函数"""
    print("="*80)
    print("扩展美国主流媒体风格例句库（全量生成）")
    print("="*80)
    print()

    # 扩展 IELTS
    print("[步骤 1/2] 扩展 IELTS 词库")
    print("-" * 80)

    ielts_result = expand_media_examples_for_dictionary(
        'src/assets/data/merriam_webster/ielts_words_mw_with_examples.json',
        'src/assets/data/merriam_webster/ielts_words_mw_final.json',
        'IELTS'
    )

    # 扩展 TOEFL
    print("[步骤 2/2] 扩展 TOEFL 词库")
    print("-" * 80)

    toefl_result = expand_media_examples_for_dictionary(
        'src/assets/data/merriam_webster/toefl_words_mw_with_examples.json',
        'src/assets/data/merriam_webster/toefl_words_mw_final.json',
        'TOEFL'
    )

    # 生成报告
    print("="*80)
    print("总结")
    print("="*80)
    print(f"总词汇数: {ielts_result['total'] + toefl_result['total']}")
    print(f"生成例句: {ielts_result['generated'] + toefl_result['generated']}")
    print(f"跳过已有: {ielts_result['skipped'] + toefl_result['skipped']}")
    print(f"覆盖率: {(ielts_result['generated'] + toefl_result['generated'])/(ielts_result['total'] + toefl_result['total'])*100:.1f}%")
    print()
    print("✅ 最终词库文件：")
    print("  - src/assets/data/merriam_webster/ielts_words_mw_final.json")
    print("  - src/assets/data/merriam_webster/toefl_words_mw_final.json")
    print("="*80)


if __name__ == "__main__":
    main()
