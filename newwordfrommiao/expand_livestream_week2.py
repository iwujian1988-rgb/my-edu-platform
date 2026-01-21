#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Livestream Vocabulary Expansion - Week 2
Adding 138 new words: Promotions (48) + AI Tech (50) + Competitor Analysis (40)
"""

import json
from pathlib import Path
from datetime import datetime

BASE_DIR = Path("D:/CodeWorld/Claude/英语网站单词库项目")
LIVESTREAM_DB = BASE_DIR / "src/assets/data/livestream_pro.json"
BACKUP_DB = BASE_DIR / "src/assets/data/livestream_pro_backup_week2.json"

# Week 2 Vocabulary - 138 Words
WEEK2_VOCABULARY = {
    "促销活动词": [
        # Holiday Sales (12 words)
        ("Black Friday", "黑色星期五", 2, "Black Friday came early - 50% off everything!"),
        ("Cyber Monday", "网络星期一", 2, "Cyber Monday deals - online exclusive!"),
        ("Holiday sale", "假日特卖", 2, "Holiday sale - biggest discounts of the year!"),
        ("Christmas special", "圣诞特惠", 2, "Christmas special - limited time offer!"),
        ("New Year sale", "新年特卖", 2, "New Year sale - start fresh with savings!"),
        ("Thanksgiving sale", "感恩节特卖", 3, "Thanksgiving sale - thank yourself with deals!"),
        ("Easter sale", "复活节特卖", 2, "Easter sale - egg-cellent prices!"),
        ("Summer sale", "夏季特卖", 2, "Summer sale - hot deals for hot days!"),
        ("Back to school", "返校季", 2, "Back to school - save big on essentials!"),
        ("Prime Day", "会员日", 2, "Prime Day exclusive - members only!"),
        ("Singles Day", "双11", 2, "Singles Day - biggest shopping festival!"),
        ("anniversary sale", "周年庆特卖", 3, "Anniversary sale - celebrating with discounts!"),

        # Limited Time Offers (12 words)
        ("24-hour sale", "24小时特卖", 2, "24-hour sale - ends midnight!"),
        ("weekend deals", "周末特惠", 2, "Weekend deals - 48 hours only!"),
        ("flash deals", "闪购优惠", 2, "Flash deals - while supplies last!"),
        ("daily deals", "每日特惠", 2, "Daily deals - check back every day!"),
        ("midnight madness", "午夜疯狂", 2, "Midnight madness - tonight only!"),
        ("happy hour", "欢乐时光", 2, "Happy hour special - limited time!"),
        ("early bird", "早鸟价", 2, "Early birds get extra 20% off!"),
        ("last chance", "最后机会", 2, "Last chance - don't miss out!"),
        ("final hours", "最后几小时", 2, "Final hours - stock running low!"),
        ("ending soon", "即将结束", 2, "Ending soon - act fast!"),
        ("expires tonight", "今晚过期", 2, "Expires tonight - order now!"),
        ("countdown", "倒计时", 2, "Countdown started - only 2 hours left!"),

        # Bundle & Combo (12 words)
        ("buy one get one", "买一送一", 1, "Buy one get one free - double value!"),
        ("BOGO", "买一送一", 1, "BOGO deal - unbeatable!"),
        ("bundle deal", "打包优惠", 2, "Bundle deal - save 30% when you bundle!"),
        ("combo offer", "组合优惠", 2, "Combo offer - best value pack!"),
        ("value pack", "超值套装", 2, "Value pack - more for less!"),
        ("starter kit", "入门套装", 2, "Starter kit - everything you need!"),
        ("family pack", "家庭装", 2, "Family pack - share the savings!"),
        ("multipack", "多件装", 2, "Multipack - stock up and save!"),
        ("complete set", "全套", 2, "Complete set - get the full collection!"),
        ("kit", "套装", 1, "Full kit - all accessories included!"),
        ("collection", "系列", 2, "Get the whole collection - special price!"),
        ("gift set", "礼品套装", 2, "Gift set - perfect for presents!"),

        # Coupons & Codes (12 words)
        ("promo code", "促销码", 1, "Use code SAVE20 - extra discount!"),
        ("discount code", "折扣码", 2, "Discount code in description - copy it!"),
        ("coupon", "优惠券", 1, "Clip coupon - automatic savings!"),
        ("voucher", "代金券", 2, "Free voucher - $10 off your order!"),
        ("gift card", "礼品卡", 2, "Gift card promotion - buy $100 get $110!"),
        ("store credit", "店铺积分", 2, "Store credit - spend like cash!"),
        ("reward points", "奖励积分", 2, "Earn reward points - redeem later!"),
        ("cashback", "返现", 2, "5% cashback - money back in pocket!"),
        ("rebate", "回扣", 3, "Mail-in rebate - $50 back!"),
        ("loyalty points", "忠诚积分", 2, "Double loyalty points - members only!"),
        ("exclusive offer", "专属优惠", 2, "Exclusive offer - just for you!"),
        ("special discount", "特别折扣", 2, "Special discount - limited availability!"),
    ],

    "AI科技词": [
        # AI-Powered Features (12 words)
        ("AI-powered", "AI驱动", 3, "AI-powered smart detection - it learns from you!"),
        ("machine learning", "机器学习", 4, "Machine learning algorithm - gets smarter!"),
        ("smart algorithm", "智能算法", 3, "Smart algorithm predicts what you need!"),
        ("artificial intelligence", "人工智能", 4, "AI technology - future is here!"),
        ("neural network", "神经网络", 5, "Neural network processing - brain-like!"),
        ("deep learning", "深度学习", 5, "Deep learning - understands patterns!"),
        ("automation", "自动化", 3, "Full automation - saves you time!"),
        ("smart features", "智能功能", 2, "Packed with smart features - life easier!"),
        ("intelligent", "智能的", 3, "Intelligent design - thinks for you!"),
        ("adaptive", "自适应", 3, "Adaptive technology - adjusts to you!"),
        ("predictive", "预测性", 4, "Predictive analytics - knows before you ask!"),
        ("personalized AI", "个性化AI", 4, "Personalized AI - tailored just for you!"),

        # AR/VR Technology (10 words)
        ("AR try-on", "AR试穿", 3, "AR try-on - see how it looks virtually!"),
        ("virtual preview", "虚拟预览", 3, "Virtual preview - try before you buy!"),
        ("3D modeling", "3D建模", 4, "3D modeling - see all angles!"),
        ("immersive experience", "沉浸式体验", 4, "Immersive AR experience - feel it!"),
        ("augmented reality", "增强现实", 4, "Augmented reality - future of shopping!"),
        ("virtual fitting", "虚拟试穿", 3, "Virtual fitting room - at home!"),
        ("digital twin", "数字孪生", 5, "Digital twin technology - exact replica!"),
        ("holographic", "全息", 4, "Holographic display - like magic!"),
        ("interactive 3D", "交互式3D", 4, "Interactive 3D view - explore!"),
        ("virtual reality", "虚拟现实", 4, "VR experience - step into future!"),

        # Smart Controls (10 words)
        ("voice control", "语音控制", 3, "Voice control - just speak!"),
        ("gesture control", "手势控制", 4, "Gesture control - wave your hand!"),
        ("touch-free", "免触摸", 3, "Touch-free operation - hygienic!"),
        ("hands-free", "免提", 2, "Hands-free convenience - multitask!"),
        ("smart sensor", "智能传感器", 3, "Smart sensor detects everything!"),
        ("auto-adjust", "自动调节", 3, "Auto-adjusts to your needs!"),
        ("one-touch operation", "一键操作", 2, "One-touch operation - super simple!"),
        ("remote control", "远程控制", 2, "Remote control via app - anywhere!"),
        ("smart home", "智能家居", 3, "Smart home compatible - works with Alexa!"),
        ("IoT", "物联网", 4, "IoT connected - always online!"),

        # Data & Analytics (10 words)
        ("personalized recommendation", "个性化推荐", 4, "Personalized recommendations - just for you!"),
        ("smart suggestion", "智能建议", 3, "Smart suggestions - knows your taste!"),
        ("data-driven", "数据驱动", 4, "Data-driven insights - science!"),
        ("analytics", "分析", 3, "Built-in analytics - track everything!"),
        ("real-time data", "实时数据", 4, "Real-time data - instant updates!"),
        ("behavior tracking", "行为追踪", 4, "Behavior tracking - understands you!"),
        ("usage patterns", "使用模式", 4, "Learns your usage patterns - custom!"),
        ("smart optimization", "智能优化", 4, "Smart optimization - always improving!"),
        ("performance metrics", "性能指标", 4, "Performance metrics - see the data!"),
        ("cloud sync", "云同步", 3, "Cloud sync - access anywhere!"),

        # Future Tech (8 words)
        ("next-gen", "下一代", 3, "Next-gen technology - be first!"),
        ("cutting-edge", "前沿", 3, "Cutting-edge innovation - lead!"),
        ("revolutionary", "革命性", 3, "Revolutionary tech - game changer!"),
        ("breakthrough", "突破", 3, "Breakthrough innovation - never seen!"),
        ("state-of-the-art", "最先进", 4, "State-of-the-art tech - top tier!"),
        ("groundbreaking", "开创性", 4, "Groundbreaking features - wow!"),
        ("innovative", "创新", 3, "Innovative design - patents pending!"),
        ("patented technology", "专利技术", 4, "Patented technology - exclusive!"),
    ],

    "竞品分析词": [
        # Price Comparison (12 words)
        ("compare prices", "比价", 2, "Compare prices - we win!"),
        ("best price", "最优价格", 2, "Best price guarantee - beat any price!"),
        ("price match", "价格匹配", 2, "We price match - you save!"),
        ("beat any price", "击败任何价格", 2, "We beat any price - guaranteed!"),
        ("lowest price", "最低价", 2, "Lowest price - shop around!"),
        ("unbeatable price", "无敌价格", 2, "Unbeatable price - can't be beat!"),
        ("best value", "最超值", 2, "Best value for money - period!"),
        ("most affordable", "最实惠", 2, "Most affordable - budget friendly!"),
        ("budget-friendly", "预算友好", 2, "Budget-friendly - save money!"),
        ("cheap vs affordable", "便宜vs实惠", 2, "Not cheap - affordable! Big difference!"),
        ("competitive pricing", "有竞争力的定价", 3, "Competitive pricing - fair deal!"),
        ("fair price", "合理价格", 2, "Fair price - honest value!"),

        # Quality Comparison (10 words)
        ("superior quality", "优越质量", 3, "Superior quality - nothing compares!"),
        ("better quality", "更好质量", 2, "Better quality than competitors!"),
        ("premium quality", "优质", 2, "Premium quality at budget price!"),
        ("high-end", "高端", 2, "High-end features - low price!"),
        ("top-notch", "顶尖", 2, "Top-notch quality - guaranteed!"),
        ("outperform", "胜过", 3, "Outperforms competitors - tested!"),
        ("compare features", "对比功能", 2, "Compare features - we have more!"),
        ("more features", "更多功能", 2, "More features - less money!"),
        ("better specs", "更好参数", 2, "Better specs - see the comparison!"),
        ("quality tested", "质量测试", 2, "Quality tested - lab verified!"),

        # Market Position (10 words)
        ("market leader", "市场领导者", 3, "Market leader for 5 years!"),
        ("#1 rated", "第一评级", 2, "#1 rated product - see reviews!"),
        ("top choice", "首选", 2, "Top choice of customers!"),
        ("customer favorite", "客户最爱", 2, "#1 customer favorite this month!"),
        ("most reviewed", "最多评价", 2, "Most reviewed - 100K reviews!"),
        ("highest rated", "最高评分", 2, "Highest rated - 5 stars!"),
        ("editor's choice", "编辑选择", 3, "Editor's choice award winner!"),
        ("award-winning", "获奖", 2, "Award-winning design - recognized!"),
        ("industry standard", "行业标准", 3, "Industry standard - everyone follows!"),
        ("trusted brand", "信任品牌", 2, "Trusted by millions!"),

        # Differentiation (8 words)
        ("unique feature", "独特功能", 3, "Unique feature - only we have!"),
        ("exclusive design", "独家设计", 3, "Exclusive design - patented!"),
        ("patented technology", "专利技术", 4, "Patented tech - legal protection!"),
        ("one-of-a-kind", "独一无二", 3, "One-of-a-kind - no copycats!"),
        ("stand out", "脱颖而出", 2, "Stands out from competition!"),
        ("unlike others", "与众不同", 2, "Unlike others - we're better!"),
        ("different", "不同", 1, "Different from the rest!"),
        ("special", "特别", 1, "Something special - unique!"),
    ]
}


def backup_existing_database():
    """Backup existing database before modification"""
    print("\n[Backing up existing database...]")

    with open(LIVESTREAM_DB, 'r', encoding='utf-8') as f:
        data = json.load(f)

    with open(BACKUP_DB, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"[OK] Backup saved to: {BACKUP_DB.name}")
    return data


def create_entry(word, cn, category, level, example):
    """Create livestream vocabulary entry"""
    return {
        "word": word,
        "word_id": f"live_{word.replace(' ', '_').replace('/', '_').replace("'", '').replace('-', '_').lower()}",
        "phonetic": {"kk": "", "mw": "", "ipa": ""},
        "level": level,
        "category": category,
        "definitions": [{
            "part_of_speech": "phrase" if " " in word else "noun/verb",
            "meaning_cn": cn,
            "meaning_en_simple": f"Essential livestream term for {category}",
            "examples": [{
                "sentence_en": example,
                "sentence_cn": "",
                "source": "livestream_week2_expansion",
                "tone": "enthusiastic_streamer",
                "platform": "multi_platform",
                "year": "2026"
            }],
            "tags": ["livestream", "ecommerce", "week2_expansion", "high_conversion"]
        }],
        "metadata": {
            "domain": "livestream_commerce",
            "urgency_level": "high",
            "conversion_power": "very_high",
            "expansion_wave": "week2",
            "created_at": datetime.now().isoformat()
        }
    }


def expand_database(existing_data):
    """Expand database with Week 2 vocabulary"""
    print("\n[Expanding database - Week 2]")
    print("="*70)

    # Get existing words
    existing_words = existing_data.get("words", [])
    existing_word_set = set(w.get("word", "").lower() for w in existing_words)

    # Create new entries
    new_entries = []
    total_added = 0

    for category, word_list in WEEK2_VOCABULARY.items():
        print(f"\n[*] Processing: {category}")
        print(f"    Target: {len(word_list)} words")

        added_count = 0
        skipped_count = 0
        for item in word_list:
            word, cn, level, example = item

            # Skip if word already exists
            if word.lower() in existing_word_set:
                print(f"      - Skipped (exists): {word}")
                skipped_count += 1
                continue

            # Create entry
            entry = create_entry(word, cn, category, level, example)
            new_entries.append(entry)
            existing_word_set.add(word.lower())
            added_count += 1
            total_added += 1

        print(f"    [OK] Added: {added_count} | Skipped: {skipped_count}")

    print(f"\n{'='*70}")
    print(f"[Summary Week 2]")
    print(f"  Total new words added: {total_added}")
    print(f"  Previous total: {len(existing_words)}")
    print(f"  New total: {len(existing_words) + total_added}")
    print(f"  Progress toward 500 goal: {len(existing_words) + total_added}/500")

    return existing_words + new_entries, total_added


def update_metadata(existing_data, words_added):
    """Update database metadata"""
    print("\n[Updating metadata...]")

    total_words = len(existing_data.get("words", []))

    existing_data["meta"]["total_words"] = total_words
    existing_data["meta"]["last_expansion"] = "week2"
    existing_data["meta"]["last_updated"] = datetime.now().isoformat()
    existing_data["meta"]["expansion_history"] = existing_data["meta"].get("expansion_history", [])

    existing_data["meta"]["expansion_history"].append({
        "wave": "week2",
        "date": datetime.now().isoformat(),
        "words_added": words_added,
        "categories_added": ["促销活动词", "AI科技词", "竞品分析词"],
        "backup_file": str(BACKUP_DB)
    })

    print(f"[OK] Metadata updated")
    return existing_data


def save_database(data):
    """Save expanded database"""
    print("\n[Saving database...]")

    with open(LIVESTREAM_DB, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"[OK] Database saved: {LIVESTREAM_DB.name}")


def generate_week2_report(data, words_added):
    """Generate Week 2 completion report"""
    print("\n[Generating Week 2 report...]")

    total_words = data["meta"]["total_words"]
    progress = (total_words / 500) * 100

    report = {
        "wave": "week2",
        "completed_at": datetime.now().isoformat(),
        "words_added": words_added,
        "categories_added": {
            "促销活动词": 48,
            "AI科技词": 50,
            "竞品分析词": 40
        },
        "total_database_size": total_words,
        "progress_toward_goal": f"{progress:.1f}%",
        "next_steps": [
            "Week 3: Add 数据分析词 (36) + Quality Check",
            "Final target: Reach 500 words",
            "Status: " + ("ALREADY EXCEEDED 500!" if total_words >= 500 else "On track to exceed 500")
        ]
    }

    report_path = BASE_DIR / "src/assets/data/livestream_week2_report.json"
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    return report


def print_final_report(report, total_words):
    """Print final Week 2 report"""
    progress_pct = (total_words / 500) * 100
    exceeded = total_words >= 500

    print("\n" + "="*70)
    print(" "*15 + "WEEK 2 EXPANSION - COMPLETED!")
    print("="*70)

    print(f"\n[Week 2 Achievements]")
    print(f"  Words Added: {report['words_added']}")
    print(f"  Database Size: {total_words}")
    print(f"  Goal Progress: {progress_pct:.1f}% ({total_words}/500)")

    if exceeded:
        print(f"\n  *** MILESTONE ACHIEVED ***")
        print(f"  *** EXCEEDED 500 WORD GOAL ***")

    print(f"\n[Categories Added]")
    for cat, count in report['categories_added'].items():
        print(f"  {cat}: {count} words")

    print(f"\n[Next Steps]")
    for i, step in enumerate(report['next_steps'], 1):
        print(f"  {i}. {step}")

    print("\n" + "="*70)
    print(" "*15 + "Week 2 Complete - Excellent!")
    print("="*70 + "\n")


def main():
    print("="*70)
    print(" "*10 + "LIVESTREAM VOCABULARY EXPANSION - WEEK 2")
    print("  Adding 138 words: Promotions + AI Tech + Competitor Analysis")
    print("="*70)

    # Backup existing database
    existing_data = backup_existing_database()

    # Expand database
    expanded_words, words_added = expand_database(existing_data)

    # Update data structure
    existing_data["words"] = expanded_words
    updated_data = update_metadata(existing_data, words_added)

    # Save database
    save_database(updated_data)

    # Generate report
    report = generate_week2_report(updated_data, words_added)

    # Print report
    print_final_report(report, updated_data["meta"]["total_words"])


if __name__ == "__main__":
    main()
