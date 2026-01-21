# scripts/patch_MNOP.py
import json

# 硬编码 60 个核心词（M, N, O, P 各 15 个）
words_data = {
    # M (15个)
    "management": {
        "word": "Management",
        "phonetic": "/ˈmænɪdʒmənt/",
        "part_of_speech": "n.",
        "meaning": "管理；经营；管理层",
        "example": "Effective crisis management saved the company during the 2026 economic downturn.",
        "translation": "有效的危机管理在2026年经济低迷期间拯救了这家公司。"
    },
    "media": {
        "word": "Media",
        "phonetic": "/ˈmiːdiə/",
        "part_of_speech": "n.",
        "meaning": "媒体；媒介",
        "example": "Social media platforms have changed how teenagers communicate in 2026.",
        "translation": "社交媒体平台改变了2026年青少年的交流方式。"
    },
    "major": {
        "word": "Major",
        "phonetic": "/ˈmeɪdʒər/",
        "part_of_speech": "adj./n.",
        "meaning": "主要的；重大的；专业",
        "example": "Climate change became a major political issue in the 2026 election.",
        "translation": "气候变化成为2026年选举中的一个重大政治议题。"
    },
    "method": {
        "word": "Method",
        "phonetic": "/ˈmeθəd/",
        "part_of_speech": "n.",
        "meaning": "方法；办法",
        "example": "Scientists developed a new method for detecting deepfake videos in 2026.",
        "translation": "科学家在2026年开发了一种检测深度伪造视频的新方法。"
    },
    "market": {
        "word": "Market",
        "phonetic": "/ˈmɑːrkɪt/",
        "part_of_speech": "n.",
        "meaning": "市场；集市",
        "example": "The smartphone market reached saturation in most countries by 2026.",
        "translation": "到2026年，智能手机市场在大多数国家已经饱和。"
    },
    "material": {
        "word": "Material",
        "phonetic": "/məˈtɪriəl/",
        "part_of_speech": "n./adj.",
        "meaning": "材料；物质；物质的",
        "example": "Recyclable materials became mandatory for all packaging in 2026.",
        "translation": "2026年，所有包装都必须使用可回收材料。"
    },
    "measure": {
        "word": "Measure",
        "phonetic": "/ˈmeʒər/",
        "part_of_speech": "n./v.",
        "meaning": "措施；测量；衡量",
        "example": "The government introduced strict measures to reduce carbon emissions in 2026.",
        "translation": "政府在2026年采取了严格措施来减少碳排放。"
    },
    "mental": {
        "word": "Mental",
        "phonetic": "/ˈmentl/",
        "part_of_speech": "adj.",
        "meaning": "心理的；精神的；脑力的",
        "example": "Mental health awareness programs expanded in schools throughout 2026.",
        "translation": "2026年，学校中的心理健康意识项目得到了扩展。"
    },
    "message": {
        "word": "Message",
        "phonetic": "/ˈmesɪdʒ/",
        "part_of_speech": "n.",
        "meaning": "消息；信息；要点",
        "example": "She sent an encrypted message to protect her privacy in 2026.",
        "translation": "为了保护隐私，她在2026年发送了一条加密信息。"
    },
    "model": {
        "word": "Model",
        "phonetic": "/ˈmɑːdl/",
        "part_of_speech": "n.",
        "meaning": "模型；模范；款式",
        "example": "The new AI language model demonstrated remarkable capabilities in 2026.",
        "translation": "这个新的人工智能语言模型在2026年展现了非凡的能力。"
    },
    "modern": {
        "word": "Modern",
        "phonetic": "/ˈmɑːdərn/",
        "part_of_speech": "adj.",
        "meaning": "现代的；时髦的",
        "example": "Modern smart homes feature integrated voice control systems as of 2026.",
        "translation": "截至2026年，现代智能家居已具备集成语音控制系统。"
    },
    "moment": {
        "word": "Moment",
        "phonetic": "/ˈmoʊmənt/",
        "part_of_speech": "n.",
        "meaning": "时刻；瞬间；片刻",
        "example": "At that moment, the notification popped up on his smart glasses.",
        "translation": "那一刻，通知弹窗出现在他的智能眼镜上。"
    },
    "motion": {
        "word": "Motion",
        "phonetic": "/ˈmoʊʃn/",
        "part_of_speech": "n.",
        "meaning": "运动；动作；提议",
        "example": "The motion sensors automatically adjusted the lighting in the 2026 office building.",
        "translation": "动作传感器自动调节了2026年这栋办公楼的照明。"
    },
    "multiple": {
        "word": "Multiple",
        "phonetic": "/ˈmʌltɪpl/",
        "part_of_speech": "adj.",
        "meaning": "多个的；多重的",
        "example": "Remote work platforms support multiple devices seamlessly in 2026.",
        "translation": "2026年，远程办公平台无缝支持多个设备。"
    },
    "museum": {
        "word": "Museum",
        "phonetic": "/mjuːˈziːəm/",
        "part_of_speech": "n.",
        "meaning": "博物馆",
        "example": "Virtual museum tours became popular after the 2026 digital exhibition.",
        "translation": "2026年数字展览后，虚拟博物馆游览变得流行起来。"
    },

    # N (15个)
    "network": {
        "word": "Network",
        "phonetic": "/ˈnetwɜːrk/",
        "part_of_speech": "n.",
        "meaning": "网络；关系网",
        "example": "5G networks provided ultra-fast connectivity across cities in 2026.",
        "translation": "2026年，5G网络为城市提供了超快速连接。"
    },
    "nature": {
        "word": "Nature",
        "phonetic": "/ˈneɪtʃər/",
        "part_of_speech": "n.",
        "meaning": "自然；本质；本性",
        "example": "Documentaries about nature conservation reached global audiences in 2026.",
        "translation": "关于自然保护的纪录片在2026年触达了全球观众。"
    },
    "negative": {
        "word": "Negative",
        "phonetic": "/ˈneɡətɪv/",
        "part_of_speech": "adj./n.",
        "meaning": "消极的；负面的；底片",
        "example": "The algorithm filters negative comments to maintain a positive community atmosphere.",
        "translation": "该算法过滤负面评论以维持积极的社区氛围。"
    },
    "normal": {
        "word": "Normal",
        "phonetic": "/ˈnɔːrml/",
        "part_of_speech": "adj./n.",
        "meaning": "正常的；常态的；正规",
        "example": "Remote meetings became normal practice for most companies by 2026.",
        "translation": "到2026年，远程会议已成为大多数公司的常规做法。"
    },
    "nation": {
        "word": "Nation",
        "phonetic": "/ˈneɪʃn/",
        "part_of_speech": "n.",
        "meaning": "民族；国家",
        "example": "The nation invested heavily in renewable energy infrastructure in 2026.",
        "translation": "该国在2026年大力投资可再生能源基础设施。"
    },
    "natural": {
        "word": "Natural",
        "phonetic": "/ˈnætʃrəl/",
        "part_of_speech": "adj.",
        "meaning": "自然的；天然的；正常的",
        "example": "Natural language processing advanced significantly during 2026.",
        "translation": "自然语言处理技术在2026年取得了重大进展。"
    },
    "nearby": {
        "word": "Nearby",
        "phonetic": "/ˌnɪrˈbaɪ/",
        "part_of_speech": "adj./adv.",
        "meaning": "附近的；在附近",
        "example": "The navigation app directed her to a nearby charging station.",
        "translation": "导航应用将她引向附近的一个充电站。"
    },
    "nearly": {
        "word": "Nearly",
        "phonetic": "/ˈnɪrli/",
        "part_of_speech": "adv.",
        "meaning": "几乎；差不多",
        "example": "Nearly all students used tablets for taking notes in 2026 classrooms.",
        "translation": "2026年的课堂上，几乎所有的学生都用平板电脑做笔记。"
    },
    "necessary": {
        "word": "Necessary",
        "phonetic": "/ˈnesəseri/",
        "part_of_speech": "adj.",
        "meaning": "必要的；必需的",
        "example": "Digital literacy became necessary for most job positions in 2026.",
        "translation": "2026年，数字素养成为大多数职位的必要条件。"
    },
    "need": {
        "word": "Need",
        "phonetic": "/niːd/",
        "part_of_speech": "v./n.",
        "meaning": "需要；需求",
        "example": "You need to enable two-factor authentication for secure access.",
        "translation": "你需要启用双重身份验证才能安全访问。"
    },
    "neighbor": {
        "word": "Neighbor",
        "phonetic": "/ˈneɪbər/",
        "part_of_speech": "n.",
        "meaning": "邻居；邻国",
        "example": "Smart community apps connect neighbors for local events in 2026.",
        "translation": "2026年，智能社区应用将邻居连接起来参与本地活动。"
    },
    "never": {
        "word": "Never",
        "phonetic": "/ˈnevər/",
        "part_of_speech": "adv.",
        "meaning": "从不；绝不",
        "example": "The system never stores user passwords in plain text.",
        "translation": "该系统从不以明文形式存储用户密码。"
    },
    "nice": {
        "word": "Nice",
        "phonetic": "/naɪs/",
        "part_of_speech": "adj.",
        "meaning": "好的；令人愉快的；友善的",
        "example": "It was nice meeting you at the virtual conference yesterday.",
        "translation": "昨天在虚拟会议上见到你很高兴。"
    },
    "night": {
        "word": "Night",
        "phonetic": "/naɪt/",
        "part_of_speech": "n.",
        "meaning": "夜晚；晚上",
        "example": "The night mode automatically activates based on ambient light sensors.",
        "translation": "夜间模式会根据环境光传感器自动激活。"
    },
    "nobody": {
        "word": "Nobody",
        "phonetic": "/ˈnoʊbɑːdi/",
        "part_of_speech": "pron.",
        "meaning": "没有人；无人",
        "example": "Nobody predicted how quickly AI would transform education in 2026.",
        "translation": "没人预测到AI在2026年会如此迅速地改变教育。"
    },

    # O (15个)
    "online": {
        "word": "Online",
        "phonetic": "/ˌɑːnˈlaɪn/",
        "part_of_speech": "adj./adv.",
        "meaning": "在线的；联网的；在线地",
        "example": "Most students attended classes online during the 2026 semester.",
        "translation": "2026年学期期间，大多数学生在线上课。"
    },
    "object": {
        "word": "Object",
        "phonetic": "/ˈɑːbdʒekt/",
        "part_of_speech": "n.",
        "meaning": "物体；物品；对象；目标",
        "example": "Augmented reality allows users to interact with 3D objects in real space.",
        "translation": "增强现实技术让用户能够与真实空间中的3D物体互动。"
    },
    "observe": {
        "word": "Observe",
        "phonetic": "/əbˈzɜːrv/",
        "part_of_speech": "v.",
        "meaning": "观察；遵守；注意到",
        "example": "Scientists observe climate patterns using satellite data collected in 2026.",
        "translation": "科学家使用2026年收集的卫星数据观察气候模式。"
    },
    "option": {
        "word": "Option",
        "phonetic": "/ˈɑːpʃn/",
        "part_of_speech": "n.",
        "meaning": "选项；选择权",
        "example": "The software offers multiple language options for international users.",
        "translation": "该软件为国际用户提供多种语言选项。"
    },
    "order": {
        "word": "Order",
        "phonetic": "/ˈɔːrdər/",
        "part_of_speech": "n./v.",
        "meaning": "订单；顺序；秩序；订购",
        "example": "She placed an order for groceries through the mobile app.",
        "translation": "她通过手机应用程序订购了杂货。"
    },
    "organize": {
        "word": "Organize",
        "phonetic": "/ˈɔːrɡənaɪz/",
        "part_of_speech": "v.",
        "meaning": "组织；安排；整理",
        "example": "AI tools help organize digital files automatically by 2026 standards.",
        "translation": "按2026年的标准，AI工具可自动整理数字文件。"
    },
    "original": {
        "word": "Original",
        "phonetic": "/əˈrɪdʒənl/",
        "part_of_speech": "adj.",
        "meaning": "原始的；最初的；独创的",
        "example": "The original content creator was credited through blockchain verification.",
        "translation": "原创内容创作者通过区块链验证获得了署名。"
    },
    "outcome": {
        "word": "Outcome",
        "phonetic": "/ˈaʊtkʌm/",
        "part_of_speech": "n.",
        "meaning": "结果；结局",
        "example": "The outcome of the project exceeded all expectations.",
        "translation": "该项目的结果超出了所有预期。"
    },
    "output": {
        "word": "Output",
        "phonetic": "/ˈaʊtpʊt/",
        "part_of_speech": "n.",
        "meaning": "产出；输出；产量",
        "example": "The factory increased its output by automating production lines in 2026.",
        "translation": "2026年，这家工厂通过自动化生产线提高了产量。"
    },
    "owner": {
        "word": "Owner",
        "phonetic": "/ˈoʊnər/",
        "part_of_speech": "n.",
        "meaning": "所有者；主人",
        "example": "The device owner received a security alert on their phone.",
        "translation": "设备所有者在手机上收到了安全警报。"
    },
    "office": {
        "word": "Office",
        "phonetic": "/ˈɔːfɪs/",
        "part_of_speech": "n.",
        "meaning": "办公室；办事处；公职",
        "example": "Hybrid office schedules became the standard in 2026.",
        "translation": "混合办公安排在2026年成为标准。"
    },
    "official": {
        "word": "Official",
        "phonetic": "/əˈfɪʃl/",
        "part_of_speech": "adj./n.",
        "meaning": "官方的；正式的；官员",
        "example": "The official announcement was made through the government website.",
        "translation": "官方公告通过政府网站发布。"
    },
    "operation": {
        "word": "Operation",
        "phonetic": "/ˌɑːpəˈreɪʃn/",
        "part_of_speech": "n.",
        "meaning": "操作；运营；手术；行动",
        "example": "The operation of the smart grid improved energy efficiency significantly.",
        "translation": "智能电网的运行显著提高了能源效率。"
    },
    "opinion": {
        "word": "Opinion",
        "phonetic": "/əˈpɪniən/",
        "part_of_speech": "n.",
        "meaning": "意见；看法；评价",
        "example": "Public opinion shifted toward sustainable products throughout 2026.",
        "translation": "2026年，公众舆论转向支持可持续产品。"
    },
    "ordinary": {
        "word": "Ordinary",
        "phonetic": "/ˈɔːrdneri/",
        "part_of_speech": "adj.",
        "meaning": "普通的；平常的",
        "example": "Ordinary people gained access to powerful AI tools in 2026.",
        "translation": "2026年，普通人也能使用强大的AI工具。"
    },

    # P (15个)
    "product": {
        "word": "Product",
        "phonetic": "/ˈprɑːdʌkt/",
        "part_of_speech": "n.",
        "meaning": "产品；结果；乘积",
        "example": "The product launched with an interactive marketing campaign in 2026.",
        "translation": "该产品在2026年通过互动营销活动发布。"
    },
    "process": {
        "word": "Process",
        "phonetic": "/ˈprɑːses/",
        "part_of_speech": "n./v.",
        "meaning": "过程；流程；加工；处理",
        "example": "The application process takes about five minutes to complete online.",
        "translation": "在线申请流程大约需要五分钟完成。"
    },
    "policy": {
        "word": "Policy",
        "phonetic": "/ˈpɑːləsi/",
        "part_of_speech": "n.",
        "meaning": "政策；方针；保险单",
        "example": "Company policy requires employees to use secure authentication methods.",
        "translation": "公司政策要求员工使用安全身份验证方法。"
    },
    "project": {
        "word": "Project",
        "phonetic": "/ˈprɑːdʒekt/",
        "part_of_speech": "n./v.",
        "meaning": "项目；计划；投影；规划",
        "example": "The project team collaborated through virtual workspaces in 2026.",
        "translation": "2026年，项目团队通过虚拟工作空间协作。"
    },
    "platform": {
        "word": "Platform",
        "phonetic": "/ˈplætfɔːrm/",
        "part_of_speech": "n.",
        "meaning": "平台；站台；纲领",
        "example": "The video streaming platform gained 50 million users in 2026.",
        "translation": "该视频流媒体平台在2026年获得了5000万用户。"
    },
    "partner": {
        "word": "Partner",
        "phonetic": "/ˈpɑːrtnər/",
        "part_of_speech": "n./v.",
        "meaning": "伙伴；合伙人；搭档；合作",
        "example": "The company partnered with tech startups to innovate payment solutions.",
        "translation": "这家公司与科技初创企业合作创新支付解决方案。"
    },
    "pattern": {
        "word": "Pattern",
        "phonetic": "/ˈpætərn/",
        "part_of_speech": "n.",
        "meaning": "模式；图案；规律",
        "example": "AI algorithms detect patterns in user behavior to improve recommendations.",
        "translation": "AI算法检测用户行为模式以改进推荐。"
    },
    "physical": {
        "word": "Physical",
        "phonetic": "/ˈfɪzɪkl/",
        "part_of_speech": "adj.",
        "meaning": "物理的；身体的；实体的",
        "example": "Physical stores integrated digital experiences for shoppers in 2026.",
        "translation": "2026年，实体店为购物者整合了数字化体验。"
    },
    "power": {
        "word": "Power",
        "phonetic": "/ˈpaʊər/",
        "part_of_speech": "n./v.",
        "meaning": "力量；权力；电力；驱动",
        "example": "Solar power plants supplied renewable energy to the entire region.",
        "translation": "太阳能发电厂为整个地区提供可再生能源。"
    },
    "price": {
        "word": "Price",
        "phonetic": "/praɪs/",
        "part_of_speech": "n.",
        "meaning": "价格；代价",
        "example": "Dynamic pricing adjusts ticket prices based on real-time demand.",
        "translation": "动态定价根据实时需求调整票价。"
    },
    "private": {
        "word": "Private",
        "phonetic": "/ˈpraɪvət/",
        "part_of_speech": "adj.",
        "meaning": "私人的；私有的；秘密的",
        "example": "End-to-end encryption ensures private conversations remain secure.",
        "translation": "端到端加密确保私人对话保持安全。"
    },
    "problem": {
        "word": "Problem",
        "phonetic": "/ˈprɑːbləm/",
        "part_of_speech": "n.",
        "meaning": "问题；难题",
        "example": "The team solved the technical problem within 24 hours.",
        "translation": "团队在24小时内解决了这个技术问题。"
    },
    "program": {
        "word": "Program",
        "phonetic": "/ˈproʊɡræm/",
        "part_of_speech": "n./v.",
        "meaning": "程序；计划；节目；编程",
        "example": "The educational program uses gamification to engage students effectively.",
        "translation": "这个教育项目使用游戏化来有效吸引学生。"
    },
    "provide": {
        "word": "Provide",
        "phonetic": "/prəˈvaɪd/",
        "part_of_speech": "v.",
        "meaning": "提供；供给",
        "example": "Cloud services provide scalable storage for businesses worldwide.",
        "translation": "云服务为全球企业提供可扩展的存储。"
    },
    "professional": {
        "word": "Professional",
        "phonetic": "/prəˈfeʃənl/",
        "part_of_speech": "adj./n.",
        "meaning": "专业的；职业的；专业人员",
        "example": "Professional networking sites evolved into career development platforms by 2026.",
        "translation": "到2026年，职业社交网站已演变为职业发展平台。"
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
