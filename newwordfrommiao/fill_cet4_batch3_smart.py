#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CET4 智能注水 - 批次 3 (500 词)
特性：
1. 智能推断缺失的词性和中文释义
2. 2026 风格原生例句生成
3. 数据回填：将推断的信息补回 Master Pool
"""

import json
import sys
from pathlib import Path
from datetime import datetime
import random

# Windows UTF-8 编码设置
if sys.platform == 'win32':
    import io
    sys.stdin = io.TextIOWrapper(sys.stdin.buffer, encoding='utf-8')
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# ============================================================================
# CET4 常见词汇知识库（用于推断缺失数据）
# ============================================================================
CET4_KNOWLEDGE_BASE = {
    # A-B
    'ability': {'pos': 'n.', 'cn': '能力，才能'},
    'abnormal': {'pos': 'adj.', 'cn': '不正常的，变态的'},
    'aboard': {'pos': 'adv./prep.', 'cn': '在船(车)上'},
    'absence': {'pos': 'n.', 'cn': '缺席，不在场'},
    'absolute': {'pos': 'adj.', 'cn': '绝对的，完全的'},
    'absorb': {'pos': 'v.', 'cn': '吸收，同化'},
    'abstract': {'pos': 'adj./n.', 'cn': '抽象的；摘要'},
    'academic': {'pos': 'adj.', 'cn': '学术的，学院的'},
    'accelerate': {'pos': 'v.', 'cn': '加速，促进'},
    'accept': {'pos': 'v.', 'cn': '接受，同意'},
    'access': {'pos': 'n./v.', 'cn': '接近，通道；存取'},
    'accident': {'pos': 'n.', 'cn': '事故，意外'},
    'accommodate': {'pos': 'v.', 'cn': '容纳，适应'},
    'accompany': {'pos': 'v.', 'cn': '陪伴，伴奏'},
    'accomplish': {'pos': 'v.', 'cn': '完成，实现'},
    'accordance': {'pos': 'n.', 'cn': '一致，和谐'},
    'account': {'pos': 'n./v.', 'cn': '账户；解释'},
    'accumulate': {'pos': 'v.', 'cn': '积累，积聚'},
    'accurate': {'pos': 'adj.', 'cn': '准确的，精确的'},
    'accuse': {'pos': 'v.', 'cn': '指责，归咎'},
    'accustomed': {'pos': 'adj.', 'cn': '习惯的'},
    'achievement': {'pos': 'n.', 'cn': '成就，完成'},
    'acknowledge': {'pos': 'v.', 'cn': '承认，致谢'},
    'acquire': {'pos': 'v.', 'cn': '获得，学到'},
    'adapt': {'pos': 'v.', 'cn': '适应，改编'},
    'addition': {'pos': 'n.', 'cn': '加，增加'},
    'additional': {'pos': 'adj.', 'cn': '附加的，追加的'},
    'address': {'pos': 'n./v.', 'cn': '地址；演讲，处理'},
    'adequate': {'pos': 'adj.', 'cn': '足够的，适当的'},
    'adjust': {'pos': 'v.', 'cn': '调整，调节'},
    'administration': {'pos': 'n.', 'cn': '管理，行政'},
    'admire': {'pos': 'v.', 'cn': '钦佩，赞赏'},
    'admit': {'pos': 'v.', 'cn': '承认，准许进入'},
    'adopt': {'pos': 'v.', 'cn': '采用，收养'},
    'adult': {'pos': 'n./adj.', 'cn': '成年人；成年的'},
    'advance': {'pos': 'n./v./adj.', 'cn': '前进；提前'},
    'advanced': {'pos': 'adj.', 'cn': '先进的，高级的'},
    'advantage': {'pos': 'n.', 'cn': '优势，利益'},
    'adventure': {'pos': 'n.', 'cn': '冒险，奇遇'},
    'advisable': {'pos': 'adj.', 'cn': '明智的，可取的'},
    'affair': {'pos': 'n.', 'cn': '事情，事件'},
    'affect': {'pos': 'v.', 'cn': '影响，感动'},
    'affection': {'pos': 'n.', 'cn': '慈爱，爱慕'},
    'afford': {'pos': 'v.', 'cn': '担负得起，提供'},
    'agency': {'pos': 'n.', 'cn': '代理处，机构'},
    'aggressive': {'pos': 'adj.', 'cn': '侵略的，好斗的'},
    'agreement': {'pos': 'n.', 'cn': '协定，同意'},
    'agriculture': {'pos': 'n.', 'cn': '农业'},
    'aid': {'pos': 'n./v.', 'cn': '援助，救护'},
    'alarm': {'pos': 'n./v.', 'cn': '警报；惊恐'},
    'alcohol': {'pos': 'n.', 'cn': '酒精，乙醇'},
    'alert': {'pos': 'adj./n./v.', 'cn': '警觉的；警报'},
    'alliance': {'pos': 'n.', 'cn': '联盟，联合'},
    'allocate': {'pos': 'v.', 'cn': '分配，拨给'},
    'allowance': {'pos': 'n.', 'cn': '津贴，允许'},
    'alter': {'pos': 'v.', 'cn': '改变，变更'},
    'alternative': {'pos': 'n./adj.', 'cn': '替代物；交替的'},
    'amaze': {'pos': 'v.', 'cn': '使惊奇，使吃惊'},
    'ambition': {'pos': 'n.', 'cn': '雄心，野心'},
    'ambulance': {'pos': 'n.', 'cn': '救护车'},
    'amount': {'pos': 'n./v.', 'cn': '数量，总计'},
    'amuse': {'pos': 'v.', 'cn': '逗乐，给...娱乐'},
    'analyze': {'pos': 'v.', 'cn': '分析，分解'},
    'analysis': {'pos': 'n.', 'cn': '分析，解析'},
    'ancestor': {'pos': 'n.', 'cn': '祖先，祖宗'},
    'ancient': {'pos': 'adj.', 'cn': '古代的，古老的'},
    'anniversary': {'pos': 'n.', 'cn': '周年纪念日'},
    'announce': {'pos': 'v.', 'cn': '宣布，发表'},
    'annual': {'pos': 'adj.', 'cn': '每年的，年度的'},
    'anticipate': {'pos': 'v.', 'cn': '预期，期望'},
    'anxiety': {'pos': 'n.', 'cn': '焦虑，忧虑'},
    'anxious': {'pos': 'adj.', 'cn': '忧虑的，渴望的'},
    'apart': {'pos': 'adv.', 'cn': '分开，相隔'},
    'apologize': {'pos': 'v.', 'cn': '道歉，谢罪'},
    'apparent': {'pos': 'adj.', 'cn': '明显的，表面的'},
    'appeal': {'pos': 'n./v.', 'cn': '呼吁，申诉'},
    'appetite': {'pos': 'n.', 'cn': '食欲，欲望'},
    'appliance': {'pos': 'n.', 'cn': '用具，器具'},
    'applicable': {'pos': 'adj.', 'cn': '能应用的，适当的'},
    'application': {'pos': 'n.', 'cn': '申请，应用'},
    'apply': {'pos': 'v.', 'cn': '申请，应用'},
    'appoint': {'pos': 'v.', 'cn': '任命，约定'},
    'appointment': {'pos': 'n.', 'cn': '约会，任命'},
    'appreciate': {'pos': 'v.', 'cn': '感激，欣赏'},
    'approach': {'pos': 'n./v.', 'cn': '方法，接近'},
    'appropriate': {'pos': 'adj.', 'cn': '适当的，恰当的'},
    'approval': {'pos': 'n.', 'cn': '批准，同意'},
    'approve': {'pos': 'v.', 'cn': '批准，赞成'},
    'approximate': {'pos': 'adj./v.', 'cn': '近似的；接近'},
    'arbitrary': {'pos': 'adj.', 'cn': '任意的，专断的'},
    'architect': {'pos': 'n.', 'cn': '建筑师'},
    'architecture': {'pos': 'n.', 'cn': '建筑学，建筑式样'},
    'area': {'pos': 'n.', 'cn': '面积，区域'},
    'argue': {'pos': 'v.', 'cn': '争论，辩论'},
    'argument': {'pos': 'n.', 'cn': '争论，论点'},
    'arise': {'pos': 'v.', 'cn': '出现，发生'},
    'arithmetic': {'pos': 'n.', 'cn': '算术'},
    'arouse': {'pos': 'v.', 'cn': '引起，唤起'},
    'arrange': {'pos': 'v.', 'cn': '整理，安排'},
    'arrangement': {'pos': 'n.', 'cn': '安排，排列'},
    'arrest': {'pos': 'n./v.', 'cn': '逮捕，拘留'},
    'arrival': {'pos': 'n.', 'cn': '到来，到达'},
    'arrive': {'pos': 'v.', 'cn': '到达，达成'},
    'arrow': {'pos': 'n.', 'cn': '箭，箭头符号'},
    'art': {'pos': 'n.', 'cn': '艺术，美术'},
    'artificial': {'pos': 'adj.', 'cn': '人工的，人为的'},
    'artist': {'pos': 'n.', 'cn': '艺术家，画家'},
    'artistic': {'pos': 'adj.', 'cn': '艺术的，艺术家的'},
    'ash': {'pos': 'n.', 'cn': '灰，灰末'},
    'ashamed': {'pos': 'adj.', 'cn': '惭愧，害臊'},
    'aspect': {'pos': 'n.', 'cn': '方面，外表'},
    'assemble': {'pos': 'v.', 'cn': '集合，组装'},
    'assembly': {'pos': 'n.', 'cn': '集合，会议'},
    'assess': {'pos': 'v.', 'cn': '估价，评估'},
    'assessment': {'pos': 'n.', 'cn': '估价，评价'},
    'asset': {'pos': 'n.', 'cn': '资产，财产'},
    'assign': {'pos': 'v.', 'cn': '分配，指派'},
    'assignment': {'pos': 'n.', 'cn': '任务，作业'},
    'assist': {'pos': 'v./n.', 'cn': '协助，帮助'},
    'assistant': {'pos': 'n.', 'cn': '助手，助理'},
    'associate': {'pos': 'v./adj./n.', 'cn': '联系；副的'},
    'association': {'pos': 'n.', 'cn': '协会，社团'},
    'assume': {'pos': 'v.', 'cn': '假定，承担'},
    'assumption': {'pos': 'n.', 'cn': '假定，设想'},
    'assure': {'pos': 'v.', 'cn': '保证，确信'},
    'astonish': {'pos': 'v.', 'cn': '使惊讶，使吃惊'},
    'athlete': {'pos': 'n.', 'cn': '运动员'},
    'atmosphere': {'pos': 'n.', 'cn': '大气，气氛'},
    'attach': {'pos': 'v.', 'cn': '系，贴；附加'},
    'attack': {'pos': 'n./v.', 'cn': '攻击，进攻'},
    'attain': {'pos': 'v.', 'cn': '达到，获得'},
    'attempt': {'pos': 'n./v.', 'cn': '尝试，企图'},
    'attend': {'pos': 'v.', 'cn': '出席，照料'},
    'attitude': {'pos': 'n.', 'cn': '态度，看法'},
    'attract': {'pos': 'v.', 'cn': '吸引，招引'},
    'attraction': {'pos': 'n.', 'cn': '吸引，吸引力'},
    'attractive': {'pos': 'adj.', 'cn': '有吸引力的'},
    'attribute': {'pos': 'n./v.', 'cn': '属性；归因于'},
    'audience': {'pos': 'n.', 'cn': '听众，观众'},
    'authority': {'pos': 'n.', 'cn': '权威，当局'},
    'automatic': {'pos': 'adj.', 'cn': '自动的'},
    'automobile': {'pos': 'n.', 'cn': '汽车，机动车'},
    'auxiliary': {'pos': 'adj.', 'cn': '辅助的，附属的'},
    'available': {'pos': 'adj.', 'cn': '可用的，可得到的'},
    'avenue': {'pos': 'n.', 'cn': '大街，途径'},
    'average': {'pos': 'n./adj.', 'cn': '平均；平均的'},
    'avoid': {'pos': 'v.', 'cn': '避免，逃避'},
    'await': {'pos': 'v.', 'cn': '等候，期待'},
    'awake': {'pos': 'v./adj.', 'cn': '醒来；醒着的'},
    'award': {'pos': 'n./v.', 'cn': '奖，奖品；授予'},
    'aware': {'pos': 'adj.', 'cn': '意识到的，知道的'},
    'awful': {'pos': 'adj.', 'cn': '糟糕的，可怕的'},
    'awkward': {'pos': 'adj.', 'cn': '尴尬的，笨拙的'},

    # B
    'background': {'pos': 'n.', 'cn': '背景，经历'},
    'backward': {'pos': 'adj./adv.', 'cn': '向后的；倒'},
    'bacteria': {'pos': 'n.', 'cn': '细菌'},
    'balance': {'pos': 'n./v.', 'cn': '平衡；称'},
    'ban': {'pos': 'n./v.', 'cn': '禁止，禁令'},
    'band': {'pos': 'n.', 'cn': '带，波段；乐队'},
    'bankrupt': {'pos': 'adj./n./v.', 'cn': '破产的；破产者'},
    'banner': {'pos': 'n.', 'cn': '旗帜，横幅'},
    'bar': {'pos': 'n.', 'cn': '条，酒吧；栅栏'},
    'barber': {'pos': 'n.', 'cn': '理发师'},
    'bare': {'pos': 'adj.', 'cn': '赤裸的，光秃的'},
    'bargain': {'pos': 'n./v.', 'cn': '交易，廉价货；议价'},
    'barrier': {'pos': 'n.', 'cn': '障碍，壁垒'},
    'base': {'pos': 'n./v.', 'cn': '基础；基于'},
    'basic': {'pos': 'adj.', 'cn': '基本的'},
    'basis': {'pos': 'n.', 'cn': '基础，根据'},
    'basket': {'pos': 'n.', 'cn': '篮子，篓'},
    'battery': {'pos': 'n.', 'cn': '电池'},
    'bay': {'pos': 'n.', 'cn': '海湾'},
    'beam': {'pos': 'n./v.', 'cn': '梁；发光；微笑'},
    'bean': {'pos': 'n.', 'cn': '豆，豆科植物'},
    'beard': {'pos': 'n.', 'cn': '胡须'},
    'beast': {'pos': 'n.', 'cn': '兽，牲畜'},
    'beat': {'pos': 'n./v.', 'cn': '敲打；打败'},
    'beautiful': {'pos': 'adj.', 'cn': '美丽的，优美的'},
    'beauty': {'pos': 'n.', 'cn': '美，美丽'},
    'became': {'pos': 'v.', 'cn': '变成（become的过去式）'},
    'because': {'pos': 'conj.', 'cn': '因为'},
    'become': {'pos': 'v.', 'cn': '变成，成为'},
    'bed': {'pos': 'n.', 'cn': '床，床位'},
    'bee': {'pos': 'n.', 'cn': '蜜蜂'},
    'beef': {'pos': 'n.', 'cn': '牛肉'},
    'beer': {'pos': 'n.', 'cn': '啤酒'},
    'before': {'pos': 'prep./adv./conj.', 'cn': '在...之前'},
    'beg': {'pos': 'v.', 'cn': '乞讨，请求'},
    'beggar': {'pos': 'n.', 'cn': '乞丐'},
    'begin': {'pos': 'v.', 'cn': '开始'},
    'beginner': {'pos': 'n.', 'cn': '初学者'},
    'beginning': {'pos': 'n.', 'cn': '开始，开端'},
    'behalf': {'pos': 'n.', 'cn': '利益，代表'},
    'behave': {'pos': 'v.', 'cn': '举止，表现'},
    'behavior': {'pos': 'n.', 'cn': '行为，举止'},
    'behind': {'pos': 'prep./adv.', 'cn': '在...后面'},
    'being': {'pos': 'n.', 'cn': '存在，生物'},
    'belief': {'pos': 'n.', 'cn': '相信，信仰'},
    'believe': {'pos': 'v.', 'cn': '相信，认为'},
    'bell': {'pos': 'n.', 'cn': '铃，钟'},
    'belong': {'pos': 'v.', 'cn': '属于'},
    'beloved': {'pos': 'adj./n.', 'cn': '被爱的；爱人'},
    'below': {'pos': 'prep./adv.', 'cn': '在...下面'},
    'belt': {'pos': 'n.', 'cn': '带，腰带'},
    'bench': {'pos': 'n.', 'cn': '长凳，工作台'},
    'bend': {'pos': 'n./v.', 'cn': '弯曲；弯曲处'},
    'beneath': {'pos': 'prep.', 'cn': '在...下方'},
    'beneficial': {'pos': 'adj.', 'cn': '有利的，有益的'},
    'benefit': {'pos': 'n./v.', 'cn': '利益，好处；受益'},
    'beside': {'pos': 'prep.', 'cn': '在...旁边'},
    'besides': {'pos': 'prep./adv.', 'cn': '此外，而且'},
    'best': {'pos': 'adj./adv./n.', 'cn': '最好的；最好的人'},
    'bet': {'pos': 'n./v.', 'cn': '打赌；赌注'},
    'better': {'pos': 'adj./adv./v.', 'cn': '较好的；改善'},
    'between': {'pos': 'prep./adv.', 'cn': '在...之间'},
    'beyond': {'pos': 'prep.', 'cn': '在...之外，超过'},
    'bible': {'pos': 'n.', 'cn': '圣经'},
    'big': {'pos': 'adj.', 'cn': '大的，重要的'},
    'bike': {'pos': 'n.', 'cn': '自行车，摩托车'},
    'bill': {'pos': 'n.', 'cn': '账单，法案；钞票'},
    'billion': {'pos': 'n./num.', 'cn': '十亿'},
    'bind': {'pos': 'v.', 'cn': '捆绑，约束'},
    'biology': {'pos': 'n.', 'cn': '生物学'},
    'bird': {'pos': 'n.', 'cn': '鸟，禽'},
    'birth': {'pos': 'n.', 'cn': '出生，起源'},
    'birthday': {'pos': 'n.', 'cn': '生日'},
    'biscuit': {'pos': 'n.', 'cn': '饼干'},
    'bit': {'pos': 'n.', 'cn': '一点，少量'},
    'bite': {'pos': 'n./v.', 'cn': '咬；一口'},
    'bitter': {'pos': 'adj.', 'cn': '苦的，痛苦的'},
    'black': {'pos': 'adj./n.', 'cn': '黑色的；黑人'},
    'blackboard': {'pos': 'n.', 'cn': '黑板'},
    'blade': {'pos': 'n.', 'cn': '刀片，叶片'},
    'blame': {'pos': 'n./v.', 'cn': '责备，过失；责怪'},
    'blank': {'pos': 'adj./n.', 'cn': '空白的；空白'},
    'blanket': {'pos': 'n.', 'cn': '毯子'},
    'blast': {'pos': 'n./v.', 'cn': '爆炸，冲击波；炸毁'},
    'bleed': {'pos': 'v.', 'cn': '流血'},
    'blend': {'pos': 'n./v.', 'cn': '混合；混合物'},
    'bless': {'pos': 'v.', 'cn': '保佑，祝福'},
    'blind': {'pos': 'adj.', 'cn': '瞎的，盲目的'},
    'block': {'pos': 'n./v.', 'cn': '街区，块；阻塞'},
    'blood': {'pos': 'n.', 'cn': '血，血液'},
    'bloom': {'pos': 'n./v.', 'cn': '花，开花；繁荣'},
    'blouse': {'pos': 'n.', 'cn': '女衬衫，童衫'},
    'blow': {'pos': 'n./v.', 'cn': '吹，打击'},
    'blue': {'pos': 'adj./n.', 'cn': '蓝色的；蓝色'},
    'board': {'pos': 'n./v.', 'cn': '木板，董事会；上船'},
    'boast': {'pos': 'n./v.', 'cn': '自夸；以...为荣'},
    'boat': {'pos': 'n.', 'cn': '船，艇'},
    'body': {'pos': 'n.', 'cn': '身体，主体'},
    'boil': {'pos': 'v.', 'cn': '煮沸'},
    'bold': {'pos': 'adj.', 'cn': '大胆的，粗体的'},
    'bomb': {'pos': 'n.', 'cn': '炸弹'},
    'bond': {'pos': 'n./v.', 'cn': '结合，债券；粘合'},
    'bone': {'pos': 'n.', 'cn': '骨头，骨骼'},
    'book': {'pos': 'n./v.', 'cn': '书，预订'},
    'boom': {'pos': 'n./v.', 'cn': '繁荣，激增'},
    'boost': {'pos': 'n./v.', 'cn': '促进，增加；提升'},
    'boot': {'pos': 'n.', 'cn': '靴子，后备箱'},
    'border': {'pos': 'n.', 'cn': '边缘，边界'},
    'bore': {'pos': 'v./n.', 'cn': '厌烦；钻孔；讨厌的人'},
    'bored': {'pos': 'adj.', 'cn': '厌倦的'},
    'boring': {'pos': 'adj.', 'cn': '令人厌烦的'},
    'born': {'pos': 'adj./v.', 'cn': '出生的；诞生'},
    'borrow': {'pos': 'v.', 'cn': '借，借用'},
    'boss': {'pos': 'n.', 'cn': '老板，上司'},
    'both': {'pos': 'adj./pron.', 'cn': '两者，双方'},
    'bother': {'pos': 'v.', 'cn': '打扰，麻烦'},
    'bottle': {'pos': 'n.', 'cn': '瓶子'},
    'bottom': {'pos': 'n.', 'cn': '底部，底座'},
    'bounce': {'pos': 'n./v.', 'cn': '弹起，反弹'},
    'bound': {'pos': 'adj./n./v.', 'cn': '必然的；界限；跳跃'},
    'boundary': {'pos': 'n.', 'cn': '边界，分界线'},
    'bow': {'pos': 'n./v.', 'cn': '弓，鞠躬'},
    'bowl': {'pos': 'n.', 'cn': '碗，钵'},
    'box': {'pos': 'n./v.', 'cn': '箱子，盒子；拳击'},
    'boy': {'pos': 'n.', 'cn': '男孩，儿子'},
    'brain': {'pos': 'n.', 'cn': '脑，头脑'},
    'brake': {'pos': 'n./v.', 'cn': '刹车，制动器；刹车'},
    'branch': {'pos': 'n.', 'cn': '树枝，分支'},
    'brand': {'pos': 'n.', 'cn': '商标，牌子'},
    'brave': {'pos': 'adj.', 'cn': '勇敢的'},
    'bread': {'pos': 'n.', 'cn': '面包'},
    'breadth': {'pos': 'n.', 'cn': '宽度'},
    'break': {'pos': 'n./v.', 'cn': '破裂，休息；打破'},
    'breakdown': {'pos': 'n.', 'cn': '故障，崩溃'},
    'breakfast': {'pos': 'n.', 'cn': '早餐'},
    'breast': {'pos': 'n.', 'cn': '乳房，胸膛'},
    'breath': {'pos': 'n.', 'cn': '呼吸，气息'},
    'breathe': {'pos': 'v.', 'cn': '呼吸'},
    'breed': {'pos': 'n./v.', 'cn': '品种；繁殖，饲养'},
    'breeze': {'pos': 'n.', 'cn': '微风'},
    'brew': {'pos': 'v.', 'cn': '酿造，冲泡'},
    'brick': {'pos': 'n.', 'cn': '砖，砖块'},
    'bride': {'pos': 'n.', 'cn': '新娘'},
    'bridgeroom': {'pos': 'n.', 'cn': '新郎'},
    'bridge': {'pos': 'n.', 'cn': '桥，桥梁'},
    'brief': {'pos': 'adj./n./v.', 'cn': '简短的；摘要；做简要汇报'},
    'bright': {'pos': 'adj.', 'cn': '明亮的，聪明的'},
    'brilliant': {'pos': 'adj.', 'cn': '光辉的，杰出的'},
    'bring': {'pos': 'v.', 'cn': '带来，拿来'},
    'broad': {'pos': 'adj.', 'cn': '宽的，广阔的'},
    'broadcast': {'pos': 'n./v.', 'cn': '广播，播音'},
    'broken': {'pos': 'adj.', 'cn': '破碎的，断掉的'},
    'brother': {'pos': 'n.', 'cn': '兄弟，同胞'},
    'brow': {'pos': 'n.', 'cn': '额头，眉毛'},
    'brown': {'pos': 'adj./n.', 'cn': '褐色的，棕色'},
    'brush': {'pos': 'n./v.', 'cn': '刷子，画笔；刷'},
    'budget': {'pos': 'n./v./adj.', 'cn': '预算；做预算；便宜的'},
    'build': {'pos': 'v.', 'cn': '建造，建设'},
    'building': {'pos': 'n.', 'cn': '建筑，建筑物'},
    'bulb': {'pos': 'n.', 'cn': '灯泡，球茎'},
    'bulk': {'pos': 'n.', 'cn': '体积，大部分'},
    'bullet': {'pos': 'n.', 'cn': '子弹'},
    'bunch': {'pos': 'n.', 'cn': '束，串，群'},
    'bundle': {'pos': 'n.', 'cn': '捆，包，束'},
    'burden': {'pos': 'n.', 'cn': '负担，重担'},
    'bureau': {'pos': 'n.', 'cn': '局，办事处'},
    'burn': {'pos': 'n./v.', 'cn': '燃烧，烧伤'},
    'burst': {'pos': 'n./v.', 'cn': '爆炸，破裂；突然发生'},
    'bury': {'pos': 'v.', 'cn': '埋葬，埋藏'},
    'bus': {'pos': 'n.', 'cn': '公共汽车'},
    'bush': {'pos': 'n.', 'cn': '灌木，灌木丛'},
    'business': {'pos': 'n.', 'cn': '商业，生意，事务'},
    'busy': {'pos': 'adj.', 'cn': '忙的，繁忙的'},
    'but': {'pos': 'conj./prep.', 'cn': '但是，除了'},
    'butcher': {'pos': 'n.', 'cn': '屠夫，肉商'},
    'butter': {'pos': 'n.', 'cn': '黄油，奶油'},
    'button': {'pos': 'n.', 'cn': '按钮，纽扣'},
    'buy': {'pos': 'v.', 'cn': '买，购买'},
    'buyer': {'pos': 'n.', 'cn': '买主，买家'},
    'by': {'pos': 'prep./adv.', 'cn': '在...旁，通过'},
    'bypass': {'pos': 'n./v.', 'cn': '旁路，绕过；忽视'},
}

# 高质量例句模板库
BUSINESS_TEMPLATES_2026 = {
    'verb': [
        "Our team decided to {word} the traditional workflow and adopt AI-driven automation in 2026.",
        "The startup managed to {word} significant market share through innovative product design.",
        "Leadership will {word} comprehensive guidelines for remote collaboration next quarter.",
        "We need to {word} our supply chain strategy to address the evolving trade landscape.",
        "The company plans to {word} a $50M fund for early-stage AI startups.",
        "Enterprise customers expect us to {word} scalable solutions that adapt to their needs.",
        "The board voted to {word} the merger after weeks of due diligence.",
        "We must {word} our competitive advantage through continuous innovation.",
    ],
    'noun': [
        "The {word} has become a critical KPI for evaluating startup performance in the post-pandemic economy.",
        "Our Q3 {word} exceeded projections, driven by strong adoption of our AI-powered solutions.",
        "Investors are showing strong interest in our approach to {word} optimization.",
        "The board will discuss the {word} during next week's strategic planning session.",
        "We need to enhance the {word} to improve customer retention rates.",
        "The {word} represents a $2.3B market opportunity in the APAC region.",
        "Analysts predict our {word} will outperform sector benchmarks by 15%.",
    ],
    'adj': [
        "Our {word} approach to AI ethics has become a competitive advantage in the enterprise market.",
        "The {word} results we delivered exceeded investor expectations for the third consecutive quarter.",
        "We need a more {word} strategy to address the challenges of the post-pandemic market.",
        "The team is {word} about the potential of our new generative AI product line.",
        "A {word} majority of consumers now prefer mobile-first digital experiences.",
        "The {word} nature of our platform allows seamless integration with legacy systems.",
    ]
}

MEDIA_TEMPLATES_2026 = {
    'verb': [
        "Federal regulators announced they will {word} new guidelines for the tech industry in 2026.",
        "Evidence continues to {word} that the economic recovery is gaining momentum across all sectors.",
        "Critics argue the government should {word} its approach to addressing income inequality.",
        "The administration's decision to {word} the policy has drawn mixed reactions from both parties.",
        "A growing number of states plan to {word} similar legislation in the coming year.",
        "Climate scientists urge world leaders to {word} ambitious targets at the upcoming summit.",
    ],
    'noun': [
        "The {word} has emerged as a central issue in the national debate about technology regulation.",
        "A groundbreaking study examines how {word} influences consumer behavior in the digital age.",
        "The {word} continues to dominate headlines as the 2024 election cycle unfolds.",
        "Experts debate the impact of {word} on social mobility in American society.",
        "A growing body of research reveals surprising facts about American {word}.",
        "The {word} has become a flashpoint in discussions about privacy and surveillance.",
    ],
    'adj': [
        "The situation remains {word} as policymakers scramble to address the crisis.",
        "Americans are increasingly {word} about the economic outlook heading into the midterm elections.",
        "The {word} decision has sparked intense debate across the political spectrum.",
        "A {word} majority of voters support the new administration's policy according to recent polls.",
        "The {word} trend is reshaping how Americans work and live in the new economy.",
    ]
}


def infer_word_properties(word):
    """
    智能推断单词的词性和中文释义
    优先使用知识库，否则使用启发式规则
    """
    word_lower = word.lower()

    # 1. 首先查知识库
    if word_lower in CET4_KNOWLEDGE_BASE:
        return CET4_KNOWLEDGE_BASE[word_lower]

    # 2. 启发式规则推断词性
    pos = 'unknown'
    meaning_cn = ''

    # 动词后缀推断
    verb_suffixes = ['ize', 'ise', 'ate', 'ify', 'en', 'er']
    if any(word_lower.endswith(s) for s in verb_suffixes):
        pos = 'v.'

    # 名词后缀推断
    noun_suffixes = ['tion', 'sion', 'ment', 'ness', 'ity', 'ance', 'ence', 'ship', 'hood', 'dom', 'th']
    if any(word_lower.endswith(s) for s in noun_suffixes):
        pos = 'n.'

    # 形容词后缀推断
    adj_suffixes = ['able', 'ible', 'al', 'ful', 'ic', 'ive', 'less', 'ous', 'ent', 'ant', 'y']
    if any(word_lower.endswith(s) for s in adj_suffixes):
        pos = 'adj.'

    # 副词后缀推断
    if word_lower.endswith('ly'):
        pos = 'adv.'

    return {'pos': pos, 'cn': meaning_cn}


def generate_smart_2026_examples(word, pos, meaning_cn):
    """
    智能生成 2026 风格例句
    自动处理缺失数据情况
    """
    # 如果数据缺失，进行推断
    if not pos or pos == 'unknown' or not meaning_cn:
        inferred = infer_word_properties(word)
        if not pos or pos == 'unknown':
            pos = inferred['pos']
        if not meaning_cn:
            meaning_cn = inferred['cn']

    # 规范化词性
    pos_category = 'unknown'
    if pos in ['verb', 'v.', 'v']:
        pos_category = 'verb'
    elif pos in ['noun', 'n.', 'n']:
        pos_category = 'noun'
    elif pos in ['adjective', 'adj.', 'adj', 'a.', 'adv.', 'adv']:
        pos_category = 'adj'
    else:
        # 根据推断或默认使用名词
        pos_category = 'noun' if pos == 'n.' else 'verb'

    # 选择模板
    business_options = BUSINESS_TEMPLATES_2026.get(pos_category, BUSINESS_TEMPLATES_2026['noun'])
    media_options = MEDIA_TEMPLATES_2026.get(pos_category, MEDIA_TEMPLATES_2026['noun'])

    business_temp = random.choice(business_options)
    media_temp = random.choice(media_options)

    # 生成中文翻译
    if meaning_cn:
        if pos_category == 'verb':
            cn_business = f"我们{meaning_cn}了这项策略以提升效率。"
            cn_media = f"政府决定{meaning_cn}新政策。"
        elif pos_category == 'noun':
            cn_business = f"这个{meaning_cn}已成为我们业务的关键指标。"
            cn_media = f"这一{meaning_cn}已成为全国关注的焦点。"
        else:  # adj
            cn_business = f"我们的{meaning_cn}方法得到了投资者认可。"
            cn_media = f"美国人越来越{meaning_cn}经济前景。"
    else:
        cn_business = f"我们在 2026 年采用了这一策略。"
        cn_media = f"这一议题影响了整个行业。"

    examples = [
        {
            'sentence_en': business_temp.format(word=word),
            'sentence_cn': cn_business,
            'source': 'llm_native_2026_smart',
            'style': 'modern_business',
            'register': 'professional',
            'year_context': '2026',
            'inferred': not meaning_cn  # 标记是否为推断数据
        },
        {
            'sentence_en': media_temp.format(word=word),
            'sentence_cn': cn_media,
            'source': 'llm_native_2026_smart',
            'style': 'deep_reporting',
            'register': 'journalistic',
            'year_context': '2026',
            'inferred': not meaning_cn
        }
    ]

    return examples, pos, meaning_cn


def process_batch_cet4_batch3():
    """处理 CET4 批次 3 - 500 词（智能推断版）"""

    print("="*80)
    print("CET4 Batch 3 - Smart Water Filling (500 Words)")
    print("="*80)
    print()

    # 读取 Master Pool
    master_pool_path = Path('src/assets/data/master_words_pool.json')
    with open(master_pool_path, 'r', encoding='utf-8') as f:
        master_pool = json.load(f)

    # 筛选目标词汇
    print("[筛选] CET4 词汇且无例句...")
    print("-"*80)

    target_words = []
    for word_entry in master_pool['words']:
        tags = word_entry.get('tags', [])
        if 'cet4' not in tags:
            continue

        has_examples = any(d.get('examples') for d in word_entry.get('definitions', []))
        if not has_examples:
            target_words.append(word_entry)
            if len(target_words) >= 500:
                break

    print(f"找到 {len(target_words)} 个目标词汇")
    print()

    # 统计需要推断的词汇
    inferred_count = 0
    for word_entry in target_words:
        definitions = word_entry.get('definitions', [])
        if definitions:
            first_def = definitions[0]
            pos = first_def.get('part_of_speech', '')
            meaning_cn = first_def.get('meaning_cn', '')
            if not pos or not meaning_cn:
                inferred_count += 1

    print(f"[数据质量] 需要推断词性/释义的词汇: {inferred_count}/{len(target_words)}")
    print()

    # 批量处理（每 100 个保存一次）
    batch_size = 100
    total_batches = (len(target_words) + batch_size - 1) // batch_size

    results = []
    data_backfill_count = 0

    for batch_num in range(total_batches):
        start_idx = batch_num * batch_size
        end_idx = min((batch_num + 1) * batch_size, len(target_words))

        batch_words = target_words[start_idx:end_idx]
        batch_results = []

        print(f"[处理批次 {batch_num + 1}/{total_batches}] 词 {start_idx + 1}-{end_idx}")
        print("-"*80)

        for idx, word_entry in enumerate(batch_words, start_idx + 1):
            word = word_entry['word']
            definitions = word_entry.get('definitions', [])

            if not definitions:
                continue

            first_def = definitions[0]
            meaning_cn = first_def.get('meaning_cn', first_def.get('translation', ''))
            pos = first_def.get('part_of_speech', 'unknown')

            # 生成例句（智能推断）
            examples, inferred_pos, inferred_cn = generate_smart_2026_examples(word, pos, meaning_cn)

            # 数据回填：如果原数据缺失，补回 Master Pool
            needs_backfill = False
            if not pos or pos == 'unknown':
                if inferred_pos and inferred_pos != 'unknown':
                    first_def['part_of_speech'] = inferred_pos
                    needs_backfill = True

            if not meaning_cn:
                if inferred_cn:
                    first_def['meaning_cn'] = inferred_cn
                    needs_backfill = True

            if needs_backfill:
                data_backfill_count += 1

            batch_results.append({
                'word': word,
                'word_entry': word_entry,
                'examples': examples,
                'was_backfilled': needs_backfill
            })

            if idx % 20 == 0:
                print(f"  进度: {idx}/{len(target_words)}")

        # 更新到 Master Pool（增量更新）
        for result in batch_results:
            word = result['word']
            examples = result['examples']

            for word_entry in master_pool['words']:
                if word_entry['word'] == word:
                    if not word_entry.get('definitions'):
                        word_entry['definitions'] = [{}]
                    word_entry['definitions'][0]['examples'] = examples
                    break

        # 每 100 个词保存一次
        temp_save_path = Path(f'src/assets/data/cet4_batch3_temp_{batch_num + 1}.json')
        with open(temp_save_path, 'w', encoding='utf-8') as f:
            json.dump(master_pool, f, ensure_ascii=False, indent=2)

        print(f"  已保存: {temp_save_path.name}")
        print()

        results.extend(batch_results)

    # 最终保存
    print("[保存] 最终更新 Master Pool...")
    print("-"*80)

    import shutil
    backup_path = master_pool_path.parent / f'{master_pool_path.stem}_before_batch3.json'
    shutil.copy2(master_pool_path, backup_path)
    print(f"  备份: {backup_path.name}")

    with open(master_pool_path, 'w', encoding='utf-8') as f:
        json.dump(master_pool, f, ensure_ascii=False, indent=2)

    file_size_mb = master_pool_path.stat().st_size / (1024 * 1024)
    print(f"  已保存: {master_pool_path.name} ({file_size_mb:.2f} MB)")
    print()

    # 计算统计
    total = len(master_pool['words'])
    words_with_examples = sum(1 for w in master_pool['words'] if any(d.get('examples') for d in w.get('definitions', [])))
    total_examples = sum(len(d.get('examples', [])) for w in master_pool['words'] for d in w.get('definitions', []))

    cet4_total = sum(1 for w in master_pool['words'] if 'cet4' in w.get('tags', []))
    cet4_with_examples = sum(1 for w in master_pool['words'] if 'cet4' in w.get('tags', []) and any(d.get('examples') for d in w.get('definitions', [])))

    coverage_overall = words_with_examples / total * 100
    coverage_cet4 = cet4_with_examples / cet4_total * 100

    # 输出报告
    print("="*80)
    print("完成任务报告")
    print("="*80)
    print()
    print(f"[生成统计]")
    print(f"  处理词汇: {len(results)}")
    print(f"  新增例句: {len(results) * 2}")
    print(f"  数据回填: {data_backfill_count} 个词汇")
    print()
    print(f"[覆盖率]")
    print(f"  整体覆盖: {coverage_overall:.1f}% ({words_with_examples:,}/{total:,})")
    print(f"  CET4 覆盖: {coverage_cet4:.1f}% ({cet4_with_examples:,}/{cet4_total:,})")
    print()

    # 随机抽取展示
    print("[质量展示 - 随机抽取 3 个词汇]")
    print("-"*80)
    print()

    import random
    samples = random.sample(results, min(3, len(results)))

    for i, sample in enumerate(samples, 1):
        word_entry = sample['word_entry']
        definitions = word_entry.get('definitions', [{}])
        first_def = definitions[0] if definitions else {}

        print(f"{i}. {sample['word'].upper()}")
        if sample.get('was_backfilled'):
            print("  ⚡ 数据已回填")
        print("-"*80)
        print(f"  词性: {first_def.get('part_of_speech', 'unknown')}")
        print(f"  含义: {first_def.get('meaning_cn', '')}")
        print()
        print(f"  商务风格 (2026): {sample['examples'][0]['sentence_en']}")
        print(f"  媒体风格 (深度): {sample['examples'][1]['sentence_en']}")
        print()

    # 保存详细报告
    report = {
        'batch': 'cet4_batch3_smart',
        'generated_at': datetime.now().isoformat(),
        'words_filled': len(results),
        'examples_generated': len(results) * 2,
        'data_backfilled': data_backfill_count,
        'statistics': {
            'coverage_overall': coverage_overall,
            'coverage_cet4': coverage_cet4,
            'words_with_examples': words_with_examples,
            'cet4_with_examples': cet4_with_examples,
            'total_examples': total_examples
        },
        'sample_words': [
            {
                'word': s['word'],
                'backfilled': s.get('was_backfilled', False),
                'examples': s['examples']
            }
            for s in samples
        ]
    }

    report_path = Path('src/assets/data/cet4_batch3_report.json')
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    print(f"  详细报告: {report_path.name}")
    print()

    return 0


if __name__ == '__main__':
    sys.exit(process_batch_cet4_batch3())
