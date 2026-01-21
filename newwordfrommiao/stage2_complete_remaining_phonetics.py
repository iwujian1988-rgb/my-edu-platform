#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
阶段2：音标补全计划 - 补充剩余单词音标
为 CET6 和 TOEFL 中未匹配的单词补充音标
"""

import json
import os
import sys

# 设置标准输出编码为 UTF-8
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')


# CET6 剩余单词音标
CET6_REMAINING = {
    "consistently": {"phonetic": "kənˈsɪstəntli", "translation": "ad. 一贯地，一致地"},
    "consultancy": {"phonetic": "kənˈsʌltənsi", "translation": "n. 咨询公司，顾问工作"},
    "disillusioned": {"phonetic": "ˌdɪsɪˈluːʒnd", "translation": "a. 幻想破灭的，不再抱幻想的"},
    "distil": {"phonetic": "dɪˈstɪl", "translation": "v. 蒸馏，提炼"},
    "firework": {"phonetic": "ˈfaɪəwɜːk", "translation": "n. 烟火"},
    "first-rate": {"phonetic": "ˌfɜːst ˈreɪt", "translation": "a. 第一流的，优秀的"},
    "grants": {"phonetic": "ɡrɑːnts", "translation": "n. 拨款（grant的复数）"},
    "hypotheses": {"phonetic": "haɪˈpɒθəsiːz", "translation": "n. 假设（hypothesis的复数）"},
    "indefinitely": {"phonetic": "ɪnˈdefɪnətli", "translation": "ad. 无限期地"},
    "instinctively": {"phonetic": "ɪnˈstɪŋktɪvli", "translation": "ad. 本能地"},
    "intellectually": {"phonetic": "ˌɪntɪˈlektʃuəli", "translation": "ad. 理智上，智力上"},
    "inversely": {"phonetic": "ɪnˈvɜːsli", "translation": "ad. 相反地"},
    "ironically": {"phonetic": "aɪˈrɒnɪkli", "translation": "ad. 讽刺地"},
    "paradoxically": {"phonetic": "ˌpærəˈdɒksɪkli", "translation": "ad. 悖论地，似非而是地"},
    "positively": {"phonetic": "ˈpɒzətɪvli", "translation": "ad. 积极地，肯定地"},
    "predominantly": {"phonetic": "prɪˈdɒmɪnəntli", "translation": "ad. 占主导地位地，显著地"},
    "sitting-room": {"phonetic": "ˈsɪtɪŋ ruːm", "translation": "n. 起居室"},
    "superficially": {"phonetic": "ˌsuːpəˈfɪʃəli", "translation": "ad. 表面上地，浅薄地"},
    "vividly": {"phonetic": "ˈvɪvɪdli", "translation": "ad. 生动地"},
}

# TOEFL 剩余单词音标
TOEFL_REMAINING = {
    "accompanying": {"phonetic": "əˈkʌmpəniɪŋ", "translation": "a. 陪伴的，附随的"},
    "adversely": {"phonetic": "ˈædvɜːsli", "translation": "ad. 不利地，有害地"},
    "affordable": {"phonetic": "əˈfɔːdəbl", "translation": "a. 负担得起的"},
    "aggressiveness": {"phonetic": "əˈɡresɪvnəs", "translation": "n. 攻击性，进取心"},
    "approaching": {"phonetic": "əˈprəʊtʃɪŋ", "translation": "a. 接近的"},
    "astonished": {"phonetic": "əˈstɒnɪʃt", "translation": "a. 惊讶的"},
    "asymmetrical": {"phonetic": "ˌeɪsɪˈmetrɪkl", "translation": "a. 不对称的"},
    "automated": {"phonetic": "ˈɔːtəmeɪtɪd", "translation": "a. 自动化的"},
    "avocational": {"phonetic": "ˌævəˈkeɪʃənl", "translation": "a. 业余爱好的"},
    "awkwardly": {"phonetic": "ˈɔːkwədli", "translation": "ad. 笨拙地"},
    "axe": {"phonetic": "æks", "translation": "n. 斧头"},
    "baby-sitter": {"phonetic": "ˈbeɪbi sɪtə", "translation": "n. 临时保姆"},
    "barrenness": {"phonetic": "ˈbærənnəs", "translation": "n. 贫瘠，不育"},
    "brawling": {"phonetic": "ˈbrɔːlɪŋ", "translation": "n. 争吵"},
    "cometary": {"phonetic": "ˈkɒmɪtri", "translation": "a. 彗星的"},
    "committed": {"phonetic": "kəˈmɪtɪd", "translation": "a. 坚定的，承担义务的"},
    "competing": {"phonetic": "kəmˈpiːtɪŋ", "translation": "a. 竞争的"},
    "competitiveness": {"phonetic": "kəmˈpetətɪvnəs", "translation": "n. 竞争力"},
    "conciseness": {"phonetic": "kənˈsaɪsnəs", "translation": "n. 简明"},
    "consciously": {"phonetic": "ˈkɒnʃəsli", "translation": "ad. 有意识地"},
    "coordinated": {"phonetic": "kəʊˈɔːdɪneɪtɪd", "translation": "a. 协调的"},
    "courteously": {"phonetic": "ˈkɜːtiəsli", "translation": "ad. 有礼貌地"},
    "customs": {"phonetic": "ˈkʌstəmz", "translation": "n. 海关"},
    "despoiler": {"phonetic": "dɪˈspɔɪlə", "translation": "n. 掠夺者"},
    "diligently": {"phonetic": "ˈdɪlɪdʒəntli", "translation": "ad. 勤奋地"},
    "dues": {"phonetic": "djuːz", "translation": "n. 应付款，会费"},
    "eclat": {"phonetic": "eɪˈklɑː", "translation": "n. 显赫，辉煌"},
    "emerging": {"phonetic": "ɪˈmɜːdʒɪŋ", "translation": "a. 新兴的"},
    "entrenched": {"phonetic": "ɪnˈtrentʃt", "translation": "a. 根深蒂固的"},
    "ethically": {"phonetic": "ˈeθɪkli", "translation": "ad. 道德上"},
    "exceptionally": {"phonetic": "ɪkˈsepʃənəli", "translation": "ad. 异常地，格外地"},
    "eye-catching": {"phonetic": "ˈaɪ kætʃɪŋ", "translation": "a. 引人注目的"},
    "facelift": {"phonetic": "ˈfeɪslɪft", "translation": "n. 翻新，改善"},
    "far-reaching": {"phonetic": "ˌfɑː ˈriːtʃɪŋ", "translation": "a. 深远的，影响广泛的"},
    "fruitfulness": {"phonetic": "ˈfruːtflnəs", "translation": "n. 富有成效"},
    "fruitlessly": {"phonetic": "ˈfruːtləsli", "translation": "ad. 徒劳地"},
    "genetically": {"phonetic": "dʒəˈnetɪkli", "translation": "ad. 遗传上"},
    "hands-on": {"phonetic": "ˈhændz ɒn", "translation": "a. 亲手实践的"},
    "in spite of": {"phonetic": "ɪn spaɪt ɒv", "translation": "prep. 尽管"},
    "inextricably": {"phonetic": "ˌɪnɪkˈstrɪkəbli", "translation": "ad. 分不开地，无法摆脱地"},
    "intentionally": {"phonetic": "ɪnˈtenʃənəli", "translation": "ad. 故意地"},
    "interconnecting": {"phonetic": "ˌɪntəkəˈnektɪŋ", "translation": "a. 相互连接的"},
    "irregularly": {"phonetic": "ɪˈreɡjələli", "translation": "ad. 不规则地"},
    "jewels": {"phonetic": "ˈdʒuːəlz", "translation": "n. 珠宝（jewel的复数）"},
    "laboriously": {"phonetic": "ləˈbɔːriəsli", "translation": "ad. 费力地"},
    "larvae": {"phonetic": "ˈlɑːviː", "translation": "n. 幼虫（larva的复数）"},
    "laurels": {"phonetic": "ˈlɒrəlz", "translation": "n. 殊荣，荣誉"},
    "long-range": {"phonetic": "ˌlɒŋ ˈreɪndʒ", "translation": "a. 长期的，远程的"},
    "lyrically": {"phonetic": "ˈlɪrɪkli", "translation": "ad. 抒情地"},
    "measures": {"phonetic": "ˈmeʒəz", "translation": "n. 措施（measure的复数）"},
    "mechanized": {"phonetic": "ˈmekənaɪzd", "translation": "a. 机械化的"},
    "meticulously": {"phonetic": "məˈtɪkjələsli", "translation": "ad. 一丝不苟地"},
    "multistory": {"phonetic": "ˈmʌltistɔːri", "translation": "a. 多层的"},
    "notoriously": {"phonetic": "nəʊˈtɔːriəsli", "translation": "ad. 臭名昭著地"},
    "obsessed": {"phonetic": "əbˈsest", "translation": "a. 着迷的"},
    "packed": {"phonetic": "pækt", "translation": "a. 拥挤的，包装好的"},
    "patroller": {"phonetic": "pəˈtrəʊlə", "translation": "n. 巡逻者"},
    "perennially": {"phonetic": "pəˈreniəli", "translation": "ad. 长期地，持久地"},
    "pioneering": {"phonetic": "ˌpaɪəˈnɪərɪŋ", "translation": "a. 先驱的，开创性的"},
    "prescribed": {"phonetic": "prɪˈskraɪbd", "translation": "a. 规定的，开处方的"},
    "prohibitively": {"phonetic": "prəˈhɪbɪtɪvli", "translation": "ad. 禁止性地，过高地"},
    "prototypical": {"phonetic": "ˌprəʊtəˈtɪpɪkl", "translation": "a. 原型的"},
    "purified": {"phonetic": "ˈpjʊərɪfaɪd", "translation": "a. 净化的"},
    "recurring": {"phonetic": "rɪˈkɜːrɪŋ", "translation": "a. 循环的，再发的"},
    "remaining": {"phonetic": "rɪˈmeɪnɪŋ", "translation": "a. 剩余的"},
    "rentable": {"phonetic": "ˈrentəbl", "translation": "a. 可租的"},
    "reverently": {"phonetic": "ˈrevərəntli", "translation": "ad. 虔诚地，恭敬地"},
    "routinely": {"phonetic": "ruːˈtiːnli", "translation": "ad. 例行公事地"},
    "ruins": {"phonetic": "ˈruːɪnz", "translation": "n. 废墟"},
    "saltiness": {"phonetic": "ˈsɔːltinəs", "translation": "n. 咸味"},
    "scrupulously": {"phonetic": "ˈskruːpjələsli", "translation": "ad. 严谨地，审慎地"},
    "seamen": {"phonetic": "ˈsiːmən", "translation": "n. 海员（seaman的复数）"},
    "sheltered": {"phonetic": "ˈʃeltəd", "translation": "a. 受庇护的"},
    "space shuttle": {"phonetic": "speɪs ˈʃʌtl", "translation": "n. 航天飞机"},
    "sparingly": {"phonetic": "ˈspeərɪŋli", "translation": "ad. 节俭地，谨慎地"},
    "specialized": {"phonetic": "ˈspeʃəlaɪzd", "translation": "a. 专业的"},
    "specified": {"phonetic": "ˈspesɪfaɪd", "translation": "a. 指定的"},
    "spectacularly": {"phonetic": "spekˈtækjələli", "translation": "ad. 壮观地"},
    "spectra": {"phonetic": "ˈspektrə", "translation": "n. 光谱（spectrum的复数）"},
    "spontaneously": {"phonetic": "spɒnˈteɪniəsli", "translation": "ad. 自发地"},
    "sporadically": {"phonetic": "spəˈrædɪkli", "translation": "ad. 零星地"},
    "stimuli": {"phonetic": "ˈstɪmjʊlaɪ", "translation": "n. 刺激物（stimulus的复数）"},
    "strenuously": {"phonetic": "ˈstrenjuəsli", "translation": "ad. 费力地，努力地"},
    "strikingly": {"phonetic": "ˈstraɪkɪŋli", "translation": "ad. 显著地，引人注目地"},
    "strings": {"phonetic": "strɪŋz", "translation": "n. 线，弦（string的复数）"},
    "stubbornness": {"phonetic": "ˈstʌbənnəs", "translation": "n. 顽固"},
    "stylized": {"phonetic": "ˈstaɪlaɪzd", "translation": "a. 风格化的"},
    "subduct": {"phonetic": "sʌbˈdʌkt", "translation": "v. 俯冲，减去"},
    "subjected": {"phonetic": "səbˈdʒektɪd", "translation": "a. 受支配的，经受的"},
    "sunglasses": {"phonetic": "ˈsʌnlɑːsɪz", "translation": "n. 太阳镜"},
    "supremely": {"phonetic": "suːˈpriːmli", "translation": "ad. 至高无上地，极度地"},
    "textured": {"phonetic": "ˈtekstʃəd", "translation": "a. 有纹理的"},
    "thousand-fold": {"phonetic": "ˈθaʊznd fəʊld", "translation": "ad. 千倍地"},
    "traditionally": {"phonetic": "trəˈdɪʃənəli", "translation": "ad. 传统上"},
    "tropics": {"phonetic": "ˈtrɒpɪks", "translation": "n. 热带地区"},
    "troubling": {"phonetic": "ˈtrʌblɪŋ", "translation": "a. 令人不安的"},
    "turnpike": {"phonetic": "ˈtɜːnpaɪk", "translation": "n. 高速公路"},
    "ultrasonics": {"phonetic": "ˌʌltrəˈsɒnɪks", "translation": "n. 超声波学"},
    "unevenly": {"phonetic": "ʌnˈiːvənli", "translation": "ad. 不均匀地"},
    "unquestionably": {"phonetic": "ʌnˈkwestʃənəbli", "translation": "ad. 毫无疑问地"},
}


def update_words_with_phonetics(words: list, phonetics_dict: dict, level: str):
    """使用给定的音标字典更新单词列表"""
    print(f"\n{'='*70}")
    print(f"更新 {level.upper()} 剩余单词音标")
    print(f"{'='*70}\n")

    updated = 0
    for word_obj in words:
        word = word_obj['word']
        if word in phonetics_dict and not word_obj.get('phonetic', '').strip():
            word_obj['phonetic'] = phonetics_dict[word]['phonetic']
            if 'translation' in phonetics_dict[word]:
                word_obj['translation'] = phonetics_dict[word]['translation']
            print(f"  ✓ {word:30} → {phonetics_dict[word]['phonetic']}")
            updated += 1

    if updated > 0:
        # 保存更新
        word_file = f'src/assets/data/{level}_words.json'
        with open(word_file, 'w', encoding='utf-8') as f:
            json.dump(words, f, ensure_ascii=False, indent=2)
        print(f"\n[保存] 已更新 {updated} 个单词到 {word_file}")

    return updated


def main():
    """主函数"""
    print("="*70)
    print("阶段2：补全剩余单词音标")
    print("="*70)

    # 处理 CET6
    cet6_file = 'src/assets/data/cet6_words.json'
    with open(cet6_file, 'r', encoding='utf-8') as f:
        cet6_words = json.load(f)

    cet6_updated = update_words_with_phonetics(cet6_words, CET6_REMAINING, 'cet6')

    # 处理 TOEFL
    toefl_file = 'src/assets/data/toefl_words.json'
    with open(toefl_file, 'r', encoding='utf-8') as f:
        toefl_words = json.load(f)

    toefl_updated = update_words_with_phonetics(toefl_words, TOEFL_REMAINING, 'toefl')

    # 总结
    print("\n" + "="*70)
    print("更新总结")
    print("="*70)
    print(f"CET6:  更新了 {cet6_updated} 个单词")
    print(f"TOEFL: 更新了 {toefl_updated} 个单词")
    print(f"总计:  更新了 {cet6_updated + toefl_updated} 个单词")
    print()


if __name__ == "__main__":
    main()
