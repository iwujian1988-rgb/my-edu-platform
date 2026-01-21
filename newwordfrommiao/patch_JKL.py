#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Stage 4: 词组与例句 AI 增强 - JKL 核心词汇补全
为 master_words_pool.json 中 J, K, L 开头的核心 CET4 单词添加 2026 语境例句
"""

import json
import os
from datetime import datetime
import glob

JKL_CORE_WORDS = [
    # J - 12 words
    {
        "word": "job",
        "pos": "n.",
        "cn": "工作，职业；职责",
        "examples": [
            {
                "en": "Remote job opportunities have expanded significantly since 2020.",
                "cn": "自2020年以来，远程工作机会显著扩大。",
                "context": "workplace",
                "source": "stage4_jkl_2026"
            },
            {
                "en": "AI tools are changing how we search for and apply to jobs.",
                "cn": "AI工具正在改变我们搜索和申请工作的方式。",
                "context": "technology",
                "source": "stage4_jkl_2026"
            }
        ]
    },
    {
        "word": "join",
        "pos": "v.",
        "cn": "参加，加入；连接",
        "examples": [
            {
                "en": "You can join online communities to learn new skills together.",
                "cn": "你可以加入在线社区一起学习新技能。",
                "context": "learning",
                "source": "stage4_jkl_2026"
            },
            {
                "en": "Click the link to join the virtual meeting room.",
                "cn": "点击链接加入虚拟会议室。",
                "context": "remote_work",
                "source": "stage4_jkl_2026"
            }
        ]
    },
    {
        "word": "judge",
        "pos": "v.",
        "cn": "判断，审判；评价",
        "examples": [
            {
                "en": "Don't judge people based solely on their social media profiles.",
                "cn": "不要仅仅根据社交媒体资料来评价他人。",
                "context": "social_media",
                "source": "stage4_jkl_2026"
            },
            {
                "en": "AI systems should not judge people without human oversight.",
                "cn": "AI系统不应在没有人类监督的情况下评判他人。",
                "context": "ai_ethics",
                "source": "stage4_jkl_2026"
            }
        ]
    },
    {
        "word": "journey",
        "pos": "n.",
        "cn": "旅行，旅程；过程",
        "examples": [
            {
                "en": "Language learning is a journey that requires patience and practice.",
                "cn": "语言学习是一个需要耐心和练习的旅程。",
                "context": "education",
                "source": "stage4_jkl_2026"
            },
            {
                "en": "Your career journey may include multiple career changes.",
                "cn": "你的职业生涯可能包括多次职业变动。",
                "context": "career",
                "source": "stage4_jkl_2026"
            }
        ]
    },
    {
        "word": "joy",
        "pos": "n.",
        "cn": "欢乐，高兴；乐趣",
        "examples": [
            {
                "en": "Finding joy in small moments helps maintain mental health.",
                "cn": "在小时刻中找到乐趣有助于保持心理健康。",
                "context": "wellness",
                "source": "stage4_jkl_2026"
            },
            {
                "en": "Digital detox can bring joy back to real-life interactions.",
                "cn": "数字排毒可以让现实互动重新带来快乐。",
                "context": "lifestyle",
                "source": "stage4_jkl_2026"
            }
        ]
    },
    {
        "word": "journal",
        "pos": "n.",
        "cn": "日报，杂志；期刊",
        "examples": [
            {
                "en": "The scientific journal published research on climate change solutions.",
                "cn": "这本科学期刊发表了关于气候变化解决方案的研究。",
                "context": "science",
                "source": "stage4_jkl_2026"
            },
            {
                "en": "Many people keep digital journals to track their personal growth.",
                "cn": "许多人保留数字日记来追踪个人成长。",
                "context": "technology",
                "source": "stage4_jkl_2026"
            }
        ]
    },
    {
        "word": "justice",
        "pos": "n.",
        "cn": "正义，公正；司法",
        "examples": [
            {
                "en": "Digital justice ensures equal access to online resources for everyone.",
                "cn": "数字正义确保每个人都能平等访问在线资源。",
                "context": "digital_rights",
                "source": "stage4_jkl_2026"
            },
            {
                "en": "Social media platforms must address algorithmic justice issues.",
                "cn": "社交媒体平台必须解决算法正义问题。",
                "context": "tech_ethics",
                "source": "stage4_jkl_2026"
            }
        ]
    },
    {
        "word": "justify",
        "pos": "v.",
        "cn": "证明...是正当的；辩护",
        "examples": [
            {
                "en": "You need to justify your budget proposal with data and evidence.",
                "cn": "你需要用数据和证据来为你的预算提案辩护。",
                "context": "business",
                "source": "stage4_jkl_2026"
            },
            {
                "en": "Companies must justify data collection practices to users transparently.",
                "cn": "公司必须向用户透明地证明数据收集做法的合理性。",
                "context": "privacy",
                "source": "stage4_jkl_2026"
            }
        ]
    },
    {
        "word": "jacket",
        "pos": "n.",
        "cn": "短上衣，夹克",
        "examples": [
            {
                "en": "Smart jackets with built-in sensors can track your health metrics.",
                "cn": "带有内置传感器的智能夹克可以追踪你的健康指标。",
                "context": "wearable_tech",
                "source": "stage4_jkl_2026"
            },
            {
                "en": "Online shopping makes it easy to find jackets in sustainable materials.",
                "cn": "在线购物使得寻找可持续材料的夹克变得容易。",
                "context": "ecommerce",
                "source": "stage4_jkl_2026"
            }
        ]
    },
    {
        "word": "jail",
        "pos": "n.",
        "cn": "监狱，监禁",
        "examples": [
            {
                "en": "Cybercriminals can face jail time for data theft and hacking.",
                "cn": "网络犯罪分子可能因数据盗窃和黑客攻击面临监禁。",
                "context": "cybersecurity",
                "source": "stage4_jkl_2026"
            },
            {
                "en": "Digital forensics helps track down criminals who commit online fraud.",
                "cn": "数字取证有助于追踪犯下网络诈骗的罪犯。",
                "context": "technology",
                "source": "stage4_jkl_2026"
            }
        ]
    },
    {
        "word": "jealous",
        "pos": "adj.",
        "cn": "嫉妒的；猜疑的",
        "examples": [
            {
                "en": "Don't feel jealous of others' highlight reels on social media.",
                "cn": "不要嫉妒别人在社交媒体上的精彩集锦。",
                "context": "social_media",
                "source": "stage4_jkl_2026"
            },
            {
                "en": "Companies are jealous of their trade secrets and intellectual property.",
                "cn": "公司对商业秘密和知识产权高度保护。",
                "context": "business",
                "source": "stage4_jkl_2026"
            }
        ]
    },
    {
        "word": "jungle",
        "pos": "n.",
        "cn": "丛林，密林",
        "examples": [
            {
                "en": "The data jungle requires powerful tools to find valuable insights.",
                "cn": "数据丛林需要强大的工具来找到有价值的见解。",
                "context": "data_science",
                "source": "stage4_jkl_2026"
            },
            {
                "en": "Urban jungles need more green spaces for better air quality.",
                "cn": "城市丛林需要更多绿色空间来改善空气质量。",
                "context": "environment",
                "source": "stage4_jkl_2026"
            }
        ]
    },

    # K - 10 words
    {
        "word": "keep",
        "pos": "v.",
        "cn": "保持，保留；遵守",
        "examples": [
            {
                "en": "Keep your software updated to protect against security threats.",
                "cn": "保持软件更新以防范安全威胁。",
                "context": "cybersecurity",
                "source": "stage4_jkl_2026"
            },
            {
                "en": "You should keep backup copies of important files in the cloud.",
                "cn": "你应该在云端保留重要文件的备份副本。",
                "context": "data_safety",
                "source": "stage4_jkl_2026"
            }
        ]
    },
    {
        "word": "kick",
        "pos": "v.",
        "cn": "踢；踢开；（口）兴奋",
        "examples": [
            {
                "en": "The startup event helped kick off their product launch successfully.",
                "cn": "创业活动成功开启了他们的产品发布。",
                "context": "business",
                "source": "stage4_jkl_2026"
            },
            {
                "en": "Video games kick you out if your internet connection is unstable.",
                "cn": "如果网络连接不稳定，视频游戏会把你踢出去。",
                "context": "gaming",
                "source": "stage4_jkl_2026"
            }
        ]
    },
    {
        "word": "kill",
        "pos": "v.",
        "cn": "杀死，扼杀；消磨（时间）",
        "examples": [
            {
                "en": "Multitasking can kill your productivity and focus.",
                "cn": "多任务处理可能会扼杀你的生产力和专注力。",
                "context": "productivity",
                "source": "stage4_jkl_2026"
            },
            {
                "en": "Antivirus software helps kill malware before it damages your system.",
                "cn": "杀毒软件有助于在恶意软件破坏系统之前将其清除。",
                "context": "cybersecurity",
                "source": "stage4_jkl_2026"
            }
        ]
    },
    {
        "word": "kind",
        "pos": "adj.",
        "cn": "友好的，和蔼的；种类",
        "examples": [
            {
                "en": "Online communities should be kind and respectful to all members.",
                "cn": "在线社区应该对所有成员友善和尊重。",
                "context": "digital_citizenship",
                "source": "stage4_jkl_2026"
            },
            {
                "en": "Different kinds of learners benefit from personalized education platforms.",
                "cn": "不同类型的学习者从个性化教育平台中受益。",
                "context": "edtech",
                "source": "stage4_jkl_2026"
            }
        ]
    },
    {
        "word": "king",
        "pos": "n.",
        "cn": "国王，君主；（某领域）巨头",
        "examples": [
            {
                "en": "Content is king in digital marketing strategies.",
                "cn": "在数字营销策略中，内容为王。",
                "context": "marketing",
                "source": "stage4_jkl_2026"
            },
            {
                "en": "Tech giants are the kings of the modern economy.",
                "cn": "科技巨头是现代经济的王者。",
                "context": "business",
                "source": "stage4_jkl_2026"
            }
        ]
    },
    {
        "word": "key",
        "pos": "n.",
        "cn": "钥匙；关键；答案",
        "examples": [
            {
                "en": "Encryption keys protect your sensitive information online.",
                "cn": "加密密钥保护你的在线敏感信息。",
                "context": "cybersecurity",
                "source": "stage4_jkl_2026"
            },
            {
                "en": "Time management is key to successful remote work.",
                "cn": "时间管理是成功远程工作的关键。",
                "context": "productivity",
                "source": "stage4_jkl_2026"
            }
        ]
    },
    {
        "word": "know",
        "pos": "v.",
        "cn": "知道，了解；认识",
        "examples": [
            {
                "en": "You need to know how to spot fake news and misinformation.",
                "cn": "你需要知道如何识别假新闻和错误信息。",
                "context": "media_literacy",
                "source": "stage4_jkl_2026"
            },
            {
                "en": "Knowing your digital rights helps protect your privacy online.",
                "cn": "了解你的数字权利有助于保护在线隐私。",
                "context": "privacy",
                "source": "stage4_jkl_2026"
            }
        ]
    },
    {
        "word": "knowledge",
        "pos": "n.",
        "cn": "知识，学问；了解",
        "examples": [
            {
                "en": "Online courses make knowledge accessible to people worldwide.",
                "cn": "在线课程使全球人民都能获得知识。",
                "context": "education",
                "source": "stage4_jkl_2026"
            },
            {
                "en": "Data literacy is essential knowledge in the information age.",
                "cn": "数据素养是信息时代的必备知识。",
                "context": "skills",
                "source": "stage4_jkl_2026"
            }
        ]
    },
    {
        "word": "kitchen",
        "pos": "n.",
        "cn": "厨房，灶间",
        "examples": [
            {
                "en": "Smart kitchens use IoT devices to automate cooking tasks.",
                "cn": "智能厨房使用物联网设备自动化烹饪任务。",
                "context": "smart_home",
                "source": "stage4_jkl_2026"
            },
            {
                "en": "Recipe apps help you plan meals based on what's in your kitchen.",
                "cn": "食谱应用根据你厨房里的食材帮你规划膳食。",
                "context": "technology",
                "source": "stage4_jkl_2026"
            }
        ]
    },
    {
        "word": "keyboard",
        "pos": "n.",
        "cn": "键盘",
        "examples": [
            {
                "en": "Ergonomic keyboards reduce strain during long work sessions.",
                "cn": "人体工程学键盘减少长时间工作时的压力。",
                "context": "workplace",
                "source": "stage4_jkl_2026"
            },
            {
                "en": "Virtual keyboards appear on mobile devices for text input.",
                "cn": "虚拟键盘出现在移动设备上用于文本输入。",
                "context": "technology",
                "source": "stage4_jkl_2026"
            }
        ]
    },

    # L - 18 words
    {
        "word": "learn",
        "pos": "v.",
        "cn": "学习，得知；认识到",
        "examples": [
            {
                "en": "Continuous learning is essential in our rapidly changing world.",
                "cn": "在我们快速变化的世界中，持续学习至关重要。",
                "context": "education",
                "source": "stage4_jkl_2026"
            },
            {
                "en": "AI-powered platforms personalize how students learn new subjects.",
                "cn": "AI驱动的平台个性化学生学习新学科的方式。",
                "context": "edtech",
                "source": "stage4_jkl_2026"
            }
        ]
    },
    {
        "word": "leave",
        "pos": "v.",
        "cn": "离开，出发；留下",
        "examples": [
            {
                "en": "Flexible work policies let employees leave early when needed.",
                "cn": "灵活的工作政策允许员工在需要时提前离开。",
                "context": "workplace",
                "source": "stage4_jkl_2026"
            },
            {
                "en": "Don't leave your devices unattended in public places.",
                "cn": "不要在公共场所让设备无人看管。",
                "context": "security",
                "source": "stage4_jkl_2026"
            }
        ]
    },
    {
        "word": "let",
        "pos": "v.",
        "cn": "让，允许；出租",
        "examples": [
            {
                "en": "Let AI assistants handle repetitive tasks to save time.",
                "cn": "让AI助手处理重复性任务以节省时间。",
                "context": "productivity",
                "source": "stage4_jkl_2026"
            },
            {
                "en": "Don't let apps access your camera without good reason.",
                "cn": "不要在没有充分理由的情况下让应用访问你的相机。",
                "context": "privacy",
                "source": "stage4_jkl_2026"
            }
        ]
    },
    {
        "word": "lie",
        "pos": "v.",
        "cn": "说谎；躺；位于",
        "examples": [
            {
                "en": "Deepfake technology makes it harder to detect lies in videos.",
                "cn": "深度伪造技术使检测视频中的谎言变得更困难。",
                "context": "technology",
                "source": "stage4_jkl_2026"
            },
            {
                "en": "Always verify information before sharing—don't lie or spread misinformation.",
                "cn": "在分享之前始终验证信息——不要撒谎或传播错误信息。",
                "context": "media_literacy",
                "source": "stage4_jkl_2026"
            }
        ]
    },
    {
        "word": "like",
        "pos": "v.",
        "cn": "喜欢；想要",
        "examples": [
            {
                "en": "Social media algorithms show content you're likely to like.",
                "cn": "社交媒体算法显示你可能喜欢的内容。",
                "context": "social_media",
                "source": "stage4_jkl_2026"
            },
            {
                "en": "Users like personalized recommendations on streaming platforms.",
                "cn": "用户喜欢流媒体平台上的个性化推荐。",
                "context": "technology",
                "source": "stage4_jkl_2026"
            }
        ]
    },
    {
        "word": "listen",
        "pos": "v.",
        "cn": "听，倾听；听从",
        "examples": [
            {
                "en": "Podcasts let you listen to educational content during commutes.",
                "cn": "播客让你在通勤时收听教育内容。",
                "context": "learning",
                "source": "stage4_jkl_2026"
            },
            {
                "en": "Voice assistants listen for your commands to help with daily tasks.",
                "cn": "语音助手监听你的命令以帮助完成日常任务。",
                "context": "technology",
                "source": "stage4_jkl_2026"
            }
        ]
    },
    {
        "word": "live",
        "pos": "v.",
        "cn": "居住；生活；生存",
        "examples": [
            {
                "en": "More people choose to live in smaller cities with remote work options.",
                "cn": "有了远程工作选择，更多人选择住在较小的城市。",
                "context": "lifestyle",
                "source": "stage4_jkl_2026"
            },
            {
                "en": "Live streaming has become a popular way to share content online.",
                "cn": "直播已成为在线分享内容的流行方式。",
                "context": "social_media",
                "source": "stage4_jkl_2026"
            }
        ]
    },
    {
        "word": "look",
        "pos": "v.",
        "cn": "看，观看；寻找",
        "examples": [
            {
                "en": "Look for verified badges before trusting information sources online.",
                "cn": "在信任在线信息源之前，寻找验证徽章。",
                "context": "media_literacy",
                "source": "stage4_jkl_2026"
            },
            {
                "en": "Smart glasses can look up information in real-time.",
                "cn": "智能眼镜可以实时查找信息。",
                "context": "wearable_tech",
                "source": "stage4_jkl_2026"
            }
        ]
    },
    {
        "word": "love",
        "pos": "v.",
        "cn": "爱，热爱；喜爱",
        "examples": [
            {
                "en": "Users love apps that are intuitive and easy to use.",
                "cn": "用户喜欢直观且易于使用的应用。",
                "context": "ux_design",
                "source": "stage4_jkl_2026"
            },
            {
                "en": "Finding work you love improves overall life satisfaction.",
                "cn": "找到你喜欢的工作可以提高整体生活满意度。",
                "context": "career",
                "source": "stage4_jkl_2026"
            }
        ]
    },
    {
        "word": "lead",
        "pos": "v.",
        "cn": "领导，引导；领先",
        "examples": [
            {
                "en": "Digital transformation projects require strong leadership to succeed.",
                "cn": "数字化转型项目需要强有力的领导才能成功。",
                "context": "business",
                "source": "stage4_jkl_2026"
            },
            {
                "en": "AI can lead doctors to earlier disease detection.",
                "cn": "AI可以引导医生更早发现疾病。",
                "context": "healthcare",
                "source": "stage4_jkl_2026"
            }
        ]
    },
    {
        "word": "land",
        "pos": "v.",
        "cn": "着陆，登陆；获得",
        "examples": [
            {
                "en": "The new Mars lander successfully landed on the red planet.",
                "cn": "新的火星着陆器成功降落在红色星球上。",
                "context": "space",
                "source": "stage4_jkl_2026"
            },
            {
                "en": "Graduates hope to land their dream jobs in competitive industries.",
                "cn": "毕业生希望在竞争激烈的行业中获得理想的工作。",
                "context": "career",
                "source": "stage4_jkl_2026"
            }
        ]
    },
    {
        "word": "law",
        "pos": "n.",
        "cn": "法律，法规；法则",
        "examples": [
            {
                "en": "Data protection laws regulate how companies handle personal information.",
                "cn": "数据保护法律规范公司如何处理个人信息。",
                "context": "privacy",
                "source": "stage4_jkl_2026"
            },
            {
                "en": "International laws address cybercrime across borders.",
                "cn": "国际法律解决跨境网络犯罪问题。",
                "context": "legal",
                "source": "stage4_jkl_2026"
            }
        ]
    },
    {
        "word": "lay",
        "pos": "v.",
        "cn": "放置，铺设；产（蛋）",
        "examples": [
            {
                "en": "Engineers lay fiber optic cables to improve internet speeds.",
                "cn": "工程师铺设光纤电缆以提高网速。",
                "context": "infrastructure",
                "source": "stage4_jkl_2026"
            },
            {
                "en": "Teams lay the foundation for successful project delivery.",
                "cn": "团队为成功的项目交付奠定基础。",
                "context": "management",
                "source": "stage4_jkl_2026"
            }
        ]
    },
    {
        "word": "life",
        "pos": "n.",
        "cn": "生命，生活；人生",
        "examples": [
            {
                "en": "Work-life balance is crucial for mental health in the digital age.",
                "cn": "在数字时代，工作与生活的平衡对心理健康至关重要。",
                "context": "wellness",
                "source": "stage4_jkl_2026"
            },
            {
                "en": "Digital banking simplifies many aspects of financial life.",
                "cn": "数字银行简化了金融生活的许多方面。",
                "context": "fintech",
                "source": "stage4_jkl_2026"
            }
        ]
    },
    {
        "word": "light",
        "pos": "n.",
        "cn": "光，光线；灯",
        "examples": [
            {
                "en": "Smart lighting systems adjust based on your daily routines.",
                "cn": "智能照明系统根据你的日常习惯进行调整。",
                "context": "smart_home",
                "source": "stage4_jkl_2026"
            },
            {
                "en": "Blue light from screens can affect sleep quality at night.",
                "cn": "屏幕的蓝光可能会影响夜间睡眠质量。",
                "context": "health",
                "source": "stage4_jkl_2026"
            }
        ]
    },
    {
        "word": "line",
        "pos": "n.",
        "cn": "线，线路；行",
        "examples": [
            {
                "en": "High-speed internet lines enable seamless video conferencing.",
                "cn": "高速互联网线路实现无缝视频会议。",
                "context": "connectivity",
                "source": "stage4_jkl_2026"
            },
            {
                "en": "Production lines use robots to improve manufacturing efficiency.",
                "cn": "生产线使用机器人提高制造效率。",
                "context": "automation",
                "source": "stage4_jkl_2026"
            }
        ]
    },
    {
        "word": "list",
        "pos": "n.",
        "cn": "列表，清单；目录",
        "examples": [
            {
                "en": "Task management apps help you create and prioritize daily to-do lists.",
                "cn": "任务管理应用帮助你创建和确定每日待办事项清单的优先级。",
                "context": "productivity",
                "source": "stage4_jkl_2026"
            },
            {
                "en": "Playlist algorithms recommend songs based on your listening history.",
                "cn": "播放列表算法根据你的收听历史推荐歌曲。",
                "context": "streaming",
                "source": "stage4_jkl_2026"
            }
        ]
    },
    {
        "word": "level",
        "pos": "n.",
        "cn": "水平，等级；层次",
        "examples": [
            {
                "en": "Skill level assessment helps personalize learning experiences.",
                "cn": "技能水平评估有助于个性化学习体验。",
                "context": "education",
                "source": "stage4_jkl_2026"
            },
            {
                "en": "Next-level gaming requires powerful hardware and fast internet.",
                "cn": "更高水平的游戏需要强大的硬件和快速的互联网。",
                "context": "gaming",
                "source": "stage4_jkl_2026"
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
    pool_path = 'src/assets/data/master_words_pool.json'
    with open(pool_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return pool_path

def update_word_examples(word_data, new_examples):
    """更新单词的例句，保留原有内容"""
    updated = False

    for definition in word_data.get('definitions', []):
        if not definition.get('examples'):
            definition['examples'] = []

        for new_ex in new_examples:
            exists = any(
                ex.get('sentence_en', '') == new_ex['en']
                for ex in definition['examples']
            )
            if not exists:
                definition['examples'].append({
                    'sentence_en': new_ex['en'],
                    'sentence_cn': new_ex['cn'],
                    'source': new_ex.get('source', 'stage4_jkl_2026'),
                    'context': new_ex.get('context', 'general'),
                    'grade_level': '',
                    'lexile_score': ''
                })
                updated = True

    return updated

def cleanup_old_backups():
    """删除旧的临时备份文件"""
    backup_files = glob.glob('src/assets/data/master_words_pool_backup_*.json')
    # 保留最新的2个备份，删除其他的
    backup_files.sort(reverse=True)
    deleted_count = 0
    for old_backup in backup_files[2:]:
        try:
            os.remove(old_backup)
            deleted_count += 1
        except Exception as e:
            pass
    return deleted_count

def patch_jkl_words():
    """主函数：更新JKL开头单词"""
    print("[START] JKL Core Words Patch...")

    data = load_master_pool()

    stats = {
        'total_processed': 0,
        'updated': 0,
        'added_examples': 0,
        'words_updated': []
    }

    for word_entry in data['words']:
        word = word_entry.get('word', '').lower()
        target = next((item for item in JKL_CORE_WORDS if item['word'] == word), None)

        if target:
            stats['total_processed'] += 1
            if update_word_examples(word_entry, target['examples']):
                stats['updated'] += 1
                stats['added_examples'] += len(target['examples'])
                stats['words_updated'].append(word)

    data['meta']['last_updated'] = datetime.now().isoformat()
    if 'stage4_patches' not in data['meta']:
        data['meta']['stage4_patches'] = []

    data['meta']['stage4_patches'].append({
        'date': datetime.now().isoformat(),
        'target_letters': ['J', 'K', 'L'],
        'words_processed': stats['total_processed'],
        'words_updated': stats['updated'],
        'examples_added': stats['added_examples']
    })

    save_master_pool(data)

    # 清理旧备份
    deleted = cleanup_old_backups()

    print(f"\n[COMPLETE] JKL Patch Finished!")
    print(f"[STATS]")
    print(f"  - Words processed: {stats['total_processed']}")
    print(f"  - Words updated: {stats['updated']}")
    print(f"  - Examples added: {stats['added_examples']}")
    print(f"  - Old backups deleted: {deleted}")
    print(f"\n[UPDATED WORDS]")
    print(f"  J: {[w for w in stats['words_updated'] if w.startswith('j')]}")
    print(f"  K: {[w for w in stats['words_updated'] if w.startswith('k')]}")
    print(f"  L: {[w for w in stats['words_updated'] if w.startswith('l')]}")

    report = {
        'timestamp': datetime.now().isoformat(),
        'letters': ['J', 'K', 'L'],
        'stats': stats,
        'words_updated': stats['words_updated']
    }

    report_path = 'src/assets/reports/stage4_patch_JKL_report.json'
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    print(f"\n[REPORT] Saved: {report_path}")
    return stats

if __name__ == '__main__':
    patch_jkl_words()
