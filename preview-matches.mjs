/**
 * 匹配预览脚本 - 仅显示匹配结果，不执行上传
 */

import fs from 'fs'
import path from 'path'

const CONFIG = {
  linshiDir: './linshi',
  csvFile: './french-podcasts-upload-map.csv'
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
 * 读取 CSV 映射文件 (手动解析)
 */
function readCsvMap(csvPath) {
  try {
    const fileContent = fs.readFileSync(csvPath, 'utf-8')
    const lines = fileContent.split('\n')
    const urlMap = new Map()

    console.log(`CSV 文件总行数: ${lines.length}`)

    // 跳过标题行
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      // 简化的 CSV 解析：按逗号分割，但处理引号内的逗号
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

    console.log(`成功解析 ${urlMap.size} 条 CSV 记录`)
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
        channel: jsonData.channel || 'unknown'
      }
    }

    // 尝试多种匹配方式
    let url = null
    let matchType = 'none'

    // 1. 精确匹配原始文件名
    if (csvMap.has(sourceFile)) {
      url = csvMap.get(sourceFile)
      matchType = 'exact'
    }

    // 2. 将 .json 替换为 .mp3 匹配
    if (!url) {
      const mp3FileName = sourceFile.replace('.json', '.mp3')
      if (csvMap.has(mp3FileName)) {
        url = csvMap.get(mp3FileName)
        matchType = 'json_to_mp3'
      }
    }

    // 3. 去掉 .json 后缀匹配
    if (!url) {
      const nameWithoutJson = sourceFile.replace('.json', '')
      if (csvMap.has(nameWithoutJson)) {
        url = csvMap.get(nameWithoutJson)
        matchType = 'without_ext'
      }
    }

    // 4. 模糊匹配：检查 CSV 中是否包含 source_file 的关键部分
    if (!url) {
      const baseName = sourceFile.replace('.json', '').toLowerCase()
      for (const [csvFileName, csvUrl] of csvMap.entries()) {
        const csvBaseName = csvFileName.replace('.mp3', '').toLowerCase()
        if (csvBaseName.includes(baseName) || baseName.includes(csvBaseName)) {
          url = csvUrl
          matchType = 'fuzzy'
          break
        }
      }
    }

    return {
      fileName: path.basename(jsonFile),
      sourceFile,
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
  console.log('🔍 批量上传匹配预览')
  console.log('========================================\n')

  // 1. 查找所有 materials.json 文件
  console.log(`📁 扫描目录: ${CONFIG.linshiDir}`)
  const jsonFiles = findMaterialsJsonFiles(CONFIG.linshiDir)
  console.log(`找到 ${jsonFiles.length} 个 materials.json 文件\n`)

  if (jsonFiles.length === 0) {
    console.log('❌ 没有找到任何 materials.json 文件')
    return
  }

  // 2. 读取 CSV 映射
  console.log(`📋 读取映射文件: ${CONFIG.csvFile}`)
  const csvMap = readCsvMap(CONFIG.csvFile)
  console.log(`CSV 映射记录: ${csvMap.size} 条\n`)

  // 3. 匹配 JSON 与 URL
  console.log('🔍 开始匹配...\n')
  const matches = []

  for (const jsonFile of jsonFiles) {
    const matchResult = matchJsonWithUrl(jsonFile, csvMap)
    matches.push(matchResult)
  }

  // 4. 按频道分组显示
  const byChannel = {}
  for (const match of matches) {
    if (!byChannel[match.channel]) {
      byChannel[match.channel] = []
    }
    byChannel[match.channel].push(match)
  }

  // 5. 显示匹配结果
  for (const [channel, channelMatches] of Object.entries(byChannel)) {
    console.log(`\n📺 频道: ${channel}`)
    console.log('----------------------------------------')

    for (const match of channelMatches) {
      const hasUrl = match.url ? '✅' : '❌'
      const matchInfo = match.matchType === 'exact' ? '精确匹配' :
                       match.matchType === 'without_json' ? '去后缀匹配' :
                       match.matchType === 'fuzzy' ? '模糊匹配' : '未匹配'

      console.log(`\n${hasUrl} ${match.fileName}`)
      console.log(`   source_file: ${match.sourceFile}`)
      console.log(`   匹配类型: ${matchInfo}`)

      if (match.url) {
        console.log(`   OSS URL: ${match.url.substring(0, 80)}...`)
      } else {
        console.log(`   OSS URL: 未匹配`)
      }

      if (match.error) {
        console.log(`   错误: ${match.error}`)
      }
    }
  }

  // 6. 统计信息
  const matched = matches.filter(m => m.url)
  const unmatched = matches.filter(m => !m.url)
  const exactMatches = matches.filter(m => m.matchType === 'exact')
  const fuzzyMatches = matches.filter(m => m.matchType === 'fuzzy')

  console.log('\n\n========================================')
  console.log('📊 匹配统计:')
  console.log(`✅ 已匹配: ${matched.length} 个`)
  console.log(`   - 精确匹配: ${exactMatches.length} 个`)
  console.log(`   - 模糊匹配: ${fuzzyMatches.length} 个`)
  console.log(`❌ 未匹配: ${unmatched.length} 个`)
  console.log(`📈 总计: ${matches.length} 个`)

  if (unmatched.length > 0) {
    console.log('\n❌ 未匹配的文件:')
    for (const match of unmatched) {
      console.log(`   - ${match.fileName}`)
      console.log(`     source_file: ${match.sourceFile}`)
    }
  }

  console.log('\n⚠️  请仔细检查匹配结果')
  console.log('如果匹配结果正确，可以运行完整的上传脚本')
}

// 运行主函数
main()