#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Livestream Vocabulary Expansion - Week 3 (FINAL)
Adding 48+ words: Data Analytics (36) + Supplementary (12+) to reach 500
"""

import json
from pathlib import Path
from datetime import datetime

BASE_DIR = Path("D:/CodeWorld/Claude/英语网站单词库项目")
LIVESTREAM_DB = BASE_DIR / "src/assets/data/livestream_pro.json"
BACKUP_DB = BASE_DIR / "src/assets/data/livestream_pro_backup_week3.json"

# Week 3 Vocabulary - 48 Words to reach 500
WEEK3_VOCABULARY = {
    "数据分析词": [
        # Sales Performance (12 words)
        ("bestseller", "畅销品", 2, "Bestseller - already sold 100K+!"),
        ("top-rated", "高分好评", 2, "Top-rated - 50,000 5-star reviews!"),
        ("most popular", "最受欢迎", 2, "Most popular this year!"),
        ("trending now", "当前热门", 2, "Trending now - see why everyone loves it!"),
        ("viral hit", "病毒式爆款", 2, "Viral hit on TikTok - 10M views!"),
        ("flying off shelves", "抢购一空", 2, "Flying off shelves - stock running low!"),
        ("sold over", "销量超过", 2, "Sold over 50,000 units!"),
        ("record breaking", "破纪录", 3, "Record-breaking sales!"),
        ("all-time high", "历史最高", 3, "All-time high sales!"),
        ("skyrocketing", "飙升", 3, "Sales are skyrocketing!"),
        ("hot item", "热门商品", 2, "This week's hot item!"),
        ("customer favorite", "客户最爱", 2, "#1 customer favorite!"),

        # User Behavior (12 words)
        ("95% love it", "95%喜爱", 2, "95% of customers love it!"),
        ("customers are raving", "客户疯狂好评", 2, "Customers are raving about it!"),
        ("highly recommended", "高度推荐", 2, "Highly recommended by buyers!"),
        ("repeat buyers", "回头客", 2, "70% are repeat buyers!"),
        ("customer loyalty", "客户忠诚度", 3, "Amazing customer loyalty!"),
        ("satisfaction rate", "满意度", 3, "99% satisfaction rate!"),
        ("positive reviews", "正面评价", 2, "Over 10,000 positive reviews!"),
        ("5-star rated", "五星评级", 2, "Consistently 5-star rated!"),
        ("user-approved", "用户认可", 2, "User-approved quality!"),
        ("crowd favorite", "大众喜爱", 2, "Crowd favorite - everyone's buying!"),
        ("social proof", "社会认同", 3, "Overwhelming social proof!"),
        ("tested by thousands", "千人测试", 3, "Tested by thousands of users!"),

        # Engagement Metrics (12 words)
        ("viral on TikTok", "TikTok爆火", 2, "Viral on TikTok with 10M views!"),
        ("featured on YouTube", "YouTube精选", 2, "Featured on YouTube - see the review!"),
        ("Instagram famous", "Instagram网红", 2, "Instagram famous - 100K shares!"),
        ("10M views", "千万观看", 2, "Hit 10 million views - insane!"),
        ("going viral", "病毒传播", 2, "This is going viral right now!"),
        ("social media buzz", "社媒热议", 3, "Huge social media buzz!"),
        ("influencer approved", "网红认可", 2, "Approved by top influencers!"),
        ("celebrity favorite", "明星最爱", 2, "Celebrity favorite - stars love it!"),
        ("media coverage", "媒体报道", 3, "Featured in major media!"),
        ("press mentions", "新闻提及", 3, "Mentioned in press - see articles!"),
        ("editor recommended", "编辑推荐", 3, "Editor recommended - top pick!"),
        ("critically acclaimed", "备受赞誉", 4, "Critically acclaimed by experts!"),
    ],

    "补充高频词": [
        # Urgency Boosters (8 words)
        ("only few left", "仅剩少数", 2, "Only a few left - hurry!"),
        ("almost gone", "几乎售罄", 2, "Almost gone - stock is low!"),
        ("selling fast", "快速售出", 2, "Selling fast right now!"),
        ("last chance", "最后机会", 2, "Last chance - don't miss out!"),
        ("don't wait", "别等了", 1, "Don't wait - order now!"),
        ("act now", "立即行动", 2, "Act now or regret later!"),
        ("time is running out", "时间不多了", 2, "Time is running out - tick tock!"),
        ("while stocks last", "售完即止", 2, "While stocks last - limited!"),

        # Social Proof (4 words)
        ("join thousands", "加入数千人", 2, "Join thousands of happy customers!"),
        ("be part of it", "成为一员", 2, "Be part of the movement!"),
        ("community approved", "社区认可", 3, "Approved by our community!"),
        ("people are buying", "人们正在购买", 2, "See why people are buying it!"),
    ]
}


def backup_and_expand():
    """Backup and expand database"""
    print("="*70)
    print(" "*10 + "LIVESTREAM VOCABULARY EXPANSION - WEEK 3 (FINAL)")
    print("  Target: Reach 500 words!")
    print("="*70)

    # Backup
    print("\n[Backing up...]")
    with open(LIVESTREAM_DB, 'r', encoding='utf-8') as f:
        data = json.load(f)

    with open(BACKUP_DB, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"[OK] Backed up to: {BACKUP_DB.name}")

    # Get existing words
    existing_words = data.get("words", [])
    existing_word_set = set(w.get("word", "").lower() for w in existing_words)

    print(f"\n[Current Status]")
    print(f"  Existing words: {len(existing_words)}")
    print(f"  Target: 500")
    print(f"  Need: {500 - len(existing_words)} more words")

    # Add Week 3 words
    print(f"\n[Adding Week 3 words...]")
    total_added = 0

    for category, word_list in WEEK3_VOCABULARY.items():
        print(f"\n[*] {category}: {len(word_list)} words")

        for item in word_list:
            word, cn, level, example = item

            if word.lower() in existing_word_set:
                print(f"    - Skipped (exists): {word}")
                continue

            entry = {
                "word": word,
                "word_id": f"live_{word.replace(' ', '_').lower()}",
                "phonetic": {"kk": "", "mw": "", "ipa": ""},
                "level": level,
                "category": category,
                "definitions": [{
                    "part_of_speech": "phrase" if " " in word else "noun",
                    "meaning_cn": cn,
                    "meaning_en_simple": f"Essential livestream term",
                    "examples": [{
                        "sentence_en": example,
                        "sentence_cn": "",
                        "source": "livestream_week3_final",
                        "tone": "enthusiastic_streamer"
                    }],
                    "tags": ["livestream", "ecommerce", "week3_final"]
                }],
                "metadata": {
                    "domain": "livestream_commerce",
                    "urgency_level": "high",
                    "conversion_power": "very_high",
                    "expansion_wave": "week3",
                    "created_at": datetime.now().isoformat()
                }
            }

            existing_words.append(entry)
            existing_word_set.add(word.lower())
            total_added += 1

    # Fill remaining to reach exactly 500
    remaining = 500 - len(existing_words)

    if remaining > 0:
        print(f"\n[*] Adding {remaining} supplementary words to reach 500...")

        supplementary = [
            ("hurry up", "快点", 1, "Hurry up before it's gone!", "supplementary"),
            ("order now", "立即下单", 1, "Order now - don't wait!", "supplementary"),
            ("shop now", "立即购买", 1, "Shop now - best prices!", "supplementary"),
            ("click here", "点击这里", 1, "Click here - amazing deal!", "supplementary"),
            ("get yours", "获取你的", 1, "Get yours today!", "supplementary"),
            ("limited time", "限时", 2, "Limited time only!", "supplementary"),
            ("act fast", "快速行动", 2, "Act fast - selling quick!", "supplementary"),
            ("don't miss out", "别错过", 1, "Don't miss out - join us!", "supplementary"),
            ("exclusive deal", "独家优惠", 2, "Exclusive deal - just for you!", "supplementary"),
            ("special offer", "特别优惠", 2, "Special offer - today only!", "supplementary"),
            ("huge savings", "巨大优惠", 2, "Huge savings - up to 70%!", "supplementary"),
            ("amazing value", "超值", 2, "Amazing value - unbeatable!", "supplementary"),
            ("unbeatable price", "无敌价格", 2, "Unbeatable price - compare!", "supplementary"),
            ("super deal", "超级优惠", 2, "Super deal - grab it!", "supplementary"),
            ("must grab", "必须抢", 2, "Must grab - once in lifetime!", "supplementary"),
            ("insane deal", "疯狂优惠", 2, "Insane deal - crazy price!", "supplementary"),
            ("crazy low price", "疯狂低价", 2, "Crazy low price - unbelievable!", "supplementary"),
            ("rock bottom price", "底价", 2, "Rock bottom price - can't go lower!", "supplementary"),
            ("once in lifetime", "千载难逢", 3, "Once in lifetime opportunity!", "supplementary"),
            ("never again", "不再有", 2, "Never again at this price!", "supplementary"),
        ]

        for i, (word, cn, level, example, cat) in enumerate(supplementary[:remaining]):
            if word.lower() not in existing_word_set:
                entry = {
                    "word": word,
                    "word_id": f"live_{word.replace(' ', '_').lower()}",
                    "phonetic": {"kk": "", "mw": "", "ipa": ""},
                    "level": level,
                    "category": cat,
                    "definitions": [{
                        "part_of_speech": "phrase",
                        "meaning_cn": cn,
                        "meaning_en_simple": "High-conversion livestream term",
                        "examples": [{"sentence_en": example, "sentence_cn": "", "source": "livestream_week3_final"}],
                        "tags": ["livestream", "urgency", "high_conversion"]
                    }],
                    "metadata": {"expansion_wave": "week3", "created_at": datetime.now().isoformat()}
                }
                existing_words.append(entry)
                total_added += 1

    # Update data
    data["words"] = existing_words
    data["meta"]["total_words"] = len(existing_words)
    data["meta"]["last_expansion"] = "week3"
    data["meta"]["last_updated"] = datetime.now().isoformat()
    data["meta"]["expansion_history"] = data["meta"].get("expansion_history", [])
    data["meta"]["expansion_history"].append({
        "wave": "week3",
        "date": datetime.now().isoformat(),
        "words_added": total_added,
        "final_total": len(existing_words),
        "goal_achieved": len(existing_words) >= 500
    })

    # Save
    print(f"\n[Saving database...]")
    with open(LIVESTREAM_DB, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"[OK] Saved: {LIVESTREAM_DB.name}")

    # Final stats
    print(f"\n{'='*70}")
    print(" "*15 + "WEEK 3 FINAL - COMPLETED!")
    print("="*70)
    print(f"\n[Final Statistics]")
    print(f"  Words added: {total_added}")
    print(f"  Final total: {len(existing_words)}")
    print(f"  Goal: 500")
    print(f"  Status: {'*** GOAL ACHIEVED ***' if len(existing_words) >= 500 else 'Almost there!'}")

    if len(existing_words) >= 500:
        print(f"\n{'='*70}")
        print(" "*10 + "🎉🎉🎉 500 WORDS ACHIEVED! 🎉🎉🎉")
        print("="*70)

    return data


if __name__ == "__main__":
    final_data = backup_and_expand()
    print("\n[All expansion weeks completed!]")
    print("Database: livestream_pro.json")
    print("Total words:", final_data["meta"]["total_words"])
