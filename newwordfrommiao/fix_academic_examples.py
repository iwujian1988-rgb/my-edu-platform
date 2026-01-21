#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
为 academic_tier2.json 中只有2个例句的词添加第3个例句
"""

import json
import sys
from pathlib import Path

# 设置标准输出编码
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')


# 为每个需要补充例句的词添加第三个例句
additional_examples = {
    "context": {
        "sentence_en": "Understanding the context helps us comprehend the author's message.",
        "sentence_cn": "理解语境有助于我们领会作者的信息。",
        "source": "ai_generated"
    },
    "infer": {
        "sentence_en": "Readers can infer the theme from the character's actions.",
        "sentence_cn": "读者可以从人物的行为中推断主题。",
        "source": "ai_generated"
    },
    "summarize": {
        "sentence_en": "Students summarize the main ideas of the chapter.",
        "sentence_cn": "学生们总结章节的主要观点。",
        "source": "ai_generated"
    },
    "narrative": {
        "sentence_en": "The narrative follows the hero's journey across many lands.",
        "sentence_cn": "这个叙述讲述了英雄穿越许多土地的旅程。",
        "source": "ai_generated"
    },
    "clarify": {
        "sentence_en": "The teacher will clarify any confusing concepts.",
        "sentence_cn": "老师会澄清任何令人困惑的概念。",
        "source": "ai_generated"
    },
    "calculate": {
        "sentence_en": "Students calculate the total cost of the materials.",
        "sentence_cn": "学生们计算材料的总成本。",
        "source": "ai_generated"
    },
    "equation": {
        "sentence_en": "Write an equation to represent the word problem.",
        "sentence_cn": "写一个方程来表示这个应用题。",
        "source": "ai_generated"
    },
    "estimate": {
        "sentence_en": "Scientists estimate the population of the species.",
        "sentence_cn": "科学家估算该物种的数量。",
        "source": "ai_generated"
    },
    "fraction": {
        "sentence_en": "Three quarters of the students voted for the new policy.",
        "sentence_cn": "四分之三的学生投票支持这项新政策。",
        "source": "ai_generated"
    },
    "experiment": {
        "sentence_en": "Our class experiment tested which liquids freeze fastest.",
        "sentence_cn": "我们班的实验测试了哪些液体冻得最快。",
        "source": "ai_generated"
    },
    "habitat": {
        "sentence_en": "Wetlands provide a habitat for many bird species.",
        "sentence_cn": "湿地为许多鸟类物种提供栖息地。",
        "source": "ai_generated"
    },
    "organism": {
        "sentence_en": "Every organism in the ecosystem plays an important role.",
        "sentence_cn": "生态系统中的每个生物都扮演着重要角色。",
        "source": "ai_generated"
    },
    "variable": {
        "sentence_en": "Temperature is a variable that affects plant growth.",
        "sentence_cn": "温度是影响植物生长的一个变量。",
        "source": "ai_generated"
    },
    "classify": {
        "sentence_en": "Scientists classify animals into different groups.",
        "sentence_cn": "科学家将动物分类到不同的组。",
        "source": "ai_generated"
    },
    "demonstrate": {
        "sentence_en": "The experiment demonstrates how chemical reactions work.",
        "sentence_cn": "这个实验展示了化学反应是如何起作用的。",
        "source": "ai_generated"
    },
    "observe": {
        "sentence_en": "Students observe the plants' growth over two weeks.",
        "sentence_cn": "学生们观察植物两周的生长情况。",
        "source": "ai_generated"
    },
    "predict": {
        "sentence_en": "Based on the data, we predict the trend will continue.",
        "sentence_cn": "基于数据，我们预测这种趋势会继续。",
        "source": "ai_generated"
    },
    "significant": {
        "sentence_en": "The discovery led to significant changes in medicine.",
        "sentence_cn": "这个发现导致了医学的重大变化。",
        "source": "ai_generated"
    },
    "establish": {
        "sentence_en": "The government established new environmental protection laws.",
        "sentence_cn": "政府建立了新的环境保护法。",
        "source": "ai_generated"
    },
    "citizen": {
        "sentence_en": "Being a good citizen means following community rules.",
        "sentence_cn": "做一个好公民意味着遵守社区规则。",
        "source": "ai_generated"
    },
    "community": {
        "sentence_en": "Our community comes together to celebrate holidays.",
        "sentence_cn": "我们社区聚在一起庆祝节日。",
        "source": "ai_generated"
    },
    "cultural": {
        "sentence_en": "Cultural festivals help us appreciate different traditions.",
        "sentence_cn": "文化节有助于我们欣赏不同的传统。",
        "source": "ai_generated"
    },
    "culture": {
        "sentence_en": "Learning about different cultures promotes understanding and respect.",
        "sentence_cn": "了解不同的文化有助于促进理解和尊重。",
        "source": "ai_generated"
    },
    "government": {
        "sentence_en": "The government provides services like schools and hospitals.",
        "sentence_cn": "政府提供学校和医院等服务。",
        "source": "ai_generated"
    },
    "history": {
        "sentence_en": "Studying history helps us understand how societies developed.",
        "sentence_cn": "学习历史有助于我们理解社会是如何发展的。",
        "source": "ai_generated"
    },
    "tradition": {
        "sentence_en": "Families pass down traditions from generation to generation.",
        "sentence_cn": "家庭代代相传传统。",
        "source": "ai_generated"
    },
    "accomplish": {
        "sentence_en": "With hard work and dedication, you can accomplish your goals.",
        "sentence_cn": "通过努力和奉献，你可以实现你的目标。",
        "source": "ai_generated"
    },
    "communicate": {
        "sentence_en": "Students learn to communicate their ideas clearly in writing.",
        "sentence_cn": "学生们学习在写作中清晰地表达自己的想法。",
        "source": "ai_generated"
    },
    "focus": {
        "sentence_en": "It is important to focus on the main idea while reading.",
        "sentence_cn": "阅读时关注主要观点很重要。",
        "source": "ai_generated"
    }
}


def main():
    """主函数"""
    print("="*80)
    print("补充 academic_tier2 例句")
    print("="*80)
    print()

    file_path = Path(__file__).parent.parent / 'src' / 'assets' / 'levels' / 'us_k12' / 'academic_tier2.json'

    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    words = data['words']
    fixed_count = 0

    for word_entry in words:
        word = word_entry['word']
        definitions = word_entry['definitions']

        for defn in definitions:
            examples = defn.get('examples', [])

            if len(examples) == 2 and word in additional_examples:
                # 添加第三个例句
                new_example = additional_examples[word].copy()
                new_example.update({
                    "context": examples[0].get('context', 'academic_context'),
                    "grade_level": word_entry['metadata']['level'],
                    "lexile_score": word_entry['metadata'].get('readability_level', {}).get('lexile', '800L')
                })

                examples.append(new_example)
                print(f"✓ {word}: 添加第3个例句")
                fixed_count += 1
            elif len(examples) < 2:
                print(f"⚠ {word}: 只有 {len(examples)} 个例句（需要手动添加）")

    # 保存文件
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print()
    print("="*80)
    print(f"✓ 完成补充 {fixed_count} 个词的例句")
    print("="*80)
    return 0


if __name__ == "__main__":
    sys.exit(main())
