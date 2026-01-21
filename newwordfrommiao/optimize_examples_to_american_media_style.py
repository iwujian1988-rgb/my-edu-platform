#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
优化例句为美国主流媒体风格（NYT, WSJ, Washington Post）
特点：
1. 使用地道的美国表达
2. 避免英式拼写和用法
3. 句式符合新闻写作规范
4. 内容涉及商业、政治、科技、文化等主流话题
"""

import json
import sys

# 设置标准输出编码
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')


# ============== 美国主流媒体风格例句模板 ==============
# 这些例句符合 NYT, WSJ 的用词习惯和报道风格
AMERICAN_MEDIA_EXAMPLES = {
    # 商业/经济
    'analyze': 'The investment firm analyzed market trends before making recommendations.',
    'assessment': 'The Federal Reserve\'s assessment of economic conditions signaled potential rate changes.',
    'benefit': 'Small businesses benefit from the new tax incentives, according to the Chamber of Commerce.',
    'budget': 'The congressional budget office projected a deficit increase for the fiscal year.',
    'capital': 'Venture capital firms invested heavily in artificial intelligence startups this quarter.',
    'economic': 'The economic recovery showed signs of slowing in the latest employment report.',
    'financial': 'Financial regulators tightened oversight of cryptocurrency trading platforms.',
    'investment': 'The investment strategy focused on sustainable energy companies.',
    'profit': 'Corporate profits exceeded analyst expectations despite supply chain challenges.',
    'revenue': 'Tech companies reported strong revenue growth driven by cloud computing services.',

    # 政治/政策
    'policy': 'The administration\'s immigration policy faced legal challenges in federal court.',
    'political': 'Political analysts debated the impact of new voting laws on turnout.',
    'government': 'Government agencies issued new guidelines for workplace safety protocols.',
    'legislation': 'Congress passed legislation to fund infrastructure projects across the nation.',
    'regulation': 'Banking regulation proposals drew criticism from industry lobbyists.',
    'democratic': 'Democratic leaders outlined their priorities for the upcoming session.',
    'republican': 'Republican senators raised concerns about the bill\'s cost estimates.',
    'election': 'The midterm election results could shift the balance of power in Washington.',
    'campaign': 'The presidential campaign intensified with advertising in key battleground states.',
    'congress': 'Congress approved the spending bill after weeks of negotiations.',

    # 科技/创新
    'technology': 'Advances in technology transformed how companies operate in the digital age.',
    'innovation': 'Silicon Valley continues to drive innovation in artificial intelligence and machine learning.',
    'digital': 'Digital transformation accelerated as businesses adapted to remote work models.',
    'artificial': 'Artificial intelligence systems can now generate human-like text and images.',
    'intelligence': 'Intelligence agencies warned about cybersecurity threats from foreign actors.',
    'algorithm': 'Social media algorithms were questioned during the Senate hearing.',
    'platform': 'The platform announced new features to compete with rival services.',
    'software': 'Software companies faced increased scrutiny over data privacy practices.',
    'data': 'Data analytics helped retailers predict consumer behavior during the holiday season.',
    'network': 'The telecommunications company expanded its 5G network coverage nationwide.',

    # 社会/文化
    'social': 'Social media platforms faced pressure to moderate harmful content.',
    'cultural': 'Cultural institutions received federal funding to preserve historic sites.',
    'community': 'The community organized fundraisers for families affected by the disaster.',
    'education': 'Education leaders debated the role of standardized testing in schools.',
    'university': 'The university announced plans to increase financial aid for low-income students.',
    'student': 'Student loan forgiveness became a key issue in the policy debate.',
    'research': 'Medical research breakthroughs offered hope for treating rare diseases.',
    'health': 'Public health officials monitored the spread of the new virus variant.',
    'environment': 'Environmental groups sued over permits for the oil pipeline project.',
    'climate': 'Climate change negotiations resulted in new international agreements.',

    # 国际/外交
    'international': 'International cooperation was essential for addressing global security challenges.',
    'foreign': 'The secretary of state met with foreign leaders to discuss trade agreements.',
    'global': 'Global supply chains continued recovering from pandemic disruptions.',
    'trade': 'Trade tensions eased as both countries resumed negotiations.',
    'agreement': 'The peace agreement was signed after years of diplomatic efforts.',
    'negotiation': 'Labor negotiations reached a tentative deal averting a strike.',
    'diplomatic': 'Diplomatic channels remained open despite public disagreements.',
    'military': 'Military officials testified before Congress about defense spending.',
    'security': 'National security advisors reviewed the intelligence assessment.',
    'strategy': 'The company\'s growth strategy included expanding into emerging markets.',

    # 商业运营
    'operation': 'The airline resumed normal operations after the technical outage was resolved.',
    'management': 'Senior management announced restructuring plans to improve efficiency.',
    'manager': 'The fund manager adjusted the portfolio based on market conditions.',
    'executive': 'The chief executive officer defended the company\'s acquisition strategy.',
    'corporate': 'Corporate governance reforms were approved by shareholders.',
    'business': 'Small business owners expressed optimism about the holiday shopping season.',
    'company': 'The company reported better-than-expected earnings for the quarter.',
    'industry': 'The automotive industry invested billions in electric vehicle development.',
    'market': 'Stock market volatility increased amid uncertainty about interest rates.',
    'consumer': 'Consumer confidence dropped slightly due to inflation concerns.',

    # 基础动词（高频）
    'make': 'The decision will make it easier for consumers to file complaints.',
    'take': 'Lawmakers took action to address the growing public concern.',
    'get': 'Many Americans get their news from social media platforms.',
    'have': 'The study has implications for how we understand consumer behavior.',
    'do': 'The agency does not have authority to enforce the proposed rules.',
    'go': 'Where the investigation goes from here remains unclear.',
    'come': 'Changes will come into effect next month.',
    'see': 'Analysts see opportunities in the renewable energy sector.',
    'know': 'We know that inflation affects different groups differently.',
    'think': 'Most economists think the economy will avoid a recession.',

    # 形容词（描述性）
    'significant': 'The ruling represents a significant victory for civil rights advocates.',
    'important': 'It\'s important to understand the context of these developments.',
    'major': 'A major acquisition was announced in the healthcare sector.',
    'clear': 'The message from voters was clear: change the approach.',
    'strong': 'The dollar showed strong performance against major currencies.',
    'different': 'Different states have taken different approaches to the issue.',
    'possible': 'Experts said a cyberattack remains a possible threat.',
    'likely': 'The Federal Reserve is likely to raise rates again this year.',
    'available': 'Vaccines are now available for children under five.',
    'public': 'Public opinion polls showed declining support for the policy.',

    # 副词
    'very': 'The situation remains very fluid according to officials.',
    'more': 'Investors are demanding more transparency from corporate leaders.',
    'most': 'Most Americans support the proposed legislation, surveys show.',
    'also': 'The deal also includes provisions for worker training.',
    'just': 'The court just issued its ruling in the landmark case.',
    'still': 'Questions remain about how the law will be enforced.',
    'well': 'The economy is performing well despite global headwinds.',
    'now': 'Applications are now being accepted for the new program.',
    'then': 'Prices were lower then, but inflation has changed that.',
    'how': 'How the technology will be regulated is still being discussed.',

    # 介词/连词
    'after': 'Stocks fell after the earnings report disappointed investors.',
    'before': 'The committee will vote before the full House considers the bill.',
    'during': 'Production was disrupted during the workers\' strike.',
    'while': 'Profits rose while competitor losses widened.',
    'when': 'It remains unclear when the restrictions will be lifted.',
    'where': 'States where the virus spread fastest imposed stricter measures.',
    'which': 'The proposal, which has bipartisan support, advances to the Senate.',
    'that': 'Officials confirmed that the investigation is ongoing.',
    'because': 'Traffic was disrupted because of the accident on the bridge.',
    'if': 'The plan will proceed if funding is approved by Congress.',

    # 数字/量词
    'many': 'Many questions remain about the long-term effects.',
    'much': 'There is still much work to be done on the issue.',
    'all': 'All eyes are on the central bank\'s decision this week.',
    'some': 'Some analysts predict slower growth next quarter.',
    'each': 'Each state received federal assistance for recovery efforts.',
    'every': 'Every household received a stimulus payment.',
    'both': 'Both parties claimed victory after the debate.',
    'either': 'Either option would require additional funding.',
    'neither': 'Neither side would compromise on key provisions.',
    'one': 'One thing everyone agrees on: the need for reform.',

    # 时间
    'today': 'The president announced new measures today.',
    'yesterday': 'The company reported earnings yesterday.',
    'tomorrow': 'The committee will vote on the bill tomorrow.',
    'now': 'Applications are being accepted now through the end of the month.',
    'soon': 'The product will be available in stores soon.',
    'still': 'The impact is still being assessed by authorities.',
    'already': 'Some stores have already sold out of the product.',
    'yet': 'The full extent of the damage is not yet known.',
    'always': 'We have always prioritized customer satisfaction, the CEO said.',
    'never': 'Such violations have never been tolerated, the spokesperson stated.',

    # 常见名词
    'people': 'People gathered in cities across the country to protest.',
    'time': 'Time is running out to reach a budget agreement.',
    'year': 'This year\'s conference attracted record attendance.',
    'way': 'The ruling paves the way for similar lawsuits nationwide.',
    'day': 'From day one, our priority has been safety, officials said.',
    'thing': 'One thing is certain: change is coming to the industry.',
    'world': 'The summit brought together leaders from around the world.',
    'life': 'The documentary explores life in small-town America.',
    'work': 'Work from home policies are being reconsidered.',
    'place': 'The incident took place near the capital building.',
}


def analyze_current_examples(file_path: str, name: str) -> dict:
    """分析当前词库的例句质量"""
    print(f"[分析] {name} 词库例句...")

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            words = json.load(f)

        has_example = 0
        has_chinese_translation = 0
        sample_examples = []

        for w in words[:200]:  # 采样前200个
            translation = w.get('translation', '')
            definition = w.get('definition', '')

            # 检查是否有例句（在 translation 或 definition 字段中）
            if translation or definition:
                has_example += 1

                if '例' in translation or '\\' in translation:
                    has_chinese_translation += 1

                if len(sample_examples) < 5:
                    sample_examples.append({
                        'word': w['word'],
                        'translation': translation[:100] if translation else definition[:100]
                    })

        print(f"  有内容: {has_example}/200")
        print(f"  有中文翻译: {has_chinese_translation}/200")

        if sample_examples:
            print(f"  内容示例（前5个）:")
            for s in sample_examples:
                content = s['translation'].replace('\\n', ' ')[:80]
                print(f"    {s['word']:<20} {content}...")
        print()

        return {
            'has_example': has_example,
            'has_chinese': has_chinese_translation,
            'samples': sample_examples
        }

    except FileNotFoundError:
        print(f"  ✗ 文件未找到: {file_path}\n")
        return {'has_example': 0, 'has_chinese': 0, 'samples': []}


def add_american_media_examples(input_file: str, output_file: str, name: str) -> dict:
    """为词库添加美国主流媒体风格的例句"""
    print(f"[优化] {name} 词库例句...")

    with open(input_file, 'r', encoding='utf-8') as f:
        words = json.load(f)

    added_count = 0
    sample_additions = []

    for word_entry in words:
        word_lower = word_entry['word'].lower()

        # 查找对应的美国媒体例句
        if word_lower in AMERICAN_MEDIA_EXAMPLES:
            american_example = AMERICAN_MEDIA_EXAMPLES[word_lower]

            # 添加到 definitions 中
            if 'definitions' not in word_entry:
                word_entry['definitions'] = []

            # 添加新的定义条目，包含美媒风格例句
            new_definition = {
                'source': 'american_media',
                'meaning_en': word_entry.get('translation', '').split('\\n')[0][:100] if word_entry.get('translation') else '',
                'examples': [
                    {
                        'sentence_en': american_example,
                        'sentence_cn': '',
                        'source': 'NYT/WSJ Style'
                    }
                ]
            }

            word_entry['definitions'].append(new_definition)
            word_entry['has_american_media_example'] = True

            added_count += 1

            if len(sample_additions) < 10:
                sample_additions.append({
                    'word': word_entry['word'],
                    'example': american_example
                })

    # 保存更新后的词库
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(words, f, ensure_ascii=False, indent=2)

    print(f"  ✓ 添加美媒例句: {added_count} 个")
    print(f"  → 已保存到: {output_file}")

    if sample_additions:
        print(f"\n  例句示例:")
        for sample in sample_additions:
            example = sample['example'][:80]
            print(f"    {sample['word']:<15} {example}...")
    print()

    return {
        'total': len(words),
        'added': added_count,
        'samples': sample_additions
    }


def main():
    """主函数"""
    print("="*80)
    print("优化例句为美国主流媒体风格（NYT, WSJ, Washington Post）")
    print("="*80)
    print()

    # 1. 分析现有例句
    print("[步骤 1/3] 分析现有例句质量")
    print("-" * 80)

    ielts_example_info = analyze_current_examples(
        'src/assets/data/merriam_webster/ielts_words_mw.json',
        'IELTS (MW)'
    )

    toefl_example_info = analyze_current_examples(
        'src/assets/data/merriam_webster/toefl_words_mw.json',
        'TOEFL (MW)'
    )

    # 2. 添加美国媒体风格例句
    print("[步骤 2/3] 添加美国主流媒体风格例句")
    print("-" * 80)

    ielts_result = add_american_media_examples(
        'src/assets/data/merriam_webster/ielts_words_mw.json',
        'src/assets/data/merriam_webster/ielts_words_mw_with_examples.json',
        'IELTS'
    )

    toefl_result = add_american_media_examples(
        'src/assets/data/merriam_webster/toefl_words_mw.json',
        'src/assets/data/merriam_webster/toefl_words_mw_with_examples.json',
        'TOEFL'
    )

    # 3. 生成报告
    print("[步骤 3/3] 生成优化报告")
    print("-" * 80)

    report = {
        'optimization_date': '2026-01-11',
        'style_guide': 'American Mainstream Media (NYT, WSJ, Washington Post)',
        'dictionaries': {
            'ielts': {
                'analyzed': ielts_example_info,
                'optimized': ielts_result
            },
            'toefl': {
                'analyzed': toefl_example_info,
                'optimized': toefl_result
            }
        },
        'summary': {
            'total_words': ielts_result['total'] + toefl_result['total'],
            'total_examples_added': ielts_result['added'] + toefl_result['added']
        }
    }

    import os
    os.makedirs('src/assets/reports', exist_ok=True)
    report_file = 'src/assets/reports/american_media_examples_report.json'

    with open(report_file, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    print(f"\n✅ 优化报告已保存到: {report_file}")
    print()
    print("="*80)
    print("总结")
    print("="*80)
    print(f"总词汇数: {report['summary']['total_words']}")
    print(f"添加美媒例句: {report['summary']['total_examples_added']}")
    print(f"覆盖率: {report['summary']['total_examples_added']/report['summary']['total_words']*100:.1f}%")
    print()
    print("例句特点：")
    print("  ✓ 符合 NYT/WSJ 报道风格")
    print("  ✓ 涵盖商业、政治、科技、社会话题")
    print("  ✓ 使用地道美式表达")
    print("  ✓ 避免英式拼写和用法")
    print("="*80)


if __name__ == "__main__":
    main()
