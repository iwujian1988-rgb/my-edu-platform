#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
阶段2：音标补全计划 - 批量更新所有级别
从 ECDICT 原始数据中查找缺失音标，批量补全 CET6/IELTS/TOEFL
"""

import json
import csv
import os
import sys

# 设置标准输出编码为 UTF-8
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')


def load_ecdict_phonetics():
    """
    从 ECDICT CSV 文件中加载所有单词的音标

    Returns:
        dict: {单词: 音标} 的映射
    """
    print("[进度] 加载 ECDICT 原始数据...")

    ecdict_file = 'ecdict.csv'
    if not os.path.exists(ecdict_file):
        print(f"[错误] 未找到 ECDICT 文件: {ecdict_file}")
        return {}

    phonetic_map = {}
    count = 0

    with open(ecdict_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            word = row.get('word', '').strip()
            phonetic = row.get('phonetic', '').strip()

            if word and phonetic:
                phonetic_map[word] = phonetic
                count += 1

    print(f"[完成] 加载了 {count:,} 个单词的音标")
    return phonetic_map


def load_word_list(level: str) -> list:
    """
    加载指定级别的词库

    Args:
        level: 词库级别 (cet4, cet6, ielts, toefl)

    Returns:
        list: 单词列表
    """
    word_file = f'src/assets/data/{level}_words.json'

    if not os.path.exists(word_file):
        print(f"[错误] 未找到词库文件: {word_file}")
        return []

    with open(word_file, 'r', encoding='utf-8') as f:
        return json.load(f)


def find_missing_words(words: list) -> list:
    """
    找出缺失音标的单词

    Args:
        words: 单词列表

    Returns:
        list: 缺失音标的单词对象列表
    """
    return [w for w in words if not w.get('phonetic', '').strip()]


def update_phonetics_from_ecdict(words: list, ecdict_map: dict, level: str) -> dict:
    """
    从 ECDICT 数据中更新缺失音标

    Args:
        words: 单词列表
        ecdict_map: ECDICT 音标映射
        level: 词库级别

    Returns:
        dict: 更新统计信息
    """
    print(f"\n{'='*70}")
    print(f"处理 {level.upper()} 词库")
    print(f"{'='*70}\n")

    # 找出缺失音标的单词
    missing_words = find_missing_words(words)

    if not missing_words:
        print(f"[完成] {level.upper()} 没有缺失音标的单词")
        return {'total': 0, 'updated': 0, 'not_found': 0}

    print(f"[步骤 1/3] 找到 {len(missing_words)} 个缺失音标的单词")

    # 尝试从 ECDICT 查找音标
    updated = []
    not_found = []

    print(f"\n[步骤 2/3] 从 ECDICT 查找音标...")

    for word_obj in missing_words:
        word = word_obj['word']

        # 直接匹配
        if word in ecdict_map:
            word_obj['phonetic'] = ecdict_map[word]
            updated.append(word)
            print(f"  ✓ {word:30} → {ecdict_map[word]}")
        else:
            # 尝试小写匹配
            word_lower = word.lower()
            if word_lower in ecdict_map:
                word_obj['phonetic'] = ecdict_map[word_lower]
                updated.append(word)
                print(f"  ✓ {word:30} → {ecdict_map[word_lower]} (小写匹配)")
            else:
                # 尝试处理复合词和短语
                # 例如: living-room -> living room
                normalized = word.replace('-', ' ')
                if normalized in ecdict_map:
                    word_obj['phonetic'] = ecdict_map[normalized]
                    updated.append(word)
                    print(f"  ✓ {word:30} → {ecdict_map[normalized]} (标准化匹配)")
                else:
                    not_found.append(word)
                    print(f"  ✗ {word:30} → 未找到")

    print(f"\n[完成] 成功匹配 {len(updated)}/{len(missing_words)} 个单词")

    # 保存更新后的词库
    if updated:
        print(f"\n[步骤 3/3] 保存更新后的词库...")

        word_file = f'src/assets/data/{level}_words.json'
        backup_file = f'src/assets/data/{level}_words_backup.json'

        # 备份
        with open(backup_file, 'w', encoding='utf-8') as f:
            json.dump(words, f, ensure_ascii=False, indent=2)
        print(f"  [备份] {backup_file}")

        # 保存
        with open(word_file, 'w', encoding='utf-8') as f:
            json.dump(words, f, ensure_ascii=False, indent=2)
        print(f"  [保存] {word_file}")

    return {
        'total': len(missing_words),
        'updated': len(updated),
        'not_found': len(not_found),
        'not_found_list': not_found
    }


def generate_manual_phonetics(words: list, not_found: list, level: str) -> int:
    """
    为未找到音标的单词手动生成音标

    Args:
        words: 单词列表
        not_found: 未找到音标的单词列表
        level: 词库级别

    Returns:
        int: 更新的数量
    """
    if not not_found:
        return 0

    print(f"\n{'='*70}")
    print(f"为 {level.upper()} 未匹配的 {len(not_found)} 个单词生成音标")
    print(f"{'='*70}\n")

    # 常见单词的手动音标映射
    manual_phonetics = generate_common_phonetics()

    updated_count = 0

    for word in not_found:
        # 查找单词对象
        word_obj = None
        for w in words:
            if w['word'] == word:
                word_obj = w
                break

        if not word_obj:
            continue

        # 尝试从手动映射中获取
        if word in manual_phonetics:
            word_obj['phonetic'] = manual_phonetics[word]['phonetic']
            if 'translation' in manual_phonetics[word]:
                word_obj['translation'] = manual_phonetics[word]['translation']
            print(f"  ✓ {word:30} → {manual_phonetics[word]['phonetic']}")
            updated_count += 1
        else:
            print(f"  ⚠ {word:30} → 需要人工处理")

    return updated_count


def generate_common_phonetics():
    """
    生成常见缺失单词的音标映射

    Returns:
        dict: 单词到音标的映射
    """
    # 基于 Collins 和 Oxford 词典的 IPA 音标
    phonetics = {
        # 缩写词
        "CD": {"phonetic": "ˌsiː ˈdiː", "translation": "n. 光盘，激光唱片"},
        "ohp": {"phonetic": "ˌəʊ eɪtʃ ˈpiː", "translation": "n. 高射投影器"},
        "phd": {"phonetic": "ˌpiː eɪtʃ ˈdiː", "translation": "n. 博士学位"},

        # 复合词和短语
        "account for": {"phonetic": "əˈkaʊnt fɔː", "translation": "v. （数量或比例上）占；说明"},
        "bring about": {"phonetic": "brɪŋ əˈbaʊt", "translation": "v. 引起，导致"},
        "co-operation": {"phonetic": "kəʊˌɒpəˈreɪʃn", "translation": "n. 合作，协作"},
        "fund-raising": {"phonetic": "ˈfʌnd reɪzɪŋ", "translation": "n. 筹款"},
        "girlfriend": {"phonetic": "ˈɡɜːlfrend", "translation": "n. 女朋友"},
        "hard-working": {"phonetic": "ˌhɑːd ˈwɜːkɪŋ", "translation": "a. 努力工作的"},
        "high-rise": {"phonetic": "ˈhaɪ raɪz", "translation": "a. 高层的，高楼的"},
        "open-book": {"phonetic": "ˈəʊpən bʊk", "translation": "a. 开卷的"},
        "part-time": {"phonetic": "ˌpɑːt ˈtaɪm", "translation": "a. 兼职的；ad. 兼职地"},
        "phone-in": {"phonetic": "ˈfəʊn ɪn", "translation": "n. 电话参与节目"},
        "water-proof": {"phonetic": "ˈwɔːtə pruːf", "translation": "a. 防水的"},
        "water-skiing": {"phonetic": "ˈwɔːtə skiːɪŋ", "translation": "n. 滑水"},

        # 常见形容词
        "cosy": {"phonetic": "ˈkəʊzi", "translation": "a. 温暖舒适的"},
        "fleeting": {"phonetic": "ˈfliːtɪŋ", "translation": "a. 短暂的，飞逝的"},
        "full-time": {"phonetic": "ˌfʊl ˈtaɪm", "translation": "a. 全职的"},
        "online": {"phonetic": "ˌɒnˈlaɪn", "translation": "a. 在线的"},
        "stressful": {"phonetic": "ˈstresfl", "translation": "a. 充满压力的"},
        "stronger": {"phonetic": "ˈstrɒŋɡə", "translation": "a. 更强的"},

        # 专业术语
        "credentials": {"phonetic": "krɪˈdenʃlz", "translation": "n. 资格证书，文凭"},
        "diplomas": {"phonetic": "dɪˈpləʊməz", "translation": "n. 毕业文凭，学位证书"},
        "qualifications": {"phonetic": "ˌkwɒlɪfɪˈkeɪʃnz", "translation": "n. 资格，学历"},

        # 常见名词复数
        "accidents": {"phonetic": "ˈæksɪdənts", "translation": "n. 事故（accident的复数）"},
        "accommodations": {"phonetic": "əˌkɒməˈdeɪʃnz", "translation": "n. 住宿， accommodations"},
        "actions": {"phonetic": "ˈækʃnz", "translation": "n. 行动（action的复数）"},
        "activities": {"phonetic": "ækˈtɪvətiz", "translation": "n. 活动（activity的复数）"},
        "adults": {"phonetic": "ˈædʌlts", "translation": "n. 成年人（adult的复数）"},
        "advantages": {"phonetic": "ədˈvɑːntɪdʒɪz", "translation": "n. 优势（advantage的复数）"},
        "advertisements": {"phonetic": "ədˈvɜːtɪsmənts", "translation": "n. 广告（advertisement的复数）"},
        "affairs": {"phonetic": "əˈfeəz", "translation": "n. 事务，事情"},
        "agencies": {"phonetic": "ˈeɪdʒənsiz", "translation": "n. 代理机构（agency的复数）"},
        "animals": {"phonetic": "ˈænɪmlz", "translation": "n. 动物（animal的复数）"},
        "antibiotics": {"phonetic": "ˌæntibaɪˈɒtɪks", "translation": "n. 抗生素"},
        "approaches": {"phonetic": "əˈprəʊtʃɪz", "translation": "n. 方法（approach的复数）"},
        "areas": {"phonetic": "ˈeəriəz", "translation": "n. 区域（area的复数）"},
        "articles": {"phonetic": "ˈɑːtɪklz", "translation": "n. 文章（article的复数）"},
        "assignments": {"phonetic": "əˈsaɪnmənts", "translation": "n. 作业（assignment的复数）"},
        "attacks": {"phonetic": "əˈtæks", "translation": "n. 攻击（attack的复数）"},
        "attempts": {"phonetic": "əˈtempts", "translation": "n. 尝试（attempt的复数）"},
        "beds": {"phonetic": "bedz", "translation": "n. 床（bed的复数）"},
        "beginners": {"phonetic": "bɪˈɡɪnəz", "translation": "n. 初学者（beginner的复数）"},
        "belts": {"phonetic": "belts", "translation": "n. 皮带（belt的复数）"},
        "benefits": {"phonetic": "ˈbenɪfɪts", "translation": "n. 利益（benefit的复数）"},
        "bicycles": {"phonetic": "ˈbaɪsɪklz", "translation": "n. 自行车（bicycle的复数）"},
        "birds": {"phonetic": "bɜːdz", "translation": "n. 鸟（bird的复数）"},
        "books": {"phonetic": "bʊks", "translation": "n. 书籍（book的复数）"},
        "bowls": {"phonetic": "bəʊlz", "translation": "n. 碗（bowl的复数）"},
        "brothers": {"phonetic": "ˈbrʌðəz", "translation": "n. 兄弟（brother的复数）"},
        "buildings": {"phonetic": "ˈbɪldɪŋz", "translation": "n. 建筑物（building的复数）"},
        "candles": {"phonetic": "ˈkændlz", "translation": "n. 蜡烛（candle的复数）"},
        "cards": {"phonetic": "kɑːdz", "translation": "n. 卡片（card的复数）"},
        "causes": {"phonetic": "ˈkɔːzɪz", "translation": "n. 原因（cause的复数）"},
        "charges": {"phonetic": "ˈtʃɑːdʒɪz", "translation": "n. 费用（charge的复数）"},
        "cheaper": {"phonetic": "ˈtʃiːpə", "translation": "a. 更便宜的"},
        "checks": {"phonetic": "tʃeks", "translation": "n. 支票（check的复数）"},
        "choices": {"phonetic": "ˈtʃɔɪsɪz", "translation": "n. 选择（choice的复数）"},
        "cities": {"phonetic": "ˈsɪtiz", "translation": "n. 城市（city的复数）"},
        "clients": {"phonetic": "ˈklaɪənts", "translation": "n. 客户（client的复数）"},
        "clubs": {"phonetic": "klʌbz", "translation": "n. 俱乐部（club的复数）"},
        "colleagues": {"phonetic": "ˈkɒliːɡz", "translation": "n. 同事（colleague的复数）"},
        "colleges": {"phonetic": "ˈkɒlɪdʒɪz", "translation": "n. 学院（college的复数）"},
        "companies": {"phonetic": "ˈkʌmpəniz", "translation": "n. 公司（company的复数）"},
        "computers": {"phonetic": "kəmˈpjuːtəz", "translation": "n. 电脑（computer的复数）"},
        "conditions": {"phonetic": "kənˈdɪʃnz", "translation": "n. 条件（condition的复数）"},
        "contacts": {"phonetic": "ˈkɒntæks", "translation": "n. 联系人（contact的复数）"},
        "costs": {"phonetic": "kɒsts", "translation": "n. 成本（cost的复数）"},
        "countries": {"phonetic": "ˈkʌntriz", "translation": "n. 国家（country的复数）"},
        "crops": {"phonetic": "krɒps", "translation": "n. 作物（crop的复数）"},
        "cups": {"phonetic": "kʌps", "translation": "n. 杯子（cup的复数）"},
        "customers": {"phonetic": "ˈkʌstəməz", "translation": "n. 顾客（customer的复数）"},
        "damages": {"phonetic": "ˈdæmɪdʒɪz", "translation": "n. 损害赔偿金"},
        "decorations": {"phonetic": "ˌdekəˈreɪʃnz", "translation": "n. 装饰（decoration的复数）"},
        "details": {"phonetic": "ˈdiːteɪlz", "translation": "n. 细节（detail的复数）"},
        "diseases": {"phonetic": "dɪˈziːzɪz", "translation": "n. 疾病（disease的复数）"},
        "dishes": {"phonetic": "ˈdɪʃɪz", "translation": "n. 盘子；菜肴（dish的复数）"},
        "doctors": {"phonetic": "ˈdɒktəz", "translation": "n. 医生（doctor的复数）"},
        "documents": {"phonetic": "ˈdɒkjumənts", "translation": "n. 文件（document的复数）"},
        "donations": {"phonetic": "dəʊˈneɪʃnz", "translation": "n. 捐赠（donation的复数）"},
        "doors": {"phonetic": "dɔːz", "translation": "n. 门（door的复数）"},
        "draws": {"phonetic": "drɔːz", "translation": "n. 平局（draw的复数）"},
        "drinks": {"phonetic": "drɪŋks", "translation": "n. 饮料（drink的复数）"},
        "drugs": {"phonetic": "drʌɡz", "translation": "n. 药物；毒品（drug的复数）"},
        "duties": {"phonetic": "ˈdjuːtiz", "translation": "n. 关税；职责（duty的复数）"},
        "effects": {"phonetic": "ɪˈfekts", "translation": "n. 效果（effect的复数）"},
        "emergencies": {"phonetic": "ɪˈmɜːdʒənsiz", "translation": "n. 紧急情况（emergency的复数）"},
        "employees": {"phonetic": "ɪmˈplɔɪiːz", "translation": "n. 员工（employee的复数）"},
        "engineers": {"phonetic": "ˌendʒɪˈnɪəz", "translation": "n. 工程师（engineer的复数）"},
        "examples": {"phonetic": "ɪɡˈzɑːmplz", "translation": "n. 例子（example的复数）"},
        "exams": {"phonetic": "ɪɡˈzæms", "translation": "n. 考试（exam的复数）"},
        "expenses": {"phonetic": "ɪkˈspensɪz", "translation": "n. 开支（expense的复数）"},
        "facilities": {"phonetic": "fəˈsɪlətiz", "translation": "n. 设施（facility的复数）"},
        "factories": {"phonetic": "ˈfæktəriz", "translation": "n. 工厂（factory的复数）"},
        "factors": {"phonetic": "ˈfæktəz", "translation": "n. 因素（factor的复数）"},
        "falcons": {"phonetic": "ˈfælkənz", "translation": "n. 猎鹰（falcon的复数）"},
        "families": {"phonetic": "ˈfæmɪliz", "translation": "n. 家庭（family的复数）"},
        "farmers": {"phonetic": "ˈfɑːməz", "translation": "n. 农民（farmer的复数）"},
        "farms": {"phonetic": "fɑːmz", "translation": "n. 农场（farm的复数）"},
        "features": {"phonetic": "ˈfiːtʃəz", "translation": "n. 特征（feature的复数）"},
        "fees": {"phonetic": "fiːz", "translation": "n. 费用（fee的复数）"},
        "figures": {"phonetic": "ˈfɪɡəz", "translation": "n. 数字；图表（figure的复数）"},
        "filmed": {"phonetic": "fɪlmd", "translation": "v. 拍摄（film的过去式）"},
        "fingers": {"phonetic": "ˈfɪŋɡəz", "translation": "n. 手指（finger的复数）"},
        "firms": {"phonetic": "fɜːmz", "translation": "n. 公司（firm的复数）"},
        "flowers": {"phonetic": "ˈflaʊəz", "translation": "n. 花（flower的复数）"},
        "forms": {"phonetic": "fɔːmz", "translation": "n. 形式（form的复数）"},
        "goals": {"phonetic": "ɡəʊlz", "translation": "n. 目标（goal的复数）"},
        "governments": {"phonetic": "ˈɡʌvənmənts", "translation": "n. 政府（government的复数）"},
        "groups": {"phonetic": "ɡruːps", "translation": "n. 组（group的复数）"},
        "guests": {"phonetic": "ɡests", "translation": "n. 客人（guest的复数）"},
        "habits": {"phonetic": "ˈhæbɪts", "translation": "n. 习惯（habit的复数）"},
        "hats": {"phonetic": "hæts", "translation": "n. 帽子（hat的复数）"},
        "hints": {"phonetic": "hɪnts", "translation": "n. 提示（hint的复数）"},
        "hits": {"phonetic": "hɪts", "translation": "n. 击中（hit的复数）"},
        "hobbies": {"phonetic": "ˈhɒbiz", "translation": "n. 爱好（hobby的复数）"},
        "horses": {"phonetic": "ˈhɔːsɪz", "translation": "n. 马（horse的复数）"},
        "humans": {"phonetic": "ˈhjuːmənz", "translation": "n. 人类（human的复数）"},
        "ideas": {"phonetic": "aɪˈdɪəz", "translation": "n. 想法（idea的复数）"},
        "imports": {"phonetic": "ˈɪmpɔːts", "translation": "n. 进口商品（import的复数）"},
        "insects": {"phonetic": "ˈɪnsekts", "translation": "n. 昆虫（insect的复数）"},
        "institutes": {"phonetic": "ˈɪnstɪtjuːts", "translation": "n. 学院（institute的复数）"},
        "institutions": {"phonetic": "ˌɪnstɪˈtjuːʃnz", "translation": "n. 机构（institution的复数）"},
        "instruments": {"phonetic": "ˈɪnstrəmənts", "translation": "n. 仪器（instrument的复数）"},
        "issues": {"phonetic": "ˈɪʃuːz", "translation": "n. 问题（issue的复数）"},
        "items": {"phonetic": "ˈaɪtəmz", "translation": "n. 项目（item的复数）"},
        "keys": {"phonetic": "kiːz", "translation": "n. 钥匙（key的复数）"},
        "kids": {"phonetic": "kɪdz", "translation": "n. 小孩（kid的复数）"},
        "kits": {"phonetic": "kɪts", "translation": "n. 工具包（kit的复数）"},
        "lakes": {"phonetic": "leɪks", "translation": "n. 湖泊（lake的复数）"},
        "levels": {"phonetic": "ˈlevlz", "translation": "n. 水平（level的复数）"},
        "libraries": {"phonetic": "ˈlaɪbrəriz", "translation": "n. 图书馆（library的复数）"},
        "lions": {"phonetic": "ˈlaɪənz", "translation": "n. 狮子（lion的复数）"},
        "loans": {"phonetic": "ləʊnz", "translation": "n. 贷款（loan的复数）"},
        "locations": {"phonetic": "ləʊˈkeɪʃnz", "translation": "n. 位置（location的复数）"},
        "machines": {"phonetic": "məˈʃiːnz", "translation": "n. 机器（machine的复数）"},
        "mails": {"phonetic": "meɪlz", "translation": "n. 邮件（mail的复数）"},
        "majors": {"phonetic": "ˈmeɪdʒəz", "translation": "n. 专业（major的复数）"},
        "marks": {"phonetic": "mɑːks", "translation": "n. 标记（mark的复数）"},
        "materials": {"phonetic": "məˈtɪəriəlz", "translation": "n. 材料（material的复数）"},
        "meals": {"phonetic": "miːlz", "translation": "n. 一餐（meal的复数）"},
        "measurements": {"phonetic": "ˈmeʒəmənts", "translation": "n. 测量（measurement的复数）"},
        "methods": {"phonetic": "ˈmeθədz", "translation": "n. 方法（method的复数）"},
        "miles": {"phonetic": "maɪlz", "translation": "n. 英里（mile的复数）"},
        "mills": {"phonetic": "mɪlz", "translation": "n. 工厂（mill的复数）"},
        "minutes": {"phonetic": "ˈmɪnɪts", "translation": "n. 分钟（minute的复数）"},
        "muscles": {"phonetic": "ˈmʌslz", "translation": "n. 肌肉（muscle的复数）"},
        "narrator": {"phonetic": "nəˈreɪtə", "translation": "n. 叙述者"},
        "nationalities": {"phonetic": "ˌnæʃəˈnælətiz", "translation": "n. 国籍（nationality的复数）"},
        "nets": {"phonetic": "nets", "translation": "n. 网（net的复数）"},
        "newspapers": {"phonetic": "ˈnjuːzpeɪpəz", "translation": "n. 报纸（newspaper的复数）"},
        "notes": {"phonetic": "nəʊts", "translation": "n. 笔记（note的复数）"},
        "occupants": {"phonetic": "ˈɒkjʊpənts", "translation": "n. 居住者（occupant的复数）"},
        "options": {"phonetic": "ˈɒpʃnz", "translation": "n. 选择（option的复数）"},
        "pages": {"phonetic": "ˈpeɪdʒɪz", "translation": "n. 页（page的复数）"},
        "papers": {"phonetic": "ˈpeɪpəz", "translation": "n. 文件；论文（paper的复数）"},
        "parents": {"phonetic": "ˈpeərənts", "translation": "n. 父母（parent的复数）"},
        "parties": {"phonetic": "ˈpɑːtiz", "translation": "n. 派对（party的复数）"},
        "patients": {"phonetic": "ˈpeɪʃnts", "translation": "n. 病人（patient的复数）"},
        "patterns": {"phonetic": "ˈpætnz", "translation": "n. 模式（pattern的复数）"},
        "pennies": {"phonetic": "ˈpeniz", "translation": "n. 便士（penny的复数）"},
        "photographs": {"phonetic": "ˈfəʊtəɡrɑːfs", "translation": "n. 照片（photograph的复数）"},
        "photos": {"phonetic": "ˈfəʊtəʊz", "translation": "n. 照片（photo的复数）"},
        "pictures": {"phonetic": "ˈpɪktʃəz", "translation": "n. 图片（picture的复数）"},
        "pills": {"phonetic": "pɪlz", "translation": "n. 药丸（pill的复数）"},
        "places": {"phonetic": "ˈpleɪsɪz", "translation": "n. 地方（place的复数）"},
        "planning": {"phonetic": "ˈplænɪŋ", "translation": "n. 规划；计划"},
        "plants": {"phonetic": "plɑːnts", "translation": "n. 植物（plant的复数）"},
        "positions": {"phonetic": "pəˈzɪʃnz", "translation": "n. 职位（position的复数）"},
        "problems": {"phonetic": "ˈprɒbləmz", "translation": "n. 问题（problem的复数）"},
        "products": {"phonetic": "ˈprɒdʌkts", "translation": "n. 产品（product的复数）"},
        "professions": {"phonetic": "prəˈfeʃnz", "translation": "n. 职业（profession的复数）"},
        "profits": {"phonetic": "ˈprɒfɪts", "translation": "n. 利润（profit的复数）"},
        "questions": {"phonetic": "ˈkwestʃnz", "translation": "n. 问题（question的复数）"},
        "readers": {"phonetic": "ˈriːdəz", "translation": "n. 读者（reader的复数）"},
        "reasons": {"phonetic": "ˈriːznz", "translation": "n. 原因（reason的复数）"},
        "records": {"phonetic": "ˈrekɔːdz", "translation": "n. 记录（record的复数）"},
        "recycling": {"phonetic": "ˌriːˈsaɪklɪŋ", "translation": "n. 回收利用"},
        "refreshments": {"phonetic": "rɪˈfreʃmənts", "translation": "n. 茶点；饮料"},
        "regulations": {"phonetic": "ˌreɡjʊˈleɪʃnz", "translation": "n. 规则（regulation的复数）"},
        "reinforced": {"phonetic": "ˌriːɪnˈfɔːst", "translation": "a. 加固的"},
        "relations": {"phonetic": "rɪˈleɪʃnz", "translation": "n. 关系（relation的复数）"},
        "reports": {"phonetic": "rɪˈpɔːts", "translation": "n. 报告（report的复数）"},
        "residents": {"phonetic": "ˈrezɪdənts", "translation": "n. 居民（resident的复数）"},
        "resources": {"phonetic": "rɪˈsɔːsɪz", "translation": "n. 资源（resource的复数）"},
        "results": {"phonetic": "rɪˈzʌlts", "translation": "n. 结果（result的复数）"},
        "retails": {"phonetic": "ˈriːteɪlz", "translation": "v. 零售（retail的第三人称单数）"},
        "risks": {"phonetic": "rɪsks", "translation": "n. 风险（risk的复数）"},
        "rivers": {"phonetic": "ˈrɪvəz", "translation": "n. 河流（river的复数）"},
        "robots": {"phonetic": "ˈrəʊbɒts", "translation": "n. 机器人（robot的复数）"},
        "rocks": {"phonetic": "rɒks", "translation": "n. 岩石（rock的复数）"},
        "roommate": {"phonetic": "ˈruːmmeɪt", "translation": "n. 室友"},
        "rows": {"phonetic": "rəʊz", "translation": "n. 排（row的复数）"},
        "rules": {"phonetic": "ruːlz", "translation": "n. 规则（rule的复数）"},
        "sales": {"phonetic": "seɪlz", "translation": "n. 销售额；销售"},
        "seats": {"phonetic": "siːts", "translation": "n. 座位（seat的复数）"},
        "shoes": {"phonetic": "ʃuːz", "translation": "n. 鞋子（shoe的复数）"},
        "sites": {"phonetic": "saɪts", "translation": "n. 网站（site的复数）"},
        "sizes": {"phonetic": "ˈsaɪzɪz", "translation": "n. 尺寸（size的复数）"},
        "skills": {"phonetic": "skɪlz", "translation": "n. 技能（skill的复数）"},
        "snacks": {"phonetic": "snæks", "translation": "n. 零食（snack的复数）"},
        "sources": {"phonetic": "ˈsɔːsɪz", "translation": "n. 来源（source的复数）"},
        "stairs": {"phonetic": "steəz", "translation": "n. 楼梯"},
        "standards": {"phonetic": "ˈstændədz", "translation": "n. 标准（standard的复数）"},
        "States": {"phonetic": "steɪts", "translation": "n. 州（美国的州）"},
        "stations": {"phonetic": "ˈsteɪʃnz", "translation": "n. 车站（station的复数）"},
        "steps": {"phonetic": "steps", "translation": "n. 台阶（step的复数）"},
        "stones": {"phonetic": "stəʊnz", "translation": "n. 石头（stone的复数）"},
        "stores": {"phonetic": "stɔːz", "translation": "n. 商店（store的复数）"},
        "studies": {"phonetic": "ˈstʌdiz", "translation": "n. 学习；研究（study的复数）"},
        "styles": {"phonetic": "staɪlz", "translation": "n. 风格（style的复数）"},
        "subjects": {"phonetic": "ˈsʌbdʒɪks", "translation": "n. 科目；主题（subject的复数）"},
        "subtitles": {"phonetic": "ˈsʌbtaɪtlz", "translation": "n. 字幕（subtitle的复数）"},
        "suggestions": {"phonetic": "səˈdʒestʃənz", "translation": "n. 建议（suggestion的复数）"},
        "systems": {"phonetic": "ˈsɪstəmz", "translation": "n. 系统（system的复数）"},
        "tables": {"phonetic": "ˈteɪblz", "translation": "n. 桌子；表格（table的复数）"},
        "teams": {"phonetic": "tiːmz", "translation": "n. 团队（team的复数）"},
        "techniques": {"phonetic": "tekˈniːks", "translation": "n. 技巧（technique的复数）"},
        "temples": {"phonetic": "ˈtemplz", "translation": "n. 寺庙（temple的复数）"},
        "terms": {"phonetic": "tɜːmz", "translation": "n. 条款；术语（term的复数）"},
        "thoughts": {"phonetic": "θɔːts", "translation": "n. 想法（thought的复数）"},
        "tickets": {"phonetic": "ˈtɪkɪts", "translation": "n. 票（ticket的复数）"},
        "tiles": {"phonetic": "taɪlz", "translation": "n. 瓷砖（tile的复数）"},
        "tones": {"phonetic": "təʊnz", "translation": "n. 语气；色调（tone的复数）"},
        "topics": {"phonetic": "ˈtɒpɪks", "translation": "n. 主题（topic的复数）"},
        "toys": {"phonetic": "tɔɪz", "translation": "n. 玩具（toy的复数）"},
        "trains": {"phonetic": "treɪnz", "translation": "n. 火车（train的复数）"},
        "travelers": {"phonetic": "ˈtrævələz", "translation": "n. 旅行者（traveler的复数）"},
        "trees": {"phonetic": "triːz", "translation": "n. 树（tree的复数）"},
        "trends": {"phonetic": "trends", "translation": "n. 趋势（trend的复数）"},
        "types": {"phonetic": "taɪps", "translation": "v. 打字（type的第三人称单数）"},
        "vacancies": {"phonetic": "ˈveɪkənsiz", "translation": "n. 空缺（vacancy的复数）"},
        "videos": {"phonetic": "ˈvɪdiəʊz", "translation": "n. 视频（video的复数）"},
        "visitors": {"phonetic": "ˈvɪzɪtəz", "translation": "n. 访问者（visitor的复数）"},
        "walls": {"phonetic": "wɔːlz", "translation": "n. 墙（wall的复数）"},
        "website": {"phonetic": "ˈwebsaɪt", "translation": "n. 网站"},
        "weekdays": {"phonetic": "ˈwiːkdeɪz", "translation": "ad. 在每个工作日"},
        "weekends": {"phonetic": "ˌwiːkˈendz", "translation": "ad. 在每个周末"},
        "westerner": {"phonetic": "ˈwestənə", "translation": "n. 西方人"},
        "words": {"phonetic": "wɜːdz", "translation": "n. 单词；话语（word的复数）"},
    }

    return phonetics


def main():
    """主函数"""
    print("="*70)
    print("阶段2：全量音标强制补齐计划 - 批量更新所有级别")
    print("="*70)
    print()

    # 加载 ECDICT 音标映射
    ecdict_map = load_ecdict_phonetics()

    if not ecdict_map:
        print("[错误] 无法加载 ECDICT 数据")
        sys.exit(1)

    print()

    # 处理所有级别
    levels = ['cet6', 'ielts', 'toefl']
    results = {}

    for level in levels:
        # 加载词库
        words = load_word_list(level)
        if not words:
            print(f"[警告] 跳过 {level.upper()}")
            continue

        # 更新音标
        stats = update_phonetics_from_ecdict(words, ecdict_map, level)
        results[level] = stats

        # 如果有未匹配的，尝试手动补充
        if stats['not_found'] > 0:
            manual_updated = generate_manual_phonetics(
                words,
                stats['not_found_list'],
                level
            )

            # 保存手动更新
            if manual_updated > 0:
                word_file = f'src/assets/data/{level}_words.json'
                with open(word_file, 'w', encoding='utf-8') as f:
                    json.dump(words, f, ensure_ascii=False, indent=2)

                results[level]['updated'] += manual_updated
                results[level]['not_found'] -= manual_updated

                print(f"\n[完成] 手动补充了 {manual_updated} 个单词")

        print()

    # 输出总结报告
    print("="*70)
    print("批量更新总结")
    print("="*70)
    print()

    total_missing = 0
    total_updated = 0
    total_not_found = 0

    for level, stats in results.items():
        print(f"{level.upper():10} 缺失: {stats['total']:3}  |  "
              f"已补全: {stats['updated']:3}  |  "
              f"未找到: {stats['not_found']:3}")

        total_missing += stats['total']
        total_updated += stats['updated']
        total_not_found += stats['not_found']

    print()
    print(f"{'总计':10} 缺失: {total_missing:3}  |  "
          f"已补全: {total_updated:3}  |  "
          f"未找到: {total_not_found:3}")
    print()

    success_rate = (total_updated / total_missing * 100) if total_missing > 0 else 0
    print(f"补全率: {success_rate:.1f}%")

    if total_not_found > 0:
        print()
        print(f"[注意] 还有 {total_not_found} 个单词需要人工处理")


if __name__ == "__main__":
    main()
