import { NextResponse } from 'next/server'

export async function GET() {
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const expected = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNucnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1ODg1MzgsImV4cCI6MjA4MzE2NDUzOH0.1rUusdU-SyWMYNiiAfjrDtSFlcxlwn4FOv0X8bJC7Sk'

  // 逐字符比较
  const differences = []
  for (let i = 0; i < Math.min(envKey?.length || 0, expected.length); i++) {
    if (envKey?.[i] !== expected[i]) {
      differences.push({
        position: i,
        envChar: envKey?.[i],
        expectedChar: expected[i],
        envCharCode: envKey?.charCodeAt(i),
        expectedCharCode: expected.charCodeAt(i)
      })
    }
  }

  return NextResponse.json({
    envKeyLength: envKey?.length,
    expectedLength: expected.length,
    match: envKey === expected,
    differences: differences.slice(0, 10), // 最多显示10个差异
    envKeyFirst20: envKey?.substring(0, 20),
    envKeyLast20: envKey?.substring(envKey?.length - 20),
    expectedFirst20: expected.substring(0, 20),
    expectedLast20: expected.substring(expected.length - 20),
  })
}
