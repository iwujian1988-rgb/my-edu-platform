/**
 * Local smoke checks for the MAXCLASS + videos merge.
 *
 * Usage:
 *   npm run maxclass:smoke
 *   BASE_URL=http://localhost:3001 npm run maxclass:smoke
 */

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const BASE_URL = process.env.BASE_URL || 'http://localhost:3001'
const LOCAL_MEDIA_PATTERN = /^\/(?:videos|content\/(?:videos|subtitles|materials))\//
const DATA_FILES = [
  'src/data/course-30days-listening.json',
  'src/data/course-import.json',
  'src/data/sef-import.json',
  'src/data/parcours-a1-real-french.json',
]

let failureCount = 0

function pass(message) {
  console.log(`OK: ${message}`)
}

function fail(message) {
  failureCount += 1
  console.error(`FAIL: ${message}`)
}

function readText(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8')
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath).replace(/^\uFEFF/, ''))
}

function walk(value, visitor) {
  if (Array.isArray(value)) {
    value.forEach(item => walk(item, visitor))
    return
  }

  if (value && typeof value === 'object') {
    Object.values(value).forEach(item => walk(item, visitor))
    return
  }

  visitor(value)
}

function assertTextIncludes(relativePath, pattern, label) {
  const text = readText(relativePath)
  if (pattern.test(text)) pass(label)
  else fail(`${label} missing in ${relativePath}`)
}

function assertAllTextIncludes(checks) {
  for (const check of checks) {
    assertTextIncludes(check.file, check.pattern, check.label)
  }
}

function checkStaticMergeInvariants() {
  assertTextIncludes(
    'src/app/videos/pageClient.tsx',
    /function MaxClassEntryCard\(\)[\s\S]+href="\/parcours"/,
    'videos homepage has MAXCLASS entry',
  )
  assertTextIncludes(
    'src/app/videos/pageClient.tsx',
    /language === 'all' \|\| language === FRENCH_LANGUAGE/,
    'MAXCLASS entry is visible for all and French filters',
  )
  assertTextIncludes(
    'src/lib/maxclass-access.ts',
    /hasFrenchVideoAccess/,
    'MAXCLASS access helper exists',
  )
  assertTextIncludes(
    'src/components/video/layout/VideoLayout.tsx',
    /继承全局主题和 MAXCLASS skin/,
    'videos layout inherits MAXCLASS skin',
  )
  assertTextIncludes(
    'src/components/video/layout/VideoLayout.tsx',
    /data-video-surface="true"/,
    'videos layout exposes MAXCLASS skin surface',
  )
  assertTextIncludes(
    'src/app/maxclass-skin.css',
    /\[data-video-surface="true"\]/,
    'MAXCLASS skin targets videos surface',
  )
  assertTextIncludes(
    'src/data/maxclass/productLinks.ts',
    /maxTube:\s*'\/videos'/,
    'MAXTUBE product link points to internal videos',
  )
  assertTextIncludes(
    'src/app/maxtube/page.tsx',
    /redirect\('\/videos\?language=fr'\)/,
    'legacy /maxtube route redirects to French videos',
  )
  assertTextIncludes(
    'src/lib/parcours/server.ts',
    /getParcoursCourse/,
    'parcours server adapter exists',
  )
  assertTextIncludes(
    'src/data/parcours-mock.ts',
    /getManifestCourses\(\)/,
    'parcours courses are sourced from MAXCLASS content manifest',
  )
  assertTextIncludes(
    'src/data/maxclass/contentManifest.ts',
    /course-30days-listening\.json/,
    'MAXCLASS 30 days listening course is registered in content manifest',
  )
  assertTextIncludes(
    'maxclass-parcours-import.mjs',
    /course-30days-listening\.json/,
    'MAXCLASS import includes 30 days listening course',
  )

  const videoLayout = readText('src/components/video/layout/VideoLayout.tsx')
  if (!/LIGHT_MODE_VARS|MutationObserver/.test(videoLayout)) {
    pass('videos layout no longer forces light mode')
  } else {
    fail('videos layout still contains light-mode forcing code')
  }
}

function checkAccessContract() {
  assertAllTextIncludes([
    {
      file: 'src/lib/maxclass-access.ts',
      pattern: /select\('feature_permissions, language_packages, package_ids, permission_expires_at'\)/,
      label: 'MAXCLASS access reads videos permission fields',
    },
    {
      file: 'src/lib/maxclass-access.ts',
      pattern: /feature_permissions[\s\S]+includes\(permission\)/,
      label: 'MAXCLASS access requires video feature permission',
    },
    {
      file: 'src/lib/maxclass-access.ts',
      pattern: /languagePackages\.includes\(FRENCH_LANGUAGE\)[\s\S]+languagePackages\.includes\('\*'\)/,
      label: 'MAXCLASS access requires French language package',
    },
    {
      file: 'src/lib/maxclass-access.ts',
      pattern: /permission_expires_at[\s\S]+new Date\(expiresAt\) > new Date\(\)/,
      label: 'MAXCLASS access respects permission expiry',
    },
    {
      file: 'src/lib/maxclass-access.ts',
      pattern: /\.from\('videos'\)[\s\S]+\.eq\('status', PUBLISHED_STATUS\)[\s\S]+\.eq\('language', FRENCH_LANGUAGE\)[\s\S]+\.overlaps\('package_ids', packageIds\)/,
      label: 'MAXCLASS access falls back to French video package overlap',
    },
    {
      file: 'src/app/parcours/page.tsx',
      pattern: /hasFrenchVideoAccess\(user\.id\)[\s\S]+redirect\('\/videos\?language=fr'\)/,
      label: 'parcours hub rejects users without French videos access',
    },
    {
      file: 'src/app/parcours/[courseSlug]/page.tsx',
      pattern: /hasFrenchVideoAccess\(user\.id\)[\s\S]+redirect\('\/videos\?language=fr'\)/,
      label: 'parcours course rejects users without French videos access',
    },
    {
      file: 'src/app/parcours/[courseSlug]/module/[moduleSlug]/page.tsx',
      pattern: /hasFrenchVideoAccess\(user\.id\)[\s\S]+redirect\('\/videos\?language=fr'\)/,
      label: 'parcours module rejects users without French videos access',
    },
  ])
}

function checkMediaRefs() {
  const unresolved = []
  for (const relativePath of DATA_FILES) {
    if (!fs.existsSync(path.join(ROOT, relativePath))) continue
    const data = readJson(relativePath)
    walk(data, value => {
      if (typeof value !== 'string') return
      if (LOCAL_MEDIA_PATTERN.test(value) || value === '#maxtube-placeholder') {
        unresolved.push({ file: relativePath, value })
      }
    })
  }

  if (unresolved.length === 0) {
    pass('MAXCLASS media refs are OSS/public URLs')
  } else {
    fail(`unresolved local media refs: ${JSON.stringify(unresolved.slice(0, 5))}`)
  }
}

function checkClassVideoBlocks() {
  const course = readJson('src/data/course-30days-listening.json')
  const videoBlocks = []
  for (const mod of course.modules || []) {
    for (const lesson of mod.lessons || []) {
      for (const block of lesson.blocks || []) {
        if (block?.type === 'video') {
          videoBlocks.push(block)
        }
      }
    }
  }

  if (videoBlocks.length === 0) {
    fail('30 days listening course has no video blocks')
    return
  }

  const unresolvedVideos = videoBlocks.filter(block => {
    const directUrl = typeof block.videoUrl === 'string' ? block.videoUrl : ''
    const assetUrl = typeof block.asset?.videoUrl === 'string' ? block.asset.videoUrl : ''
    return ![directUrl, assetUrl].some(url => url.startsWith('https://'))
  })

  if (unresolvedVideos.length === 0) {
    pass(`30 days listening course exposes ${videoBlocks.length} OSS video blocks`)
  } else {
    fail(`30 days listening video blocks missing OSS URLs: ${JSON.stringify(unresolvedVideos.map(block => block.id))}`)
  }
}

async function probeRoute(pathname, expectedLoginRedirect) {
  try {
    const response = await fetch(`${BASE_URL}${pathname}`, { redirect: 'manual' })
    const location = response.headers.get('location') || ''
    if (response.status === 200) {
      pass(`${pathname} responds 200`)
      return
    }

    if (
      expectedLoginRedirect
      && [301, 302, 303, 307, 308].includes(response.status)
      && location.includes('/login')
    ) {
      pass(`${pathname} redirects unauthenticated users to login`)
      return
    }

    fail(`${pathname} unexpected response: ${response.status} ${location}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    fail(`${pathname} probe failed against ${BASE_URL}: ${message}`)
  }
}

async function probeRedirect(pathname, expectedLocation, label) {
  try {
    const response = await fetch(`${BASE_URL}${pathname}`, { redirect: 'manual' })
    const location = response.headers.get('location') || ''
    if (
      [301, 302, 303, 307, 308].includes(response.status)
      && location === expectedLocation
    ) {
      pass(label)
      return
    }

    fail(`${pathname} expected redirect to ${expectedLocation}, got ${response.status} ${location}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    fail(`${pathname} redirect probe failed against ${BASE_URL}: ${message}`)
  }
}

async function main() {
  checkStaticMergeInvariants()
  checkAccessContract()
  checkMediaRefs()
  checkClassVideoBlocks()
  await probeRedirect('/maxtube', '/videos?language=fr', '/maxtube redirects to French videos')
  await probeRoute('/videos', true)
  await probeRoute('/parcours/a1-real-french', true)
  await probeRoute('/parcours/30days-listening', true)

  if (failureCount > 0) {
    process.exitCode = 1
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
