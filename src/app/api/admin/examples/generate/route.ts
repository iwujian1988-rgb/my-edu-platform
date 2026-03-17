import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { spawn } from 'child_process'
import path from 'path'

import { supabaseAdminClient } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    const { workers = 10 } = await request.json()

    // 获取需要更新的单词
    const supabase = supabaseAdminClient()

    // 检查是否已有任务在运行
    const { data: existingTask } = await supabase
      .from('admin_tasks')
      .select('*')
      .eq('type', 'generate_examples')
      .eq('status', 'running')
      .single()

    if (existingTask) {
      return NextResponse.json({
        error: 'Task already running',
        task: existingTask
      }, 400)
    }

    // 创建任务记录
    const { data: task, error: taskError } = await supabase
      .from('admin_tasks')
      .insert({
        type: 'generate_examples',
        status: 'running',
        started_at: new Date().toISOString(),
        config: { workers: workers || 10 }
      })
      .select()
      .single()

    if (taskError) {
      return NextResponse.json({ error: 'Failed to create task' }, 500)
    }

    // 后台启动生成进程
    const scriptPath = path.join(process.cwd(), 'scripts', 'generate_examples_v3_parallel.py')

    const child = spawn('python', [
      scriptPath,
      '--all',
      '--workers', String(workers || 10),
      '--no-resume'
      '--server-mode'
      '--task-id', task.id
    ], {
      detached: true,
      stdio: 'ignore',
      stderr: 'ignore'
    })

    // 不等待子进程完成，立即返回
    return NextResponse.json({
      success: true,
      message: 'Task started',
      task: task
    })

  } catch (error) {
    console.error('Generate examples error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
