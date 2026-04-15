/**
 * 验证音频文件地址匹配正确性
 */

import fs from 'fs'
import path from 'path'

const CONFIG = {
  linshiDir: './linshi',
  csvFile: './french-podcasts-upload-map.csv'
}

/**
 * 读取 CSV 映射文件
 */
function readCsvMap(csvPath) {
  const fileContent = fs.readFileSync(csvPath, 'utf-8')
  const lines = fileContent.split('\n')
  const urlMap = new Map()

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

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

    if (fields.length >= 5) {
      const fileName = fields[1].replace(/^"|"$/g, '').replace(/"/g, '')
      const ossUrl = fields[2].replace(/^"|"$/g, '').replace(/"/g, '')
      const status = fields[4].replace(/^"|"$/g, '').replace(/"/g, '')

      if (fileName && ossUrl && status === '成功') {
        urlMap.set(fileName, ossUrl)
      }
    }
  }

  return urlMap
}

/**
 * 验证几个具体案例
 */
function verifyCases() {
  const csvMap = readCsvMap(CONFIG.csvFile)

  // 测试案例
  const testCases = [
    {
      jsonFile: './linshi/InnerFrench 中级法语_processed/E174 Apprendre le français en immersion dans l\'Utah_materials.json',
      expectedMp3: 'E174 Apprendre le français en immersion dans l\'Utah.mp3'
    },
    {
      jsonFile: './linshi/Louis法语课_processed/Ciel voilé _materials.json',
      expectedMp3: 'Ciel voilé .mp3'
    },
    {
      jsonFile: './linshi/SBS简易法语_processed/SBS Easy French #273 _ les couples mariés doivent-ils faire l\'amour __materials.json',
      expectedMp3: 'SBS Easy French #273 _ les couples mariés doivent-ils faire l\'amour _.mp3'
    }
  ]

  console.log('🔍 验证音频文件地址匹配')
  console.log('========================================\n')

  for (const testCase of testCases) {
    try {
      const content = fs.readFileSync(testCase.jsonFile, 'utf-8')
      const jsonData = JSON.parse(content)
      const sourceFile = jsonData.source_file

      // 转换为 mp3 文件名
      const mp3FileName = sourceFile.replace('.json', '.mp3')
      const matchedUrl = csvMap.get(mp3FileName)

      console.log(`📄 JSON文件: ${path.basename(testCase.jsonFile)}`)
      console.log(`   source_file: ${sourceFile}`)
      console.log(`   期望MP3: ${testCase.expectedMp3}`)
      console.log(`   转换MP3: ${mp3FileName}`)
      console.log(`   匹配结果: ${mp3FileName === testCase.expectedMp3 ? '✅ 正确' : '❌ 错误'}`)

      if (matchedUrl) {
        console.log(`   OSS URL: ✅ 已匹配`)
        console.log(`   ${matchedUrl.substring(0, 80)}...`)
      } else {
        console.log(`   OSS URL: ❌ 未匹配`)
      }

      console.log('')
    } catch (error) {
      console.log(`❌ 读取失败: ${testCase.jsonFile}`)
      console.log(`   错误: ${error.message}\n`)
    }
  }

  // 统计总体匹配情况
  console.log('========================================')
  console.log('📊 总体验证:')

  let correctMatches = 0
  let wrongMatches = 0

  for (const [mp3FileName, ossUrl] of csvMap.entries()) {
    // 检查URL是否包含正确的文件名
    const urlFileName = mp3FileName.replace(/'/g, "%E2%80%99").replace(/ /g, '+')
    if (ossUrl.includes(encodeURIComponent(mp3FileName)) || ossUrl.includes(urlFileName)) {
      correctMatches++
    }
  }

  console.log(`✅ CSV中URL格式正确的记录: ${correctMatches}/${csvMap.size}`)
  console.log(`📋 总体匹配率: ${Math.round((correctMatches / csvMap.size) * 100)}%`)
}

// 运行验证
verifyCases()