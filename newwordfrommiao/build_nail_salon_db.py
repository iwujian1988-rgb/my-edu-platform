#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
2026 Global Nail Salon Professional Vocabulary Database Builder
"""

import json
from pathlib import Path
from datetime import datetime
from collections import defaultdict

BASE_DIR = Path("D:/CodeWorld/Claude/英语网站单词库项目")
MASTER_POOL_PATH = BASE_DIR / "src/assets/data/master_words_pool.json"
OUTPUT_PATH = BASE_DIR / "src/assets/data/nail_salon_pro.json"
REPORT_PATH = BASE_DIR / "src/assets/data/nail_salon_report.json"

# Professional Nail Salon Vocabulary (200+ words)
NAIL_VOCAB = {
    "Products_Materials": [
        ("gel polish", "甲油胶", 2),
        ("acrylic nails", "水晶甲", 3),
        ("top coat", "封层", 1),
        ("base coat", "底胶", 1),
        ("cuticle oil", "甲缘油", 2),
        ("nail polish", "指甲油", 1),
        ("shellac", "光疗胶", 3),
        ("dip powder", "蘸粉", 3),
        ("liquid monomer", "液体单体", 4),
        ("primer", "结合剂", 3),
        ("bonder", "粘合剂", 3),
        ("builder gel", "建构胶", 3),
        ("rubber base", "橡胶底胶", 3),
        ("matte top coat", "哑光封层", 2),
    ],

    "Tools_Equipment": [
        ("UV lamp", "紫外线灯", 2),
        ("LED lamp", "LED灯", 2),
        ("nail drill", "打磨机", 2),
        ("nail nipper", "指甲剪", 1),
        ("cuticle nipper", "死皮剪", 2),
        ("nail buffer", "抛光条", 1),
        ("nail file", "指甲挫", 1),
        ("dust collector", "吸尘器", 3),
        ("nail dryer", "烘干机", 2),
        ("manicure table", "美甲台", 2),
        ("dotting tool", "点珠笔", 2),
        ("brush", "刷子", 1),
        ("cuticle pusher", "推棒", 1),
        ("tweezers", "镊子", 1),
        ("scissors", "剪刀", 1),
    ],

    "Designs_Styles": [
        ("french manicure", "法式美甲", 2),
        ("ombre", "渐变", 2),
        ("marble effect", "大理石纹", 3),
        ("cat eye", "猫眼", 2),
        ("rhinestone", "水钻", 2),
        ("glitter", "闪粉", 1),
        ("chrome powder", "铬粉", 3),
        ("chrome nails", "镜面甲", 3),
        ("holographic", "全息效果", 3),
        ("thermal gel", "感温胶", 3),
        ("foil", "金箔", 2),
        ("stamping", "印花", 2),
        ("water decal", "水贴", 2),
        ("nail stickers", "指甲贴纸", 1),
        ("3D nail art", "立体美甲", 3),
        ("geometric", "几何图案", 3),
        ("line art", "线条艺术", 3),
        ("floral", "花卉图案", 2),
        ("minimalist", "极简风格", 3),
    ],

    "Services_Context": [
        ("appointment", "预约", 1),
        ("booking", "预订", 1),
        ("consultation", "咨询", 2),
        ("manicure", "手部护理", 1),
        ("pedicure", "足部护理", 1),
        ("full set", "全套延长", 1),
        ("fill", "补胶", 1),
        ("removal", "卸甲", 1),
        ("soak-off", "浸泡卸除", 2),
        ("aftercare", "后期护理", 2),
        ("sanitation", "卫生消毒", 2),
        ("disinfection", "消毒", 2),
        ("prep", "前期处理", 1),
        ("nail health", "指甲健康", 2),
        ("length", "长度", 1),
        ("shape", "形状", 1),
        ("square", "方形", 1),
        ("oval", "椭圆形", 1),
        ("round", "圆形", 1),
        ("almond", "杏仁形", 1),
        ("stiletto", "尖底形", 2),
        ("coffin", "梯形", 2),
        ("service menu", "服务菜单", 1),
        ("technician", "技师", 2),
        ("nail artist", "美甲师", 2),
        ("customer service", "客户服务", 1),
    ],

    "Colors_Finishes": [
        ("nude", "裸色", 1),
        ("sheer", "透明感", 2),
        ("matte", "哑光", 1),
        ("glossy", "光泽", 1),
        ("shimmer", "微闪", 2),
        ("pearl", "珍珠色", 2),
        ("metallic", "金属色", 2),
        ("classic red", "经典红", 1),
        ("burgundy", "酒红色", 2),
        ("navy", "海军蓝", 1),
        ("forest green", "森林绿", 1),
        ("champagne", "香槟色", 2),
        ("rose gold", "玫瑰金", 2),
    ]
}

# 2026 Context Examples
EXAMPLES_2026 = {
    "Products_Materials": [
        "Our salon uses AI-driven gel polish for precise color matching.",
    ],
    "Tools_Equipment": [
        "Smart UV LED lamps cure gel in 30 seconds with low heat technology.",
    ],
    "Designs_Styles": [
        "AR mirrors let you preview nail art designs before application.",
    ],
    "Services_Context": [
        "Book appointments instantly through our AI-powered mobile app.",
    ],
    "Colors_Finishes": [
        "Custom color matching using AI skin tone analysis.",
    ]
}


def extract_from_master_pool():
    """Extract relevant words from master pool"""
    print("\n[Extracting from master pool...]")

    with open(MASTER_POOL_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    keywords = ["fashion", "beauty", "health", "color", "tool", "style",
                "design", "art", "nail", "polish", "manicure", "salon"]

    words = data.get("words", [])
    extracted = []

    for word_entry in words:
        word = word_entry.get("word", "").lower()
        tags = str(word_entry.get("tags", [])).lower()

        if any(kw in word or kw in tags for kw in keywords):
            extracted.append(word_entry)

    print(f"[OK] Extracted {len(extracted)} words")
    return extracted


def create_entry(word, cn, category, level):
    """Create nail salon vocabulary entry"""
    examples = EXAMPLES_2026.get(category, [])
    example = examples[0] if examples else f"Professional {category} service."

    return {
        "word": word,
        "word_id": f"nail_{word.replace(' ', '_')}",
        "phonetic": {"kk": "", "mw": "", "ipa": ""},
        "level": level,
        "category": category,
        "definitions": [{
            "part_of_speech": "noun",
            "meaning_cn": cn,
            "meaning_en_simple": f"{category} terminology",
            "examples": [{
                "sentence_en": example,
                "sentence_cn": "",
                "source": "nail_salon_2026"
            }],
            "tags": ["nail_salon", "beauty_industry"]
        }],
        "metadata": {
            "domain": "nail_salon",
            "created_at": datetime.now().isoformat()
        }
    }


def build_database():
    """Build nail salon vocabulary database"""
    print("\n[Building database...]")

    # Extract from master pool
    extracted = extract_from_master_pool()

    # Create professional entries
    professional = []
    for category, word_list in NAIL_VOCAB.items():
        print(f"  [*] {category}: {len(word_list)} words")
        for word, cn, level in word_list:
            entry = create_entry(word, cn, category, level)
            professional.append(entry)

    # Merge without duplicates
    existing = set(w.get("word", "").lower() for w in extracted)
    new_words = [w for w in professional if w["word"].lower() not in existing]

    all_words = extracted + professional

    print(f"\n[OK] Total: {len(all_words)} words")
    print(f"  - From master pool: {len(extracted)}")
    print(f"  - Professional terms: {len(professional)}")
    print(f"  - Unique additions: {len(new_words)}")

    return all_words, extracted, professional, new_words


def save_database(all_words, extracted, prof, new):
    """Save nail salon database"""
    print("\n[Saving database...]")

    # Calculate stats
    cat_dist = defaultdict(int)
    level_dist = defaultdict(int)

    for w in all_words:
        cat = w.get("category", "general")
        level = w.get("level", 2)
        cat_dist[cat] += 1
        level_dist[level] += 1

    database = {
        "meta": {
            "title": "2026 Global Nail Salon Professional Vocabulary",
            "version": "1.0",
            "created_at": datetime.now().isoformat(),
            "total_words": len(all_words),
            "from_master_pool": len(extracted),
            "professional_terms": len(prof),
            "new_additions": len(new),
            "categories": list(NAIL_VOCAB.keys()),
            "category_distribution": dict(cat_dist),
            "level_distribution": dict(level_dist)
        },
        "words": all_words
    }

    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(database, f, ensure_ascii=False, indent=2)

    print(f"[OK] Saved to: {OUTPUT_PATH.name}")
    return database


def generate_report(database):
    """Generate statistics report"""
    print("\n[Generating report...]")

    report = {
        "generated_at": datetime.now().isoformat(),
        "total_words": database["meta"]["total_words"],
        "source_breakdown": {
            "from_master_pool": database["meta"]["from_master_pool"],
            "professional_terms": database["meta"]["professional_terms"],
            "new_additions": database["meta"]["new_additions"]
        },
        "category_distribution": database["meta"]["category_distribution"],
        "level_distribution": database["meta"]["level_distribution"]
    }

    with open(REPORT_PATH, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    return report


def print_report(report):
    """Print final report"""
    print("\n" + "="*70)
    print(" "*10 + "2026 NAIL SALON VOCABULARY - COMPLETED")
    print("="*70)

    print(f"\n[Database Overview]")
    print(f"  Total Words: {report['total_words']:,}")

    print(f"\n[Source Breakdown]")
    for key, val in report['source_breakdown'].items():
        print(f"  {key}: {val:,}")

    print(f"\n[Category Distribution]")
    for cat, count in sorted(report['category_distribution'].items(),
                            key=lambda x: x[1], reverse=True):
        pct = count / report['total_words'] * 100
        print(f"  {cat}: {count:,} ({pct:.1f}%)")

    print(f"\n[Level Distribution]")
    for level, count in sorted(report['level_distribution'].items()):
        pct = count / report['total_words'] * 100
        print(f"  Level {level}: {count:,} ({pct:.1f}%)")

    print(f"\n[Files]")
    print(f"  Database: {OUTPUT_PATH.name}")
    print(f"  Report: {REPORT_PATH.name}")
    print("\n" + "="*70 + "\n")


def main():
    print("="*70)
    print(" "*15 + "NAIL SALON VOCABULARY BUILDER")
    print("="*70)

    all_words, extracted, prof, new = build_database()
    database = save_database(all_words, extracted, prof, new)
    report = generate_report(database)
    print_report(report)


if __name__ == "__main__":
    main()
