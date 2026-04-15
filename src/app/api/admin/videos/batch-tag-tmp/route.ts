/**
 * 临时批量打标签 API（用完可删）
 *
 * POST /api/admin/videos/batch-tag-tmp
 * 鉴权: apikey header = SUPABASE_SERVICE_ROLE_KEY
 *
 * Body: { assignments: [{ video_url: string, tags: [tagName, tagName] }] }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  // 鉴权
  const apiKey = request.headers.get('apikey')
  if (apiKey !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  const { assignments } = await request.json() as {
    assignments: Array<{ video_url: string; tags: string[] }>
  }

  if (!Array.isArray(assignments) || assignments.length === 0) {
    return NextResponse.json({ error: 'assignments 为空' }, { status: 400 })
  }

  const supabase = await createAdminClient()

  // 1. 获取所有标签 id
  const { data: allTags } = await supabase
    .from('video_tags')
    .select('id, name')

  const tagNameToId = new Map<string, string>()
  for (const t of (allTags || [])) {
    tagNameToId.set(t.name, t.id)
  }

  // 2. 收集所有 video_url，批量查视频
  const urls = [...new Set(assignments.map(a => a.video_url))]
  const { data: videos } = await supabase
    .from('videos')
    .select('id, video_url')
    .in('video_url', urls)

  const urlToId = new Map<string, string>()
  for (const v of (videos || [])) {
    if (v.video_url) urlToId.set(v.video_url, v.id)
  }

  // 3. 构建 tag relations 并插入
  const relations: Array<{ video_id: string; tag_id: string }> = []
  const results: Array<{ url: string; status: string; tags?: string[] }> = []

  for (const assignment of assignments) {
    const videoId = urlToId.get(assignment.video_url)
    if (!videoId) {
      results.push({ url: assignment.video_url, status: 'video not found' })
      continue
    }

    const tagIds: string[] = []
    for (const tagName of assignment.tags) {
      const tagId = tagNameToId.get(tagName)
      if (tagId) {
        tagIds.push(tagId)
        relations.push({ video_id: videoId, tag_id: tagId })
      }
    }

    results.push({
      url: assignment.video_url,
      status: 'ok',
      tags: assignment.tags,
    })
  }

  // 4. 批量插入（忽略重复）
  if (relations.length > 0) {
    const { error: insertError } = await supabase
      .from('video_tag_relations')
      .insert(relations as never[])

    if (insertError) {
      // 可能是重复，尝试逐条插入
      let inserted = 0
      for (const rel of relations) {
        const { error } = await supabase
          .from('video_tag_relations')
          .insert(rel as never)
        if (!error) inserted++
      }
      return NextResponse.json({
        success: true,
        inserted,
        total: relations.length,
        results,
      })
    }
  }

  return NextResponse.json({
    success: true,
    inserted: relations.length,
    total: relations.length,
    results,
  })
}
