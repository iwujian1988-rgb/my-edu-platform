/**
 * 批量合并上传脚本
 *
 * 功能：
 * 1. 读取 linshi 文件夹下的所有 materials.json 文件
 * 2. 从 french-podcasts-upload-map.csv 读取映射关系
 * 3. 根据 source_file 匹配 CSV 中的文件名，获取对应的 OSS URL
 * 4. 调用合并上传 API 上传所有 JSON
 */

import fs from 'fs'
import path from 'path'
import { parse } from 'csv-parse/sync'

const CONFIG = {
  linshiDir: './linshi',
  csvFile: './french-podcasts-upload-map.csv',
  apiEndpoint: 'http://localhost:3001/api/admin/videos/merged-batch-upload',
  adminSession: undefined // 需要设置管理员 session
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
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    })

    // 创建文件名到 OSS URL 的映射
    const urlMap = new Map()
    for (const record of records) {
      if (record['文件名'] && record['OSS URL'] && record['状态'] === '成功') {
        urlMap.set(record['文件名'], record['OSS URL'])
      }
    }

    console.log(`📋 读取 CSV 映射文件: ${urlMap.size} 条有效记录`)
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
      console.log(`⚠️  ${path.basename(jsonFile)} 缺少 source_file 字段`)
      return { jsonFile, jsonData, url: null }
    }

    // 尝试精确匹配
    let url = csvMap.get(sourceFile)

    // 如果没有匹配到，尝试移除 .json 后缀匹配
    if (!url) {
      const nameWithoutJson = sourceFile.replace('.json', '')
      url = csvMap.get(nameWithoutJson)
    }

    // 如果还是没有匹配到，尝试模糊匹配
    if (!url) {
      for (const [csvFileName, csvUrl] of csvMap.entries()) {
        if (csvFileName.includes(sourceFile) || sourceFile.includes(csvFileName)) {
          url = csvUrl
          console.log(`🔗 模糊匹配成功: ${sourceFile} -> ${csvFileName}`)
          break
        }
      }
    }

    if (url) {
      console.log(`✅ 匹配成功: ${sourceFile}`)
    } else {
      console.log(`❌ 未匹配到 URL: ${sourceFile}`)
    }

    return { jsonFile, jsonData, url }
  } catch (error) {
    console.error(`❌ 解析 JSON 文件失败 ${jsonFile}:`, error.message)
    return null
  }
}

/**
 * 调用合并上传 API
 */
async function uploadToApi(jsonData, videoUrl) {
  try {
    const response = await fetch(CONFIG.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 'Cookie': `session=${CONFIG.adminSession}` // 如果需要认证
      },
      body: JSON.stringify({
        merged_json: jsonData,
        video_url: videoUrl || undefined
      })
    })

    const result = await response.json()

    if (response.ok && result.success) {
      return { success: true, data: result.data }
    } else {
      return { success: false, error: result.error || result.data?.errors?.[0]?.error }
    }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 开始批量合并上传...')
  console.log('========================================')

  // 1. 查找所有 materials.json 文件
  console.log(`\n📁 扫描目录: ${CONFIG.linshiDir}`)
  const jsonFiles = findMaterialsJsonFiles(CONFIG.linshiDir)
  console.log(`找到 ${jsonFiles.length} 个 materials.json 文件`)

  if (jsonFiles.length === 0) {
    console.log('❌ 没有找到任何 materials.json 文件')
    return
  }

  // 2. 读取 CSV 映射
  console.log(`\n📋 读取映射文件: ${CONFIG.csvFile}`)
  const csvMap = readCsvMap(CONFIG.csvFile)
  console.log(`CSV 映射记录: ${csvMap.size} 条`)

  // 3. 匹配 JSON 与 URL
  console.log('\n🔍 匹配 JSON 文件与 OSS URL...')
  const uploadTasks = []
  let matchedCount = 0
  let unmatchedCount = 0

  for (const jsonFile of jsonFiles) {
    const matchResult = matchJsonWithUrl(jsonFile, csvMap)
    if (matchResult) {
      uploadTasks.push(matchResult)
      if (matchResult.url) {
        matchedCount++
      } else {
        unmatchedCount++
      }
    }
  }

  console.log(`\n匹配结果:`)
  console.log(`✅ 成功匹配: ${matchedCount} 个`)
  console.log(`❌ 未匹配: ${unmatchedCount} 个`)

  // 4. 确认上传
  console.log('\n⚠️  即将上传确认:')
  console.log(`- 总计: ${uploadTasks.length} 个文件`)
  console.log(`- 有 URL: ${matchedCount} 个`)
  console.log(`- 无 URL: ${unmatchedCount} 个`)

  console.log('\n📋 匹配详情预览:')
  console.log('----------------------------------------')
  for (const task of uploadTasks.slice(0, 5)) {
    const fileName = path.basename(task.jsonFile)
    const sourceFile = task.jsonData.source_file
    const hasUrl = task.url ? '✅' : '❌'
    console.log(`${hasUrl} ${sourceFile} -> ${task.url ? '已匹配' : '未匹配'}`)
  }

  if (uploadTasks.length > 5) {
    console.log(`... 还有 ${uploadTasks.length - 5} 个文件`)
  }
  console.log('----------------------------------------')

  // 询问用户确认
  console.log('\n🤔 请确认匹配结果是否正确？')
  console.log('输入 "yes" 继续上传，其他任何输入取消:')

  // 由于是脚本，我们需要手动处理用户输入
  // 在实际运行时，你可以取消注释下面的代码
  /*
  const readline = require('readline')
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  rl.question('', (answer) => {
    rl.close()
    if (answer.toLowerCase() !== 'yes') {
      console.log('❌ 用户取消上传')
      return
    }
    */

    // 5. 开始批量上传
    console.log('\n🚀 开始批量上传...')
    console.log('========================================')

    let successCount = 0
    let failCount = 0
    const results = []

    for (let i = 0; i < uploadTasks.length; i++) {
      const task = uploadTasks[i]
      const fileName = path.basename(task.jsonFile)
      const progress = `[${i + 1}/${uploadTasks.length}]`

      console.log(`\n${progress} 处理: ${fileName}`)

      const uploadResult = await uploadToApi(task.jsonData, task.url)

      if (uploadResult.success) {
        successCount++
        console.log(`✅ 成功: 创建了 ${uploadResult.data.created_count} 个视频`)
        results.push({ file: fileName, success: true, data: uploadResult.data })
      } else {
        failCount++
        console.log(`❌ 失败: ${uploadResult.error}`)
        results.push({ file: fileName, success: false, error: uploadResult.error })
      }

      // 添加延迟避免请求过快
      if (i < uploadTasks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    // 6. 输出总结
    console.log('\n========================================')
    console.log('📊 上传完成总结:')
    console.log(`✅ 成功: ${successCount} 个`)
    console.log(`❌ 失败: ${failCount} 个`)
    console.log(`📈 总计: ${uploadTasks.length} 个`)

    if (failCount > 0) {
      console.log('\n❌ 失败文件列表:')
      results
        .filter(r => !r.success)
        .forEach(r => console.log(`  - ${r.file}: ${r.error}`))
    }

    // 保存结果到文件
    const reportPath = './linshi/batch_upload_report.json'
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2))
    console.log(`\n📄 详细报告已保存到: ${reportPath}`)
  // }) // 结束 readline 询问
}

// 运行主函数
main().catch(console.error)