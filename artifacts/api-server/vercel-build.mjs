import { execSync } from 'node:child_process'
import { cpSync, mkdirSync, rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const apiDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)))
const repoRoot = path.resolve(apiDir, '../..')
const financeDist = path.join(repoRoot, 'artifacts/finance/dist/public')
const publicDir = path.join(apiDir, 'public')

execSync('pnpm --filter @workspace/finance build', {
  cwd: repoRoot,
  stdio: 'inherit',
  env: { ...process.env, BASE_PATH: '/', NODE_ENV: 'production' },
})

rmSync(publicDir, { recursive: true, force: true })
mkdirSync(publicDir, { recursive: true })
cpSync(financeDist, publicDir, { recursive: true })

console.log(`[vercel-build] frontend copiado para ${publicDir}`)

// Bundle the API with esbuild into index.mjs so the Express preset picks it up
// (it is preferred over src/index.ts) and the @workspace/db package (whose
// exports point to TS source with extension-less directory imports) is resolved
// correctly at build time instead of failing at runtime with
// ERR_UNSUPPORTED_DIR_IMPORT.
execSync('node ./build.mjs', { cwd: apiDir, stdio: 'inherit' })

const bundledEntry = path.join(apiDir, 'dist/index.mjs')
const rootEntry = path.join(apiDir, 'index.mjs')
cpSync(bundledEntry, rootEntry)

console.log(`[vercel-build] API bundled para ${rootEntry}`)
