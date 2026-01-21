/**
 * 下载并处理ECDICT数据
 *
 * 功能：
 * 1. 下载ECDICT的stardict.csv文件
 * 2. 解析CSV数据
 * 3. 为KET词库补全字段
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const ECDICT_URL = 'https://github.com/skywind3000/ECDICT/releases/download/v28.0/ecdict-stardict-28.7z'
const ECDICT_CSV_FILE = './stardict.csv'

// 如果CSV文件不存在，提示下载
console.log('🔍 检查ECDICT数据文件...\n')

if (!existsSync(ECDICT_CSV_FILE)) {
  console.log('❌ 未找到 stardict.csv 文件')
  console.log('\n📥 请按以下步骤下载ECDICT数据：\n')
  console.log('方法1（推荐）：')
  console.log('  1. 访问：https://github.com/skywind3000/ECDICT/releases')
  console.log('  2. 下载最新版本：ecdict-stardict-28.7z 或 ecdict-stardict-28.zip')
  console.log('  3. 解压到项目根目录')
  console.log('  4. 确保得到 stardict.csv 文件\n')
  console.log('方法2（使用衍生项目）：')
  console.log('  1. 访问：https://github.com/H1DDENADM1N/ECCEDICT/releases')
  console.log('  2. 下载 stardict.7z')
  console.log('  3. 解压得到 stardict.csv\n')
  console.log('文件大小提示：解压后约 200-300MB\n')
  console.log('下载完成后，重新运行此脚本：')
  console.log('  node update-ket-with-ecdict.mjs\n')
  process.exit(1)
}

console.log('✅ 找到 stardict.csv 文件')
console.log('📂 开始解析数据...\n')

// 解析CSV文件
function parseCSV(filePath) {
  console.log('📖 读取CSV文件...')

  const content = readFileSync(filePath, 'utf-8')
  const lines = content.split('\n').filter(line => line.trim())

  console.log(`✅ 读取了 ${lines.length} 行数据`)

  // 解析每一行
  const wordMap = new Map()
  let parseCount = 0

  for (let i = 0; i < lines.length; i++) {
    // CSV格式：word,phonetic,definition,translation,frequency,collins,oxford,tag,bnc,frq,exchange
    const line = lines[i]

    // 处理CSV中的引号
    const fields = []
    let current = ''
    let inQuotes = false

    for (let j = 0; j < line.length; j++) {
      const char = line[j]

      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        fields.push(current)
        current = ''
      } else {
        current += char
      }
    }
    fields.push(current)

    if (fields.length >= 3) {
      const word = fields[0]
      const phonetic = fields[1]
      const definition = fields[2]
      const translation = fields[3]

      if (word && word !== 'word') { // 跳过表头
        wordMap.set(word, {
          phonetic: phonetic || null,
          definition: definition || null,
          translation: translation || null
        })
        parseCount++
      }
    }

    if ((i + 1) % 100000 === 0) {
      process.stdout.write(`\r📊 解析进度: ${Math.round((i + 1) / lines.length * 100)}%`)
    }
  }

  console.log(`\r✅ 解析完成: ${parseCount} 个单词\n`)

  return wordMap
}

// 主函数
async function main() {
  try {
    // 1. 解析ECDICT数据
    const ecdictMap = parseCSV(ECDICT_CSV_FILE)

    // 2. 显示示例
    console.log('📊 ECDICT数据示例：\n')
    const samples = ['hello', 'abandon', 'barbecue', 'chips']
    samples.forEach(word => {
      const data = ecdictMap.get(word)
      if (data) {
        console.log(`${word}:`)
        console.log(`  音标: ${data.phonetic || '(无)'}`)
        console.log(`  中文: ${data.translation || '(无)'}`)
        console.log(`  英文: ${data.definition || '(无)'}`)
        console.log()
      } else {
        console.log(`${word}: (未找到)\n`)
      }
    })

    console.log(`\n✅ ECDICT数据解析完成！共 ${ecdictMap.size} 个单词`)
    console.log('\n下一步：运行 update-ket-from-ecdict.mjs 来更新KET词库')

  } catch (error) {
    console.error('\n❌ 错误:', error.message)
    process.exit(1)
  }
}

main()
