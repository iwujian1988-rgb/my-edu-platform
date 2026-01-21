/**
 * 检查themes和scenes表的结构
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function loadEnvFile() {
  try {
    const envPath = join(__dirname, '.env.local')
    const envContent = readFileSync(envPath, 'utf-8')

    const envVars = {}
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=')
      const value = valueParts.join('=').trim()
      const cleanValue = value.replace(/^[\"']|[\"']$/g, '')
      if (key && cleanValue) {
        envVars[key.trim()] = cleanValue
      }
    })

    return envVars
  } catch (error) {
    return {}
  }
}

const env = loadEnvFile()
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

async function checkTables() {
  console.log('🔍 检查数据库表结构...\n')

  try {
    // 1. 检查是否有themes表
    console.log('1️⃣ 检查themes表...')
    const { data: themes, error: themesError } = await supabase
      .from('themes')
      .select('*')
      .limit(1)

    if (themesError) {
      console.log('   ❌ themes表不存在或无法访问:', themesError.message)
    } else {
      console.log('   ✅ themes表存在')
      if (themes && themes.length > 0) {
        console.log('   字段:', Object.keys(themes[0]).join(', '))
        console.log('   示例:', themes[0])
      }
    }

    // 2. 检查是否有scenes表
    console.log('\n2️⃣ 检查scenes表...')
    const { data: scenes, error: scenesError } = await supabase
      .from('scenes')
      .select('*')
      .limit(1)

    if (scenesError) {
      console.log('   ❌ scenes表不存在或无法访问:', scenesError.message)
    } else {
      console.log('   ✅ scenes表存在')
      if (scenes && scenes.length > 0) {
        console.log('   字段:', Object.keys(scenes[0]).join(', '))
        console.log('   示例:', scenes[0])
      }
    }

    // 3. 检查chapters表的theme_id和scene_id实际值
    console.log('\n3️⃣ 检查chapters表的theme_id和scene_id...')
    const { data: chapters, error: chaptersError } = await supabase
      .from('chapters')
      .select('id, title, theme_id, scene_id')
      .limit(5)

    if (chaptersError) {
      console.log('   ❌ 查询失败:', chaptersError.message)
    } else {
      console.log('   ✅ 查询成功')
      chapters.forEach(ch => {
        console.log(`   - ${ch.title}: theme_id=${ch.theme_id}, scene_id=${ch.scene_id}`)
      })
    }

    // 4. 统计情况
    console.log('\n4️⃣ 数据统计...')
    const { count: chaptersCount } = await supabase
      .from('chapters')
      .select('*', { count: 'exact', head: true })

    const { count: chaptersWithTheme } = await supabase
      .from('chapters')
      .select('*', { count: 'exact', head: true })
      .not('theme_id', 'is', null)

    const { count: chaptersWithScene } = await supabase
      .from('chapters')
      .select('*', { count: 'exact', head: true })
      .not('scene_id', 'is', null)

    console.log(`   总章节数: ${chaptersCount}`)
    console.log(`   有theme_id的章节: ${chaptersWithTheme}`)
    console.log(`   有scene_id的章节: ${chaptersWithScene}`)

  } catch (error) {
    console.error('\n❌ 操作失败:', error)
  }
}

checkTables()
