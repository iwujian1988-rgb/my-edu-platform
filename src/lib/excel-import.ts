/**
 * Excel导入工具函数
 */

import * as XLSX from 'xlsx'
import type { ExcelImportRow, ExcelImportError, ExcelImportResult } from '@/types/word'

/**
 * 从Excel文件中解析数据
 */
export async function parseExcelFile(file: File): Promise<ExcelImportRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = e.target?.result
        if (!data) {
          reject(new Error('文件读取失败'))
          return
        }

        const workbook = XLSX.read(data, { type: 'binary' })

        // 获取第一个工作表
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]

        // 转换为JSON
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, {
          defval: null // 空单元格使用null
        })

        // 映射到ExcelImportRow格式
        const rows: ExcelImportRow[] = jsonData.map((row: any, index: number) => ({
          chapter: row['Chapter'] || row['章节'] || null,
          word: row['Word'] || row['单词'] || '',
          phonetic: row['Phonetic'] || row['音标'] || null,
          part_of_speech: row['Part of Speech'] || row['词性'] || null,
          definition: row['Definition'] || row['中文释义'] || '',
          definition_en: row['Definition EN'] || row['英文释义'] || null,
          collocation: row['Collocation'] || row['搭配（中文）'] || null,
          collocation_en: row['Collocation EN'] || row['搭配（英文）'] || null,
          example_sentence: row['Example Sentence'] || row['例句（中文）'] || null,
          example_sentence_en: row['Example EN'] || row['例句（英文）'] || null
        }))

        resolve(rows)
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => {
      reject(new Error('文件读取失败'))
    }

    reader.readAsBinaryString(file)
  })
}

/**
 * 校验Excel行数据
 */
export function validateExcelRow(row: ExcelImportRow, rowIndex: number): ExcelImportError | null {
  const errors: string[] = []

  // 校验必填字段
  if (!row.word || row.word.trim() === '') {
    errors.push('单词为空（必填字段缺失）')
  }

  if (!row.definition || row.definition.trim() === '') {
    errors.push('中文释义为空（必填字段缺失）')
  }

  if (errors.length > 0) {
    return {
      rowIndex,
      chapter: row.chapter || '(无)',
      word: row.word || '(空)',
      error: errors.join('; ')
    }
  }

  return null
}

/**
 * 生成错误报告Excel
 */
export function generateErrorExcel(errors: ExcelImportError[]): Buffer {
  // 创建工作簿
  const workbook = XLSX.utils.book_new()

  // 准备数据
  const data = errors.map(err => ({
    '行号': err.rowIndex,
    'Chapter': err.chapter,
    'Word': err.word,
    '错误原因': err.error
  }))

  // 创建工作表
  const worksheet = XLSX.utils.json_to_sheet(data)

  // 设置列宽
  worksheet['!cols'] = [
    { wch: 8 },  // 行号
    { wch: 15 }, // Chapter
    { wch: 20 }, // Word
    { wch: 50 }  // 错误原因
  ]

  // 添加工作表到工作簿
  XLSX.utils.book_append_sheet(workbook, worksheet, '导入错误')

  // 生成Buffer
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
}
