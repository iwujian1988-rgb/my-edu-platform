/**
 * 工作流进度更新辅助函数
 *
 * 统一管理视频工作流的 workflow_progress 更新逻辑
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { WorkflowProgress, WorkflowStepStatus } from '@/types/video'
import { DEFAULT_WORKFLOW_PROGRESS } from '@/types/video'

// 步骤名称到索引的映射
export const STEP_INDEX: Record<string, number> = {
  subtitles: 0,
  info: 1,
  translation: 2,
  cards: 3,
  review: 4,
  video: 5,
  publish: 6,
}

// 步骤索引到名称的映射
export const STEP_NAMES: string[] = [
  'subtitles',
  'info',
  'translation',
  'cards',
  'review',
  'video',
  'publish',
]

/**
 * 更新工作流进度
 *
 * @param supabase - Supabase 客户端
 * @param videoId - 视频 ID
 * @param stepName - 当前步骤名称
 * @param status - 步骤状态
 * @param advanceToNext - 是否前进到下一步（默认 true）
 */
export async function updateWorkflowProgress(
  supabase: SupabaseClient,
  videoId: string,
  stepName: string,
  status: WorkflowStepStatus,
  advanceToNext: boolean = true
): Promise<{ success: boolean; error?: string; progress?: WorkflowProgress }> {
  try {
    // 1. 获取当前进度
    const { data: video, error: fetchError } = await supabase
      .from('videos')
      .select('workflow_progress')
      .eq('id', videoId)
      .single()

    if (fetchError) {
      return { success: false, error: `获取工作流进度失败: ${fetchError.message}` }
    }

    const currentProgress: WorkflowProgress = video?.workflow_progress || DEFAULT_WORKFLOW_PROGRESS
    const stepIndex = STEP_INDEX[stepName]

    if (stepIndex === undefined) {
      return { success: false, error: `无效的步骤名称: ${stepName}` }
    }

    // 2. 计算新的进度
    const newProgress: WorkflowProgress = {
      current_step: advanceToNext
        ? Math.min(stepIndex + 1, 6)  // 前进到下一步，最大为 6
        : currentProgress.current_step,
      steps: {
        ...currentProgress.steps,
        [stepName]: status,
      },
    }

    // 3. 更新数据库
    const { error: updateError } = await supabase
      .from('videos')
      .update({ workflow_progress: newProgress })
      .eq('id', videoId)

    if (updateError) {
      return { success: false, error: `更新工作流进度失败: ${updateError.message}` }
    }

    return { success: true, progress: newProgress }
  } catch (err) {
    return {
      success: false,
      error: `更新工作流进度异常: ${err instanceof Error ? err.message : String(err)}`
    }
  }
}

/**
 * 标记步骤为完成并前进到下一步
 */
export async function completeStep(
  supabase: SupabaseClient,
  videoId: string,
  stepName: string
): Promise<{ success: boolean; error?: string; progress?: WorkflowProgress }> {
  return updateWorkflowProgress(supabase, videoId, stepName, 'completed', true)
}

/**
 * 标记步骤为跳过并前进到下一步
 */
export async function skipStep(
  supabase: SupabaseClient,
  videoId: string,
  stepName: string
): Promise<{ success: boolean; error?: string; progress?: WorkflowProgress }> {
  return updateWorkflowProgress(supabase, videoId, stepName, 'skipped', true)
}

/**
 * 标记步骤为进行中（不前进到下一步）
 */
export async function markStepInProgress(
  supabase: SupabaseClient,
  videoId: string,
  stepName: string
): Promise<{ success: boolean; error?: string; progress?: WorkflowProgress }> {
  return updateWorkflowProgress(supabase, videoId, stepName, 'in_progress', false)
}
