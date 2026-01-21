# scripts/patch_QRST.py
import json

# 硬编码 60 个核心词（Q, R, S, T 各 15 个）- 2026 前沿语境版
words_data = {
    # Q (15个)
    "quality": {
        "word": "Quality",
        "phonetic": "/ˈkwɑːləti/",
        "part_of_speech": "n.",
        "meaning": "质量；品质；优质",
        "example": "AI agents automatically monitor product quality on manufacturing lines in 2026.",
        "translation": "2026年，AI代理人在生产线上自动监控产品质量。"
    },
    "quantity": {
        "word": "Quantity",
        "phonetic": "/ˈkwɑːntəti/",
        "part_of_speech": "n.",
        "meaning": "数量；分量",
        "example": "Smart inventory systems predict exact quantities needed for restocking.",
        "translation": "智能库存系统预测补货所需的精确数量。"
    },
    "question": {
        "word": "Question",
        "phonetic": "/ˈkwestʃən/",
        "part_of_speech": "n./v.",
        "meaning": "问题；疑问；质疑",
        "example": "Students can ask questions to AI tutors 24/7 through learning platforms.",
        "translation": "学生可以通过学习平台全天候向AI导师提问。"
    },
    "quick": {
        "word": "Quick",
        "phonetic": "/kwɪk/",
        "part_of_speech": "adj.",
        "meaning": "快的；迅速的",
        "example": "Quick charging stations for electric vehicles are ubiquitous in cities now.",
        "translation": "电动汽车快速充电站在城市中已无处不在。"
    },
    "quiet": {
        "word": "Quiet",
        "phonetic": "/ˈkwaɪət/",
        "part_of_speech": "adj.",
        "meaning": "安静的；轻声的",
        "example": "Quiet electric delivery drones operate in urban areas during early mornings.",
        "translation": "安静的电动配送无人机在清晨时分于城市区域作业。"
    },
    "quite": {
        "word": "Quite",
        "phonetic": "/kwaɪt/",
        "part_of_speech": "adv.",
        "meaning": "相当；十分",
        "example": "The carbon footprint reduction was quite significant after switching to green energy.",
        "translation": "改用绿色能源后，碳足迹减少相当显著。"
    },
    "quote": {
        "word": "Quote",
        "phonetic": "/kwoʊt/",
        "part_of_speech": "v./n.",
        "meaning": "引用；报价；引语",
        "example": "The app instantly quotes prices for services using real-time market data.",
        "translation": "该应用使用实时市场数据即时报价服务。"
    },
    "quarter": {
        "word": "Quarter",
        "phonetic": "/ˈkwɔːrtər/",
        "part_of_speech": "n.",
        "meaning": "四分之一；季度；一刻钟",
        "example": "Company earnings exceeded forecasts for the third quarter of 2026.",
        "translation": "公司2026年第三季度收益超出预测。"
    },
    "queen": {
        "word": "Queen",
        "phonetic": "/kwiːn/",
        "part_of_speech": "n.",
        "meaning": "女王；王后；（纸牌中的）王后",
        "example": "The virtual reality tour lets visitors explore the queen's historic palace.",
        "translation": "虚拟现实游览让访客探索女王的历史宫殿。"
    },
    "quickly": {
        "word": "Quickly",
        "phonetic": "/ˈkwɪkli/",
        "part_of_speech": "adv.",
        "meaning": "迅速地；很快地",
        "example": "Emergency response teams quickly assess damage using drone surveillance.",
        "translation": "紧急响应团队使用无人机监视快速评估损害。"
    },
    "quietly": {
        "word": "Quietly",
        "phonetic": "/ˈkwaɪətli/",
        "part_of_speech": "adv.",
        "meaning": "安静地；悄悄地",
        "example": "Autonomous robots quietly clean office buildings at night.",
        "translation": "自主机器人在夜间安静地清洁办公楼。"
    },
    "quest": {
        "word": "Quest",
        "phonetic": "/kwest/",
        "part_of_speech": "n.",
        "meaning": "探索；追求；任务",
        "example": "The scientific quest for sustainable energy solutions accelerated in 2026.",
        "translation": "2026年，寻找可持续能源解决方案的科学探索加速了。"
    },
    "quit": {
        "word": "Quit",
        "phonetic": "/kwɪt/",
        "part_of_speech": "v.",
        "meaning": "退出；停止；辞职",
        "example": "Users can quit the app anytime and their progress saves automatically.",
        "translation": "用户可以随时退出应用，进度会自动保存。"
    },
    "quiz": {
        "word": "Quiz",
        "phonetic": "/kwɪz/",
        "part_of_speech": "n.",
        "meaning": "测验；问答比赛",
        "example": "Interactive quizzes help students learn through gamified education platforms.",
        "translation": "互动测验通过游戏化教育平台帮助学生学习。"
    },
    "quote_mark": {
        "word": "Quotation mark",
        "phonetic": "/kwoʊˈteɪʃən mɑːrk/",
        "part_of_speech": "n.",
        "meaning": "引号",
        "example": "Text formatting software automatically pairs quotation marks while typing.",
        "translation": "文本格式化软件在输入时自动配对引号。"
    },

    # R (15个)
    "remote": {
        "word": "Remote",
        "phonetic": "/rɪˈmoʊt/",
        "part_of_speech": "adj./n.",
        "meaning": "遥远的；远程的；遥控器",
        "example": "Remote work has revolutionized how companies hire talent globally in 2026.",
        "translation": "2026年，远程工作彻底改变了公司在全球招聘人才的方式。"
    },
    "resource": {
        "word": "Resource",
        "phonetic": "/ˈriːsɔːrs/",
        "part_of_speech": "n.",
        "meaning": "资源；资料；财力",
        "example": "Cloud computing resources scale dynamically based on workload demands.",
        "translation": "云计算资源根据工作负载需求动态扩展。"
    },
    "record": {
        "word": "Record",
        "phonetic": "/ˈrekərd/ /rɪˈkɔːrd/",
        "part_of_speech": "n./v.",
        "meaning": "记录；唱片；记录；录制",
        "example": "Blockchain technology provides an immutable record of digital transactions.",
        "translation": "区块链技术为数字交易提供不可篡改的记录。"
    },
    "reduce": {
        "word": "Reduce",
        "phonetic": "/rɪˈduːs/",
        "part_of_speech": "v.",
        "meaning": "减少；降低；简化",
        "example": "Smart manufacturing significantly reduces waste through AI optimization.",
        "translation": "智能制造通过AI优化显著减少浪费。"
    },
    "report": {
        "word": "Report",
        "phonetic": "/rɪˈpɔːrt/",
        "part_of_speech": "n./v.",
        "meaning": "报告；报道；汇报",
        "example": "AI agents generate comprehensive reports from raw data automatically.",
        "translation": "AI代理自动从原始数据生成综合报告。"
    },
    "require": {
        "word": "Require",
        "phonetic": "/rɪˈkwaɪər/",
        "part_of_speech": "v.",
        "meaning": "需要；要求；命令",
        "example": "New regulations require companies to disclose their carbon footprint data.",
        "translation": "新法规要求公司披露其碳足迹数据。"
    },
    "research": {
        "word": "Research",
        "phonetic": "/ˈriːsɜːrtʃ/",
        "part_of_speech": "n./v.",
        "meaning": "研究；调查",
        "example": "Quantum computing research breakthroughs were announced in 2026.",
        "translation": "2026年宣布了量子计算研究的突破。"
    },
    "reach": {
        "word": "Reach",
        "phonetic": "/riːtʃ/",
        "part_of_speech": "v./n.",
        "meaning": "到达；达到；联系；范围",
        "example": "5G networks reach even remote rural areas for universal connectivity.",
        "translation": "5G网络覆盖偏远农村地区以实现普遍连接。"
    },
    "recent": {
        "word": "Recent",
        "phonetic": "/ˈriːsnt/",
        "part_of_speech": "adj.",
        "meaning": "最近的；近来的",
        "example": "Recent innovations in battery technology extended electric vehicle range.",
        "translation": "近期电池技术的创新延长了电动汽车的续航里程。"
    },
    "rate": {
        "word": "Rate",
        "phonetic": "/reɪt/",
        "part_of_speech": "n./v.",
        "meaning": "比率；速度；评级；评估",
        "example": "The adoption rate of AI assistants in homes exceeded 70% in 2026.",
        "translation": "2026年，家庭中AI助手的采用率超过70%。"
    },
    "rather": {
        "word": "Rather",
        "phonetic": "/ˈræðər/",
        "part_of_speech": "adv.",
        "meaning": "相当；宁愿；相反",
        "example": "Most consumers rather choose sustainable products despite higher costs.",
        "translation": "尽管成本较高，大多数消费者仍更愿意选择可持续产品。"
    },
    "realize": {
        "word": "Realize",
        "phonetic": "/ˈriːəlaɪz/",
        "part_of_speech": "v.",
        "meaning": "实现；意识到；明白",
        "example": "Companies realize that data privacy builds customer trust and loyalty.",
        "translation": "公司意识到数据隐私能建立客户信任和忠诚度。"
    },
    "regular": {
        "word": "Regular",
        "phonetic": "/ˈreɡjələr/",
        "part_of_speech": "adj.",
        "meaning": "规则的；定期的；正常的",
        "example": "Regular software updates ensure security and performance improvements.",
        "translation": "定期软件更新确保安全性和性能改进。"
    },
    "relate": {
        "word": "Relate",
        "phonetic": "/rɪˈleɪt/",
        "part_of_speech": "v.",
        "meaning": "联系；涉及；叙述",
        "example": "Social platforms connect users who relate to similar interests and causes.",
        "translation": "社交平台将关注相似兴趣和事业的用户连接起来。"
    },
    "result": {
        "word": "Result",
        "phonetic": "/rɪˈzʌlt/",
        "part_of_speech": "n.",
        "meaning": "结果；后果；成绩",
        "example": "As a result of automation, productivity increased by 40% in 2026.",
        "translation": "由于自动化，2026年生产力提高了40%。"
    },

    # S (15个)
    "smart": {
        "word": "Smart",
        "phonetic": "/smɑːrt/",
        "part_of_speech": "adj.",
        "meaning": "聪明的；智能的；敏捷的",
        "example": "Smart cities use IoT sensors to optimize traffic flow and energy consumption.",
        "translation": "智慧城市使用物联网传感器优化交通流量和能源消耗。"
    },
    "system": {
        "word": "System",
        "phonetic": "/ˈsɪstəm/",
        "part_of_speech": "n.",
        "meaning": "系统；制度；体系",
        "example": "The operating system supports augmented reality applications seamlessly.",
        "translation": "该操作系统无缝支持增强现实应用。"
    },
    "service": {
        "word": "Service",
        "phonetic": "/ˈsɜːrvɪs/",
        "part_of_speech": "n.",
        "meaning": "服务；公务；维修",
        "example": "Subscription services replaced traditional ownership models for digital products.",
        "translation": "订阅服务取代了数字产品的传统拥有模式。"
    },
    "social": {
        "word": "Social",
        "phonetic": "/ˈsoʊʃl/",
        "part_of_speech": "adj.",
        "meaning": "社会的；社交的；群居的",
        "example": "Social media algorithms prioritize content from friends and family.",
        "translation": "社交媒体算法优先展示来自朋友和家人的内容。"
    },
    "support": {
        "word": "Support",
        "phonetic": "/səˈpɔːrt/",
        "part_of_speech": "v./n.",
        "meaning": "支持；支撑；维持",
        "example": "AI customer support handles 80% of inquiries without human intervention.",
        "translation": "AI客户支持无需人工干预即可处理80%的咨询。"
    },
    "source": {
        "word": "Source",
        "phonetic": "/sɔːrs/",
        "part_of_speech": "n.",
        "meaning": "来源；源头；源代码",
        "example": "Open source software drives innovation in enterprise solutions globally.",
        "translation": "开源软件推动全球企业解决方案的创新。"
    },
    "state": {
        "word": "State",
        "phonetic": "/steɪt/",
        "part_of_speech": "n./v./adj.",
        "meaning": "状态；国家；陈述；州的",
        "example": "The state of the art AI model achieves human-level performance.",
        "translation": "最先进的AI模型达到人类水平的性能。"
    },
    "standard": {
        "word": "Standard",
        "phonetic": "/ˈstændərd/",
        "part_of_speech": "n./adj.",
        "meaning": "标准；水准；标准的",
        "example": "Industry standard protocols ensure interoperability between smart devices.",
        "translation": "行业标准协议确保智能设备之间的互操作性。"
    },
    "structure": {
        "word": "Structure",
        "phonetic": "/ˈstrʌktʃər/",
        "part_of_speech": "n./v.",
        "meaning": "结构；构造；建造；组织",
        "example": "The molecular structure was analyzed using quantum simulation tools.",
        "translation": "分子结构使用量子模拟工具进行分析。"
    },
    "security": {
        "word": "Security",
        "phonetic": "/sɪˈkjʊrəti/",
        "part_of_speech": "n.",
        "meaning": "安全；保障；证券",
        "example": "Biometric authentication became the standard for mobile security in 2026.",
        "translation": "2026年，生物特征认证成为移动安全的标准。"
    },
    "significant": {
        "word": "Significant",
        "phonetic": "/sɪɡˈnɪfɪkənt/",
        "part_of_speech": "adj.",
        "meaning": "重要的；显著的；意味深长的",
        "example": "Significant improvements in battery efficiency enabled longer device usage.",
        "translation": "电池效率的显著改进使设备使用时间更长。"
    },
    "solution": {
        "word": "Solution",
        "phonetic": "/səˈluːʃn/",
        "part_of_speech": "n.",
        "meaning": "解决方案；解答；溶解",
        "example": "AI-powered solutions optimize logistics for e-commerce delivery networks.",
        "translation": "AI驱动的解决方案为电商配送网络优化物流。"
    },
    "staff": {
        "word": "Staff",
        "phonetic": "/stæf/",
        "part_of_speech": "n.",
        "meaning": "员工；全体职员；参谋",
        "example": "Medical staff use AI diagnostics to improve patient care accuracy.",
        "translation": "医务人员使用AI诊断提高患者护理准确性。"
    },
    "status": {
        "word": "Status",
        "phonetic": "/ˈsteɪtəs/",
        "part_of_speech": "n.",
        "meaning": "状态；地位；身份",
        "example": "Real-time status updates keep users informed about their orders.",
        "translation": "实时状态更新让用户了解其订单情况。"
    },
    "strategy": {
        "word": "Strategy",
        "phonetic": "/ˈstrætədʒi/",
        "part_of_speech": "n.",
        "meaning": "策略；战略",
        "example": "The company's digital transformation strategy focused on cloud-first approaches.",
        "translation": "公司的数字化转型战略专注于云优先方法。"
    },

    # T (15个)
    "tech": {
        "word": "Tech",
        "phonetic": "/tek/",
        "part_of_speech": "n.",
        "meaning": "技术；科技",
        "example": "Tech giants invested billions in metaverse infrastructure development in 2026.",
        "translation": "2026年，科技巨头在元宇宙基础设施开发上投资数十亿。"
    },
    "technology": {
        "word": "Technology",
        "phonetic": "/tekˈnɑːlədʒi/",
        "part_of_speech": "n.",
        "meaning": "技术；工艺；科技",
        "example": "Blockchain technology ensures transparent supply chains for consumer products.",
        "translation": "区块链技术确保消费品供应链的透明度。"
    },
    "trend": {
        "word": "Trend",
        "phonetic": "/trend/",
        "part_of_speech": "n.",
        "meaning": "趋势；倾向；时尚",
        "example": "The low-altitude economy trend created new opportunities for urban air mobility.",
        "translation": "低空经济趋势为城市空中机动性创造了新机遇。"
    },
    "target": {
        "word": "Target",
        "phonetic": "/ˈtɑːrɡɪt/",
        "part_of_speech": "n./v.",
        "meaning": "目标；靶子；以此为目标",
        "example": "The campaign targeted specific demographics using AI-driven analytics.",
        "translation": "该活动使用AI驱动分析针对特定人群。"
    },
    "team": {
        "word": "Team",
        "phonetic": "/tiːm/",
        "part_of_speech": "n.",
        "meaning": "团队；组；队",
        "example": "Virtual reality tools enable remote teams to collaborate in shared spaces.",
        "translation": "虚拟现实工具让远程团队在共享空间中协作。"
    },
    "task": {
        "word": "Task",
        "phonetic": "/tæsk/",
        "part_of_speech": "n.",
        "meaning": "任务；工作；作业",
        "example": "AI agents automate repetitive tasks, freeing humans for creative work.",
        "translation": "AI代理自动化重复性任务，让人类专注于创造性工作。"
    },
    "total": {
        "word": "Total",
        "phonetic": "/ˈtoʊtl/",
        "part_of_speech": "adj./n.",
        "meaning": "总的；完全的；总计",
        "example": "Total carbon emissions decreased by 15% due to green energy adoption.",
        "translation": "由于采用绿色能源，总碳排放量减少了15%。"
    },
    "through": {
        "word": "Through",
        "phonetic": "/θruː/",
        "part_of_speech": "prep./adv.",
        "meaning": "通过；穿过；凭借",
        "example": "Students access educational resources through cloud-based learning platforms.",
        "translation": "学生通过基于云的学习平台访问教育资源。"
    },
    "throughout": {
        "word": "Throughout",
        "phonetic": "/θruːˈaʊt/",
        "part_of_speech": "prep./adv.",
        "meaning": "遍及；贯穿；在整个期间",
        "example": "Digital payments are accepted throughout the country without transaction fees.",
        "translation": "全国接受数字支付，无需交易手续费。"
    },
    "today": {
        "word": "Today",
        "phonetic": "/təˈdeɪ/",
        "part_of_speech": "n./adv.",
        "meaning": "今天；现今",
        "example": "Today's workforce demands flexibility in work hours and locations.",
        "translation": "现今的劳动力要求工作时间和地点的灵活性。"
    },
    "together": {
        "word": "Together",
        "phonetic": "/təˈɡeðər/",
        "part_of_speech": "adv.",
        "meaning": "一起；共同；同时",
        "example": "Global research communities together solved complex climate challenges.",
        "translation": "全球研究界共同解决了复杂的气候挑战。"
    },
    "traditional": {
        "word": "Traditional",
        "phonetic": "/trəˈdɪʃənl/",
        "part_of_speech": "adj.",
        "meaning": "传统的；惯例的",
        "example": "Traditional classrooms evolved into hybrid learning environments by 2026.",
        "translation": "到2026年，传统教室演变为混合学习环境。"
    },
    "treatment": {
        "word": "Treatment",
        "phonetic": "/ˈtriːtmənt/",
        "part_of_speech": "n.",
        "meaning": "治疗；处理；待遇",
        "example": "Personalized treatment plans are generated by AI medical diagnosis systems.",
        "translation": "个性化治疗方案由AI医疗诊断系统生成。"
    },
    "training": {
        "word": "Training",
        "phonetic": "/ˈtreɪnɪŋ/",
        "part_of_speech": "n.",
        "meaning": "训练；培训；培养",
        "example": "Virtual reality training simulates dangerous scenarios safely for workers.",
        "translation": "虚拟现实培训为工人安全模拟危险场景。"
    },
    "transaction": {
        "word": "Transaction",
        "phonetic": "/trænˈzækʃn/",
        "part_of_speech": "n.",
        "meaning": "交易；业务；办理",
        "example": "Contactless transactions became the preferred payment method worldwide in 2026.",
        "translation": "2026年，非接触式交易成为全球首选支付方式。"
    }
}

# 极简逻辑：直接 update
def main():
    # 读取现有数据
    with open("src/assets/data/master_words_pool.json", "r", encoding="utf-8") as f:
        data = json.load(f)

    # 直接更新
    data.update(words_data)

    # 保存
    with open("src/assets/data/master_words_pool.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"[OK] Added {len(words_data)} words")

if __name__ == "__main__":
    main()
