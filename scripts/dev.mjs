import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const API_PORT = process.env.API_PORT || '8080'
const WEB_PORT = process.env.WEB_PORT || '5173'

function loadEnv(file) {
  const env = {}
  try {
    const raw = readFileSync(file, 'utf8')
    for (const line of raw.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const idx = trimmed.indexOf('=')
      if (idx === -1) continue
      const key = trimmed.slice(0, idx).trim()
      let value = trimmed.slice(idx + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      env[key] = value
    }
  } catch {
    // no env file — rely on process env
  }
  return env
}

const envFile = path.join(ROOT, '.env.local')
const fileEnv = loadEnv(envFile)
const baseEnv = { ...process.env, ...fileEnv }

const children = []

function start(name, args, extraEnv) {
  const child = spawn('pnpm', args, {
    cwd: ROOT,
    env: { ...baseEnv, ...extraEnv },
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
  children.push(child)
  child.on('exit', (code) => {
    console.log(`[dev] ${name} saiu (código ${code})`)
    stop()
  })
}

function stop() {
  for (const child of children) {
    if (child && !child.killed) child.kill('SIGTERM')
  }
  process.exit(0)
}

process.on('SIGINT', stop)
process.on('SIGTERM', stop)

console.log(`[dev] API em http://localhost:${API_PORT} — Frontend em http://localhost:${WEB_PORT}`)

start('api', ['--filter', '@workspace/api-server', 'dev'], {
  PORT: API_PORT,
  NODE_ENV: 'development',
})
start('web', ['--filter', '@workspace/finance', 'dev'], {
  PORT: WEB_PORT,
  BASE_PATH: '/',
  NODE_ENV: 'development',
})
