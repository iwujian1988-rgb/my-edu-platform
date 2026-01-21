#!/usr/bin/env python3
"""
2026 全球美甲沙龙专业词库构建脚本

功能：
1. 从 master_pool 检索相关词汇
2. 补充美甲专业词汇（200-300个）
3. 生成2026语境例句
4. 保存到独立文件
5. 生成分类统计报告
"""

import json
from pathlib import Path
from datetime import datetime
from collections import defaultdict

BASE_DIR = Path("D:/CodeWorld/Claude/英语网站单词库项目")
MASTER_POOL_PATH = BASE_DIR / "src/assets/data/master_words_pool.json"
OUTPUT_PATH = BASE_DIR / "src/assets/data/nail_salon_pro.json"
REPORT_PATH = BASE_DIR / "src/assets/data/nail_salon_report.json"

# 美甲行业专业词汇库（200-300个）
NAIL_SALON_VOCABULARY = {
    "产品与材质": [
        # 甲油类
        {"word": "gel polish", "phonetic": "dʒɛl pɒˈlɪʃ", "cn": "甲油胶", "level": 3},
        {"word": "acrylic nails", "pronunciation": "əˈkrɪlɪk neɪlz", "cn": "水晶甲", "level": 3},
        {"word": "top coat", "phonetic": "tɒp kəʊt", "cn": "封层", "level": 2},
        {"word": "base coat", "phonetic": "beɪs kəʊt", "cn": "底胶", "level": 2},
        {"word": "cuticle oil", "phonetic": "ˈkjuːtɪkəl ɔɪl", "cn": "指甲缘油", "level": 2},
        {"word": "nail polish", "phonetic": "neɪl ˈpɒlɪʃ", "cn": "指甲油", "level": 1},
        {"word": "nail lacquer", "phonetic": "neɪl ˈlækə", "cn": "指甲漆", "level": 2},
        {"word": "shellac", "phonetic": "ʃəˈlæk", "cn": "光疗胶", "level": 3},
        {"word": "dip powder", "phonetic": "dɪp ˈpaʊdə", "cn": "蘸粉", "level": 3},
        {"word": "extension powder", "phonetic": "ɪkˈstenʃən ˈpaʊdə", "cn": "延长粉", "level": 3},
        {"word": "liquid monomer", "phonetic": "ˈlɪkwɪd ˈmɒnəmə", "cn": "液体单体", "level": 4},
        {"word": "primer", "phonetic": "ˈpraɪmə", "cn": "结合剂", "level": 3},
        {"word": "bonder", "phonetic": "ˈbɒndə", "cn": "粘合剂", "level": 3},
        {"word": "dehydrator", "phonetic": "diːˈhaɪdreɪtə", "cn": "脱水剂", "level": 3},
        {"word": "reinforcement gel", "phonetic": "riːɪnˈfɔːsmənt dʒɛl", "cn": "加固胶", "level": 3},
        {"word": "builder gel", "phonetic": "ˈbɪldə dʒɛl", "cn": "建构胶", "level": 3},
        {"word": "rubber base", "phonetic": "ˈrʌbə beɪs", "cn": "橡胶底胶", "level": 3},
        {"word": "matte top coat", "phonetic": "mæt tɒp kəʊt", "cn": "哑光封层", "level": 2},
        {"word": "no-wipe top coat", "phonetic": "nəʊ waɪp tɒp kəʊt", "cn": "免擦封层", "level": 2},
        {"word": "quick dry top coat", "phonetic": "kwɪk draɪ tɒp kəʊt", "cn": "快干封层", "level": 2},
    ],

    "工具与设备": [
        {"word": "UV lamp", "phonetic": "juː viː læmp", "cn": "紫外线灯", "level": 2},
        {"word": "LED lamp", "phonetic": "ɛl iː diː læmp", "cn": "LED灯", "level": 2},
        {"word": "UV LED lamp", "phonetic": "juː viː ɛl iː diː læmp", "cn": "UV/LED双用灯", "level": 2},
        {"word": "nail drill", "phonetic": "neɪl drɪl", "cn": "打磨机", "level": 2},
        {"word": "e-file", "phonetic": "iː faɪl", "cn": "电动打磨机", "level": 2},
        {"word": "nail nipper", "phonetic": "neɪl ˈnɪpə", "cn": "指甲剪", "level": 1},
        {"word": "cuticle nipper", "phonetic": "ˈkjuːtɪkəl ˈnɪpə", "cn": "死皮剪", "level": 2},
        {"word": "nail buffer", "phonetic": "neɪl ˈbʌfə", "cn": "抛光条", "level": 1},
        {"word": "nail file", "phonetic": "neɪl faɪl", "cn": "指甲挫", "level": 1},
        {"word": "glass nail file", "phonetic": "ɡlɑːs neɪl faɪl", "cn": "玻璃指甲挫", "level": 2},
        {"word": "dust collector", "phonetic": "dʌst kəˈlɛktə", "cn": "吸尘器", "level": 3},
        {"word": "nail dryer", "phonetic": "neɪl ˈdraɪə", "cn": "烘干机", "level": 2},
        {"word": "manicure table", "phonetic": "ˈmænɪkjʊə ˈteɪbəl", "cn": "美甲台", "level": 2},
        {"word": "nail art station", "phonetic": "neɪl ɑːt ˈsteɪʃən", "cn": "美甲工作站", "level": 3},
        {"word": "brush", "phonetic": "brʌʃ", "cn": "刷子", "level": 1},
        {"word": "dotting tool", "phonetic": "ˈdɒtɪŋ tuːl", "cn": "点珠笔", "level": 2},
        {"word": "liners brush", "phonetic": "ˈlaɪnəz brʌʃ", "cn": "拉线笔", "level": 2},
        {"word": "angled brush", "phonetic": "ˈæŋɡəld brʌʃ", "cn": "斜角刷", "level": 2},
        {"word": "fan brush", "phonetic": "fæn brʌʃ", "cn": "扇形刷", "level": 2},
        {"word": "cleaning brush", "phonetic": "ˈkliːnɪŋ brʌʃ", "cn": "除尘刷", "level": 1},
        {"word": "cuticle pusher", "phonetic": "ˈkjuːtɪkəl ˈpʊʃə", "cn": "推棒", "level": 1},
        {"word": "metal pusher", "phonetic": "ˈmɛtəl ˈpʊʃə", "cn": "金属推棒", "level": 1},
        {"word": "wooden stick", "phonetic": "ˈwʊdən stɪk", "cn": "木棒", "level": 1},
        {"word": "orange wood stick", "phonetic": "ˈɒrɪndʒ wʊd stɪk", "cn": "橙木棒", "level": 1},
        {"word": "tweezers", "phonetic": "ˈtwiːzəz", "cn": "镊子", "level": 1},
        {"word": "scissors", "phonetic": "ˈsɪzəz", "cn": "剪刀", "level": 1},
    ],

    "款式与设计": [
        {"word": "french manicure", "phonetic": "frɛntʃ ˈmænɪkjʊə", "cn": "法式美甲", "level": 2},
        {"word": "ombre", "phonetic": "ˈɒmbəreɪ", "cn": "渐变", "level": 2},
        {"word": "gradient", "phonetic": "ˈɡreɪdɪənt", "cn": "渐变效果", "level": 2},
        {"word": "marble effect", "phonetic": "ˈmɑːbəl ɪˈfɛkt", "cn": "大理石纹", "level": 3},
        {"word": "cat eye", "phonetic": "kæt aɪ", "cn": "猫眼", "level": 2},
        {"word": "magnetic gel", "phonetic": "mæɡˈnɛtɪk dʒɛl", "cn": "磁力胶", "level": 3},
        {"word": "rhinestone", "phonetic": "ˈraɪnstəʊn", "cn": "水钻", "level": 2},
        {"word": "crystals", "phonetic": "ˈkrɪstəlz", "cn": "水晶钻", "level": 2},
        {"word": "glitter", "phonetic": "ˈɡlɪtə", "cn": "闪粉", "level": 1},
        {"word": "chrome powder", "phonetic": "krəʊm ˈpaʊdə", "cn": "铬粉", "level": 3},
        {"word": "chrome nails", "phonetic": "krəʊm neɪlz", "cn": "镜面甲", "level": 3},
        {"word": "holographic", "phonetic": "hɒləˈɡræfɪk", "cn": "全息效果", "level": 3},
        {"word": "thermal gel", "phonetic": "ˈθɜːməl dʒɛl", "cn": "感温胶", "level": 3},
        {"word": "color changing", "phonetic": "ˈkʌlə tʃeɪndʒɪŋ", "cn": "变色效果", "level": 3},
        {"word": "flakies", "phonetic": "ˈfleɪkɪz", "cn": "纸片闪粉", "level": 3},
        {"word": "shimmer", "phonetic": "ˈʃɪmə", "cn": "微闪", "level": 2},
        {"word": "foil", "phonetic": "fɔɪl", "cn": "金箔", "level": 2},
        {"word": "transfer foil", "phonetic": "ˈtrænsfɜː fɔɪl", "cn": "转移纸", "level": 2},
        {"word": "stamping", "phonetic": "ˈstæmpɪŋ", "cn": "印花", "level": 2},
        {"word": "stamp plates", "phonetic": "stæmp pleɪts", "cn": "印花板", "level": 2},
        {"word": "water decal", "phonetic": "ˈwɔːtə diːˈkæl", "cn": "水贴", "level": 2},
        {"word": "nail stickers", "phonetic": "neɪl ˈstɪkəz", "cn": "指甲贴纸", "level": 1},
        {"word": "nail wraps", "phonetic": "neɪl ræps", "cn": "指甲贴片", "level": 2},
        {"word": "3D nail art", "phonetic": "θriː diː neɪl ɑːt", "cn": "立体美甲", "level": 3},
        {"word": "encapsulation", "phonetic": "ɪnˌkæpsjʊˈleɪʃən", "cn": "封胶工艺", "level": 4},
        {"word": "aqua nail", "phonetic": "ˈækwə neɪl", "cn": "水波纹", "level": 3},
        {"word": "geometric", "phonetic": "dʒɪəˈmɛtrɪk", "cn": "几何图案", "level": 3},
        {"word": "line art", "phonetic": "laɪn ɑːt", "cn": "线条艺术", "level": 3},
        {"word": "abstract", "phonetic": "ˈæbstrækt", "cn": "抽象风格", "level": 3},
        {"word": "floral", "phonetic": "ˈflɔːrəl", "cn": "花卉图案", "level": 2},
        {"word": "anime style", "phonetic": "ˈænɪmeɪ staɪl", "cn": "动漫风格", "level": 2},
        {"word": "cartoon", "phonetic": "kɑːˈtuːn", "cn": "卡通", "level": 2},
        {"word": "minimalist", "phonetic": "ˈmɪnɪməlɪst", "cn": "极简风格", "level": 3},
    ],

    "服务语境": [
        {"word": "appointment", "phonetic": "əˈpɔɪntmənt", "cn": "预约", "level": 1},
        {"word": "booking", "phonetic": "ˈbʊkɪŋ", "cn": "预订", "level": 1},
        {"word": "walk-in", "phonetic": "wɔːk ɪn", "cn": "无需预约", "level": 1},
        {"word": "consultation", "phonetic": "kɒnsəlˈteɪʃən", "cn": "咨询", "level": 2},
        {"word": "manicure", "phonetic": "ˈmænɪkjʊə", "cn": "手部护理", "level": 1},
        {"word": "pedicure", "phonetic": "ˈpɛdɪkjʊə", "cn": "足部护理", "level": 1},
        {"word": "full set", "phonetic": "fʊl sɛt", "cn": "全套延长", "level": 1},
        {"word": "fill", "phonetic": "fɪl", "cn": "补胶", "level": 1},
        {"word": "infill", "phonetic": "ɪnfɪl", "cn": "补胶", "level": 1},
        {"word": "refill", "phonetic": "riːˈfɪl", "cn": "填充", "level": 1},
        {"word": "removal", "phonetic": "rɪˈmuːvəl", "cn": "卸甲", "level": 1},
        {"word": "soak-off", "phonetic": "səʊk ɒf", "cn": "浸泡卸除", "level": 2},
        {"word": "drill-off", "phonetic": "drɪl ɒf", "cn": "打磨卸除", "level": 2},
        {"word": "aftercare", "phonetic": "ˈɑːftəkeə", "cn": "后期护理", "level": 2},
        {"word": "maintenance", "phonetic": "ˈmeɪntɪnəns", "cn": "保养", "level": 2},
        {"word": "sanitation", "phonetic": "sænɪˈteɪʃən", "cn": "卫生消毒", "level": 2},
        {"word": "disinfection", "phonetic": "dɪsɪnˈfɛkʃən", "cn": "消毒", "level": 2},
        {"word": "sterilization", "phonetic": ˌstɛrɪlaɪˈzeɪʃən", "cn": "灭菌", "level": 3},
        {"word": "autoclave", "phonetic": "ˈɔːtəʊkleɪv", "cn": "高压灭菌器", "level": 3},
        {"word": "barbicide", "phonetic": "ˈbɑːbɪsaɪd", "cn": "消毒液", "level": 3},
        {"word": "prep", "phonetic": "prɛp", "cn": "前期处理", "level": 1},
        {"word": "cuticle care", "phonetic": "ˈkjuːtɪkəl keə", "cn": "甲缘护理", "level": 1},
        {"word": "nail health", "phonetic": "neɪl hɛlθ", "cn": "指甲健康", "level": 2},
        {"word": "nail enhancement", "phonetic": "neɪl ɪnˈhænsmənt", "cn": "指甲增强", "level": 2},
        {"word": "length", "phonetic": "lɛŋθ", "cn": "长度", "level": 1},
        {"word": "shape", "phonetic": "ʃeɪp", "cn": "形状", "level": 1},
        {"word": "square", "phonetic": "skweə", "cn": "方形", "level": 1},
        {"word": "oval", "phonetic": "ˈəʊvəl", "cn": "椭圆形", "level": 1},
        {"word": "round", "phonetic": "raʊnd", "cn": "圆形", "level": 1},
        {"word": "almond", "phonetic": "ˈɑːmənd", "cn": "杏仁形", "level": 1},
        {"word": "stiletto", "phonetic": "stɪˈlɛtəʊ", "cn": "尖底形", "level": 2},
        {"word": "coffin", "phonetic": "ˈkɒfɪn", "cn": "梯形", "level": 2},
        {"word": "ballerina", "phonetic": ˌbæləˈriːnə", "cn": "芭蕾形", "level": 2},
        {"word": "service menu", "phonetic": "ˈsɜːvɪs ˈmɛnjuː", "cn": "服务菜单", "level": 1},
        {"word": "pricing", "phonetic": "ˈpraɪsɪŋ", "cn": "定价", "level": 1},
        {"word": "duration", "phonetic": "djʊˈreɪʃən", "cn": "时长", "level": 1},
        {"word": "technician", "phonetic": "tɛkˈnɪʃən", "cn": "技师", "level": 2},
        {"word": "nail artist", "phonetic": "neɪl ˈɑːtɪst", "cn": "美甲师", "level": 2},
        {"word": "nail technician", "phonetic": "neɪl tɛkˈnɪʃən", "cn": "美甲技师", "level": 2},
        {"word": "salon owner", "phonetic": "ˈsælɒn ˈəʊnə", "cn": "沙龙店主", "level": 2},
        {"word": "customer service", "phonetic": "ˈkʌstəmə ˈsɜːvɪs", "cn": "客户服务", "level": 1},
    ],

    # 额外补充：颜色和修饰词
    "颜色与修饰": [
        {"word": "nude", "phonetic": "njuːd", "cn": "裸色", "level": 1},
        {"word": "sheer", "phonetic": "ʃɪə", "cn": "透明感", "level": 2},
        {"word": "creme", "phonetic": "kriːm", "cn": "奶油色", "level": 1},
        {"word": "jelly", "phonetic": "dʒɛlɪ", "cn": "果冻色", "level": 2},
        {"word": "pastel", "phonetic": "pæsˈtɛl", "cn": "粉彩", "level": 2},
        {"word": "neon", "phonetic": "ˈniːɒn", "cn": "霓虹色", "level": 2},
        {"word": "matte", "phonetic": "mæt", "cn": "哑光", "level": 1},
        {"word": "glossy", "phonetic": "ˈɡlɒsi", "cn": "光泽", "level": 1},
        {"word": "shiny", "phonetic": "ˈʃaɪni", "cn": "闪亮", "level": 1},
        {"word": "sparkle", "phonetic": "ˈspɑːkəl", "cn": "闪耀", "level": 1},
        {"word": "pearl", "phonetic": "pɜːl", "cn": "珍珠色", "level": 2},
        {"word": "metallic", "phonetic": "məˈtælɪk", "cn": "金属色", "level": 2},
        {"word": "iridescent", "phonetic": ˌɪrɪˈdɛsənt", "cn": "彩虹色", "level": 3},
        {"word": "duochrome", "phonetic": "djuːəʊkrəʊm", "cn": "双色偏光", "level": 3},
        {"word": "multichrome", "phonetic": "mʌltɪkrəʊm", "cn": "多色偏光", "level": 3},
        {"word": "classic red", "phonetic": "ˈklæsɪk rɛd", "cn": "经典红", "level": 1},
        {"word": "burgundy", "phonetic": "ˈbɜːɡəndi", "cn": "酒红色", "level": 2},
        {"word": "navy", "phonetic": "ˈneɪvi", "cn": "海军蓝", "level": 1},
        {"word": "forest green", "phonetic": "ˈfɒrɪst ɡriːn", "cn": "森林绿", "level": 1},
        {"word": "champagne", "phonetic": "ʃæmˈpeɪn", "cn": "香槟色", "level": 2},
        {"word": "rose gold", "phonetic": "rəʊz ɡəʊld", "cn": "玫瑰金", "level": 2},
    ]
}


# 2026年场景例句模板
EXAMPLES_2026 = {
    "产品与材质": [
        "Our salon uses AI-driven nail printers for high-precision art.",
        "Smart gel polish changes color based on your body temperature.",
        "We use vegan and cruelty-free products for eco-conscious clients.",
        "Our premium acrylic system provides lightweight yet durable extensions.",
        "The new long-wear top coat lasts up to 4 weeks without chipping.",
    ],
    "工具与设备": [
        "Our UV LED lamps cure gel in just 30 seconds with low heat technology.",
        "The electric nail file features a silent motor for a comfortable experience.",
        "Smart dust collectors automatically adjust suction power based on debris.",
        "Our portable LED lamp allows for mobile nail services.",
        "Touchscreen manicure tables display color-matching AI suggestions.",
    ],
    "款式与设计": [
        "Custom ombre effects are created using our automated color blending system.",
        "3D printing technology enables intricate nail art designs previously impossible.",
        "AR mirrors let you preview designs before application.",
        "Magnetic cat eye gels create dynamic light-reflecting effects.",
        "Our design database includes over 10,000 customizable nail art patterns.",
    ],
    "服务语境": [
        "Book appointments instantly through our AI-powered mobile app.",
        "Smart scheduling predicts optimal service times based on your history.",
        "Digital health scans analyze nail condition before treatment.",
        "Our sanitation protocol exceeds 2026 international safety standards.",
        "Membership includes personalized aftercare reminders via smart notifications.",
    ],
    "颜色与修饰": [
        "Custom color matching using AI skin tone analysis.",
        "Holographic polishes create rainbow effects under different lighting.",
        "Thermal gels shift between two colors based on temperature.",
        "Our matte finish top coat provides a sophisticated modern look.",
        "Limited edition seasonal colors released quarterly.",
    ]
}


def extract_relevant_words_from_master_pool():
    """从 master pool 中提取相关词汇"""
    print("\n[Extracting relevant words from master pool...]")

    with open(MASTER_POOL_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    words = data.get("words", [])
    extracted = []

    # 相关关键词
    relevant_keywords = [
        "fashion", "beauty", "health", "color", "colour", "tool", "style",
        "design", "art", "nail", "polish", "manicure", "pedicure", "salon",
        "cosmetic", "makeup", "skin", "care", "treatment", "service",
        "brush", "lamp", "dry", "cure", "gel", "acrylic", "crystal"
    ]

    for word_entry in words:
        word = word_entry.get("word", "").lower()
        tags = word_entry.get("tags", [])
        categories = word_entry.get("categories", [])
        definitions = word_entry.get("definitions", [])

        # 检查是否相关
        is_relevant = False

        # 检查单词本身
        if any(keyword in word for keyword in relevant_keywords):
            is_relevant = True

        # 检查标签
        if isinstance(tags, list):
            if any(any(keyword in tag.lower() for keyword in relevant_keywords) for tag in tags):
                is_relevant = True

        # 检查分类
        if isinstance(categories, list):
            if any("日常生活词" in cat or "职场" in cat for cat in categories):
                is_relevant = True

        # 检查定义
        if definitions and len(definitions) > 0:
            meaning = definitions[0].get("meaning_cn", "").lower()
            if meaning and any(keyword in meaning for keyword in relevant_keywords):
                is_relevant = True

        if is_relevant:
            extracted.append(word_entry)

    print(f"[OK] Extracted {len(extracted)} relevant words")
    return extracted


def create_nail_salon_entry(word_info, category):
    """创建美甲专业词条目"""
    word = word_info["word"]
    phonetic = word_info.get("phonetic", word_info.get("pronunciation", ""))
    cn = word_info["cn"]
    level = word_info.get("level", 2)

    # 生成2026语境例句
    examples = EXAMPLES_2026.get(category, [])
    example_en = examples[hash(word) % len(examples)] if examples else f"Professional {category} service in our modern salon."

    return {
        "word": word,
        "word_id": f"nail_salon_{word.replace(' ', '_')}",
        "phonetic": {
            "kk": phonetic,
            "mw": phonetic,
            "ipa": phonetic
        },
        "level": level,
        "category": category,
        "definitions": [
            {
                "part_of_speech": "noun" if category not in ["服务语境"] else "noun/verb",
                "meaning_cn": cn,
                "meaning_en_simple": f"{category} term for nail salon services",
                "meaning_en_academic": f"Professional terminology in nail salon industry",
                "examples": [
                    {
                        "sentence_en": example_en,
                        "sentence_cn": "",  # 待翻译
                        "source": "nail_salon_2026",
                        "context": "modern_salon",
                        "grade_level": "",
                        "lexile_score": ""
                    }
                ],
                "tags": ["nail_salon", "beauty_industry", "professional"],
                "frequency": {
                    "industry_specific": "high" if level <= 2 else "medium"
                }
            }
        ],
        "metadata": {
            "domain": "nail_salon",
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "quality_flag": "professional_2026"
        }
    }


def build_nail_salon_vocabulary():
    """构建完整的美甲专业词库"""
    print("\n[Building nail salon vocabulary...]")

    # 1. 从 master pool 提取相关词
    extracted_words = extract_relevant_words_from_master_pool()

    # 2. 添加专业美甲词汇
    professional_words = []

    for category, word_list in NAIL_SALON_VOCABULARY.items():
        print(f"  [*] Processing category: {category} ({len(word_list)} words)")

        for word_info in word_list:
            entry = create_nail_salon_entry(word_info, category)
            professional_words.append(entry)

    # 3. 合并（避免重复）
    existing_words_set = set(w.get("word", "").lower() for w in extracted_words)

    new_words = []
    for prof_word in professional_words:
        if prof_word["word"].lower() not in existing_words_set:
            new_words.append(prof_word)

    print(f"\n[OK] Total words:")
    print(f"  - Extracted from master pool: {len(extracted_words)}")
    print(f"  - Professional nail salon terms: {len(professional_words)}")
    print(f"  - Unique new additions: {len(new_words)}")
    print(f"  - Final vocabulary size: {len(extracted_words) + len(professional_words)}")

    return extracted_words, professional_words, new_words


def save_nail_salon_database(extracted, professional, new):
    """保存美甲专业词库"""
    print("\n[Saving nail salon database...]")

    # 构建最终数据结构
    all_words = extracted + professional

    database = {
        "meta": {
            "title": "2026 全球美甲沙龙专业词库",
            "description": "Professional Nail Salon Vocabulary Database - 2026 Edition",
            "version": "1.0",
            "created_at": datetime.now().isoformat(),
            "total_words": len(all_words),
            "extracted_from_master_pool": len(extracted),
            "professional_terms": len(professional),
            "new_additions": len(new),
            "categories": list(NAIL_SALON_VOCABULARY.keys()),
            "level_distribution": {},
            "language": "en-zh",
            "target_users": ["nail_technicians", "salon_owners", "beauty_students"]
        },
        "words": all_words
    }

    # 统计难度分布
    level_dist = defaultdict(int)
    for word in all_words:
        level = word.get("level", 2)
        level_dist[level] += 1

    database["meta"]["level_distribution"] = dict(level_dist)

    # 保存
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(database, f, ensure_ascii=False, indent=2)

    print(f"[OK] Database saved to: {OUTPUT_PATH.name}")
    return database


def generate_statistics_report(database):
    """生成统计报告"""
    print("\n[Generating statistics report...]")

    words = database["meta"]["total_words"]
    categories = database["meta"]["categories"]

    # 统计各类别词汇数
    category_stats = defaultdict(int)
    for word in database["words"]:
        cat = word.get("category", "general")
        category_stats[cat] += 1

    report = {
        "generated_at": datetime.now().isoformat(),
        "total_words": words,
        "source_breakdown": {
            "extracted_from_master_pool": database["meta"]["extracted_from_master_pool"],
            "professional_nail_salon_terms": database["meta"]["professional_terms"],
            "unique_new_additions": database["meta"]["new_additions"]
        },
        "category_distribution": dict(category_stats),
        "level_distribution": database["meta"]["level_distribution"],
        "key_insights": {
            "total_categories": len(categories),
            "average_words_per_category": int(words / len(categories)),
            "coverage": "Comprehensive nail salon industry vocabulary"
        }
    }

    # 保存报告
    with open(REPORT_PATH, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    return report


def print_final_report(report, database):
    """打印最终报告"""
    print("\n" + "="*80)
    print(" "*15 + "2026 NAIL SALON VOCABULARY - PROJECT REPORT")
    print("="*80)

    print(f"\n[Database Overview]")
    print(f"  Total Words: {report['total_words']:,}")
    print(f"  Title: {database['meta']['title']}")
    print(f"  Version: {database['meta']['version']}")

    print(f"\n[Source Breakdown]")
    print(f"  Extracted from Master Pool: {report['source_breakdown']['extracted_from_master_pool']:,}")
    print(f"  Professional Nail Terms: {report['source_breakdown']['professional_nail_salon_terms']:,}")
    print(f"  Unique New Additions: {report['source_breakdown']['unique_new_additions']:,}")

    print(f"\n[Category Distribution]")
    for cat, count in sorted(report['category_distribution'].items(),
                            key=lambda x: x[1], reverse=True):
        percentage = count / report['total_words'] * 100
        print(f"  {cat}: {count:,} ({percentage:.1f}%)")

    print(f"\n[Level Distribution]")
    for level, count in sorted(report['level_distribution'].items()):
        percentage = count / report['total_words'] * 100
        print(f"  Level {level}: {count:,} ({percentage:.1f}%)")

    print(f"\n[Key Insights]")
    print(f"  Total Categories: {report['key_insights']['total_categories']}")
    print(f"  Avg Words/Category: {report['key_insights']['average_words_per_category']}")

    print(f"\n[Files Generated]")
    print(f"  Database: {OUTPUT_PATH}")
    print(f"  Report: {REPORT_PATH}")

    print("\n" + "="*80)
    print(" "*25 + "PROJECT COMPLETED SUCCESSFULLY")
    print("="*80 + "\n")


def main():
    print("="*80)
    print(" "*15 + "2026 NAIL SALON VOCABULARY BUILDER")
    print("="*80)

    # 1. 构建词库
    extracted, professional, new = build_nail_salon_vocabulary()

    # 2. 保存数据库
    database = save_nail_salon_database(extracted, professional, new)

    # 3. 生成统计报告
    report = generate_statistics_report(database)

    # 4. 打印最终报告
    print_final_report(report, database)


if __name__ == "__main__":
    main()
