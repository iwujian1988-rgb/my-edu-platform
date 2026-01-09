/**
 * Excel导入 API
 * POST - 上传并导入Excel文件
 */

import { createClient } from '@/lib/supabase/server'
import { requireAdminForAPI, UnauthorizedError } from '@/lib/admin-auth'
import { logAdminAction } from '@/lib/admin-auth'
import { NextRequest, NextResponse } from 'next/server'
import { parseExcelFile, validateExcelRow, generateErrorExcel } from '@/lib/excel-import'
import type { ExcelImportResult } from '@/types/word'

type Params = Promise<{ bookId: string }>

// 每批处理的单词数量
const BATCH_SIZE = 1000
// 单次上传最大行数
const MAX_ROWS = 100000

/**
 * POST - 上传并导入Excel文件
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    // 验证管理员权限
    const admin = await requireAdminForAPI()

    const { bookId } = await params

    const supabase = await createClient()

    // 检查单词书是否存在
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('*')
      .eq('id', bookId)
      .single()

    if (bookError || !book) {
      return NextResponse.json(
        { error: '单词书不存在' },
        { status: 404 }
      )
    }

    // 解析表单数据
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: '未上传文件' },
        { status: 400 }
      )
    }

    // 验证文件类型
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return NextResponse.json(
        { error: '文件格式不正确，请上传Excel文件（.xlsx或.xls）' },
        { status: 400 }
      )
    }

    // 解析Excel文件
    const rows = await parseExcelFile(file)

    // 检查行数限制
    if (rows.length > MAX_ROWS) {
      return NextResponse.json(
        {
          error: `文件行数超过限制（最多${MAX_ROWS}行）`,
          actualRows: rows.length,
          maxRows: MAX_ROWS
        },
        { status: 400 }
      )
    }

    // 校验所有行
    const errors: any[] = []
    const validRows: any[] = []

    rows.forEach((row, index) => {
      const rowIndex = index + 2 // Excel行号从1开始，表头占1行
      const validationError = validateExcelRow(row, rowIndex)

      if (validationError) {
        errors.push(validationError)
      } else {
        validRows.push({ ...row, rowIndex })
      }
    })

    // 如果所有行都无效，返回错误
    if (validRows.length === 0) {
      return NextResponse.json(
        {
          error: '没有有效的数据行',
          result: {
            total: rows.length,
            imported: 0,
            skipped: rows.length,
            errorReportUrl: null
          }
        },
        { status: 400 }
      )
    }

    // 分批插入有效数据
    // 注意：不再创建"默认章节"，没有章节的单词 chapter_id 直接为 null
    let importedCount = 0
    let skippedCount = 0
    let chaptersCreated = 0

    // 用于追踪已创建的章节，避免重复计数
    const createdChapters = new Set<string>()

    for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
      const batch = validRows.slice(i, i + BATCH_SIZE)

      // 准备批量插入数据
      const wordsToInsert = await Promise.all(
        batch.map(async (row) => {
          // 如果Chapter为空，chapter_id 为 null
          // 如果Chapter不为空，获取或创建章节
          let chapterId: string | null = null

          if (row.chapter) {
            // 标准化章节名称：去除前后空格
            const normalizedChapter = row.chapter.trim()

            // 查找现有章节（使用标准化后的名称）
            const { data: existingChapter } = await supabase
              .from('chapters')
              .select('id')
              .eq('book_id', bookId)
              .eq('title', normalizedChapter)
              .single()

            if (existingChapter) {
              chapterId = existingChapter.id
            } else {
              // 创建新章节（使用标准化后的名称）
              const { data: newChapter } = await supabase
                .from('chapters')
                .insert({
                  book_id: bookId,
                  title: normalizedChapter,
                  word_count: 0
                })
                .select('id')
                .single()

              chapterId = newChapter?.id || null

              // 记录新创建的章节
              if (chapterId && !createdChapters.has(chapterId)) {
                createdChapters.add(chapterId)
                chaptersCreated++
              }
            }
          }

          // 检查是否已存在相同的单词（同一章节内）
          // 注意：Supabase查询null值需要使用.is()而不是.eq()
          const query = supabase
            .from('words')
            .select('id')
            .eq('book_id', bookId)
            .eq('word', row.word)

          if (chapterId === null) {
            query.is('chapter_id', null)
          } else {
            query.eq('chapter_id', chapterId)
          }

          const { data: existingWord } = await query.single()

          if (existingWord) {
            skippedCount++
            return null
          }

          return {
            book_id: bookId,
            chapter_id: chapterId,
            word: row.word,
            phonetic: row.phonetic || null,
            part_of_speech: row.part_of_speech || null,
            definition: row.definition,
            definition_en: row.definition_en || null,
            collocation: row.collocation || null,
            collocation_en: row.collocation_en || null,
            example_sentence: row.example_sentence || null,
            example_sentence_en: row.example_sentence_en || null
          }
        })
      )

      // 过滤掉null值（已存在的单词）
      const validWordsToInsert = wordsToInsert.filter(w => w !== null)

      if (validWordsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('words')
          .insert(validWordsToInsert)

        if (insertError) {
          console.error('Error inserting words batch:', insertError)
          // 继续处理下一批，不中断整个导入
        } else {
          importedCount += validWordsToInsert.length
        }
      }
    }

    // 更新单词书的单词总数
    const { data: allWords } = await supabase
      .from('words')
      .select('id')
      .eq('book_id', bookId)

    await supabase
      .from('books')
      .update({ total_words: allWords?.length || 0 })
      .eq('id', bookId)

    // 更新所有章节的单词数
    const { data: allChapters } = await supabase
      .from('chapters')
      .select('id')

    if (allChapters) {
      for (const chapter of allChapters) {
        const { data: chapterWords } = await supabase
          .from('words')
          .select('id')
          .eq('chapter_id', chapter.id)

        await supabase
          .from('chapters')
          .update({ word_count: chapterWords?.length || 0 })
          .eq('id', chapter.id)
      }
    }

    // 生成错误报告（如果有错误）
    let errorReportUrl = null
    if (errors.length > 0) {
      const errorExcelBuffer = generateErrorExcel(errors)

      // 这里可以将错误报告保存到云存储或临时目录
      // 简化版：直接返回错误列表
      errorReportUrl = '/api/admin/import-errors/' + Date.now()
    }

    // 记录操作日志
    await logAdminAction(
      'import_words_from_excel',
      'word_book',
      bookId,
      {
        file_name: file.name,
        total_rows: rows.length,
        imported: importedCount,
        skipped: skippedCount,
        errors: errors.length
      }
    )

    const result: ExcelImportResult = {
      total: rows.length,
      imported: importedCount,
      skipped: skippedCount,
      chaptersCreated: chaptersCreated,
      errors: errors
    }

    return NextResponse.json({
      success: true,
      message: '导入完成',
      result
    })
  } catch (error: any) {
    console.error('Error in Excel import API:', error)
if (error instanceof UnauthorizedError || error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    return NextResponse.json(
      { error: '服务器错误', details: error.message },
      { status: 500 }
    )
  }
}
