#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Stage 4: 词组与例句 AI 增强 - 字母 I 核心词汇补全
为 master_words_pool.json 中 I 开头的核心 CET4 单词添加 2026 语境例句
"""

import json
import os
from datetime import datetime

# 20个I开头的核心CET4单词 + 2026语境原创例句
I_CORE_WORDS = [
    {
        "word": "identify",
        "pos": "v.",
        "cn": "认出，识别；确定，确认",
        "examples": [
            {
                "en": "AI-powered security systems can now identify unauthorized personnel within seconds.",
                "cn": "人工智能驱动的安全系统现在可以在几秒钟内识别未授权人员。",
                "context": "technology",
                "source": "stage4_2026_context"
            },
            {
                "en": "Users can identify fake news by checking multiple reliable sources.",
                "cn": "用户可以通过核实多个可靠来源来识别假新闻。",
                "context": "digital_literacy",
                "source": "stage4_2026_context"
            }
        ]
    },
    {
        "word": "ignore",
        "pos": "v.",
        "cn": "忽视，不理会",
        "examples": [
            {
                "en": "Don't ignore the privacy policy before installing new apps on your phone.",
                "cn": "在手机上安装新应用之前，不要忽视隐私政策。",
                "context": "digital_safety",
                "source": "stage4_2026_context"
            },
            {
                "en": "Smart filters automatically ignore spam messages in your email inbox.",
                "cn": "智能过滤器会自动忽略电子邮件收件箱中的垃圾信息。",
                "context": "technology",
                "source": "stage4_2026_context"
            }
        ]
    },
    {
        "word": "illegal",
        "pos": "adj.",
        "cn": "非法的，违法的",
        "examples": [
            {
                "en": "Downloading pirated software is illegal and can harm your computer with malware.",
                "cn": "下载盗版软件是非法的，并且可能会用恶意软件危害你的电脑。",
                "context": "cybersecurity",
                "source": "stage4_2026_context"
            },
            {
                "en": "The company was fined for illegal data collection practices.",
                "cn": "该公司因非法数据收集行为被罚款。",
                "context": "business",
                "source": "stage4_2026_context"
            }
        ]
    },
    {
        "word": "illustrate",
        "pos": "v.",
        "cn": "说明，阐明；给...作插图说明",
        "examples": [
            {
                "en": "The professor used interactive charts to illustrate the impact of climate change.",
                "cn": "教授使用互动图表来阐明气候变化的影响。",
                "context": "education",
                "source": "stage4_2026_context"
            },
            {
                "en": "Social media posts often illustrate success stories, but rarely show the struggles behind them.",
                "cn": "社交媒体帖子经常展示成功故事，但很少显示背后的挣扎。",
                "context": "social_media",
                "source": "stage4_2026_context"
            }
        ]
    },
    {
        "word": "image",
        "pos": "n.",
        "cn": "图像，形象；印象",
        "examples": [
            {
                "en": "High-quality images are essential for successful e-commerce product listings.",
                "cn": "高质量的图像对于成功的电商产品列表至关重要。",
                "context": "ecommerce",
                "source": "stage4_2026_context"
            },
            {
                "en": "Your professional image on LinkedIn can affect your career opportunities.",
                "cn": "你在领英上的职业形象会影响你的职业机会。",
                "context": "career",
                "source": "stage4_2026_context"
            }
        ]
    },
    {
        "word": "immigrate",
        "pos": "v.",
        "cn": "移民，移居（入境）",
        "examples": [
            {
                "en": "Many skilled professionals immigrate to countries with better tech industries.",
                "cn": "许多技能型专业人士移民到科技产业更好的国家。",
                "context": "global_mobility",
                "source": "stage4_2026_context"
            },
            {
                "en": "Digital nomads immigrate to countries offering remote work visas.",
                "cn": "数字游民移民到提供远程工作签证的国家。",
                "context": "remote_work",
                "source": "stage4_2026_context"
            }
        ]
    },
    {
        "word": "impact",
        "pos": "n.",
        "cn": "影响，作用；冲击",
        "examples": [
            {
                "en": "The pandemic had a huge impact on remote work adoption worldwide.",
                "cn": "疫情对全球远程办公的采用产生了巨大影响。",
                "context": "workplace",
                "source": "stage4_2026_context"
            },
            {
                "en": "Electric vehicles are making a positive environmental impact.",
                "cn": "电动汽车正在产生积极的环境影响。",
                "context": "sustainability",
                "source": "stage4_2026_context"
            }
        ]
    },
    {
        "word": "implement",
        "pos": "v.",
        "cn": "实施，执行；实现",
        "examples": [
            {
                "en": "The company implemented AI tools to improve customer service efficiency.",
                "cn": "该公司实施了AI工具以提高客户服务效率。",
                "context": "business",
                "source": "stage4_2026_context"
            },
            {
                "en": "Schools implemented hybrid learning models after the pandemic.",
                "cn": "疫情后，学校实施了混合学习模式。",
                "context": "education",
                "source": "stage4_2026_context"
            }
        ]
    },
    {
        "word": "import",
        "pos": "v.",
        "cn": "进口，输入；导入（数据）",
        "examples": [
            {
                "en": "You can import contacts from your phone to the cloud automatically.",
                "cn": "你可以自动将联系人从手机导入到云端。",
                "context": "technology",
                "source": "stage4_2026_context"
            },
            {
                "en": "Many countries import electronic components from global manufacturers.",
                "cn": "许多国家从全球制造商进口电子元件。",
                "context": "trade",
                "source": "stage4_2026_context"
            }
        ]
    },
    {
        "word": "important",
        "pos": "adj.",
        "cn": "重要的，重大的",
        "examples": [
            {
                "en": "Cybersecurity is important for protecting personal data online.",
                "cn": "网络安全对于保护在线个人数据很重要。",
                "context": "technology",
                "source": "stage4_2026_context"
            },
            {
                "en": "Critical thinking skills are becoming more important in the information age.",
                "cn": "批判性思维技能在信息时代正变得更重要。",
                "context": "education",
                "source": "stage4_2026_context"
            }
        ]
    },
    {
        "word": "impose",
        "pos": "v.",
        "cn": "把...强加于；征（税等）",
        "examples": [
            {
                "en": "The government imposed new regulations on social media platforms.",
                "cn": "政府对社交媒体平台实施了新法规。",
                "context": "regulation",
                "source": "stage4_2026_context"
            },
            {
                "en": "Don't impose your opinions on others during team discussions.",
                "cn": "在团队讨论期间不要将你的观点强加给别人。",
                "context": "workplace",
                "source": "stage4_2026_context"
            }
        ]
    },
    {
        "word": "improve",
        "pos": "v.",
        "cn": "改进，改善",
        "examples": [
            {
                "en": "Regular software updates improve system security and performance.",
                "cn": "定期的软件更新可以提升系统安全性和性能。",
                "context": "technology",
                "source": "stage4_2026_context"
            },
            {
                "en": "Online courses help people improve their skills at their own pace.",
                "cn": "在线课程帮助人们按自己的节奏提升技能。",
                "context": "learning",
                "source": "stage4_2026_context"
            }
        ]
    },
    {
        "word": "include",
        "pos": "v.",
        "cn": "包括，包含",
        "examples": [
            {
                "en": "The premium subscription includes ad-free streaming and offline downloads.",
                "cn": "高级订阅包括无广告流媒体和离线下载。",
                "context": "services",
                "source": "stage4_2026_context"
            },
            {
                "en": "Your travel package should include travel insurance.",
                "cn": "你的旅行套餐应该包括旅行保险。",
                "context": "travel",
                "source": "stage4_2026_context"
            }
        ]
    },
    {
        "word": "increase",
        "pos": "v.",
        "cn": "增加，增长",
        "examples": [
            {
                "en": "Remote work opportunities increased significantly after 2020.",
                "cn": "2020年后，远程工作机会显著增加。",
                "context": "workplace",
                "source": "stage4_2026_context"
            },
            {
                "en": "Video streaming consumption increased during the holiday season.",
                "cn": "假日期间，视频流媒体消费增加了。",
                "context": "entertainment",
                "source": "stage4_2026_context"
            }
        ]
    },
    {
        "word": "indeed",
        "pos": "adv.",
        "cn": "真正地，当然；确实",
        "examples": [
            {
                "en": "The new smartphone is indeed faster than the previous model.",
                "cn": "这款新智能手机确实比之前的型号更快。",
                "context": "technology",
                "source": "stage4_2026_context"
            },
            {
                "en": "Climate change is indeed a global challenge requiring international cooperation.",
                "cn": "气候变化确实是一个需要国际合作的全球挑战。",
                "context": "environment",
                "source": "stage4_2026_context"
            }
        ]
    },
    {
        "word": "independent",
        "pos": "adj.",
        "cn": "独立的；自主的",
        "examples": [
            {
                "en": "More young people choose to be independent entrepreneurs rather than employees.",
                "cn": "更多年轻人选择成为独立的创业者而非员工。",
                "context": "career",
                "source": "stage4_2026_context"
            },
            {
                "en": "AI systems should not be completely independent without human oversight.",
                "cn": "AI系统不应在没有人类监督的情况下完全独立运行。",
                "context": "technology",
                "source": "stage4_2026_context"
            }
        ]
    },
    {
        "word": "individual",
        "pos": "adj.",
        "cn": "个人的，个体的；独特的",
        "examples": [
            {
                "en": "Personalized learning platforms adapt to individual student needs.",
                "cn": "个性化学习平台适应个人学生的需求。",
                "context": "education",
                "source": "stage4_2026_context"
            },
            {
                "en": "Every individual has the right to control their personal data.",
                "cn": "每个人都有权控制自己的个人数据。",
                "context": "privacy",
                "source": "stage4_2026_context"
            }
        ]
    },
    {
        "word": "influence",
        "pos": "n.",
        "cn": "影响，影响力；感化",
        "examples": [
            {
                "en": "Social media influencers have significant influence on youth consumer choices.",
                "cn": "社交媒体影响者对年轻人的消费选择有重大影响。",
                "context": "marketing",
                "source": "stage4_2026_context"
            },
            {
                "en": "Cultural exchange programs influence global understanding.",
                "cn": "文化交流项目影响全球理解。",
                "context": "culture",
                "source": "stage4_2026_context"
            }
        ]
    },
    {
        "word": "inform",
        "pos": "v.",
        "cn": "通知，告知；报告",
        "examples": [
            {
                "en": "Apps should inform users about data collection practices transparently.",
                "cn": "应用程序应该透明地向用户告知数据收集做法。",
                "context": "privacy",
                "source": "stage4_2026_context"
            },
            {
                "en": "Please inform me if the meeting schedule changes.",
                "cn": "如果会议时间表有变化，请通知我。",
                "context": "workplace",
                "source": "stage4_2026_context"
            }
        ]
    },
    {
        "word": "information",
        "pos": "n.",
        "cn": "信息，消息；通知",
        "examples": [
            {
                "en": "Finding accurate health information online requires checking reliable sources.",
                "cn": "在线查找准确的健康信息需要核实可靠来源。",
                "context": "health",
                "source": "stage4_2026_context"
            },
            {
                "en": "Too much information can lead to decision fatigue.",
                "cn": "信息过多会导致决策疲劳。",
                "context": "psychology",
                "source": "stage4_2026_context"
            }
        ]
    },
    {
        "word": "innovate",
        "pos": "v.",
        "cn": "创新，革新",
        "examples": [
            {
                "en": "Tech startups continuously innovate to stay competitive in the market.",
                "cn": "科技初创公司不断创新以在市场上保持竞争力。",
                "context": "business",
                "source": "stage4_2026_context"
            },
            {
                "en": "Educational institutions must innovate to meet modern learning needs.",
                "cn": "教育机构必须创新以满足现代学习需求。",
                "context": "education",
                "source": "stage4_2026_context"
            }
        ]
    }
]

def load_master_pool():
    """加载 master_words_pool.json"""
    pool_path = 'src/assets/data/master_words_pool.json'
    with open(pool_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_master_pool(data):
    """保存 master_words_pool.json"""
    # 先备份
    pool_path = 'src/assets/data/master_words_pool.json'
    backup_path = f'src/assets/data/master_words_pool_backup_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'

    with open(backup_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    # 保存新版本
    with open(pool_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    return backup_path

def update_word_examples(word_data, new_examples):
    """更新单词的例句，保留原有内容"""
    updated = False

    # 查找匹配的词性定义
    for definition in word_data.get('definitions', []):
        # 检查是否有例句，如果没有则添加
        if not definition.get('examples'):
            definition['examples'] = []

        # 添加新例句（避免重复）
        for new_ex in new_examples:
            exists = any(
                ex.get('sentence_en', '') == new_ex['en']
                for ex in definition['examples']
            )
            if not exists:
                definition['examples'].append({
                    'sentence_en': new_ex['en'],
                    'sentence_cn': new_ex['cn'],
                    'source': new_ex.get('source', 'stage4_2026_context'),
                    'context': new_ex.get('context', 'general'),
                    'grade_level': '',
                    'lexile_score': ''
                })
                updated = True

    return updated

def patch_i_words():
    """主函数：更新I开头单词"""
    print("[START] Updating I core words...")

    # 加载数据
    data = load_master_pool()

    stats = {
        'total_processed': 0,
        'updated': 0,
        'added_examples': 0,
        'words_updated': []
    }

    # 遍历单词库
    for word_entry in data['words']:
        word = word_entry.get('word', '').lower()

        # 检查是否在目标列表中
        target = next((item for item in I_CORE_WORDS if item['word'] == word), None)

        if target:
            stats['total_processed'] += 1

            # 更新例句
            if update_word_examples(word_entry, target['examples']):
                stats['updated'] += 1
                stats['added_examples'] += len(target['examples'])
                stats['words_updated'].append(word)

    # 更新元数据
    data['meta']['last_updated'] = datetime.now().isoformat()
    if 'stage4_patches' not in data['meta']:
        data['meta']['stage4_patches'] = []

    data['meta']['stage4_patches'].append({
        'date': datetime.now().isoformat(),
        'target_letter': 'I',
        'words_processed': stats['total_processed'],
        'words_updated': stats['updated'],
        'examples_added': stats['added_examples']
    })

    # 保存
    backup_path = save_master_pool(data)

    # 输出统计
    print(f"\n[COMPLETE] Update finished!")
    print(f"[STATS]")
    print(f"  - Words processed: {stats['total_processed']}")
    print(f"  - Words updated: {stats['updated']}")
    print(f"  - Examples added: {stats['added_examples']}")
    print(f"  - Backup: {backup_path}")
    print(f"\n[UPDATED WORDS]")
    for w in stats['words_updated']:
        print(f"  + {w}")

    # 保存报告
    report = {
        'timestamp': datetime.now().isoformat(),
        'letter': 'I',
        'stats': stats,
        'words_updated': stats['words_updated']
    }

    report_path = 'src/assets/reports/stage4_patch_I_report.json'
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    print(f"\n[REPORT] Saved: {report_path}")

if __name__ == '__main__':
    patch_i_words()
