/**
 * 批量上传执行脚本 - 每次上传5个文件
 */

import fs from 'fs'
import path from 'path'

const CONFIG = {
  linshiDir: './linshi',
  csvFile: './french-podcasts-upload-map.csv',
  apiEndpoint: 'http://localhost:3001/api/admin/videos/merged-batch-upload',
  batchSize: 5, // 每次上传5个
  delayBetweenBatches: 2000, // 批次间延迟2秒
  delayBetweenFiles: 500 // 文件间延迟0.5秒
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
 * 匹配 JSON 文件与 OSS URL
 */
function matchJsonWithUrl(jsonFile, csvMap) {
  try {
    const content = fs.readFileSync(jsonFile, 'utf-8')
    const jsonData = JSON.parse(content)
    const sourceFile = jsonData.source_file

    if (!sourceFile) {
      return null // 跳过没有source_file的文件
    }

    // 将 .json 替换为 .mp3 匹配
    const mp3FileName = sourceFile.replace('.json', '.mp3')
    const url = csvMap.get(mp3FileName)

    if (!url) {
      return null // 跳过没有匹配到URL的文件
    }

    // 确保 unit_info 中有 creator 字段
    if (jsonData.materials) {
      for (const unitKey of Object.keys(jsonData.materials)) {
        const unit = jsonData.materials[unitKey]
        if (unit.unit_info && !unit.unit_info.creator) {
          // 使用顶层的 channel 作为 creator
          unit.unit_info.creator = jsonData.channel || 'unknown'
        }
      }
    }

    return {
      jsonFile,
      jsonData,
      url,
      fileName: path.basename(jsonFile),
      sourceFile,
      channel: jsonData.channel || 'unknown'
    }
  } catch (error) {
    console.error(`❌ 解析文件失败 ${jsonFile}:`, error.message)
    return null
  }
}

/**
 * 调用合并上传 API
 */
async function uploadToApi(task) {
  try {
    const response = await fetch(CONFIG.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'
      },
      body: JSON.stringify({
        merged_json: task.jsonData,
        video_url: task.url
      })
    })

    const result = await response.json()

    if (response.ok && result.success) {
      return {
        success: true,
        fileName: task.fileName,
        sourceFile: task.sourceFile,
        channel: task.channel,
        data: result.data
      }
    } else {
      return {
        success: false,
        fileName: task.fileName,
        sourceFile: task.sourceFile,
        channel: task.channel,
        error: result.error || result.data?.errors?.[0]?.error
      }
    }
  } catch (error) {
    return {
      success: false,
      fileName: task.fileName,
      sourceFile: task.sourceFile,
      channel: task.channel,
      error: error.message
    }
  }
}

/**
 * 延迟函数
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 开始批量上传...')
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
  console.log('🔍 匹配 JSON 文件与 OSS URL...')
  const uploadTasks = []

  for (const jsonFile of jsonFiles) {
    const matchResult = matchJsonWithUrl(jsonFile, csvMap)
    if (matchResult) {
      uploadTasks.push(matchResult)
    }
  }

  console.log(`✅ 成功匹配: ${uploadTasks.length} 个文件`)
  console.log(`❌ 跳过: ${jsonFiles.length - uploadTasks.length} 个文件\n`)

  if (uploadTasks.length === 0) {
    console.log('❌ 没有可上传的文件')
    return
  }

  // 4. 按频道分组
  const byChannel = {}
  for (const task of uploadTasks) {
    if (!byChannel[task.channel]) {
      byChannel[task.channel] = []
    }
    byChannel[task.channel].push(task)
  }

  console.log('📺 各频道文件数量:')
  for (const [channel, tasks] of Object.entries(byChannel)) {
    console.log(`  - ${channel}: ${tasks.length} 个`)
  }
  console.log('')

  // 5. 分批上传
  console.log('🚀 开始测试上传（仅前5个文件）...')
  console.log('========================================\n')

  // 只取前5个文件进行测试
  const testTasks = uploadTasks.slice(0, 5)
  console.log(`📋 测试文件数量: ${testTasks.length} 个\n`)

  let totalSuccess = 0
  let totalFailed = 0
  const allResults = []

  // 分批上传（测试版本）
  let batchNum = 0
  const batch = testTasks
  console.log(`📦 测试批次 (${batch.length} 个文件)\n`)

  for (let j = 0; j < batch.length; j++) {
    const task = batch[j]
    const progress = `[${j + 1}/${batch.length}]`

    console.log(`  ${progress} 上传: ${task.fileName}`)
    console.log(`  频道: ${task.channel}`)
    console.log(`  音频URL: ${task.url.substring(0, 60)}...`)

    const result = await uploadToApi(task)

    if (result.success) {
      totalSuccess++
      console.log(`    ✅ 成功: 创建了 ${result.data.created_count} 个视频`)
    } else {
      totalFailed++
      console.log(`    ❌ 失败: ${result.error}`)
    }

    allResults.push(result)

    // 文件间延迟
    if (j < batch.length - 1) {
      await delay(CONFIG.delayBetweenFiles)
    }
  }

  // 6. 输出总结
  console.log('\n========================================')
  console.log('📊 测试上传完成总结:')
  console.log(`✅ 成功: ${totalSuccess} 个`)
  console.log(`❌ 失败: ${totalFailed} 个`)
  console.log(`📈 总计: ${testTasks.length} 个`)
  console.log(`\n💡 如果测试成功，将上传剩余 ${uploadTasks.length - testTasks.length} 个文件`)

  if (totalFailed > 0) {
    console.log('\n❌ 失败文件列表:')
    allResults
      .filter(r => !r.success)
      .forEach(r => {
        console.log(`  - ${r.fileName} (${r.channel})`)
        console.log(`    错误: ${r.error}`)
      })
  }

  // 7. 保存详细报告
  const reportData = {
    timestamp: new Date().toISOString(),
    summary: {
      total: uploadTasks.length,
      success: totalSuccess,
      failed: totalFailed
    },
    results: allResults
  }

  const reportPath = './linshi/batch_upload_report.json'
  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2))
  console.log(`\n📄 详细报告已保存到: ${reportPath}`)

  console.log('\n🎉 批量上传完成！')
}

// 运行主函数
main().catch(console.error)