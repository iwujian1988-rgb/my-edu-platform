const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

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

async function addExtraFields() {
  console.log('\n添加额外字段到words表...\n')

  const fieldsToAdd = [
    {
      name: 'synonyms',
      type: 'JSONB',
      comment: '同义词列表'
    },
    {
      name: 'related_words',
      type: 'JSONB',
      comment: '相关词列表'
    },
    {
      name: 'derived_words',
      type: 'JSONB',
      comment: '派生词列表'
    },
    {
      name: 'memory_method',
      type: 'TEXT',
      comment: '记忆方法'
    }
  ]

  for (const field of fieldsToAdd) {
    console.log(`添加字段: ${field.name} (${field.type})`)

    // 使用Supabase的SQL执行
    const { data, error } = await supabase
      .rpc('exec_sql', {
        sql: `ALTER TABLE words ADD COLUMN IF NOT EXISTS ${field.name} ${field.type};`
      })

    if (error) {
      // 如果exec_sql不存在，直接使用SQL
      console.error(`  ⚠️  需要手动添加字段: ${field.name}`)
      console.log(`  SQL: ALTER TABLE words ADD COLUMN ${field.name} ${field.type};`)
    } else {
      console.log(`  ✅ 成功`)
    }
  }

  console.log('\n✅ 字段添加完成！\n')
}

addExtraFields().catch(console.error)
