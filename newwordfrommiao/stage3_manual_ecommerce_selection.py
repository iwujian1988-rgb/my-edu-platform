#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
阶段3：场景词书清洗 - 跨境电商核心词汇（人工精选版）
精选 50 个最贴合跨境电商场景的核心词汇
"""

import json
import sys

# 设置标准输出编码为 UTF-8
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')


# 人工精选的跨境电商核心 50 词
ECOMMERCE_TOP_50 = {
    "运营管理类": [
        {
            "word": "manage",
            "reason": "店铺运营核心动词，管理店铺、库存、订单"
        },
        {
            "word": "management",
            "reason": "名词形式，店铺管理体系、团队管理"
        },
        {
            "word": "operate",
            "reason": "运营操作，运作电商业务"
        },
        {
            "word": "operation",
            "reason": "运营流程，日常操作"
        },
        {
            "word": "business",
            "reason": "电商业务，商业模式"
        },
        {
            "word": "strategy",
            "reason": "运营策略，营销策略，选品策略"
        },
        {
            "word": "analyze",
            "reason": "数据分析，市场分析，竞品分析"
        },
        {
            "word": "performance",
            "reason": "业绩表现，店铺绩效，转化率"
        },
        {
            "word": "optimize",
            "reason": "优化Listing，优化广告，提升转化"
        },
        {
            "word": "scale",
            "reason": "规模化，扩大业务"
        }
    ],
    "选品类": [
        {
            "word": "product",
            "reason": "产品，核心词汇"
        },
        {
            "word": "market",
            "reason": "市场，目标市场，市场需求"
        },
        {
            "word": "competition",
            "reason": "竞争，竞品分析，竞争优势"
        },
        {
            "word": "competitive",
            "reason": "有竞争力的，价格优势"
        },
        {
            "word": "source",
            "reason": "货源，供应商，产品来源"
        },
        {
            "word": "supplier",
            "reason": "供应商，厂家"
        },
        {
            "word": "quality",
            "reason": "产品质量，品质控制"
        },
        {
            "word": "stock",
            "reason": "库存，现货，备货"
        },
        {
            "word": "inventory",
            "reason": "库存清单，库存管理"
        },
        {
            "word": "wholesale",
            "reason": "批发，批发价，货源采购"
        }
    ],
    "引流营销类": [
        {
            "word": "traffic",
            "reason": "流量，网站流量，店铺访问量"
        },
        {
            "word": "customer",
            "reason": "客户，目标客户群"
        },
        {
            "word": "advertise",
            "reason": "做广告，投放广告"
        },
        {
            "word": "advertisement",
            "reason": "广告，广告投放"
        },
        {
            "word": "promote",
            "reason": "推广，促销，产品推广"
        },
        {
            "word": "promotion",
            "reason": "促销活动，营销推广"
        },
        {
            "word": "brand",
            "reason": "品牌，品牌建设"
        },
        {
            "word": "marketing",
            "reason": "市场营销，营销策略"
        },
        {
            "word": "audience",
            "reason": "受众，目标受众，客群定位"
        },
        {
            "word": "conversion",
            "reason": "转化，转化率，流量转化"
        },
        {
            "word": "attract",
            "reason": "吸引客户，吸引流量"
        },
        {
            "word": "platform",
            "reason": "平台，电商平台（Amazon/eBay等）"
        }
    ],
    "支付财务类": [
        {
            "word": "payment",
            "reason": "支付，付款方式"
        },
        {
            "word": "purchase",
            "reason": "购买，采购"
        },
        {
            "word": "order",
            "reason": "订单，下单"
        },
        {
            "word": "transaction",
            "reason": "交易，交易记录"
        },
        {
            "word": "commission",
            "reason": "佣金，平台佣金，销售提成"
        },
        {
            "word": "profit",
            "reason": "利润，盈利空间"
        },
        {
            "word": "margin",
            "reason": "利润率，毛利率"
        },
        {
            "word": "fee",
            "reason": "费用，手续费，平台费"
        },
        {
            "word": "charge",
            "reason": "收费，费用，运费"
        },
        {
            "word": "cost",
            "reason": "成本，产品成本"
        },
        {
            "word": "discount",
            "reason": "折扣，打折促销"
        },
        {
            "word": "refund",
            "reason": "退款，退货退款"
        }
    ],
    "物流售后类": [
        {
            "word": "ship",
            "reason": "发货，运输，配送"
        },
        {
            "word": "shipping",
            "reason": "发货，物流配送"
        },
        {
            "word": "delivery",
            "reason": "配送，交付，送达"
        },
        {
            "word": "logistics",
            "reason": "物流，物流管理"
        },
        {
            "word": "package",
            "reason": "包装，包裹"
        },
        {
            "word": "track",
            "reason": "跟踪，物流追踪"
        },
        {
            "word": "express",
            "reason": "快递，快递服务"
        },
        {
            "word": "freight",
            "reason": "运费，货运"
        },
        {
            "word": "customs",
            "reason": "海关，清关"
        },
        {
            "word": "import",
            "reason": "进口，进口商品"
        },
        {
            "word": "global",
            "reason": "全球的，跨境电商"
        },
        {
            "word": "service",
            "reason": "服务，客户服务"
        },
        {
            "word": "support",
            "reason": "支持，售后支持"
        }
    ]
}


def load_word_details(word: str) -> dict:
    """从词库中加载单词的详细信息"""
    levels = ['cet4', 'cet6', 'ielts', 'toefl']

    for level in levels:
        with open(f'src/assets/data/{level}_words.json', 'r', encoding='utf-8') as f:
            words = json.load(f)
            for w in words:
                if w['word'].lower() == word.lower():
                    return w

    # 如果找不到，返回基本信息
    return {
        'word': word,
        'phonetic': '',
        'translation': '需人工补充',
        'definition': ''
    }


def main():
    """主函数"""
    print("="*100)
    print("跨境电商场景核心 50 词（人工精选版）")
    print("="*100)
    print()

    total_count = 0

    for category, word_list in ECOMMERCE_TOP_50.items():
        print(f"\n{'═'*100}")
        print(f"【{category}】({len(word_list)} 个)")
        print(f"{'═'*100}")
        print()

        # 表头
        print(f"{'序号':<4} {'单词':<18} {'音标':<20} {'中文翻译':<35} {'入选理由'}")
        print(f"{'─'*100}")

        for i, item in enumerate(word_list, 1):
            word = item['word']
            reason = item['reason']

            # 从词库加载详细信息
            word_obj = load_word_details(word)
            phonetic = word_obj.get('phonetic', '')
            translation = word_obj.get('translation', '').split('\\n')[0][:35]

            print(f"{i:<4} {word:<18} {phonetic:<20} {translation:<35} {reason}")

            total_count += 1

    print()
    print("="*100)
    print(f"总计：{total_count} 个核心词汇")
    print("="*100)
    print()

    # 保存到文件
    output_data = []
    for category, word_list in ECOMMERCE_TOP_50.items():
        for item in word_list:
            word_obj = load_word_details(item['word'])
            word_obj['scenario'] = 'ecommerce'
            word_obj['scenario_category'] = category
            word_obj['reason'] = item['reason']
            output_data.append(word_obj)

    import os
    os.makedirs('src/assets/scenarios', exist_ok=True)

    output_file = 'src/assets/scenarios/scenario_ecommerce_top50.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)

    print(f"✅ 已保存到: {output_file}")
    print()
    print("📋 请审核以上 50 个核心词汇，确认方向正确后将执行大规模自动化任务")


if __name__ == "__main__":
    main()
