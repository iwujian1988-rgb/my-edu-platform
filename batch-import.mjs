/**
 * 统一批量导入系统
 *
 * 合并 batch-import-fayuliao / batch-import-bruno / import-single-podcast 为统一 CLI。
 * 支持音频/视频、有/无 OSS URL、多种发布模式、多种日期分配。
 *
 * Usage:
 *   node batch-import.mjs --mode audio --dir ./linshi/法语闲聊_processed \
 *     --creator "法语闲聊" --csv ./linshi/french-podcasts-upload-map.csv \
 *     --publish all --date-mode today
 *
 *   node batch-import.mjs --mode video --dir ./linshi/0424/Bruno_Maltor_导出 \
 *     --creator "Bruno Maltor" --dir-prefix BM_ \
 *     --manifest ./linshi/0424/bruno-manifest.json \
 *     --publish all --date-mode today
 *
 *   node batch-import.mjs --mode video --dir ./linshi/Grace_Villarreal_导出 \
 *     --creator "Grace Villarreal" --language es --package "西班牙语视频学习永久会员" \
 *     --manifest ./manifest.json --publish none --date-mode today
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// ============================================================================
// 常量
// ============================================================================

const CEFR_TO_NUMBER = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 5 };

const MAX_TITLE_LENGTH = 250;
const MAX_ORIGINAL_TITLE_LENGTH = 500;
const MAX_TAGS_PER_VIDEO = 3;

const LANG_FOREIGN_FIELD = { fr: 'french', es: 'spanish' };
const DEFAULT_PACKAGE_NAMES = {
  fr: '法语视频学习永久会员',
  es: '西班牙语视频学习永久会员',
};

const RETRY_DEFAULT_RETRIES = 3;
const RETRY_DEFAULT_DELAY = 1000;

const SUMMARY_MIN_LENGTH = 40;
const SUMMARY_MAX_LENGTH = 200;
const GLM_MAX_SUBTITLE_CHARS = 2000;
const GLM_MIN_SUBTITLE_CHARS = 20;

const EXERCISE_TYPE_MAPPING = {
  '填空': 'fill_blank', fill_blank: 'fill_blank', fill_in_blank: 'fill_blank',
  '选择': 'multiple_choice', choice: 'multiple_choice', multiple_choice: 'multiple_choice',
  '翻译': 'translation', translation: 'translation',
  '语法': 'grammar_drill', grammar_drill: 'grammar_drill', rewrite: 'grammar_drill', rewriting: 'grammar_drill',
};

const MEANINGLESS_THEMES = new Set([
  'Full Video', 'full video', 'Full video', 'full',
  'Full Audio', 'full audio', 'Full audio',
]);

const RELATED_TABLES = [
  'video_subtitles', 'video_word_cards', 'video_grammar_points',
  'video_exercises', 'video_expression_cards', 'video_vocabulary_networks',
  'video_pronunciation_tips', 'video_tag_relations',
];

// 9 类标签关键词映射（加权匹配）
const TAG_KEYWORDS = {
  '旅行地理': {
    keywords: ['法国', '乡村', '旅行', '城市', '巴黎', '里昂', '马赛', '地点', '地图', '风景', '景色', '地理', '位置', '地方', '村庄', '小镇', '首都', '景点', '名胜', '户外', '自然', '公园', '海滩', '山脉', '河流', '城堡', '教堂', '博物馆', '建筑', '街道', '广场', '咖啡馆', '餐厅', '酒店', '住宿', '民宿', '旅游', '游览', '参观', '探索', '发现', '漫步', '散步', '徒步', '骑行', '自驾', '交通', '地铁', '公交', '火车', '飞机', '机场', '车站', '导航', '路线', '行程', 'voyage', 'voyager', 'lieu', 'endroit', 'ville', 'village', 'paysage', 'monument', 'musée', 'église', 'château', 'parc', 'plage', 'montagne', 'rivière'],
    weight: 1.0,
  },
  '美食烹饪': {
    keywords: ['早餐', '美食', '食物', '饮食', '午餐', '晚餐', '料理', '菜肴', '烹饪', '厨艺', '食材', '蔬菜', '水果', '肉类', '海鲜', '甜点', '蛋糕', '面包', '奶酪', '红酒', '白酒', '咖啡', '茶', '饮料', '果汁', '超市', '杂货店', '烘焙', '烧烤', '寿司', '披萨', '意面', '沙拉', '汤', '三明治', '零食', '糖果', '巧克力', '冰淇淋', '食谱', '菜单', '点餐', '用餐', '吃饭', '品尝', '味道', '口感', '香气', '美味', '好吃', '新鲜', '有机', '营养', '厨房', '餐桌', '盘子', 'recipe', 'cuisine', 'plat', 'repas', 'petit déjeuner', 'déjeuner', 'dîner', 'boulangerie', 'pâtisserie', 'fromage', 'vin', 'manger', 'boire', 'goût', 'saveur', 'délicieux'],
    weight: 1.0,
  },
  '生活Vlog': {
    keywords: ['生活', '日常', 'vlog', '记录', '日记', '一天', '惯例', '习惯', '作息', '起床', '睡觉', '工作', '学习', '运动', '锻炼', '健身', '跑步', '瑜伽', '游泳', '购物', '逛街', '买菜', '做饭', '打扫', '清洁', '整理', '洗衣', '浇花', '遛狗', '养猫', '宠物', '家庭', '家人', '朋友', '聚会', '派对', '聊天', '看电影', '听音乐', '读书', '阅读', '写作', '绘画', '手工', '游戏', '娱乐', '休闲', '放松', '休息', '度假', '周末', '假期', '节日', '生日', '庆祝', '心情', '感受', '想法', '计划', '目标', '梦想', 'routine', 'quotidien', 'journal', 'vie', 'maison', 'famille', 'amis', 'travail', 'étude', 'sport', 'exercice', 'course', 'ménage', 'loisir', 'détente', 'vacance', 'week-end', 'fête'],
    weight: 0.9,
  },
  '文化深度': {
    keywords: ['文化', '历史', '传统', '习俗', '风俗', '艺术', '文学', '音乐', '电影', '戏剧', '舞蹈', '绘画', '雕塑', '建筑', '哲学', '宗教', '信仰', '神话', '传说', '故事', '诗歌', '小说', '散文', '作家', '诗人', '艺术家', '画家', '音乐家', '作品', '创作', '表现', '表达', '风格', '流派', '思想', '观念', '价值', '理念', '理论', '传承', '遗产', '古迹', '文物', '展览', '演出', '表演', '音乐会', '歌剧', '芭蕾', '画廊', '艺术节', '文化节', '庆典', '仪式', '民俗', '民间', '古典', '现代', '当代', 'culture', 'histoire', 'tradition', 'art', 'littérature', 'musique', 'cinéma', 'théâtre', 'danse', 'peinture', 'sculpture', 'architecture', 'philosophie', 'religion', 'mythe', 'légende', 'conte', 'poésie', 'roman', 'écrivain', 'poète', 'artiste', 'œuvre', 'création', 'style', 'patrimoine', 'festival', 'cérémonie'],
    weight: 1.0,
  },
  '职场商务': {
    keywords: ['工作', '职业', '职场', '商务', '办公', '公司', '企业', '办公室', '会议', '项目', '团队', '同事', '老板', '经理', '员工', '招聘', '面试', '简历', '求职', '行业', '专业', '技能', '经验', '能力', '职责', '任务', '业绩', '成就', '成功', '挑战', '机会', '发展', '晋升', '加薪', '离职', '跳槽', '创业', '商业', '业务', '客户', '合作', '谈判', '合同', '销售', '市场', '营销', '广告', '品牌', '产品', '服务', '质量', '效率', '管理', '领导', '决策', '策略', 'career', 'travail', 'profession', 'bureau', 'entreprise', 'réunion', 'projet', 'équipe', 'collègue', 'manager', 'directeur', 'employé', 'recrutement', 'entretien', 'compétence', 'expérience', 'responsabilité', 'objectif', 'performance', 'défi', 'opportunité', 'promotion'],
    weight: 1.0,
  },
  '学习教育': {
    keywords: ['学习', '教育', '教学', '课程', '课堂', '学校', '大学', '学院', '老师', '教授', '学生', '考试', '测试', '作业', '练习', '题目', '知识', '概念', '原理', '方法', '技巧', '理解', '掌握', '记忆', '背诵', '思考', '分析', '研究', '论文', '报告', '实验', '实践', '实习', '留学', '交换', '语言', '外语', '法语', '英语', '翻译', '口译', '笔译', '阅读', '写作', '听力', '口语', '发音', '语法', '词汇', '单词', '句子', '文章', '书籍', '教材', '图书馆', '复习', '预习', '成绩', '分数', '奖学金', '毕业', '学位', '文凭', '证书', 'apprentissage', 'éducation', 'enseignement', 'cours', 'classe', 'école', 'université', 'professeur', 'étudiant', 'examen', 'devoir', 'exercice', 'connaissance', 'méthode', 'langue', 'étranger', 'traduction', 'lecture', 'écriture', 'grammaire', 'vocabulaire', 'diplôme'],
    weight: 1.0,
  },
  '科技数码': {
    keywords: ['科技', '技术', '数码', '电子', '电脑', '手机', '互联网', '网络', '软件', '硬件', '应用', '程序', '代码', '编程', '开发', '算法', '数据', '信息', '系统', '平台', '网站', '服务器', '数据库', '云计算', '人工智能', 'AI', '机器学习', '深度学习', '大数据', '区块链', '虚拟现实', 'VR', '增强现实', '物联网', '5G', '通信', '安全', '隐私', '加密', '创新', '发明', '专利', '研究', '产品', '设备', '工具', 'technology', 'numérique', 'ordinateur', 'téléphone', 'internet', 'logiciel', 'application', 'code', 'programmation', 'algorithme', 'intelligence artificielle', 'innovation', 'startup'],
    weight: 1.0,
  },
  '健康医疗': {
    keywords: ['健康', '医疗', '医学', '医院', '医生', '护士', '病人', '疾病', '症状', '诊断', '治疗', '药物', '手术', '疗法', '康复', '锻炼', '运动', '健身', '瑜伽', '跑步', '游泳', '营养', '减肥', '增肌', '睡眠', '休息', '放松', '压力', '焦虑', '抑郁', '心理', '精神', '情绪', '心情', '心态', '积极', '消极', '疲劳', '痛', '不舒服', '发烧', '感冒', '咳嗽', '头痛', '失眠', '精力', '活力', '免疫力', '预防', '保健', '养生', '体检', 'santé', 'médical', 'médecine', 'hôpital', 'médecin', 'patient', 'maladie', 'traitement', 'médicament', 'thérapie', 'exercice', 'sport', 'fitness', 'yoga', 'nutrition', 'sommeil', 'repos', 'stress', 'anxiété', 'dépression', 'psychologie', 'émotion', 'fatigue', 'douleur', 'immunité', 'bien-être'],
    weight: 1.0,
  },
  '娱乐休闲': {
    keywords: ['娱乐', '休闲', '游戏', '爱好', '兴趣', '才艺', '比赛', '竞赛', '观看', '欣赏', '享受', '快乐', '开心', '高兴', '愉快', '欢乐', '兴奋', '激动', '期待', '惊喜', '感动', '温馨', '浪漫', '搞笑', '幽默', '有趣', '好玩', '刺激', '精彩', '优秀', '棒', '喜欢', '爱', '热爱', '痴迷', '粉丝', '追星', '偶像', '明星', '名人', '网红', '博主', '直播', '视频', '电影', '电视剧', '综艺', '动漫', '动画', '漫画', '小说', '笑话', '聊天', '互动', '评论', '分享', '关注', '订阅', 'divertissement', 'loisir', 'jeu', 'hobby', 'sport', 'compétition', 'joie', 'bonheur', 'plaisir', 'humour', 'amusant', 'cinéma', 'film', 'série', 'anime', 'manga', 'célébrité'],
    weight: 0.8,
  },
};

// ============================================================================
// 词库加载
// ============================================================================

const dictMap = new Map();
// 词库加载延迟到 main() 中根据 language 参数决定

// ============================================================================
// 共享工具函数
// ============================================================================

function lookupCefr(word) {
  const entry = dictMap.get(word.toLowerCase());
  if (!entry?.cefrLevel) return { cefr_level: null, difficulty_level: null };
  const cefr = entry.cefrLevel.toUpperCase();
  return { cefr_level: cefr, difficulty_level: CEFR_TO_NUMBER[cefr] || null };
}

/**
 * CEFR 等级 → DB difficulty（必须匹配 CHECK 约束: beginner/intermediate/advanced）
 * B2 和 B1+ 也映射到 intermediate，因为 DB 没有更细粒度
 */
function cefrToDifficulty(level) {
  if (!level) return 'intermediate';
  const base = level.replace(/[+\-]/g, '');
  const mapping = {
    A1: 'beginner', A2: 'beginner',
    B1: 'intermediate', B2: 'intermediate',
    C1: 'advanced', C2: 'advanced',
  };
  const result = mapping[base];
  if (!result) {
    console.warn(`[WARN] 未知 CEFR 等级 "${level}"，fallback 到 intermediate`);
  }
  return result || 'intermediate';
}

function timeStringToSeconds(timeStr) {
  const parts = timeStr.split(':');
  return parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseFloat(parts[2]);
}

function isMostlyChinese(text) {
  if (!text || text.length < 10) return false;
  const chineseCharCount = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const totalChars = text.replace(/\s/g, '').length;
  return totalChars > 0 && (chineseCharCount / totalChars) >= 0.6;
}

async function generateChineseDescription(subtitleText, contentType, retries = 2) {
  const role = contentType === 'audio' ? '播客' : '视频';
  const prompt = `你是一个语言学习${role}的内容编辑助手。请根据以下字幕中文翻译，生成一个吸引人的中文描述。\n\n要求：\n1. 描述这个${role}讲述什么内容或教什么语言知识\n2. 字数要求：不少于 40 字，不超过 80 字\n3. 使用生动有趣的语言\n4. 不要使用引号、书名号等符号\n5. 直接输出描述文本\n\n字幕内容：\n${subtitleText}\n\n请输出描述：`;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GLM_API_KEY}` },
        body: JSON.stringify({ model: 'glm-4-flash', max_tokens: 150, temperature: 0.7, messages: [{ role: 'user', content: prompt }] }),
      });
      if (!response.ok) {
        console.warn(`[GLM] HTTP ${response.status}，重试 ${attempt + 1}/${retries}`);
        if (attempt < retries) { await new Promise(r => setTimeout(r, 2000)); continue; }
        return null;
      }
      const data = await response.json();
      const text = data.choices?.[0]?.message?.content?.trim();
      if (!text || !isMostlyChinese(text)) {
        console.warn(`[GLM] 返回内容非中文，重试 ${attempt + 1}/${retries}`);
        if (attempt < retries) { await new Promise(r => setTimeout(r, 2000)); continue; }
        return null;
      }
      return text;
    } catch (err) {
      console.warn(`[GLM] 调用失败: ${err.message}，重试 ${attempt + 1}/${retries}`);
      if (attempt < retries) { await new Promise(r => setTimeout(r, 2000)); continue; }
    }
  }
  console.error(`[GLM] 生成中文描述失败（已重试 ${retries} 次），description 将为空`);
  return null;
}

async function resolveDescription(ld, subtitles, contentType) {
  // 优先用源数据的中文 summary
  if (ld.summary && isMostlyChinese(ld.summary) && ld.summary.length >= SUMMARY_MIN_LENGTH && ld.summary.length <= SUMMARY_MAX_LENGTH) {
    return ld.summary;
  }
  if (ld.summary && isMostlyChinese(ld.summary) && ld.summary.length > SUMMARY_MAX_LENGTH) {
    return ld.summary.substring(0, SUMMARY_MAX_LENGTH);
  }

  // 源数据没有中文 summary → 调 GLM 从字幕中文生成
  const zhText = subtitles.map(s => s.chinese || s.chinese_text || '').filter(Boolean).join(' ').substring(0, GLM_MAX_SUBTITLE_CHARS);
  if (zhText.length < GLM_MIN_SUBTITLE_CHARS) {
    console.warn('[description] 字幕中文不足，无法生成描述');
    return null;
  }
  const generated = await generateChineseDescription(zhText, contentType);
  if (generated) return generated;

  // GLM 彻底失败 → 不存法语，存 null 并告警
  console.error('[description] GLM 生成失败，description 置空（不会存法语）');
  return null;
}

async function retryWithBackoff(fn, retries = RETRY_DEFAULT_RETRIES, delay = RETRY_DEFAULT_DELAY) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await fn();
      // Supabase 返回 { data, error } 而非抛异常 — 主动检测并抛出
      if (result && typeof result === 'object' && result.error) {
        throw new Error(result.error.message);
      }
      return result;
    } catch (error) {
      if (attempt === retries) throw error;
      const waitMs = delay * Math.pow(2, attempt);
      console.warn(`  重试 (${attempt + 1}/${retries})，等待 ${waitMs}ms: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, waitMs));
    }
  }
}

// 标签加权推断
function analyzeTextForTags(text) {
  if (!text) return {};
  const lowerText = text.toLowerCase();
  const scores = {};
  for (const [tagName, config] of Object.entries(TAG_KEYWORDS)) {
    let score = 0;
    for (const keyword of config.keywords) {
      const regex = new RegExp(keyword.toLowerCase(), 'gi');
      const matches = lowerText.match(regex);
      if (matches) score += matches.length * config.weight;
    }
    if (score > 0) scores[tagName] = score;
  }
  return scores;
}

function inferVideoTags(title, originalTitle, summaryContent) {
  const combinedText = [title, originalTitle, summaryContent].filter(Boolean).join(' ');
  const scores = analyzeTextForTags(combinedText);
  return Object.entries(scores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, MAX_TAGS_PER_VIDEO)
    .map(([tagName]) => tagName);
}

// ============================================================================
// CLI 参数解析
// ============================================================================

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].substring(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

function validateArgs(args) {
  const errors = [];
  if (!args.mode || !['audio', 'video'].includes(args.mode)) {
    errors.push('--mode <audio|video> is required');
  }
  if (!args.dir) {
    errors.push('--dir <path> is required');
  }
  if (!args.creator) {
    errors.push('--creator <name> is required');
  }
  if (args.mode === 'audio' && !args.csv) {
    errors.push('--csv <path> is required for audio mode');
  }
  if (args.mode === 'video' && !args.manifest && !args.dryRun && !args['dry-run']) {
    errors.push('--manifest <path> is required for video mode (unless --dry-run)');
  }
  if (args.publish && !['none', 'all', 'test'].includes(args.publish)) {
    errors.push('--publish must be none|all|test');
  }
  if (args['date-mode'] && !['spread', 'today', 'specific'].includes(args['date-mode'])) {
    errors.push('--date-mode must be spread|today|specific');
  }
  if (args['date-mode'] === 'specific' && !args.date) {
    errors.push('--date <YYYY-MM-DD> is required when --date-mode is specific');
  }
  if (args.language && !LANG_FOREIGN_FIELD[args.language]) {
    errors.push(`--language must be one of: ${Object.keys(LANG_FOREIGN_FIELD).join(', ')}`);
  }
  return errors;
}

// ============================================================================
// 数据归一化
// ============================================================================

function normalizeAiFormat(raw, foreignField = 'french') {
  const u = raw.materials.unit_1;
  const la = u.language_analysis || {};
  const dl = u.deep_learning || {};
  const pr = u.practice || {};
  const ui = u.unit_info || {};
  const sm = u.summary || {};

  return {
    _format: 'ai',
    embeddedSubtitles: u.subtitles || [],
    embeddedUnitInfo: ui,
    topic: ui.theme || raw.channel || null,
    difficulty: ui.cefr_level || u.verification?.cefr_level || null,
    summary: sm.content || null,
    vocabulary: (la.vocabulary || []).map(v => ({
      word: v[foreignField],
      pos: v.part_of_speech,
      meaning: v.chinese,
      phonetics: v.ipa,
      example: v.example_sentence?.[foreignField] || null,
      example_translation: v.example_sentence?.chinese || null,
      cefr_level: v.cefr_level,
      occurrence_count: v.occurrence_count,
      source_ids: v.source_ids,
      examples: v.examples,
    })),
    grammar_points: (dl.grammar_points || []).map(gp => ({
      point: gp.name,
      structure: gp.structure || null,
      explanation: gp.explanation || gp.usage_note,
      example_from_text: gp.example?.[foreignField] || null,
      example_translation: gp.example?.chinese || null,
      note: gp.usage_note || null,
    })),
    authentic_expression: la.key_expressions || null,
    vocabulary_network: dl.vocabulary_network ? {
      seed_word: dl.vocabulary_network.core_word,
      related_words: dl.vocabulary_network.related_groups
        ? dl.vocabulary_network.related_groups.flatMap(g => g.words || [])
        : [],
      _ai_format: true,
      _raw: dl.vocabulary_network,
    } : null,
    exercises: pr.exercises || [],
    pronunciation_tips: dl.pronunciation?.key_sounds || [],
    pronunciation_liaison: dl.pronunciation?.liaison || null,
    pronunciation_intonation: dl.pronunciation?.intonation || null,
    sentence_patterns: pr.sentence_patterns || [],
    scenario: pr.scenario || null,
    summary_content: sm.content || null,
    summary_keywords: sm.keywords || null,
    difficulty_note: sm.difficulty_note || null,
    learning_objectives: u.learning_objectives || null,
    tags: ui.tags || [],
  };
}

function normalizeSimpleFormat(raw) {
  return {
    _format: 'simple',
    embeddedSubtitles: [],
    embeddedUnitInfo: null,
    topic: raw.topic || null,
    difficulty: raw.difficulty || null,
    summary: raw.summary || null,
    vocabulary: raw.vocabulary || [],
    grammar_points: raw.grammar_points || [],
    authentic_expression: raw.authentic_expression || null,
    vocabulary_network: raw.vocabulary_network || null,
    exercises: raw.exercises || [],
    pronunciation_tips: [],
    pronunciation_liaison: null,
    pronunciation_intonation: null,
    sentence_patterns: [],
    scenario: null,
    summary_content: null,
    summary_keywords: null,
    difficulty_note: null,
    learning_objectives: null,
    tags: [],
  };
}

function normalizeLearningData(raw, foreignField = 'french') {
  if (raw.materials?.unit_1) return normalizeAiFormat(raw, foreignField);
  return normalizeSimpleFormat(raw);
}

// ============================================================================
// 文件扫描
// ============================================================================

function scanAudioDir(dir) {
  const items = [];
  const files = fs.readdirSync(dir).filter(f => f.endsWith('_materials.json')).sort();
  for (const fileName of files) {
    items.push({
      type: 'audio',
      materialsFile: path.join(dir, fileName),
      fileName,
      dirName: '',
      segNumber: 0,
    });
  }
  return items;
}

function scanVideoDir(dir, prefix) {
  const items = [];
  const dirs = fs.readdirSync(dir)
    .filter(name => {
      if (prefix && !name.startsWith(prefix)) return false;
      return fs.statSync(path.join(dir, name)).isDirectory();
    })
    .sort();

  for (const subDir of dirs) {
    const subtitleDir = path.join(dir, subDir, '字幕');
    const learningDir = path.join(dir, subDir, '学习资料');

    if (!fs.existsSync(subtitleDir) || !fs.existsSync(learningDir)) continue;

    const subFiles = fs.readdirSync(subtitleDir).filter(f => f.endsWith('.json')).sort();
    const learnFiles = fs.readdirSync(learningDir).filter(f => f.endsWith('.json')).sort();

    const learnIndex = new Map();
    for (const lf of learnFiles) {
      learnIndex.set(lf.replace('_学习资料.json', ''), lf);
    }

    for (const sf of subFiles) {
      const key = sf.replace('_字幕.json', '');
      const learningFile = learnIndex.get(key);
      const segMatch = sf.match(/seg_?(\d+)/);
      const segNumber = segMatch ? parseInt(segMatch[1], 10) : 0;

      if (learningFile) {
        items.push({
          type: 'video',
          subtitleFile: path.join(subtitleDir, sf),
          learningFile: path.join(learningDir, learningFile),
          subtitleFileName: sf,
          learningFileName: learningFile,
          dirName: subDir,
          segNumber,
        });
      }
    }
  }
  return items;
}

// ============================================================================
// URL 解析
// ============================================================================

function buildCsvUrlMap(csvPath) {
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const lines = csvContent.split('\n').slice(1);
  const map = new Map();
  for (const line of lines) {
    if (!line.trim()) continue;
    const match = line.match(/^"([^"]*)","([^"]*)","([^"]*)",/);
    if (match) {
      // NFD (e + combining accent) 与 NFC (é) 归一化，避免 CSV 编码不匹配
      const mp3Name = match[2].normalize('NFC');
      const ossUrl = match[3];
      map.set(mp3Name, ossUrl);
      map.set(mp3Name.replace('.mp3', '_materials.json'), ossUrl);
    }
  }
  return map;
}

function findAudioUrl(urlMap, materialsFileName) {
  const mp3Name = materialsFileName.replace('_materials.json', '.mp3');
  return urlMap.get(mp3Name) || urlMap.get(materialsFileName) || null;
}

function findVideoUrl(manifest, dirName, segNumber) {
  const segPadded = String(segNumber).padStart(3, '0');
  for (const [relPath, url] of Object.entries(manifest)) {
    if (relPath.includes(dirName) && relPath.includes(`seg${segPadded}.mp4`)) {
      return url;
    }
  }
  return null;
}

async function uploadToOSS(dir, ossPath, manifestPath, dirPrefix) {
  const OSS = (await import('ali-oss')).default;
  const ossClient = new OSS({
    region: process.env.ALIYUN_OSS_REGION,
    accessKeyId: process.env.ALIYUN_OSS_ACCESS_KEY_ID,
    accessKeySecret: process.env.ALIYUN_OSS_ACCESS_KEY_SECRET,
    bucket: process.env.ALIYUN_OSS_BUCKET,
    timeout: 300000,
  });

  const videoFiles = [];
  const dirs = fs.readdirSync(dir)
    .filter(name => {
      if (dirPrefix && !name.startsWith(dirPrefix)) return false;
      return fs.statSync(path.join(dir, name)).isDirectory();
    })
    .sort();

  for (const sub of dirs) {
    const videoDir = path.join(dir, sub, '视频片段');
    if (!fs.existsSync(videoDir)) continue;
    const mp4s = fs.readdirSync(videoDir).filter(f => f.endsWith('.mp4')).sort();
    for (const mp4 of mp4s) {
      videoFiles.push({ localPath: path.join(videoDir, mp4), dir: sub, fileName: mp4 });
    }
  }

  console.log(`\n找到 ${videoFiles.length} 个视频文件待上传`);

  let manifest = {};
  if (fs.existsSync(manifestPath)) {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    console.log(`已有 manifest: ${Object.keys(manifest).length} 条`);
  }

  let uploadedCount = 0;
  let skippedCount = 0;

  for (const vf of videoFiles) {
    const relativePath = path.relative(dir, vf.localPath).replace(/\\/g, '/');
    if (manifest[relativePath]) {
      console.log(`  跳过(已上传): ${vf.fileName}`);
      skippedCount++;
      continue;
    }

    const ossKey = (ossPath || 'videos/') + path.basename(vf.localPath);
    const sizeMB = (fs.statSync(vf.localPath).size / 1024 / 1024).toFixed(1);
    console.log(`  上传: ${vf.fileName} (${sizeMB}MB)`);

    try {
      await retryWithBackoff(async () => {
        const result = await ossClient.put(ossKey, vf.localPath, { timeout: 300000 });
        manifest[relativePath] = result.url;
      });
      console.log(`  OK: ${manifest[relativePath].substring(0, 60)}...`);
      uploadedCount++;
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    } catch (error) {
      console.error(`  失败: ${error.message}`);
    }
  }

  console.log(`上传完成: 新增 ${uploadedCount}, 跳过 ${skippedCount}`);
  return manifest;
}

// ============================================================================
// 日期分配
// ============================================================================

function assignDates(count, dateMode, dateStr, spreadDays) {
  const today = new Date();
  const dates = [];

  if (dateMode === 'today') {
    const todayStr = today.toISOString().split('T')[0];
    for (let i = 0; i < count; i++) dates.push(todayStr);
  } else if (dateMode === 'specific') {
    for (let i = 0; i < count; i++) dates.push(dateStr);
  } else {
    // spread: 从 (today - count) 到 (today - 1)
    const days = spreadDays || count;
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - days);
    for (let i = 0; i < count; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }
  }

  return dates;
}

// ============================================================================
// 核心导入
// ============================================================================

async function importSingle(outerSupabase, item, url, opts) {
  const { creatorName, contentType, creatorId: rawCreatorId, coverUrl, language, foreignField } = opts;
  // 防护：确保 creatorId 是有效 UUID 或 null（不能是字符串 "undefined"）
  const creatorId = (rawCreatorId && rawCreatorId !== 'undefined') ? rawCreatorId : null;
  // 每次导入用新的 Supabase client，避免网络中断后客户端状态损坏
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  let rawLearningData, subtitleData, subtitles, ld, unitInfo, duration, baseTitle;

  if (contentType === 'audio') {
    rawLearningData = JSON.parse(fs.readFileSync(item.materialsFile, 'utf8'));
    ld = normalizeLearningData(rawLearningData, foreignField);
    subtitles = ld.embeddedSubtitles;
    unitInfo = ld.embeddedUnitInfo;
  } else {
    subtitleData = JSON.parse(fs.readFileSync(item.subtitleFile, 'utf8'));
    rawLearningData = JSON.parse(fs.readFileSync(item.learningFile, 'utf8'));
    ld = normalizeLearningData(rawLearningData, foreignField);
    unitInfo = subtitleData.unit_info || {};
    subtitles = subtitleData.subtitles || [];
    // 适配驼峰命名字幕格式（startTime/endTime → start_time/end_time）
    if (subtitles.length > 0 && subtitles[0].startTime && !subtitles[0].start_time) {
      subtitles = subtitles.map(sub => ({
        ...sub,
        start_time: sub.start_time || sub.startTime,
        end_time: sub.end_time || sub.endTime,
      }));
    }
    // 适配新格式：无 unit_info，标题/信息在顶层字段
    if (!subtitleData.unit_info && subtitleData.videoTitle) {
      unitInfo = {
        source_video_name: subtitleData.videoTitle || '',
        video_title_cn: subtitleData.videoTitle || '',
        start_time: subtitles[0]?.start_time,
        end_time: subtitles[subtitles.length - 1]?.end_time,
        unit_name_cn: subtitleData.videoTitle || '',
      };
    }
  }

  // 时长
  if (unitInfo?.start_time && unitInfo?.end_time) {
    duration = Math.round(timeStringToSeconds(unitInfo.end_time) - timeStringToSeconds(unitInfo.start_time));
  } else {
    duration = 0;
  }

  // 标题
  if (contentType === 'audio') {
    baseTitle = rawLearningData.video_name || unitInfo?.source_video_name || ld.topic || '未命名播客';
  } else {
    baseTitle = unitInfo?.video_title_cn || unitInfo?.source_video_name || ld.topic || item.dirName;
  }
  let aiTitle = baseTitle.replace(/\.json$/, '').substring(0, MAX_TITLE_LENGTH);

  // 视频模式追加 seg 编号
  if (contentType === 'video' && item.segNumber > 0) {
    aiTitle = `${aiTitle}（${item.segNumber}）`;
  }

  // original_title 过滤
  const rawTheme = unitInfo?.theme || ld.topic || '';
  const safeTheme = MEANINGLESS_THEMES.has(rawTheme) ? '' : rawTheme;

  // 描述
  const resolvedDescription = await resolveDescription(ld, subtitles, contentType);

  // 查重 + 创建/更新
  const { data: existingVideo } = await retryWithBackoff(() =>
    supabase.from('videos').select('id').eq('video_url', url).maybeSingle()
  );
  let videoId;

  if (existingVideo) {
    videoId = existingVideo.id;
  } else {
    const insertData = {
      title: aiTitle.substring(0, MAX_TITLE_LENGTH),
      description: resolvedDescription,
      original_title: safeTheme ? safeTheme.substring(0, MAX_ORIGINAL_TITLE_LENGTH) : null,
      language: language,
      difficulty: cefrToDifficulty(ld.difficulty),
      duration,
      video_url: url,
      content_type: contentType,
      status: 'draft',
      creator_id: creatorId,
      creator_name: creatorName,
      summary_content: ld.summary_content || null,
      summary_keywords: ld.summary_keywords || null,
      difficulty_note: ld.difficulty_note || null,
      learning_objectives: ld.learning_objectives || null,
    };
    if (contentType === 'video' && unitInfo?.unit_name_cn) {
      insertData.album_title = unitInfo.unit_name_cn;
    }

    const newVideo = await retryWithBackoff(() =>
      supabase.from('videos').insert(insertData).select().single()
    );
    videoId = newVideo.data.id;
  }

  // 清理旧关联数据
  for (const table of RELATED_TABLES) {
    await retryWithBackoff(() =>
      supabase.from(table).delete().eq('video_id', videoId)
    );
  }

  // 字幕
  if (subtitles.length > 0) {
    await retryWithBackoff(() =>
      supabase.from('video_subtitles').insert(subtitles.map((sub, i) => ({
        video_id: videoId,
        start_time: timeStringToSeconds(sub.start_time),
        end_time: timeStringToSeconds(sub.end_time),
        original_text: sub[foreignField],
        chinese_text: sub.chinese,
        word_count: sub[foreignField] ? sub[foreignField].split(/\s+/).filter(Boolean).length : 0,
        display_order: i,
      })))
    );
  }

  // 单词卡片
  if (ld.vocabulary?.length > 0) {
    const wordCards = ld.vocabulary.map((vocab, idx) => {
      const { cefr_level, difficulty_level } = vocab.cefr_level
        ? { cefr_level: vocab.cefr_level, difficulty_level: CEFR_TO_NUMBER[vocab.cefr_level] || null }
        : lookupCefr(vocab.word);
      return {
        video_id: videoId,
        word: vocab.word,
        phonetic: vocab.phonetics || vocab.phonetic || null,
        part_of_speech: (vocab.pos || '').substring(0, 20) || null,
        chinese_definition: vocab.meaning || vocab.definition,
        example_from_video: vocab.example || null,
        example_translation: vocab.example_translation || null,
        cefr_level,
        difficulty_level,
        occurrence_count: vocab.occurrence_count || null,
        source_ids: vocab.source_ids || null,
        examples: vocab.examples || null,
        display_order: idx,
        is_reviewed: true,
      };
    });
    await retryWithBackoff(() =>
      supabase.from('video_word_cards').insert(wordCards)
    );
  }

  // 语法点
  if (ld.grammar_points?.length > 0) {
    await retryWithBackoff(() =>
      supabase.from('video_grammar_points').insert(ld.grammar_points.map((gp, idx) => ({
        video_id: videoId,
        name: gp.point || gp.name,
        structure: gp.structure || null,
        example_french: gp.example_from_text || gp.example?.[foreignField] || null,
        example_chinese: gp.example_translation || gp.example?.chinese || null,
        example_ipa: null,
        purpose: gp.explanation || null,
        note: gp.note || null,
        display_order: idx,
      })))
    );
  }

  // 练习题
  let exerciseCount = 0;
  if (ld.exercises?.length > 0) {
    const exercisesToInsert = [];
    ld.exercises.forEach((ex, idx) => {
      const exerciseType = EXERCISE_TYPE_MAPPING[ex.type];
      if (!exerciseType) return;
      if (exerciseType === 'fill_blank') {
        const blankPositions = [];
        const blankRegex = /_+/g;
        let match, blankIndex = 0;
        while ((match = blankRegex.exec(ex.question)) !== null) {
          const answerWords = ex.answer.split(',').map(s => s.trim());
          blankPositions.push({
            start: match.index,
            end: match.index + match[0].length,
            word: answerWords[blankIndex] || ex.answer,
            hint: (answerWords[blankIndex] || ex.answer).charAt(0),
          });
          blankIndex++;
        }

        // fill_in_blank 但 question 里没有下划线 → 实际是选择题，按 multiple_choice 处理
        if (blankPositions.length === 0) {
          exercisesToInsert.push({
            video_id: videoId,
            exercise_type: 'multiple_choice',
            difficulty: 'intermediate',
            original_text: ex.question,
            blank_positions: [],
            answer_text: ex.answer,
            hint_type: null,
            display_order: idx,
            exercise_metadata: {
              question: ex.question,
              answer: ex.answer,
              options: ex.options || undefined,
              explanation: ex.explanation || null,
            },
          });
        } else {
          exercisesToInsert.push({
            video_id: videoId,
            exercise_type: 'fill_blank',
            difficulty: blankPositions.length === 1 ? 'beginner' : blankPositions.length <= 3 ? 'intermediate' : 'advanced',
            original_text: ex.question,
            blank_positions: blankPositions,
            answer_text: ex.answer,
            hint_type: blankPositions.length === 1 ? 'first_letter' : 'none',
            display_order: idx,
            exercise_metadata: null,
          });
        }
      } else {
        exercisesToInsert.push({
          video_id: videoId,
          exercise_type: exerciseType,
          difficulty: 'intermediate',
          original_text: ex.question,
          blank_positions: [],
          answer_text: ex.answer,
          hint_type: null,
          display_order: idx,
          exercise_metadata: {
            question: ex.question,
            answer: ex.answer,
            options: ex.options || undefined,
            explanation: ex.explanation || null,
          },
        });
      }
    });
    if (exercisesToInsert.length > 0) {
      await retryWithBackoff(() =>
        supabase.from('video_exercises').insert(exercisesToInsert)
      );
      exerciseCount = exercisesToInsert.length;
    }
  }

  // 句型模式
  if (ld.sentence_patterns?.length > 0) {
    await retryWithBackoff(() =>
      supabase.from('video_exercises').insert(ld.sentence_patterns.map((sp, idx) => ({
        video_id: videoId,
        exercise_type: 'sentence_pattern',
        difficulty: 'intermediate',
        original_text: sp.pattern,
        blank_positions: [],
        answer_text: sp.example?.[foreignField] || '',
        hint_type: null,
        display_order: exerciseCount + idx,
        exercise_metadata: { pattern: sp.pattern, explanation: sp.explanation || null, example: sp.example || null },
      })))
    );
  }

  // 情景练习
  if (ld.scenario) {
    await retryWithBackoff(() =>
      supabase.from('video_exercises').insert({
        video_id: videoId,
        exercise_type: 'scenario',
        difficulty: 'advanced',
        original_text: ld.scenario.description,
        blank_positions: [],
        answer_text: ld.scenario.starter || '',
        hint_type: null,
        display_order: 100,
        exercise_metadata: {
          description: ld.scenario.description,
          requirements: ld.scenario.requirements || [],
          starter: ld.scenario.starter || null,
        },
      })
    );
  }

  // 地道表达
  if (ld.authentic_expression) {
    const expressions = Array.isArray(ld.authentic_expression) ? ld.authentic_expression : [ld.authentic_expression];
    await retryWithBackoff(() =>
      supabase.from('video_expression_cards').insert(expressions.map((expr, idx) => ({
        video_id: videoId,
        expression: expr.expression || expr.phrase,
        context: expr.example_from_text || expr.example?.[foreignField] || null,
        context_translation: expr.example?.chinese || null,
        formula: expr.note || expr.usage_note || null,
        meaning: expr.meaning || null,
        examples: (expr.example_from_text || expr.example?.[foreignField])
          ? [{ original: expr.example_from_text || expr.example?.[foreignField], cn: expr.example?.chinese || '' }]
          : null,
        display_order: idx,
        is_reviewed: true,
      })))
    );
  }

  // 词汇网络
  if (ld.vocabulary_network) {
    const vn = ld.vocabulary_network;
    let structureData = null;
    let relatedWordsData = null;

    if (vn._ai_format && vn._raw) {
      const rawVn = vn._raw;
      if (rawVn.related_groups) {
        const groupMap = {};
        const allWords = [];
        for (const group of rawVn.related_groups) {
          if (group.category && group.words) {
            groupMap[group.category] = group.words;
            allWords.push(...group.words);
          }
        }
        structureData = JSON.stringify(groupMap);
        relatedWordsData = allWords.length > 0 ? allWords : null;
      }
    } else {
      relatedWordsData = vn.related_words ? vn.related_words.map(r => typeof r === 'string' ? r : r.word) : null;
      // simple 格式没有分类结构，不写 structure，让前端走 SimpleNetworkVisualization
      structureData = null;
    }

    // word_details：保留 related_words 的完整数据，供前端点击时优先展示
    const wordDetailsData = vn.related_words?.length > 0 && typeof vn.related_words[0] === 'object'
      ? vn.related_words.map(r => ({
          word: r.word,
          meaning: r.meaning || '',
          example: r.example || null,
          example_translation: r.example_translation || null,
        }))
      : null;

    await retryWithBackoff(() =>
      supabase.from('video_vocabulary_networks').insert({
        video_id: videoId,
        theme: (ld.topic && !MEANINGLESS_THEMES.has(ld.topic)) ? ld.topic : null,
        core_word: vn.seed_word || null,
        related_words: relatedWordsData,
        collocations: null,
        structure: structureData,
        word_details: wordDetailsData,
      })
    );
  }

  // 发音要点
  if (ld.pronunciation_tips?.length > 0) {
    await retryWithBackoff(() =>
      supabase.from('video_pronunciation_tips').insert(ld.pronunciation_tips.map((pt, idx) => ({
        video_id: videoId,
        sound_symbol: pt.sound,
        example_words: pt.example_words || pt.examples || [],
        instruction: pt.instruction || pt.description || null,
        practice_tip: pt.practice_tip || null,
        display_order: idx,
      })))
    );
    if (ld.pronunciation_liaison || ld.pronunciation_intonation) {
      await retryWithBackoff(() =>
        supabase.from('video_pronunciation_tips').update({
          ...(ld.pronunciation_liaison ? { liaison: ld.pronunciation_liaison } : {}),
          ...(ld.pronunciation_intonation ? { intonation: ld.pronunciation_intonation } : {}),
        }).eq('video_id', videoId).eq('display_order', 0)
      );
    }
  }

  // 标签
  let tagNames = ld.tags?.length > 0
    ? ld.tags.slice(0, MAX_TAGS_PER_VIDEO)
    : inferVideoTags(aiTitle, safeTheme, ld.summary || '');

  if (tagNames.length > 0) {
    const { data: matchedTags } = await retryWithBackoff(() =>
      supabase.from('video_tags').select('id, name').in('name', tagNames)
    );
    if (matchedTags?.length > 0) {
      await retryWithBackoff(() =>
        supabase.from('video_tag_relations').insert(
          matchedTags.map(t => ({ video_id: videoId, tag_id: t.id }))
        )
      );
    }
  }

  return {
    videoId,
    title: aiTitle,
    vocabCount: ld.vocabulary?.length || 0,
    subtitleCount: subtitles.length,
    exerciseCount: exerciseCount + (ld.sentence_patterns?.length || 0),
    grammarCount: ld.grammar_points?.length || 0,
    expressionCount: Array.isArray(ld.authentic_expression)
      ? ld.authentic_expression.length
      : (ld.authentic_expression ? 1 : 0),
    duration,
  };
}

// ============================================================================
// 发布
// ============================================================================

async function publishSingle(supabase, videoId, opts) {
  const { packageId, coverUrl, learningDate, duration } = opts;
  await retryWithBackoff(() =>
    supabase.from('videos').update({
      status: 'published',
      published_at: new Date().toISOString(),
      package_ids: [packageId],
      thumbnail_url: coverUrl,
      cover_url: coverUrl,
      learning_date: learningDate,
      updated_at: new Date().toISOString(),
    }).eq('id', videoId)
  );
}

// ============================================================================
// 导入后验证
// ============================================================================

async function validateImport(supabase, videoId, expected) {
  const issues = [];

  const { data: video } = await retryWithBackoff(() =>
    supabase.from('videos').select('id, creator_id, title, video_url, status, learning_date, content_type')
      .eq('id', videoId).single()
  );

  if (!video) {
    return { pass: false, issues: ['videos 行不存在'] };
  }
  if (!video.creator_id) issues.push('creator_id 为空');
  if (!video.title) issues.push('title 为空');
  if (!video.video_url) issues.push('video_url 为空');

  // 字幕数量验证
  const { count: subtitleCount } = await retryWithBackoff(() =>
    supabase.from('video_subtitles').select('*', { count: 'exact', head: true }).eq('video_id', videoId)
  );
  if (subtitleCount !== expected.subtitleCount) {
    issues.push(`字幕数量不匹配: 期望 ${expected.subtitleCount}, 实际 ${subtitleCount}`);
  }

  // 单词卡片数量验证
  const { count: wordCount } = await retryWithBackoff(() =>
    supabase.from('video_word_cards').select('*', { count: 'exact', head: true }).eq('video_id', videoId)
  );
  if (wordCount !== expected.vocabCount) {
    issues.push(`单词数量不匹配: 期望 ${expected.vocabCount}, 实际 ${wordCount}`);
  }

  // 发布状态验证
  if (expected.published) {
    if (video.status !== 'published') issues.push(`状态不是 published: ${video.status}`);
    if (!video.learning_date) issues.push('已发布但 learning_date 为空');
  }

  return { pass: issues.length === 0, issues };
}

// ============================================================================
// main()
// ============================================================================

async function main() {
  console.log('========================================');
  console.log('   统一批量导入系统');
  console.log('========================================');

  dotenv.config({ path: '.env.local' });

  const args = parseArgs(process.argv);
  const errors = validateArgs(args);
  if (errors.length > 0) {
    console.error('参数错误:');
    errors.forEach(e => console.error(`  - ${e}`));
    console.error('\n用法: node batch-import.mjs --mode <audio|video> --dir <path> --creator <name> [--language fr|es] [--package 名称] [选项]');
    process.exit(1);
  }

  const mode = args.mode;
  const dir = args.dir;
  const creatorName = args.creator;
  const csvPath = args.csv || null;
  const ossPath = args['oss-path'] || 'videos/';
  const manifestPath = args.manifest || null;
  const dirPrefix = args['dir-prefix'] || '';
  const publishMode = args.publish || 'none';
  const testCount = parseInt(args['test-count'] || '2', 10);
  const dateMode = args['date-mode'] || 'spread';
  const dateStr = args.date || null;
  const spreadDays = parseInt(args['spread-days'] || '0', 10) || 0;
  const delay = parseInt(args.delay || '500', 10);
  const dryRun = !!(args.dryRun || args['dry-run']);
  const language = args.language || 'fr';
  const foreignField = LANG_FOREIGN_FIELD[language];
  const packageName = args.package || DEFAULT_PACKAGE_NAMES[language] || DEFAULT_PACKAGE_NAMES.fr;

  console.log(`模式: ${mode}`);
  console.log(`目录: ${dir}`);
  console.log(`创作者: ${creatorName}`);
  console.log(`语言: ${language}`);
  console.log(`套餐: ${packageName}`);
  console.log(`发布: ${publishMode}`);
  console.log(`日期模式: ${dateMode}`);
  console.log(`dry-run: ${dryRun}`);

  // 校验目录存在
  if (!fs.existsSync(dir)) {
    console.error(`目录不存在: ${dir}`);
    process.exit(1);
  }

  // 词库加载：仅法语加载本地词库
  if (language === 'fr') {
    const dictRaw = JSON.parse(fs.readFileSync('data/french/french_words_all.json', 'utf8'));
    for (const w of dictRaw.words) {
      const key = w.word.toLowerCase();
      if (!dictMap.has(key)) dictMap.set(key, w);
    }
    console.log(`词库已加载: ${dictMap.size} 词`);
  } else {
    console.log(`语言 ${language} 跳过本地词库加载`);
  }

  // 初始化 Supabase
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // 获取套餐 ID
  const { data: pkg } = await retryWithBackoff(() =>
    supabase.from('invitation_packages').select('id').eq('name', packageName).single()
  );
  if (!pkg) {
    console.error(`找不到套餐: ${packageName}`);
    process.exit(1);
  }

  // 获取创作者信息
  const { data: creatorRow } = await retryWithBackoff(() =>
    supabase.from('upstream_creators').select('id, name').eq('name', creatorName).maybeSingle()
  );
  const creatorId = creatorRow?.id || null;
  if (!creatorId) {
    console.warn(`创作者 "${creatorName}" 未在 upstream_creators 表中找到`);
  }

  // 封面策略
  let coverUrl = null;
  if (mode === 'audio') {
    const { data: creators } = await retryWithBackoff(() =>
      supabase.rpc('get_podcast_creators', { p_limit: 50 })
    );
    const creatorInfo = (creators || []).find(c => c.name === creatorName);
    coverUrl = creatorInfo?.avatar_url || null;
    console.log(`封面(播客头像): ${coverUrl ? '有' : '无'}`);
  }

  // 扫描文件
  let items;
  if (mode === 'audio') {
    items = scanAudioDir(dir);
    console.log(`扫描到 ${items.length} 个音频材料文件`);
  } else {
    items = scanVideoDir(dir, dirPrefix);
    console.log(`扫描到 ${items.length} 个视频配对`);
  }

  if (items.length === 0) {
    console.log('没有找到可导入的项目，退出');
    return;
  }

  // dry-run 模式：只打印扫描结果
  if (dryRun) {
    console.log('\n=== DRY-RUN 模式（不写入数据库）===');
    items.forEach((item, i) => {
      if (mode === 'audio') {
        console.log(`  [${i + 1}] ${item.fileName}`);
      } else {
        console.log(`  [${i + 1}] ${item.dirName} / ${item.subtitleFileName}`);
      }
    });
    return;
  }

  // URL 解析
  let urlMap = new Map();
  let manifest = {};

  if (mode === 'audio') {
    if (!fs.existsSync(csvPath)) {
      console.error(`CSV 文件不存在: ${csvPath}`);
      process.exit(1);
    }
    urlMap = buildCsvUrlMap(csvPath);
    console.log(`CSV 映射: ${urlMap.size} 条`);
  } else {
    // 视频模式：上传 OSS（如果 manifest 存在或不完整则继续上传）
    manifest = await uploadToOSS(dir, ossPath, manifestPath, dirPrefix);
  }

  // 限制范围（test 模式）
  let targetItems = items;
  if (publishMode === 'test') {
    targetItems = items.slice(0, testCount);
    console.log(`测试模式: 只处理前 ${targetItems.length} 个`);
  }

  // 日期分配
  const dates = assignDates(targetItems.length, dateMode, dateStr, spreadDays || targetItems.length);

  // 逐项导入
  const results = [];
  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;

  for (let i = 0; i < targetItems.length; i++) {
    const item = targetItems[i];
    const learningDate = dates[i];

    const label = mode === 'audio' ? item.fileName : `${item.dirName} seg${item.segNumber}`;
    console.log(`\n[${i + 1}/${targetItems.length}] ${learningDate} | ${label}`);

    // 查找 URL
    let url;
    if (mode === 'audio') {
      url = findAudioUrl(urlMap, item.fileName);
    } else {
      url = findVideoUrl(manifest, item.dirName, item.segNumber);
    }

    if (!url) {
      console.log('  跳过: 未找到媒体 URL');
      skipCount++;
      results.push({ label, status: 'skip', reason: '未找到媒体 URL' });
      continue;
    }

    try {
      // 视频封面：OSS 截帧
      const itemCoverUrl = mode === 'video'
        ? `${url}?x-oss-process=video/snapshot,t_${Math.round(0)},m_fast,w_640,f_jpg`
        : coverUrl;

      const result = await importSingle(supabase, item, url, {
        creatorName,
        contentType: mode,
        creatorId,
        coverUrl: itemCoverUrl,
        language,
        foreignField,
      });

      // 视频封面需要用到 duration
      const finalCoverUrl = mode === 'video'
        ? `${url}?x-oss-process=video/snapshot,t_${Math.round(result.duration * 0.25 * 1000)},m_fast,w_640,f_jpg`
        : coverUrl;

      // 发布
      const shouldPublish = publishMode === 'all' || publishMode === 'test';
      if (shouldPublish) {
        await publishSingle(supabase, result.videoId, {
          packageId: pkg.id,
          coverUrl: finalCoverUrl,
          learningDate,
          duration: result.duration,
        });
      }

      // 验证
      const validation = await validateImport(supabase, result.videoId, {
        subtitleCount: result.subtitleCount,
        vocabCount: result.vocabCount,
        published: shouldPublish,
      });

      const statusLabel = validation.pass ? '[PASS]' : `[FAIL: ${validation.issues.join(', ')}]`;
      console.log(`  ${statusLabel} ${result.title} | 字幕${result.subtitleCount} | 单词${result.vocabCount} | 练习${result.exerciseCount} | ${learningDate}`);

      successCount++;
      results.push({
        label,
        status: validation.pass ? 'pass' : 'warn',
        videoId: result.videoId,
        title: result.title,
        issues: validation.issues,
      });
    } catch (error) {
      console.error(`  [FAIL] ${error.message}`);
      failCount++;
      results.push({ label, status: 'fail', reason: error.message });
    }

    if (i < targetItems.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // 汇总报告
  console.log('\n========================================');
  console.log('   导入汇总');
  console.log('========================================');
  console.log(`模式: ${mode}`);
  console.log(`创作者: ${creatorName}`);
  console.log(`总计: ${targetItems.length}`);
  console.log(`成功: ${successCount}`);
  console.log(`跳过: ${skipCount}`);
  console.log(`失败: ${failCount}`);
  console.log(`结束时间: ${new Date().toLocaleString()}`);

  // 详细结果
  if (results.some(r => r.status !== 'pass')) {
    console.log('\n--- 非成功项详情 ---');
    for (const r of results) {
      if (r.status === 'pass') continue;
      if (r.status === 'skip') console.log(`  SKIP: ${r.label} - ${r.reason}`);
      else if (r.status === 'warn') console.log(`  WARN: ${r.label} - ${r.issues.join(', ')}`);
      else if (r.status === 'fail') console.log(`  FAIL: ${r.label} - ${r.reason}`);
    }
  }

  if (failCount > 0) process.exit(1);
}

main();
