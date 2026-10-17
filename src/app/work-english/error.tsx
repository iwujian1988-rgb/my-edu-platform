'use client'
export default function WorkEnglishError({reset}:{reset:()=>void}) {
  return <main style={{padding:40,maxWidth:650,margin:'auto'}}><h1>学习库暂时无法载入</h1><p>请检查连接后重试，已有学习记录不会受影响。</p><button onClick={reset}>重新载入</button></main>
}
