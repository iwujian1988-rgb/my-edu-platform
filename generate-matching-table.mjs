/**
 * 生成匹配表格脚本
 */

import fs from 'fs'
import path from 'path'

const CONFIG = {
  linshiDir: './linshi',
  csvFile: './french-podcasts-upload-map.csv',
  outputFile: './linshi/matching_table.csv'
}

/**
 * 递归查找所有 materials.json 文件
 */
function findMaterialsJsonFiles(dir) {
  const files = []

  function traverse(currentPath) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name)

      if (entry.isDirectory()) {
        traverse(fullPath)
      } else if (entry.isFile() && entry.name.endsWith('_materials.json')) {
        files.push(fullPath)
      }
    }
  }

  traverse(dir)
  return files
}

/**
 * 读取 CSV 映射文件
 */
function readCsvMap(csvPath) {
  try {
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
  } catch (error) {
    console.error('❌ 读取 CSV 文件失败:', error.message)
    return new Map()
  }
}

/**
 * 匹配 JSON 文件与 OSS URL
 */
function matchJsonWithUrl(jsonFile, csvMap) {
  try {
    const content = fs.readFileSync(jsonFile, 'utf-8')
    const jsonData = JSON.parse(content)
    const sourceFile = jsonData.source_file

    if (!sourceFile) {
      return {
        fileName: path.basename(jsonFile),
        sourceFile: 'missing',
        url: null,
        channel: jsonData.channel || 'unknown',
        videoName: jsonData.video_name || 'unnamed'
      }
    }

    let url = null
    let matchType = 'none'

    // 将 .json 替换为 .mp3 匹配
    const mp3FileName = sourceFile.replace('.json', '.mp3')
    if (csvMap.has(mp3FileName)) {
      url = csvMap.get(mp3FileName)
      matchType = 'json_to_mp3'
    }

    return {
      fileName: path.basename(jsonFile),
      sourceFile,
      matchedFile: mp3FileName,
      url,
      matchType: url ? matchType : 'none',
      channel: jsonData.channel || 'unknown',
      videoName: jsonData.video_name || 'unnamed'
    }
  } catch (error) {
    return {
      fileName: path.basename(jsonFile),
      sourceFile: 'error',
      url: null,
      matchType: 'error',
      channel: 'error',
      error: error.message
    }
  }
}

/**
 * 主函数
 */
function main() {
  console.log('📊 生成匹配表格...')
  console.log('========================================\n')

  // 1. 查找所有 materials.json 文件
  console.log(`📁 扫描目录: ${CONFIG.linshiDir}`)
  const jsonFiles = findMaterialsJsonFiles(CONFIG.linshiDir)
  console.log(`找到 ${jsonFiles.length} 个 materials.json 文件\n`)

  // 2. 读取 CSV 映射
  console.log(`📋 读取映射文件: ${CONFIG.csvFile}`)
  const csvMap = readCsvMap(CONFIG.csvFile)
  console.log(`CSV 映射记录: ${csvMap.size} 条\n`)

  // 3. 匹配 JSON 与 URL
  console.log('🔍 开始匹配...\n')
  const matches = []

  for (const jsonFile of jsonFiles) {
    const matchResult = matchJsonWithUrl(jsonFile, csvMap)
    // 跳过没有 URL 的文件
    if (matchResult.url) {
      matches.push(matchResult)
    }
  }

  // 4. 生成 CSV 表格
  const csvHeader = '音频地址,文件名,JSON文件名,对应频道,视频名称\n'
  let csvContent = csvHeader

  for (const match of matches) {
    // CSV 字段转义
    const audioUrl = `"${match.url}"`
    const fileName = `"${match.matchedFile}"`
    const jsonFileName = `"${match.fileName}"`
    const channel = `"${match.channel}"`
    const videoName = `"${match.videoName}"`

    csvContent += `${audioUrl},${fileName},${jsonFileName},${channel},${videoName}\n`
  }

  // 5. 保存表格
  fs.writeFileSync(CONFIG.outputFile, '\uFEFF' + csvContent, 'utf8') // 添加 BOM 以支持 Excel

  console.log('========================================')
  console.log('📊 匹配统计:')
  console.log(`✅ 成功匹配: ${matches.length} 个`)
  console.log(`❌ 已跳过: ${jsonFiles.length - matches.length} 个 (无 URL)`)
  console.log(`📈 总计: ${jsonFiles.length} 个`)
  console.log(`\n📄 匹配表格已保存到: ${CONFIG.outputFile}`)

  // 6. 按频道统计
  const byChannel = {}
  for (const match of matches) {
    if (!byChannel[match.channel]) {
      byChannel[match.channel] = []
    }
    byChannel[match.channel].push(match)
  }

  console.log('\n📺 各频道匹配数量:')
  for (const [channel, channelMatches] of Object.entries(byChannel)) {
    console.log(`  - ${channel}: ${channelMatches.length} 个`)
  }
}

// 运行主函数
main()