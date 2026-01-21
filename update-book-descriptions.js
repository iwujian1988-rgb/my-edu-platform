/**
 * 为所有词库生成用户价值导向的描述
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// 加载环境变量
const envPath = path.join(__dirname, '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=')
    if (valueParts.length > 0) {
      let value = valueParts.join('=').trim()
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      if (key && value) {
        process.env[key.trim()] = value
      }
    }
  })
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// 为每个词库定制的描述
const BOOK_DESCRIPTIONS = {
  '专业英语八级': '专为英语专业高年级学生设计，覆盖文学、语言学、翻译等高级词汇，助力TEM-8考试与学术研究',

  'TOEFL': '托福考试必备词汇库，涵盖学术场景与校园生活核心词汇，助你突破托福词汇瓶颈，轻松应对听说读写',

  'GRE': 'GRE考试核心词汇，精准覆盖填空与阅读高频词，配以详细释义和例句，为冲刺顶尖名校打下坚实基础',

  'SAT': 'SAT考试词汇精选，涵盖学术阅读与写作核心词汇，适合美本申请者系统提升词汇量与学术英语能力',

  '考研': '考研英语核心词汇，紧扣历年真题高频词，配以精准中文释义和搭配，助你攻克考研词汇难关',

  '专业英语四级': '英语专业基础阶段词汇库，系统覆盖基础到中级词汇，适合英语专业大一、大二学生夯实基础',

  'CET-4': '大学英语四级词汇精选，覆盖考试高频核心词，配以实用搭配和例句，助你轻松突破四级词汇关',

  'CET-6': '大学英语六级进阶词汇，涵盖学术阅读、写作高频词，适合已过四级同学向更高水平进阶',

  'IELTS': '雅思考试核心词汇，覆盖学术类与培训类场景，配以真题例句，助力听说读写全面突破',

  'PETS3': '全国英语等级考试三级词汇，覆盖日常交流与工作场景，适合中级英语学习者系统提升',

  'BEC': '剑桥商务英语证书词汇，涵盖商务会议、谈判、邮件等场景，适合商务人士和外企求职者',

  'FCE': '剑桥英语第一证书词汇，覆盖日常生活、工作、学习场景，适合中级英语学习者进阶',

  'GMAT': 'GMAT考试核心词汇，涵盖商业、逻辑、数据分析场景必备词汇，适合MBA申请者系统提升商业英语能力',

  'PET': '剑桥英语入门考试词汇，涵盖日常交流核心词汇，适合初级英语学习者提升',

  'PTE': 'PTE学术英语考试词汇，覆盖学术场景与交叉学科词汇，适合留学申请者',

  'KET': '剑桥英语入门考试词汇，涵盖基础日常词汇，适合英语初学者建立词汇基础',

  '高中': '高中英语课程标准词汇，覆盖高考高频词与学术词汇，适合高中生系统学习与备考',

  '初中': '初中英语核心词汇，紧扣中考考点，配以实用搭配，适合初中生打牢词汇基础',

  'PEP高中英语': '人教版高中英语教材词汇，按模块划分，覆盖必修与选修核心词，适合高中课堂同步学习',

  'PEP初中7年级': '人教版七年级英语词汇，涵盖Unit 1-3核心词汇，适合初一学生同步学习',

  'PEP初中8年级': '人教版八年级英语词汇，涵盖Unit 4-6核心词汇，适合初二学生进阶提升',

  'PEP初中9年级': '人教版九年级英语词汇，涵盖Unit 7-9核心词汇，适合初三学生中考冲刺',

  'PEP小学3年级': '人教版三年级英语词汇，涵盖Unit 1-3基础词汇，适合小学英语入门学习',

  'PEP小学4年级': '人教版四年级英语词汇，涵盖Unit 4-6核心词汇，适合小学英语进阶学习',

  'PEP小学5年级': '人教版五年级英语词汇，涵盖Unit 7-9核心词汇，适合小学高年级词汇积累',

  'PEP小学6年级': '人教版六年级英语词汇，涵盖Unit 10-12核心词汇，适合小升初词汇巩固',

  '北京高中英语': '北京版高中英语词汇，按Part划分，覆盖必修核心词汇，适合北京高中生同步学习',

  '外研社初中英语': '外研版初中英语词汇，涵盖初中阶段核心词汇，适合使用外研版教材的学生'
}

async function updateBookDescriptions() {
  console.log('📝 开始更新词库描述...\n')

  // 获取所有书籍
  const { data: books, error } = await supabase
    .from('books')
    .select('id, title, description')

  if (error) {
    console.error('❌ 获取词库失败:', error.message)
    return
  }

  if (!books || books.length === 0) {
    console.log('⚠️  没有找到词库')
    return
  }

  console.log(`找到 ${books.length} 个词库\n`)

  let updated = 0
  let skipped = 0

  for (const book of books) {
    const newDescription = BOOK_DESCRIPTIONS[book.title]

    if (!newDescription) {
      console.log(`⚠️  跳过: ${book.title} (未找到预设描述)`)
      skipped++
      continue
    }

    // 检查是否需要更新
    if (book.description && book.description.includes('从 20260112v1.tar.gz 导入')) {
      // 需要更新
      const { error: updateError } = await supabase
        .from('books')
        .update({ description: newDescription })
        .eq('id', book.id)

      if (updateError) {
        console.error(`❌ 更新失败 (${book.title}): ${updateError.message}`)
      } else {
        console.log(`✅ 更新: ${book.title}`)
        console.log(`   ${newDescription.substring(0, 50)}...`)
        updated++
      }
    } else {
      console.log(`⊙ 跳过: ${book.title} (已有描述)`)
      skipped++
    }
  }

  console.log('\n\n📊 更新完成统计')
  console.log('='.repeat(60))
  console.log(`成功更新: ${updated} 个词库`)
  console.log(`跳过: ${skipped} 个词库`)
  console.log('\n✅ 完成！\n')
}

async function main() {
  await updateBookDescriptions()
}

main().catch(console.error)
