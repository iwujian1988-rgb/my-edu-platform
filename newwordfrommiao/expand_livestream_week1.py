#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Livestream Vocabulary Expansion - Week 1
Adding 150 new words: Customer Service (50) + Payment/Logistics (50) + After-sales (50)
"""

import json
from pathlib import Path
from datetime import datetime

BASE_DIR = Path("D:/CodeWorld/Claude/英语网站单词库项目")
LIVESTREAM_DB = BASE_DIR / "src/assets/data/livestream_pro.json"
BACKUP_DB = BASE_DIR / "src/assets/data/livestream_pro_backup_week1.json"

# Week 1 Vocabulary - 150 Words
WEEK1_VOCABULARY = {
    "客服沟通词": [
        # FAQ & Information (15 words)
        ("FAQ", "常见问题", 1, "Check the FAQ below - we answered everything!"),
        ("frequently asked questions", "常见问题解答", 2, "Link to FAQ in bio - save time!"),
        ("common concerns", "常见顾虑", 2, "Let me address your common concerns right now!"),
        ("typical issues", "典型问题", 2, "Here's how we handle typical issues!"),
        ("product details", "产品详情", 1, "Swipe left for full product details!"),
        ("specifications", "规格参数", 2, "All specifications in the description - check it out!"),
        ("how to use", "使用方法", 1, "I'll show you how to use it - watch closely!"),
        ("step by step", "一步步", 1, "Step by step guide coming right up!"),
        ("tutorial", "教程", 2, "Full tutorial on my channel - link in bio!"),
        ("demo video", "演示视频", 2, "Check the demo video - see it in action!"),
        ("size guide", "尺码指南", 2, "Size guide pinned in comments - check before ordering!"),
        ("color options", "颜色选项", 1, "We have 10 color options - I'll show each one!"),
        ("stock availability", "库存情况", 2, "Stock availability updates every 5 minutes!"),
        ("shipping info", "配送信息", 1, "All shipping info in the description below!"),
        ("product reviews", "产品评价", 2, "Real product reviews from our customers - look!"),

        # Response Speed & Availability (10 words)
        ("instant reply", "即时回复", 2, "Our team gives instant replies - no waiting!"),
        ("24/7 support", "全天候客服", 2, "24/7 support team ready to help you!"),
        ("real-time assistance", "实时帮助", 3, "Get real-time assistance - we're here now!"),
        ("quick response", "快速响应", 2, "Quick response guaranteed - under 5 minutes!"),
        ("available now", "现在可用", 1, "Our team is available now - ask anything!"),
        ("online support", "在线支持", 2, "Online support 24/7 - click the link!"),
        ("live chat", "在线聊天", 2, "Live chat support - talk to real people!"),
        ("response time", "响应时间", 2, "Average response time under 3 minutes!"),
        ("team ready", "团队待命", 2, "Our whole team is ready to help!"),
        ("here to help", "在这里帮助", 1, "We're here to help - ask away!"),

        # Communication Methods (10 words)
        ("DM me", "私信我", 1, "DM me if you have questions - I reply to everyone!"),
        ("slide into DMs", "发私信给我", 1, "Slide into DMs - I respond to all messages!"),
        ("hit my inbox", "发到我收件箱", 1, "Hit my inbox - let's talk!"),
        ("message us", "给我们留言", 1, "Message us anytime - we reply fast!"),
        ("contact support", "联系客服", 2, "Contact support - link is in bio!"),
        ("reach out", "联系我们", 2, "Reach out to us - we're friendly!"),
        ("drop a message", "留言", 1, "Drop a message in comments - we read all!"),
        ("send a text", "发短信", 1, "Or send a text - we respond 24/7!"),
        ("email us", "发邮件", 2, "Email us for detailed questions!"),
        ("customer service", "客户服务", 1, "Our customer service team is amazing!"),

        # Problem Resolution (15 words)
        ("resolve issues", "解决问题", 2, "We resolve issues fast - satisfaction guaranteed!"),
        ("answer queries", "回答疑问", 2, "Let me answer all your queries right now!"),
        ("address concerns", "处理顾虑", 3, "We address every concern - your peace of mind!"),
        ("find solution", "找到解决方案", 2, "We'll find a solution together!"),
        ("make it right", "解决问题", 2, "We'll make it right - promise!"),
        ("fix the problem", "修复问题", 2, "We fix problems fast - no stress!"),
        ("handle complaints", "处理投诉", 3, "We handle complaints professionally!"),
        ("sort it out", "搞定", 1, "We'll sort it out for you!"),
        ("work it out", "解决", 1, "Let's work it out together!"),
        ("we got you", "我们罩着你", 1, "Don't worry - we got you covered!"),
        ("take care of it", "处理它", 2, "We'll take care of it immediately!"),
        ("no worries", "别担心", 1, "No worries at all - we handle everything!"),
        ("leave it to us", "交给我们", 2, "Leave it to us - relax!"),
        ("we're on it", "我们在处理", 1, "We're on it - being handled now!"),
        ("consider it done", "包在我们身上", 2, "Consider it done - we're pros!"),
    ],

    "支付物流词": [
        # Payment Methods (15 words)
        ("credit card", "信用卡", 1, "We accept all major credit cards!"),
        ("debit card", "借记卡", 1, "Debit card accepted - easy payment!"),
        ("PayPal", "贝宝", 1, "PayPal checkout - super secure!"),
        ("Apple Pay", "苹果支付", 1, "Apple Pay supported - one-tap payment!"),
        ("Google Pay", "谷歌支付", 1, "Google Pay - checkout in seconds!"),
        ("buy now pay later", "先买后付", 2, "Buy now pay later - split your payments!"),
        ("installments", "分期付款", 2, "Pay in installments - 0% interest!"),
        ("Klarna", "克拉纳支付", 2, "Use Klarna for easy payments!"),
        ("Afterpay", "后付", 2, "Afterpay available - shop now pay later!"),
        ("Stripe", " Stripe支付", 2, "Secure Stripe payment - 100% safe!"),
        ("checkout", "结账", 1, "Quick checkout - takes 30 seconds!"),
        ("secure payment", "安全支付", 2, "100% secure payment - shop safely!"),
        ("encrypted", "加密的", 3, "Fully encrypted - your data is safe!"),
        ("payment processed", "支付处理", 2, "Payment processed instantly!"),
        ("transaction complete", "交易完成", 2, "Transaction complete - order confirmed!"),

        # Shipping Options (15 words)
        ("free shipping", "包邮", 1, "FREE shipping worldwide - yes, really!"),
        ("express delivery", "快递", 2, "Express delivery available - get it fast!"),
        ("same-day shipping", "当日发货", 2, "Same-day shipping - order now ships today!"),
        ("next day delivery", "次日送达", 2, "Next day delivery - super fast!"),
        ("2-3 days", "2-3天", 1, "Ships in 2-3 days - right to your door!"),
        ("fast delivery", "快速配送", 2, "Lightning fast delivery - no waiting!"),
        ("standard shipping", "标准配送", 1, "Standard shipping - free on all orders!"),
        ("premium shipping", "高级配送", 2, "Premium shipping - get it faster!"),
        ("international shipping", "国际运输", 2, "International shipping - we ship worldwide!"),
        ("worldwide delivery", "全球配送", 2, "Worldwide delivery - yes, to your country!"),
        ("shipped within 24h", "24小时内发货", 2, "Shipped within 24 hours - guaranteed!"),
        ("ready to ship", "准备发货", 2, "Ready to ship - in stock now!"),
        ("dispatch", "发货", 2, "Quick dispatch - same day!"),
        ("in transit", "运输中", 2, "Your order is in transit - tracking active!"),
        ("out for delivery", "派送中", 2, "Out for delivery - you'll get it today!"),

        # Tracking & Status (10 words)
        ("tracking number", "追踪号码", 2, "Tracking number provided - track your package!"),
        ("track your order", "追踪订单", 2, "Track your order - real-time updates!"),
        ("live tracking", "实时追踪", 2, "Live tracking - watch your package move!"),
        ("delivery updates", "配送更新", 2, "Get delivery updates via SMS!"),
        ("shipping notification", "发货通知", 3, "Shipping notification sent - check your email!"),
        ("order status", "订单状态", 2, "Check order status - link in bio!"),
        ("shipping confirmation", "发货确认", 2, "Shipping confirmation emailed to you!"),
        ("estimated delivery", "预计送达", 2, "Estimated delivery in 3-5 business days!"),
        ("delivery date", "送达日期", 2, "Your delivery date is confirmed!"),
        ("package arrived", "包裹已到", 2, "Package arrived - enjoy your purchase!"),

        # Packaging (10 words)
        ("eco-friendly packaging", "环保包装", 2, "Eco-friendly packaging - save the planet!"),
        ("gift wrap", "礼品包装", 2, "Free gift wrap available - perfect for gifts!"),
        ("secure packaging", "安全包装", 2, "Secure packaging - arrives safe!"),
        ("discreet packaging", " discreet包装", 2, "Discreet packaging - your privacy matters!"),
        ("premium box", "高级礼盒", 2, "Comes in premium box - feels luxurious!"),
        ("bubble wrap", "气泡膜", 1, "Wrapped in bubble wrap - extra protection!"),
        ("careful packaging", "仔细包装", 2, "Careful packaging - arrives perfect!"),
        ("recyclable", "可回收", 2, "100% recyclable packaging!"),
        ("sustainable", "可持续", 3, "Sustainable packaging - eco-conscious choice!"),
        ("gift ready", "礼品级", 2, "Gift ready - includes gift card!"),
    ],

    "售后服务词": [
        # Return Policy (15 words)
        ("30-day return", "30天退货", 1, "30-day free returns - we've got your back!"),
        ("free returns", "免费退货", 1, "FREE returns - no questions asked!"),
        ("return policy", "退货政策", 2, "Easy return policy - hassle-free!"),
        ("return window", "退货期", 2, "30-day return window - plenty of time!"),
        ("no questions asked", "不问理由", 2, "No questions asked - full refund!"),
        ("hassle-free returns", "无忧退货", 2, "Hassle-free returns - we make it easy!"),
        ("easy returns", "轻松退货", 1, "Easy returns process - 3 clicks only!"),
        ("return shipping", "退货运费", 2, "Free return shipping - we pay!"),
        ("refund process", "退款流程", 2, "Simple refund process - 48 hours!"),
        ("money back", "退款", 1, "Your money back - guaranteed!"),
        ("full refund", "全额退款", 2, "Full refund if not satisfied!"),
        ("partial refund", "部分退款", 2, "Partial refund available - fair deal!"),
        ("refund within 24h", "24小时内退款", 2, "Refund within 24 hours - super fast!"),
        ("satisfaction guarantee", "满意保证", 2, "100% satisfaction guarantee!"),
        ("not happy? refund!", "不满意退款", 1, "Not happy? Full refund - simple!"),

        # Warranty & Guarantee (15 words)
        ("lifetime warranty", "终身保修", 2, "Lifetime warranty - we stand behind our products!"),
        ("extended warranty", "延长保修", 2, "Extended warranty available - 2 years coverage!"),
        ("manufacturer warranty", "制造商保修", 3, "Full manufacturer warranty included!"),
        ("warranty claim", "保修索赔", 2, "Easy warranty claim process!"),
        ("warranty card", "保修卡", 2, "Warranty card included in package!"),
        ("warranty covers", "保修范围", 2, "Warranty covers everything - peace of mind!"),
        ("full coverage", "全额覆盖", 2, "Full coverage protection!"),
        ("protection plan", "保护计划", 2, "Add protection plan - extra security!"),
        ("quality guarantee", "质量保证", 2, "Quality guarantee - or money back!"),
        ("defect replacement", "缺陷更换", 3, "Free replacement for defects!"),
        ("repair service", "维修服务", 2, "Free repair service included!"),
        ("replacement", "更换", 2, "Free replacement if damaged!"),
        ("we stand behind", "我们支持", 2, "We stand behind our products 100%!"),
        ("guaranteed quality", "保证质量", 2, "Guaranteed quality - certified!"),
        ("certified", "认证", 2, "Certified quality - meets all standards!"),

        # Customer Care & Follow-up (20 words)
        ("follow-up", "后续跟进", 2, "We'll do a follow-up - ensure satisfaction!"),
        ("check-in", "签到问候", 2, "Post-purchase check-in - how's it going?"),
        ("customer care", "客户关怀", 2, "Amazing customer care team!"),
        ("after-sales service", "售后服务", 2, "Excellent after-sales service!"),
        ("support team", "支持团队", 1, "Dedicated support team for you!"),
        ("help desk", "帮助台", 2, "24/7 help desk - always available!"),
        ("priority support", "优先支持", 2, "VIPs get priority support!"),
        ("exclusive service", "专属服务", 2, "Exclusive service for our customers!"),
        ("VIP treatment", "VIP待遇", 2, "VIP treatment - you're special!"),
        ("white glove", "白手套服务", 3, "White glove service - premium care!"),
        ("personal assistance", "个人协助", 2, "Personal assistance - dedicated agent!"),
        ("dedicated support", "专属支持", 3, "Dedicated support agent assigned!"),
        ("customer success", "客户成功", 3, "Your success is our success!"),
        ("happy customers", "快乐的客户", 1, "100,000+ happy customers!"),
        ("positive feedback", "正面反馈", 2, "Overwhelming positive feedback!"),
        ("five-star service", "五星服务", 2, "Five-star service guaranteed!"),
        ("raving fans", "狂热粉丝", 2, "Customers are raving about us!"),
        ("repeat buyers", "回头客", 2, "70% are repeat buyers - says it all!"),
        ("loyalty program", "忠诚度计划", 2, "Join our loyalty program - earn rewards!"),
        ("member benefits", "会员福利", 2, "Exclusive member benefits - join now!"),
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
        "word_id": f"live_{word.replace(' ', '_').replace('/', '_').lower()}",
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
                "source": "livestream_week1_expansion",
                "tone": "enthusiastic_streamer",
                "platform": "multi_platform"
            }],
            "tags": ["livestream", "ecommerce", "week1_expansion"]
        }],
        "metadata": {
            "domain": "livestream_commerce",
            "urgency_level": "medium",
            "conversion_power": "high",
            "expansion_wave": "week1",
            "created_at": datetime.now().isoformat()
        }
    }


def expand_database(existing_data):
    """Expand database with Week 1 vocabulary"""
    print("\n[Expanding database - Week 1]")
    print("="*70)

    # Get existing words
    existing_words = existing_data.get("words", [])
    existing_word_set = set(w.get("word", "").lower() for w in existing_words)

    # Create new entries
    new_entries = []
    total_added = 0

    for category, word_list in WEEK1_VOCABULARY.items():
        print(f"\n[*] Processing: {category}")
        print(f"    Target: {len(word_list)} words")

        added_count = 0
        for item in word_list:
            word, cn, level, example = item

            # Skip if word already exists
            if word.lower() in existing_word_set:
                print(f"      - Skipped (exists): {word}")
                continue

            # Create entry
            entry = create_entry(word, cn, category, level, example)
            new_entries.append(entry)
            existing_word_set.add(word.lower())
            added_count += 1
            total_added += 1

        print(f"    [OK] Added: {added_count} new words")

    print(f"\n{'='*70}")
    print(f"[Summary Week 1]")
    print(f"  Total new words added: {total_added}")
    print(f"  Previous total: {len(existing_words)}")
    print(f"  New total: {len(existing_words) + total_added}")

    return existing_words + new_entries, total_added


def update_metadata(existing_data, words_added):
    """Update database metadata"""
    print("\n[Updating metadata...]")

    total_words = len(existing_data.get("words", []))

    existing_data["meta"]["total_words"] = total_words
    existing_data["meta"]["last_expansion"] = "week1"
    existing_data["meta"]["last_updated"] = datetime.now().isoformat()
    existing_data["meta"]["expansion_history"] = existing_data["meta"].get("expansion_history", [])

    existing_data["meta"]["expansion_history"].append({
        "wave": "week1",
        "date": datetime.now().isoformat(),
        "words_added": words_added,
        "categories_added": ["客服沟通词", "支付物流词", "售后服务词"],
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


def generate_week1_report(data, words_added):
    """Generate Week 1 completion report"""
    print("\n[Generating Week 1 report...]")

    report = {
        "wave": "week1",
        "completed_at": datetime.now().isoformat(),
        "words_added": words_added,
        "categories_added": {
            "客服沟通词": 50,
            "支付物流词": 50,
            "售后服务词": 50
        },
        "total_database_size": data["meta"]["total_words"],
        "next_steps": [
            "Week 2: Add 促销活动词 (48) + AI科技词 (50) + 竞品分析词 (40)",
            "Week 3: Add 数据分析词 (36) + Quality Check",
            "Target: Reach 500 words by Week 3"
        ]
    }

    report_path = BASE_DIR / "src/assets/data/livestream_week1_report.json"
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    return report


def print_final_report(report):
    """Print final Week 1 report"""
    print("\n" + "="*70)
    print(" "*15 + "WEEK 1 EXPANSION - COMPLETED!")
    print("="*70)

    print(f"\n[Week 1 Achievements]")
    print(f"  Words Added: {report['words_added']}")
    print(f"  Database Size: {report['total_database_size']} → {report['total_database_size'] + report['words_added']}")

    print(f"\n[Categories Added]")
    for cat, count in report['categories_added'].items():
        print(f"  {cat}: {count} words")

    print(f"\n[Next Steps]")
    for i, step in enumerate(report['next_steps'], 1):
        print(f"  {i}. {step}")

    print("\n" + "="*70)
    print(" "*20 + "Week 1 Complete - Success!")
    print("="*70 + "\n")


def main():
    print("="*70)
    print(" "*10 + "LIVESTREAM VOCABULARY EXPANSION - WEEK 1")
    print("  Adding 150 words: Customer Service + Payment/Logistics + After-sales")
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
    report = generate_week1_report(updated_data, words_added)

    # Print report
    print_final_report(report)


if __name__ == "__main__":
    main()
