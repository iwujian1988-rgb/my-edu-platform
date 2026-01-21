# scripts/patch_IJKL.py - 快速补充 I, J, K, L 核心词
import json

# I, J, K, L 核心词（共 57 词）
words_data = {
    # I (20词)
    "identify": {
        "word": "Identify",
        "phonetic": "/aɪˈdentɪfaɪ/",
        "part_of_speech": "v.",
        "meaning": "识别；认出；确定",
        "example": "Biometric scanners identify users instantly for secure access in 2026.",
        "translation": "2026年，生物特征扫描仪瞬间识别用户以实现安全访问。"
    },
    "ignore": {
        "word": "Ignore",
        "phonetic": "/ɪɡˈnɔːr/",
        "part_of_speech": "v.",
        "meaning": "忽视；忽略；不理睬",
        "example": "Smart filters ignore spam messages and prioritize important communications.",
        "translation": "智能过滤器忽略垃圾信息并优先处理重要通信。"
    },
    "illegal": {
        "word": "Illegal",
        "phonetic": "/ɪˈliːɡl/",
        "part_of_speech": "adj.",
        "meaning": "非法的；违法的",
        "example": "AI systems detect illegal activities on digital platforms automatically.",
        "translation": "AI系统自动检测数字平台上的非法活动。"
    },
    "illustrate": {
        "word": "Illustrate",
        "phonetic": "/ˈɪləstreɪt/",
        "part_of_speech": "v.",
        "meaning": "说明；举例说明；给...做插图",
        "example": "VR tools illustrate complex scientific concepts through interactive simulations.",
        "translation": "VR工具通过交互式模拟来说明复杂的科学概念。"
    },
    "image": {
        "word": "Image",
        "phonetic": "/ˈɪmɪdʒ/",
        "part_of_speech": "n.",
        "meaning": "图像；形象；印象",
        "example": "AI image generators create realistic photos from text descriptions.",
        "translation": "AI图像生成器从文本描述创建逼真的照片。"
    },
    "immigrate": {
        "word": "Immigrate",
        "phonetic": "/ˈɪmɪɡreɪt/",
        "part_of_speech": "v.",
        "meaning": "移居；移民入境",
        "example": "Digital nomads immigrate to countries offering remote work visas.",
        "translation": "数字游民移民到提供远程工作签证的国家。"
    },
    "impact": {
        "word": "Impact",
        "phonetic": "/ˈɪmpækt/",
        "part_of_speech": "n./v.",
        "meaning": "影响；冲击；撞击",
        "example": "The pandemic's impact accelerated remote work adoption globally.",
        "translation": "疫情的影响加速了全球远程办公的采用。"
    },
    "implement": {
        "word": "Implement",
        "phonetic": "/ˈɪmplɪment/",
        "part_of_speech": "v.",
        "meaning": "实施；执行；实现",
        "example": "Companies implement AI solutions to streamline business operations.",
        "translation": "公司实施AI解决方案以简化业务运营。"
    },
    "import": {
        "word": "Import",
        "phonetic": "/ˈɪmpɔːrt/",
        "part_of_speech": "v./n.",
        "meaning": "进口；输入；进口商品",
        "example": "Automated systems import data from multiple sources for analysis.",
        "translation": "自动化系统从多个来源导入数据进行分析。"
    },
    "important": {
        "word": "Important",
        "phonetic": "/ɪmˈpɔːrtənt/",
        "part_of_speech": "adj.",
        "meaning": "重要的；重大的",
        "example": "Data privacy became increasingly important for consumers by 2026.",
        "translation": "到2026年，数据隐私对消费者变得愈发重要。"
    },
    "impose": {
        "word": "Impose",
        "phonetic": "/ɪmˈpoʊz/",
        "part_of_speech": "v.",
        "meaning": "强加；征税；施加",
        "example": "Governments impose strict regulations on AI to ensure ethical use.",
        "translation": "政府对AI实施严格法规以确保道德使用。"
    },
    "improve": {
        "word": "Improve",
        "phonetic": "/ɪmˈpruːv/",
        "part_of_speech": "v.",
        "meaning": "改善；改进；提高",
        "example": "Continuous learning algorithms improve their accuracy over time.",
        "translation": "持续学习算法随着时间的推移提高其准确性。"
    },
    "include": {
        "word": "Include",
        "phonetic": "/ɪnˈkluːd/",
        "part_of_speech": "v.",
        "meaning": "包括；包含",
        "example": "Subscription plans include access to all premium features.",
        "translation": "订阅计划包括访问所有高级功能。"
    },
    "increase": {
        "word": "Increase",
        "phonetic": "/ɪnˈkriːs/",
        "part_of_speech": "v./n.",
        "meaning": "增加；提高；增长",
        "example": "Renewable energy capacity increased significantly across the nation.",
        "translation": "全国可再生能源容量显著增加。"
    },
    "indeed": {
        "word": "Indeed",
        "phonetic": "/ɪnˈdiːd/",
        "part_of_speech": "adv.",
        "meaning": "确实；的确；真正地",
        "example": "The results were indeed impressive, exceeding all expectations.",
        "translation": "结果确实令人印象深刻，超出了所有预期。"
    },
    "independent": {
        "word": "Independent",
        "phonetic": "/ˌɪndɪˈpendənt/",
        "part_of_speech": "adj.",
        "meaning": "独立的；自主的",
        "example": "Independent creators monetize content directly through blockchain platforms.",
        "translation": "独立创作者通过区块链平台直接将内容变现。"
    },
    "individual": {
        "word": "Individual",
        "phonetic": "/ˌɪndɪˈvɪdʒuəl/",
        "part_of_speech": "adj./n.",
        "meaning": "个人的；个体的；个人",
        "example": "AI tailors learning experiences to individual student needs.",
        "translation": "AI根据个人学生需求定制学习体验。"
    },
    "influence": {
        "word": "Influence",
        "phonetic": "/ˈɪnfluəns/",
        "part_of_speech": "n./v.",
        "meaning": "影响；影响力；影响",
        "example": "Social media influencers shape consumer trends and brand awareness.",
        "translation": "社交媒体影响者塑造消费趋势和品牌意识。"
    },
    "inform": {
        "word": "Inform",
        "phonetic": "/ɪnˈfɔːrm/",
        "part_of_speech": "v.",
        "meaning": "通知；告诉；报告",
        "example": "Apps inform users about data usage to promote transparency.",
        "translation": "应用通知用户数据使用情况以促进透明度。"
    },
    "information": {
        "word": "Information",
        "phonetic": "/ˌɪnfərˈmeɪʃn/",
        "part_of_speech": "n.",
        "meaning": "信息；消息；资料",
        "example": "Information overload led to demand for AI-powered content curation.",
        "translation": "信息过载导致对AI驱动内容策展的需求。"
    },
    "innovate": {
        "word": "Innovate",
        "phonetic": "/ˈɪnəveɪt/",
        "part_of_speech": "v.",
        "meaning": "创新；革新；改革",
        "example": "Tech startups innovate rapidly to capture emerging market opportunities.",
        "translation": "科技初创公司快速创新以抓住新兴市场机会。"
    },

    # J (12词)
    "job": {
        "word": "Job",
        "phonetic": "/dʒɑːb/",
        "part_of_speech": "n.",
        "meaning": "工作；职业；职责",
        "example": "Remote job opportunities expanded across all industries by 2026.",
        "translation": "到2026年，远程工作机会扩展到所有行业。"
    },
    "join": {
        "word": "Join",
        "phonetic": "/dʒɔɪn/",
        "part_of_speech": "v.",
        "meaning": "加入；连接；参加",
        "example": "Professionals join virtual communities to network and share expertise.",
        "translation": "专业人士加入虚拟社区以建立人脉和分享专业知识。"
    },
    "judge": {
        "word": "Judge",
        "phonetic": "/dʒʌdʒ/",
        "part_of_speech": "v./n.",
        "meaning": "判断；评判；法官",
        "example": "AI systems judge the quality of products in manufacturing lines.",
        "translation": "AI系统在生产线上判断产品质量。"
    },
    "journey": {
        "word": "Journey",
        "phonetic": "/ˈdʒɜːrni/",
        "part_of_speech": "n.",
        "meaning": "旅程；旅行；过程",
        "example": "Digital transformation requires a multi-year journey for most enterprises.",
        "translation": "数字化转型对大多数企业来说需要多年的旅程。"
    },
    "joy": {
        "word": "Joy",
        "phonetic": "/dʒɔɪ/",
        "part_of_speech": "n.",
        "meaning": "快乐；高兴；乐趣",
        "example": "Gaming platforms bring joy and social connection to millions.",
        "translation": "游戏平台为数百万人带来快乐和社交联系。"
    },
    "journal": {
        "word": "Journal",
        "phonetic": "/ˈdʒɜːrnl/",
        "part_of_speech": "n.",
        "meaning": "期刊；日报；日志",
        "example": "Open-access journals make scientific research freely available globally.",
        "translation": "开放获取期刊使科学研究在全球范围内免费提供。"
    },
    "justice": {
        "word": "Justice",
        "phonetic": "/ˈdʒʌstɪs/",
        "part_of_speech": "n.",
        "meaning": "正义；公正；司法",
        "example": "Algorithmic fairness ensures justice in automated decision-making.",
        "translation": "算法公平性确保自动化决策中的公正性。"
    },
    "justify": {
        "word": "Justify",
        "phonetic": "/ˈdʒʌstɪfaɪ/",
        "part_of_speech": "v.",
        "meaning": "证明...是正当的；为...辩护",
        "example": "Companies must justify data collection practices to regulators.",
        "translation": "公司必须向监管机构证明数据收集实践的正当性。"
    },
    "jacket": {
        "word": "Jacket",
        "phonetic": "/ˈdʒækɪt/",
        "part_of_speech": "n.",
        "meaning": "夹克；短上衣；护套",
        "example": "Smart jackets with integrated sensors monitor health metrics.",
        "translation": "带有集成传感器的智能夹克监测健康指标。"
    },
    "jail": {
        "word": "Jail",
        "phonetic": "/dʒeɪl/",
        "part_of_speech": "n./v.",
        "meaning": "监狱；监禁",
        "example": "Cybercriminals face jail time for hacking critical infrastructure.",
        "translation": "网络犯罪分子因黑客攻击关键基础设施而面临监禁。"
    },
    "jealous": {
        "word": "Jealous",
        "phonetic": "/ˈdʒeləs/",
        "part_of_speech": "adj.",
        "meaning": "嫉妒的；羡慕的",
        "example": "Competitors became jealous of the startup's rapid market success.",
        "translation": "竞争对手对这家初创公司的快速市场成功感到嫉妒。"
    },
    "jungle": {
        "word": "Jungle",
        "phonetic": "/ˈdʒʌŋɡl/",
        "part_of_speech": "n.",
        "meaning": "丛林；密林；混乱的局面",
        "example": "Drones monitor deforestation in endangered jungle regions.",
        "translation": "无人机监测濒危丛林地区的森林砍伐情况。"
    },

    # K (10词)
    "keep": {
        "word": "Keep",
        "phonetic": "/kiːp/",
        "part_of_speech": "v.",
        "meaning": "保持；保留；遵守",
        "example": "Cloud services keep your data safe across multiple devices.",
        "translation": "云服务在多个设备上保持您的数据安全。"
    },
    "key": {
        "word": "Key",
        "phonetic": "/kiː/",
        "part_of_speech": "adj./n.",
        "meaning": "关键的；钥匙；关键",
        "example": "Encryption keys protect sensitive information from unauthorized access.",
        "translation": "加密密钥保护敏感信息免受未经授权的访问。"
    },
    "keyboard": {
        "word": "Keyboard",
        "phonetic": "/ˈkiːbɔːrd/",
        "part_of_speech": "n.",
        "meaning": "键盘；键盘乐器",
        "example": "Voice recognition reduced reliance on keyboards for text input.",
        "translation": "语音识别减少了对键盘进行文本输入的依赖。"
    },
    "kick": {
        "word": "Kick",
        "phonetic": "/kɪk/",
        "part_of_speech": "v./n.",
        "meaning": "踢；踢腿；兴奋",
        "example": "The project kick-off meeting introduced team members and goals.",
        "translation": "项目启动会议介绍了团队成员和目标。"
    },
    "kill": {
        "word": "Kill",
        "phonetic": "/kɪl/",
        "part_of_speech": "v.",
        "meaning": "杀死；消磨；终止",
        "example": "Antivirus software kills malware before it infects the system.",
        "translation": "杀毒软件在恶意软件感染系统之前将其清除。"
    },
    "kind": {
        "word": "Kind",
        "phonetic": "/kaɪnd/",
        "part_of_speech": "adj./n.",
        "meaning": "友善的；种类；某种",
        "example": "AI assistants respond kindly to user frustrations with empathy.",
        "translation": "AI助手以同理心友善地回应用户的挫败感。"
    },
    "king": {
        "word": "King",
        "phonetic": "/kɪŋ/",
        "part_of_speech": "n.",
        "meaning": "国王；君主；大王",
        "example": "The king of e-commerce dominated online retail globally.",
        "translation": "电商之王在全球在线零售领域占据主导地位。"
    },
    "kitchen": {
        "word": "Kitchen",
        "phonetic": "/ˈkɪtʃən/",
        "part_of_speech": "n.",
        "meaning": "厨房；烹饪场所",
        "example": "Smart kitchens automate meal prep with connected appliances.",
        "translation": "智能厨房通过互联电器自动化膳食准备。"
    },
    "know": {
        "word": "Know",
        "phonetic": "/noʊ/",
        "part_of_speech": "v.",
        "meaning": "知道；了解；认识",
        "example": "Search engines know your preferences to personalize results.",
        "translation": "搜索引擎了解您的偏好以个性化结果。"
    },
    "knowledge": {
        "word": "Knowledge",
        "phonetic": "/ˈnɑːlɪdʒ/",
        "part_of_speech": "n.",
        "meaning": "知识；学问；了解",
        "example": "Knowledge workers leverage AI to enhance productivity and creativity.",
        "translation": "知识工作者利用AI提高生产力和创造力。"
    },

    # L (15词)
    "land": {
        "word": "Land",
        "phonetic": "/lænd/",
        "part_of_speech": "n./v.",
        "meaning": "土地；着陆；到达",
        "example": "Vertical farming maximizes crop yields on limited urban land.",
        "translation": "垂直农业在有限的城市土地上最大化作物产量。"
    },
    "law": {
        "word": "Law",
        "phonetic": "/lɔː/",
        "part_of_speech": "n.",
        "meaning": "法律；法规；法则",
        "example": "New data protection laws strengthen user privacy rights globally.",
        "translation": "新的数据保护法在全球范围内加强用户隐私权。"
    },
    "lay": {
        "word": "Lay",
        "phonetic": "/leɪ/",
        "part_of_speech": "v.",
        "meaning": "放置；铺设；产卵",
        "example": "Companies lay off employees to reduce costs during economic downturns.",
        "translation": "公司在经济低迷期间裁员以降低成本。"
    },
    "lead": {
        "word": "Lead",
        "phonetic": "/liːd/",
        "part_of_speech": "v./n.",
        "meaning": "领导；引导；铅",
        "example": "Innovative technologies lead the transformation of traditional industries.",
        "translation": "创新技术引领传统产业的转型。"
    },
    "learn": {
        "word": "Learn",
        "phonetic": "/lɜːrn/",
        "part_of_speech": "v.",
        "meaning": "学习；得知；获悉",
        "example": "Online platforms enable people to learn new skills at their own pace.",
        "translation": "在线平台使人们能够按自己的节奏学习新技能。"
    },
    "leave": {
        "word": "Leave",
        "phonetic": "/liːv/",
        "part_of_speech": "v./n.",
        "meaning": "离开；留下；休假",
        "example": "Flexible leave policies improve employee work-life balance and retention.",
        "translation": "灵活的休假政策改善员工的工作与生活平衡和留任率。"
    },
    "let": {
        "word": "Let",
        "phonetic": "/let/",
        "part_of_speech": "v.",
        "meaning": "让；允许；出租",
        "example": "Permission settings let users control who accesses their content.",
        "translation": "权限设置让用户控制谁可以访问他们的内容。"
    },
    "level": {
        "word": "Level",
        "phonetic": "/ˈlevl/",
        "part_of_speech": "n./adj.",
        "meaning": "水平；级别；水平的",
        "example": "Skill levels in programming are certified through blockchain credentials.",
        "translation": "编程技能水平通过区块链凭证认证。"
    },
    "life": {
        "word": "Life",
        "phonetic": "/laɪf/",
        "part_of_speech": "n.",
        "meaning": "生命；生活；人生",
        "example": "Digital life and physical life became increasingly integrated by 2026.",
        "translation": "到2026年，数字生活和现实生活变得日益融合。"
    },
    "light": {
        "word": "Light",
        "phonetic": "/laɪt/",
        "part_of_speech": "n./adj./v.",
        "meaning": "光；光线；轻的；点亮",
        "example": "Smart lighting systems adjust brightness based on natural light availability.",
        "translation": "智能照明系统根据自然光线可用性调整亮度。"
    },
    "like": {
        "word": "Like",
        "phonetic": "/laɪk/",
        "part_of_speech": "v./prep./n.",
        "meaning": "喜欢；像；喜欢；类似的",
        "example": "Social media users like posts to express appreciation and agreement.",
        "translation": "社交媒体用户点赞帖子以表达欣赏和赞同。"
    },
    "line": {
        "word": "Line",
        "phonetic": "/laɪn/",
        "part_of_speech": "n./v.",
        "meaning": "线；线路；排队；排列",
        "example": "Queue management apps reduce waiting time in long lines effectively.",
        "translation": "排队管理应用程序有效减少长队中的等待时间。"
    },
    "list": {
        "word": "List",
        "phonetic": "/lɪst/",
        "part_of_speech": "n./v.",
        "meaning": "列表；清单；列出",
        "example": "Task management apps help users list and prioritize daily activities.",
        "translation": "任务管理应用帮助用户列出和确定日常活动的优先级。"
    },
    "live": {
        "word": "Live",
        "phonetic": "/lɪv/",
        "part_of_speech": "v./adj.",
        "meaning": "居住；生活；现场的；直播的",
        "example": "Live streaming became a primary way to share experiences in real time.",
        "translation": "直播成为实时分享体验的主要方式。"
    },
    "look": {
        "word": "Look",
        "phonetic": "/lʊk/",
        "part_of_speech": "v./n.",
        "meaning": "看；观看；外观；寻找",
        "example": "Reverse image search lets users look up similar photos online.",
        "translation": "反向图像搜索让用户在线查找类似照片。"
    }
}

def main():
    with open("src/assets/data/master_words_pool.json", "r", encoding="utf-8") as f:
        data = json.load(f)

    data.update(words_data)

    with open("src/assets/data/master_words_pool.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"[OK] Added {len(words_data)} words (I: 20, J: 12, K: 10, L: 15)")

if __name__ == "__main__":
    main()
