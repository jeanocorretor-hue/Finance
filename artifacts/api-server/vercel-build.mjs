import { execSync } from 'node:child_process'
import { cpSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const apiDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)))
const repoRoot = path.resolve(apiDir, '../..')
const financeDist = path.join(repoRoot, 'artifacts/finance/dist/public')
const publicDir = path.join(apiDir, 'public')
const dbSrc = path.join(repoRoot, 'lib/db')
const targetDb = path.join(apiDir, 'node_modules/@workspace/db')

execSync('pnpm --filter @workspace/finance build', {
  cwd: repoRoot,
  stdio: 'inherit',
  env: { ...process.env, BASE_PATH: '/', NODE_ENV: 'production' },
})

execSync('pnpm --filter @workspace/db run build', {
  cwd: repoRoot,
  stdio: 'inherit',
})

// Ensure @workspace/db is compiled & copied as real physical files inside api-server/node_modules for Vercel NFT tracing
try {
  rmSync(targetDb, { recursive: true, force: true })
  mkdirSync(path.dirname(targetDb), { recursive: true })
  cpSync(dbSrc, targetDb, { recursive: true })
  console.log(`[vercel-build] @workspace/db copiado para ${targetDb}`)
} catch (e) {
  console.warn(`[vercel-build] aviso ao copiar @workspace/db: ${e.message}`)
}

rmSync(publicDir, { recursive: true, force: true })
mkdirSync(publicDir, { recursive: true })
cpSync(financeDist, publicDir, { recursive: true })

console.log(`[vercel-build] frontend copiado para ${publicDir}`)

execSync('node ./build.mjs', { cwd: apiDir, stdio: 'inherit' })

const bundledEntry = path.join(apiDir, 'dist/index.cjs')
const apiSubDir = path.join(apiDir, 'api')
const rootApiSubDir = path.join(repoRoot, 'api')

mkdirSync(apiSubDir, { recursive: true })
mkdirSync(rootApiSubDir, { recursive: true })

cpSync(bundledEntry, path.join(apiDir, 'index.js'))
cpSync(bundledEntry, path.join(apiSubDir, 'index.js'))
cpSync(bundledEntry, path.join(repoRoot, 'index.js'))
cpSync(bundledEntry, path.join(rootApiSubDir, 'index.js'))

console.log(`[vercel-build] API CJS bundled para index.js e api/index.js (em api-server e na raiz)`)
