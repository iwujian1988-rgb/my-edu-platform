# scripts/patch_UVWXYZ.py
import json

# 硬编码 60 个核心词（U, V, W 各 15 个，X, Y, Z 各 5 个）- 2026 终极语境版
words_data = {
    # U (15个)
    "understand": {
        "word": "Understand",
        "phonetic": "/ˌʌndərˈstænd/",
        "part_of_speech": "v.",
        "meaning": "理解；明白；领会",
        "example": "AI translation tools help people understand foreign languages instantly in 2026.",
        "translation": "2026年，AI翻译工具帮助人们即时理解外语。"
    },
    "university": {
        "word": "University",
        "phonetic": "/ˌjuːnɪˈvɜːrsəti/",
        "part_of_speech": "n.",
        "meaning": "大学；综合性大学",
        "example": "Virtual university campuses hosted graduation ceremonies in the metaverse.",
        "translation": "虚拟大学校园在元宇宙举办毕业典礼。"
    },
    "use": {
        "word": "Use",
        "phonetic": "/juːz/",
        "part_of_speech": "v./n.",
        "meaning": "使用；利用；用途",
        "example": "Smart citizens use mobile apps for all city services by 2026.",
        "translation": "到2026年，智慧市民使用移动应用获取所有城市服务。"
    },
    "unit": {
        "word": "Unit",
        "phonetic": "/ˈjuːnɪt/",
        "part_of_speech": "n.",
        "meaning": "单位；单元；部件",
        "example": "Each apartment unit has integrated smart home management systems.",
        "translation": "每个公寓单元都集成了智能家居管理系统。"
    },
    "user": {
        "word": "User",
        "phonetic": "/ˈjuːzər/",
        "part_of_speech": "n.",
        "meaning": "用户；使用者",
        "example": "User experience designers prioritize accessibility in all digital products.",
        "translation": "用户体验设计师在所有数字产品中优先考虑无障碍性。"
    },
    "urban": {
        "word": "Urban",
        "phonetic": "/ˈɜːrbən/",
        "part_of_speech": "adj.",
        "meaning": "城市的；市镇的",
        "example": "Urban farming initiatives reduced food transport emissions significantly.",
        "translation": "城市农业倡议显著减少了食品运输排放。"
    },
    "urgent": {
        "word": "Urgent",
        "phonetic": "/ˈɜːrdʒənt/",
        "part_of_speech": "adj.",
        "meaning": "紧急的；急迫的",
        "example": "AI prioritizes urgent emails and highlights them in your inbox.",
        "translation": "AI优先处理紧急邮件并在收件箱中突出显示。"
    },
    "universal": {
        "word": "Universal",
        "phonetic": "/ˌjuːnɪˈvɜːrsl/",
        "part_of_speech": "adj.",
        "meaning": "普遍的；通用的；宇宙的",
        "example": "Universal basic income pilot programs launched in several countries by 2026.",
        "translation": "到2026年，几个国家推出了全民基本收入试点项目。"
    },
    "union": {
        "word": "Union",
        "phonetic": "/ˈjuːniən/",
        "part_of_speech": "n.",
        "meaning": "工会；联盟；联合",
        "example": "Trade unions negotiated remote work rights for tech industry employees.",
        "translation": "工会为科技行业员工谈判远程工作权利。"
    },
    "unique": {
        "word": "Unique",
        "phonetic": "/juˈniːk/",
        "part_of_speech": "adj.",
        "meaning": "独特的；唯一的；独一无二的",
        "example": "Each user has a unique digital identity secured by blockchain.",
        "translation": "每个用户都有由区块链保护的身份数字标识。"
    },
    "update": {
        "word": "Update",
        "phonetic": "/ʌpˈdeɪt/",
        "part_of_speech": "v./n.",
        "meaning": "更新；升级；最新消息",
        "example": "Software systems update automatically during low-usage hours at night.",
        "translation": "软件系统在夜间低使用时段自动更新。"
    },
    "upload": {
        "word": "Upload",
        "phonetic": "/ˈʌploʊd/",
        "part_of_speech": "v./n.",
        "meaning": "上传；上传的数据",
        "example": "You can upload documents directly to cloud storage from any device.",
        "translation": "您可以从任何设备直接将文档上传到云存储。"
    },
    "url": {
        "word": "URL",
        "phonetic": "/ˌjuː es ˈel/",
        "part_of_speech": "n.",
        "meaning": "统一资源定位符；网址",
        "example": "QR codes replaced URLs as the primary way to access websites in 2026.",
        "translation": "2026年，二维码取代网址成为访问网站的主要方式。"
    },
    "utility": {
        "word": "Utility",
        "phonetic": "/juːˈtɪləti/",
        "part_of_speech": "n.",
        "meaning": "公用事业；效用；实用程序",
        "example": "Smart grids optimize utility distribution based on real-time demand.",
        "translation": "智能电网根据实时需求优化公用事业分配。"
    },
    "unless": {
        "word": "Unless",
        "phonetic": "/ənˈles/",
        "part_of_speech": "conj.",
        "meaning": "除非；如果不",
        "example": "Unless renewable energy adoption accelerates, climate goals remain at risk.",
        "translation": "除非可再生能源采用加速，否则气候目标仍面临风险。"
    },

    # V (15个)
    "virtual": {
        "word": "Virtual",
        "phonetic": "/ˈvɜːrtʃuəl/",
        "part_of_speech": "adj.",
        "meaning": "虚拟的；实质上的",
        "example": "Virtual reality classrooms enabled immersive learning experiences worldwide.",
        "translation": "虚拟现实课堂在全球范围内实现了沉浸式学习体验。"
    },
    "value": {
        "word": "Value",
        "phonetic": "/ˈvæljuː/",
        "part_of_speech": "n./v.",
        "meaning": "价值；价值观；重视",
        "example": "Companies prioritize creating value for society alongside profits by 2026.",
        "translation": "到2026年，公司在追求利润的同时优先为社会创造价值。"
    },
    "view": {
        "word": "View",
        "phonetic": "/vjuː/",
        "part_of_speech": "n./v.",
        "meaning": "观点；视野；观看；查看",
        "example": "Smart glasses display navigation information in your field of view.",
        "translation": "智能眼镜在您的视野范围内显示导航信息。"
    },
    "video": {
        "word": "Video",
        "phonetic": "/ˈvɪdioʊ/",
        "part_of_speech": "n.",
        "meaning": "视频；录像",
        "example": "8K video streaming became standard for premium content platforms in 2026.",
        "translation": "2026年，8K视频流媒体成为优质内容平台的标准。"
    },
    "vehicle": {
        "word": "Vehicle",
        "phonetic": "/ˈviːəkl/",
        "part_of_speech": "n.",
        "meaning": "车辆；交通工具；运载工具",
        "example": "Autonomous electric vehicles dominate urban transportation networks today.",
        "translation": "如今，自动驾驶电动汽车主导着城市交通网络。"
    },
    "verify": {
        "word": "Verify",
        "phonetic": "/ˈverɪfaɪ/",
        "part_of_speech": "v.",
        "meaning": "核实；验证；证明",
        "example": "Biometric scanners verify identity within seconds at secure facilities.",
        "translation": "生物特征扫描仪在安全设施内几秒钟即可验证身份。"
    },
    "version": {
        "word": "Version",
        "phonetic": "/ˈvɜːrʃn/",
        "part_of_speech": "n.",
        "meaning": "版本；译本；形式",
        "example": "The latest version of the operating system supports quantum encryption.",
        "translation": "最新版本的操作系统支持量子加密。"
    },
    "visible": {
        "word": "Visible",
        "phonetic": "/ˈvɪzəbl/",
        "part_of_speech": "adj.",
        "meaning": "可见的；明显的；有形的",
        "example": "Carbon footprint labels are visible on all product packaging by 2026.",
        "translation": "到2026年，所有产品包装上都可见碳足迹标签。"
    },
    "visit": {
        "word": "Visit",
        "phonetic": "/ˈvɪzɪt/",
        "part_of_speech": "v./n.",
        "meaning": "访问；参观；拜访",
        "example": "Virtual museum visits increased accessibility for people with disabilities.",
        "translation": "虚拟博物馆访问增加了残疾人的可及性。"
    },
    "voice": {
        "word": "Voice",
        "phonetic": "/vɔɪs/",
        "part_of_speech": "n.",
        "meaning": "声音；嗓音；发言权",
        "example": "Voice assistants control smart homes through natural conversation.",
        "translation": "语音助手通过自然对话控制智能家居。"
    },
    "volume": {
        "word": "Volume",
        "phonetic": "/ˈvɑːljuːm/",
        "part_of_speech": "n.",
        "meaning": " volume；音量；卷；册",
        "example": "Data volume generated by IoT devices requires edge computing solutions.",
        "translation": "物联网设备产生的数据量需要边缘计算解决方案。"
    },
    "volunteer": {
        "word": "Volunteer",
        "phonetic": "/ˌvɑːlənˈtɪr/",
        "part_of_speech": "n./v.",
        "meaning": "志愿者；自愿的；自愿做",
        "example": "Digital platforms connect volunteers with local community service opportunities.",
        "translation": "数字平台将志愿者与当地社区服务机会连接起来。"
    },
    "vote": {
        "word": "Vote",
        "phonetic": "/voʊt/",
        "part_of_speech": "n./v.",
        "meaning": "投票；选举；选票",
        "example": "Mobile voting apps increased voter participation in the 2026 election.",
        "translation": "移动投票应用提高了2026年选举的投票参与率。"
    },
    "various": {
        "word": "Various",
        "phonetic": "/ˈveriəs/",
        "part_of_speech": "adj.",
        "meaning": "各种各样的；不同的",
        "example": "AI chatbots communicate in various languages to serve global customers.",
        "translation": "AI聊天机器人用多种语言与全球客户交流。"
    },
    "virus": {
        "word": "Virus",
        "phonetic": "/ˈvaɪrəs/",
        "part_of_speech": "n.",
        "meaning": "病毒；病毒性疾病",
        "example": "AI-powered diagnostic tools detect virus outbreaks earlier than ever before.",
        "translation": "AI驱动的诊断工具比以往任何时候都能更早发现病毒爆发。"
    },

    # W (15个)
    "work": {
        "word": "Work",
        "phonetic": "/wɜːrk/",
        "part_of_speech": "n./v.",
        "meaning": "工作；运转；有效",
        "example": "Remote work platforms enable collaboration across time zones seamlessly.",
        "translation": "远程办公平台无缝实现跨时区协作。"
    },
    "web": {
        "word": "Web",
        "phonetic": "/web/",
        "part_of_speech": "n.",
        "meaning": "网络；网；蜘蛛网",
        "example": "The decentralized web (Web3) gave users control over their data.",
        "translation": "去中心化网络让用户控制了自己的数据。"
    },
    "world": {
        "word": "World",
        "phonetic": "/wɜːrld/",
        "part_of_speech": "n.",
        "meaning": "世界；领域；全世界",
        "example": "Global climate cooperation became a priority for all world leaders by 2026.",
        "translation": "到2026年，全球气候合作成为所有世界领导人的优先事项。"
    },
    "write": {
        "word": "Write",
        "phonetic": "/raɪt/",
        "part_of_speech": "v.",
        "meaning": "写；写作；编写",
        "example": "AI writing assistants help authors draft novels and screenplays more efficiently.",
        "translation": "AI写作助手帮助作者更高效地起草小说和剧本。"
    },
    "way": {
        "word": "Way",
        "phonetic": "/weɪ/",
        "part_of_speech": "n.",
        "meaning": "方式；道路；方向",
        "example": "Sustainable farming practices changed the way we produce food globally.",
        "translation": "可持续农业实践改变了全球粮食生产方式。"
    },
    "website": {
        "word": "Website",
        "phonetic": "/ˈwebsaɪt/",
        "part_of_speech": "n.",
        "meaning": "网站；站点",
        "example": "Progressive web apps replace traditional websites for better mobile experience.",
        "translation": "渐进式Web应用取代传统网站以提供更好的移动体验。"
    },
    "wireless": {
        "word": "Wireless",
        "phonetic": "/ˈwaɪərləs/",
        "part_of_speech": "adj.",
        "meaning": "无线的；无线电的",
        "example": "Wireless charging pads are built into public furniture like benches and tables.",
        "translation": "无线充电板嵌入长椅和桌子等公共家具中。"
    },
    "wealth": {
        "word": "Wealth",
        "phonetic": "/welθ/",
        "part_of_speech": "n.",
        "meaning": "财富；丰富；大量",
        "example": "Digital wealth management platforms made investing accessible to everyone.",
        "translation": "数字财富管理平台让每个人都能进行投资。"
    },
    "weather": {
        "word": "Weather",
        "phonetic": "/ˈweðər/",
        "part_of_speech": "n.",
        "meaning": "天气；气象；气象预报",
        "example": "Hyperlocal weather predictions help farmers optimize crop planting schedules.",
        "translation": "超局部天气预测帮助农民优化作物种植时间表。"
    },
    "weapon": {
        "word": "Weapon",
        "phonetic": "/ˈwepən/",
        "part_of_speech": "n.",
        "meaning": "武器；斗争工具",
        "example": "Cybersecurity became a critical defense weapon against digital warfare.",
        "translation": "网络安全成为防御数字战争的关键武器。"
    },
    "week": {
        "word": "Week",
        "phonetic": "/wiːk/",
        "part_of_speech": "n.",
        "meaning": "周；星期",
        "example": "The four-day work week became standard across many industries by 2026.",
        "translation": "到2026年，四天工作制成为许多行业的标准。"
    },
    "weight": {
        "word": "Weight",
        "phonetic": "/weɪt/",
        "part_of_speech": "n.",
        "meaning": "重量；重量；重要性",
        "example": "Lightweight electric vehicles extended driving range through advanced materials.",
        "translation": "轻量化电动汽车通过先进材料延长了行驶里程。"
    },
    "welcome": {
        "word": "Welcome",
        "phonetic": "/ˈwelkəm/",
        "part_of_speech": "adj./v./n.",
        "meaning": "受欢迎的；欢迎；欢迎辞",
        "example": "Digital concierge services welcome hotel guests in their preferred language.",
        "translation": "数字礼宾服务用客人偏好的语言欢迎酒店客人。"
    },
    "western": {
        "word": "Western",
        "phonetic": "/ˈwestərn/",
        "part_of_speech": "adj./n.",
        "meaning": "西方的；西部地区的；西部片",
        "example": "Western countries adopted digital currencies for cross-border payments in 2026.",
        "translation": "2026年，西方国家采用数字货币进行跨境支付。"
    },
    "whenever": {
        "word": "Whenever",
        "phonetic": "/wenˈevər/",
        "part_of_speech": "conj./adv.",
        "meaning": "无论何时；随时",
        "example": "You can access your medical records whenever needed through secure apps.",
        "translation": "您可以通过安全应用随时访问您的医疗记录。"
    },

    # X (5个) - 高频核心词
    "xray": {
        "word": "X-ray",
        "phonetic": "/ˈeks reɪ/",
        "part_of_speech": "n./v.",
        "meaning": "X射线；X光检查；用X光检查",
        "example": "AI-powered X-ray analysis detects health conditions earlier than traditional methods.",
        "translation": "AI驱动的X光分析比传统方法更早检测出健康状况。"
    },
    "xenon": {
        "word": "Xenon",
        "phonetic": "/ˈziːnɑːn/",
        "part_of_speech": "n.",
        "meaning": "氙气（化学元素，用于照明和火箭推进）",
        "example": "Xenon ion propulsion systems enabled deep space exploration missions.",
        "translation": "氙离子推进系统实现了深空探索任务。"
    },
    "xylophone": {
        "word": "Xylophone",
        "phonetic": "/ˈzaɪləfoʊn/",
        "part_of_speech": "n.",
        "meaning": "木琴（打击乐器）",
        "example": "Virtual music students learned xylophone through haptic feedback instruments.",
        "translation": "虚拟音乐学生通过触觉反馈乐器学习木琴。"
    },
    "xerox": {
        "word": "Xerox",
        "phonetic": "/ˈzierɑːks/",
        "part_of_speech": "n./v.",
        "meaning": "复印；复印件（品牌名泛化）",
        "example": "Digital document workflows eliminated the need to xerox paper files.",
        "translation": "数字文档工作流消除了复印纸质文件的需要。"
    },
    "xaxis": {
        "word": "X-axis",
        "phonetic": "/ˈeks æksɪs/",
        "part_of_speech": "n.",
        "meaning": "X轴；横坐标轴",
        "example": "Data visualization tools automatically scale the x-axis for optimal readability.",
        "translation": "数据可视化工具自动缩放X轴以获得最佳可读性。"
    },

    # Y (5个) - 高频核心词
    "you": {
        "word": "You",
        "phonetic": "/juː/",
        "part_of_speech": "pron.",
        "meaning": "你；你们",
        "example": "AI personal assistants learn your preferences to provide customized recommendations.",
        "translation": "AI个人助手学习您的偏好以提供定制推荐。"
    },
    "your": {
        "word": "Your",
        "phonetic": "/jɔːr/",
        "part_of_speech": "pron.",
        "meaning": "你的；你们的",
        "example": "Your digital twin simulates health outcomes for personalized medicine.",
        "translation": "您的数字孪生为个性化医疗模拟健康结果。"
    },
    "young": {
        "word": "Young",
        "phonetic": "/jʌŋ/",
        "part_of_speech": "adj.",
        "meaning": "年轻的；年纪小的；没有经验的",
        "example": "Young entrepreneurs used crowdfunding platforms to launch successful startups.",
        "translation": "年轻企业家使用众筹平台推出成功的初创公司。"
    },
    "year": {
        "word": "Year",
        "phonetic": "/jɪr/",
        "part_of_speech": "n.",
        "meaning": "年；年份；年度的",
        "example": "The year 2026 marked a turning point for renewable energy adoption globally.",
        "translation": "2026年标志着全球可再生能源采用的转折点。"
    },
    "yield": {
        "word": "Yield",
        "phonetic": "/jiːld/",
        "part_of_speech": "v./n.",
        "meaning": "出产；屈服；产量；收益",
        "example": "Vertical farming techniques yield ten times more crops per square meter.",
        "translation": "垂直农业技术每平方米的作物产量提高了十倍。"
    },

    # Z (5个) - 高频核心词
    "zero": {
        "word": "Zero",
        "phonetic": "/ˈzɪroʊ/",
        "part_of_speech": "n./adj.",
        "meaning": "零；零度；零的；完全没有的",
        "example": "Carbon-neutral cities achieved zero net emissions by 2026.",
        "translation": "碳中和城市在2026年实现了零净排放。"
    },
    "zone": {
        "word": "Zone",
        "phonetic": "/zoʊn/",
        "part_of_speech": "n.",
        "meaning": "区域；地带；专区",
        "example": "Low-emission zones in cities restricted internal combustion engine vehicles.",
        "translation": "城市的低排放区限制了内燃机车辆的通行。"
    },
    "zoom": {
        "word": "Zoom",
        "phonetic": "/zuːm/",
        "part_of_speech": "v./n.",
        "meaning": "缩放；急速上升；.zoom",
        "example": "Video conferencing platforms like Zoom enabled global remote collaboration.",
        "translation": "像Zoom这样的视频会议平台实现了全球远程协作。"
    },
    "zeal": {
        "word": "Zeal",
        "phonetic": "/ziːl/",
        "part_of_speech": "n.",
        "meaning": "热情；热忱；激情",
        "example": "Climate activists with renewed zeal pushed governments toward bolder policies.",
        "translation": "重燃热情的气候活动家推动政府采取更大胆的政策。"
    },
    "zinc": {
        "word": "Zinc",
        "phonetic": "/zɪŋk/",
        "part_of_speech": "n.",
        "meaning": "锌（化学元素）",
        "example": "Recyclable zinc batteries became popular for sustainable energy storage.",
        "translation": "可回收的锌电池在可持续能源存储中变得流行。"
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
