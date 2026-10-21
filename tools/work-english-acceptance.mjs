import {chromium, expect} from '@playwright/test'
import {config} from 'dotenv'
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {spawn} from 'node:child_process'
import assert from 'node:assert/strict'

config({path:'.env.local',quiet:true})
const root='linshi/work-english-acceptance'
const fixtures=JSON.parse(await readFile(`${root}/fixtures.private.json`,'utf8'))
const base=process.env.WORK_ENGLISH_TEST_URL||'http://localhost:3001'
const reports=[]
await mkdir(`${root}/screenshots`,{recursive:true})
const contexts=[]
const errors=[]
const sessions={}
let server
async function fetchRetry(url,options,attempts=4){let last;for(let attempt=0;attempt<attempts;attempt++){try{return await fetch(url,options)}catch(error){last=error;if(attempt+1<attempts)await new Promise(resolve=>setTimeout(resolve,500*(attempt+1)))}}throw last}
for(const [role,account] of Object.entries(fixtures.users)) {
  const response=await fetchRetry(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,'content-type':'application/json'},body:JSON.stringify({email:`${account.phone}@phone.xiaoyu.com`,password:account.password})})
  const session=await response.json()
  if(!response.ok) throw new Error(`Sign in fixture ${role}: ${session.msg||session.message||response.status}`)
  sessions[role]=session
}
async function check(name,fn){const start=Date.now();try{await fn();reports.push({name,status:'PASS',ms:Date.now()-start});process.stdout.write(`PASS ${name}\n`)}catch(error){reports.push({name,status:'FAIL',error:error.message,ms:Date.now()-start});process.stdout.write(`FAIL ${name}: ${error.message.slice(0,700)}\n`);throw error}}
await check('数据库拒绝用户自行添加付费套餐',async()=>{
  const response=await fetchRetry(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/users?id=eq.${encodeURIComponent(fixtures.users.outsider.id)}`,{method:'PATCH',headers:{apikey:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,authorization:`Bearer ${sessions.outsider.access_token}`,'content-type':'application/json',prefer:'return=minimal'},body:JSON.stringify({package_ids:[fixtures.packageId]})})
  assert.ok(!response.ok,`Direct profile update unexpectedly returned ${response.status}`)
})
if(base==='http://localhost:3001') {
  try { await fetch(`${base}/work-english`,{signal:AbortSignal.timeout(1500)}) }
  catch {
    server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--webpack','-p','3001'],{cwd:process.cwd(),stdio:'inherit',windowsHide:true})
    const deadline=Date.now()+90_000
    while(Date.now()<deadline) {
      try { const response=await fetch(`${base}/work-english`,{signal:AbortSignal.timeout(2500)});if(response.status<500)break }
      catch {}
      await new Promise(resolve=>setTimeout(resolve,1000))
    }
    if(Date.now()>=deadline) throw new Error('Local Work English test server did not start within 90 seconds')
  }
}
const browser=await chromium.launch({channel:'chrome',headless:true})
async function context(role,options={}) {
  const c=await browser.newContext({baseURL:base,...options});contexts.push(c)
  if(role){const ref=new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0];await c.addCookies([{name:`sb-${ref}-auth-token`,value:`base64-${Buffer.from(JSON.stringify(sessions[role])).toString('base64url')}`,url:base,sameSite:'Lax'}])}
  return c
}

async function saved(page){await expect(page.locator('#savedStatus')).toContainText('已保存到账号',{timeout:20000})}
try {
  const guest=await context();const catalog=await context('buyer');const guestPage=await catalog.newPage()
  await check('已登录目录、搜索与手机宽度',async()=>{
    await guestPage.goto('/work-english');await expect(guestPage.getByRole('heading',{level:1})).toContainText('跟着谷歌')
    await expect(guestPage.locator('.we-lesson-card')).toHaveCount(12)
    await expect(guestPage.locator('.we-catalog-count')).toContainText('共 100 篇')
    await guestPage.getByRole('textbox',{name:'搜索公司、主题或文章'}).fill('不存在的场景');await expect(guestPage.locator('.we-list-empty')).toBeVisible()
    await guestPage.getByRole('textbox',{name:'搜索公司、主题或文章'}).fill('')
    await guestPage.screenshot({path:`${root}/screenshots/01-library-desktop.png`,fullPage:true})
    await guestPage.setViewportSize({width:390,height:844})
    assert.equal(await guestPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
    await guestPage.screenshot({path:`${root}/screenshots/02-library-mobile.png`,fullPage:true})
  })
  await check('游客课程、音频、学习记录均受服务端保护',async()=>{
    const chapter=await guest.request.get('/work-english/lessons/001',{maxRedirects:0})
    assert.equal(chapter.status(),307);assert.match(chapter.headers().location,/login\?redirect=/)
    assert.equal((await guest.request.get('/work-english/lessons/001/media/original.mp3')).status(),401)
    assert.equal((await guest.request.get('/api/work-english/progress/001')).status(),401)
  })
  for(const role of ['outsider','expired','banned']) await check(`${role} 无法访问套餐内容和记录`,async()=>{
    const c=await context(role)
    if(role==='outsider') {
      const page=await c.newPage();await page.goto('/work-english')
      await expect(page.getByText('您未开通权限，请联系管理员！',{exact:true})).toBeVisible()
      await expect(page.locator('.we-lesson-card')).toHaveCount(0)
      await expect(page.getByRole('heading',{level:1})).toHaveCount(0)
    }
    assert.equal((await c.request.get('/work-english/lessons/001',{maxRedirects:0})).status(),307)
    assert.equal((await c.request.get('/work-english/lessons/001/media/original.mp3')).status(),403)
    assert.equal((await c.request.get('/api/work-english/progress/001')).status(),403)
  })
  const buyer=await context();const page=await buyer.newPage();page.on('pageerror',error=>errors.push(error.message))
  await check('真实登录表单直接返回第001期',async()=>{
    await page.goto('/login?redirect=%2Fwork-english%2Flessons%2F001')
    assert.match(await page.getByRole('link',{name:'立即注册'}).getAttribute('href'),/redirect=/)
    await page.locator('input[type=tel]').fill(fixtures.users.buyer.phone)
    await page.locator('input[type=password]').fill(fixtures.users.buyer.password)
    await page.locator('button[type=submit]').click()
    await page.waitForURL('**/work-english/lessons/001',{timeout:60000})
    await expect(page.locator('#sourceSheet')).toBeVisible()
  })
  await check('原文先读、中文与批注开关、桌面UI',async()=>{
    assert.equal(await page.locator('.section').first().getAttribute('id'),'reading')
    await expect(page.locator('#translation')).toBeHidden()
    await page.locator('#translationBtn').click();await expect(page.locator('#translation')).toBeVisible();await page.locator('#translationBtn').click()
    await page.locator('#annotateReadBtn').click();await expect(page.locator('#sourceSheet')).toHaveClass(/annotated-mode/)
    await page.locator('#plainReadBtn').click()
    await page.screenshot({path:`${root}/screenshots/03-lesson-desktop.png`,fullPage:false})
  })
  await check('音频存在、真实播放、倍速和循环',async()=>{
    const clips=await page.locator('#lessonData').textContent();const data=JSON.parse(clips)
    assert.ok(Object.keys(data.audio).length>0)
    for(const clip of Object.values(data.audio)){const response=await buyer.request.get(clip.src,{headers:{Range:'bytes=0-31'}});assert.equal(response.status(),206);assert.equal((await response.body()).length,32)}
    await page.locator('[data-play=original]').first().click()
    await expect.poll(()=>page.locator('#lessonAudio').evaluate(a=>a.currentTime),{timeout:20000}).toBeGreaterThan(0)
    await page.locator('#speedSelect').selectOption('0.75');await page.locator('#loopClip').check()
    assert.equal(await page.locator('#lessonAudio').evaluate(a=>a.playbackRate===.75&&a.loop),true)
    await page.locator('#miniStop').click()
  })
  await check('词汇收藏、填空判题、错题重做',async()=>{
    const word=page.locator('.save-word[data-word=key-findings]')
    if(await word.getAttribute('aria-pressed')!=='true')await word.click()
    await page.locator('#c1').fill('wrong');await page.locator('#c2').fill('benefit');await page.locator('#c3').fill('review');await page.locator('#checkCloze').click()
    await expect(page.locator('#c1Feedback')).toHaveAttribute('data-result','retry')
    await expect(page.locator('#reviewQueue')).toContainText('locate')
    await page.locator('#c1').fill('locate');await page.locator('#checkCloze').click()
    await expect(page.locator('#c1Feedback')).toHaveAttribute('data-result','correct')
    await saved(page)
  })
  await check('听写、选择题、仿写、自查和复习闪卡',async()=>{
    await page.locator('#d1Input').fill('Be kind.');await page.locator('#d1Check').click();await expect(page.locator('#d1Feedback')).toHaveAttribute('data-result','correct')
    await page.locator('#d2Input').fill('Could we put the key findings on the first page?');await page.locator('#d2Check').click();await expect(page.locator('#d2Feedback')).toHaveAttribute('data-result','correct')
    await page.locator('input[name=quiz][value=b]').check();await page.locator('#checkBtn').click();await expect(page.locator('#quizFeedback')).toContainText('选对了')
    await page.locator('#warmupInput').fill('Could we highlight the key findings?')
    await page.locator('#practiceInput').fill('Could we put the conclusion first so the audience can follow the presentation?')
    await page.locator('#self1').check();await page.locator('#compareWriting').click();await expect(page.locator('#beforeWriting')).toContainText('Could we highlight')
    await page.locator('#reviewStart').click();await page.locator('#reviewReveal').click();await page.locator('#reviewRemember').click()
    await saved(page)
  })
  await check('刷新与第二设备恢复，另一账号隔离',async()=>{
    await page.reload();await expect(page.locator('#practiceInput')).toHaveValue(/Could we put/)
    await expect(page.locator('#self1')).toBeChecked()
    const mobile=await context('buyer',{viewport:{width:390,height:844},isMobile:true,hasTouch:true});const mobilePage=await mobile.newPage()
    await mobilePage.goto('/work-english/lessons/001');await expect(mobilePage.locator('#warmupInput')).toHaveValue('Could we highlight the key findings?')
    assert.equal(await mobilePage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
    await mobilePage.screenshot({path:`${root}/screenshots/04-lesson-mobile.png`,fullPage:false})
    const other=await context('otherBuyer');const response=await other.request.get('/api/work-english/progress/001');const otherState=await response.json()
    assert.equal(otherState.state.warmupInput,undefined)
    await mobile.close()
  })
  await check('保存失败可重试，离线不伪报成功',async()=>{
    await page.route('**/api/work-english/progress/001',route=>route.request().method()==='PUT'?route.abort():route.continue())
    await page.locator('#warmupInput').fill('Network retry exercise')
    await expect(page.locator('#savedStatus')).toContainText('保存失败',{timeout:15000})
    await page.unroute('**/api/work-english/progress/001');await page.locator('#retrySave').click();await saved(page)
  })
  await check('旧页面不会覆盖另一页面的新记录',async()=>{
    const stale=await buyer.newPage();await stale.goto('/work-english/lessons/001')
    await page.locator('#warmupInput').fill('The newest saved draft');await saved(page)
    await stale.locator('#warmupInput').fill('Stale draft from second tab')
    await expect(stale.locator('#savedStatus')).toContainText('另一页面已更新',{timeout:20000})
    const result=await buyer.request.get('/api/work-english/progress/001');assert.equal((await result.json()).state.warmupInput,'The newest saved draft')
    await stale.close({runBeforeUnload:false})
  })
  await check('输出导出、完成状态与目录同步',async()=>{
    const download=page.waitForEvent('download');await page.locator('#exportNotes').click();assert.match((await download).suggestedFilename(),/学习记录/)
    if(await page.locator('#completeBtn').getAttribute('aria-pressed')!=='true')await page.locator('#completeBtn').click()
    await saved(page)
    await page.goto('/work-english');await expect(page.locator('.we-lesson-card[href^="/work-english/lessons/001"] .we-lesson-card-footer')).toContainText('已完成')
    await page.screenshot({path:`${root}/screenshots/05-library-signed-in.png`,fullPage:true})
  })
  await check('已登录访问登录页仍回到产品',async()=>{
    await page.goto('/login?redirect=%2Fwork-english%2Flessons%2F001');await page.waitForURL('**/work-english/lessons/001')
  })
  await check('退出登录清除服务端会话',async()=>{
    await page.goto('/work-english');await page.getByRole('link',{name:/退出登录/}).click();await page.waitForURL('**/login')
    await page.goto('/work-english');await page.waitForURL('**/login?redirect=%2Fwork-english')
  })
  await check('输入边界、跨站写入和版本冲突',async()=>{
    const current=await (await buyer.request.get('/api/work-english/progress/001')).json()
    const make=(data,origin=base)=>buyer.request.put('/api/work-english/progress/001',{headers:{Origin:origin},data})
    assert.equal((await make({version:1,revision:current.revision,state:{}},'https://example.com')).status(),403)
    assert.equal((await make({version:1,revision:current.revision,state:{warmupInput:'x'.repeat(5001)}})).status(),400)
    assert.equal((await make({version:1,revision:0,state:{}})).status(),409)
    assert.equal((await buyer.request.get('/work-english/lessons/999')).status(),404)
    assert.equal((await buyer.request.get('/work-english/lessons/001/media/unknown.mp3')).status(),404)
  })
  await check('无运行时JavaScript错误',async()=>assert.deepEqual(errors,[]))
} finally {
  await writeFile(`${root}/acceptance-report.json`,JSON.stringify({at:new Date().toISOString(),base,reports,errors},null,2))
  await browser.close()
  server?.kill()
}
