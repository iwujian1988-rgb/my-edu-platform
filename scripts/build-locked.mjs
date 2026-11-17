import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const nextCli = require.resolve('next/dist/bin/next')
const args = [nextCli, 'build', ...process.argv.slice(2)]
const isLinux = process.platform === 'linux'
const lockPath = '/var/lock/maxnote-build.lock'

// All server checkouts share this lock so separate deploys cannot exhaust RAM together.
if (isLinux) process.stderr.write(`[build] Waiting for ${lockPath} (up to 30 minutes)\n`)
const child = spawn(isLinux ? 'flock' : process.execPath, isLinux
  ? ['--no-fork', '--wait', '1800', lockPath, process.execPath, ...args]
  : args, { stdio: 'inherit', env: process.env })

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal))
}
child.on('error', error => {
  process.stderr.write(`[build] ${error.message}\n`)
  process.exitCode = 1
})
child.on('exit', (code, signal) => {
  process.exitCode = code ?? (signal === 'SIGINT' ? 130 : 143)
})
