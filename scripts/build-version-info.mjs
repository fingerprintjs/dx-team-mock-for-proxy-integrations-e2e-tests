import { readFileSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import path from 'node:path'
import url from 'node:url'

const dirname = path.dirname(url.fileURLToPath(import.meta.url))
const root = path.join(dirname, '..')

const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'))

function tryCommand(cmd) {
    try {
        return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
    } catch {
        return ''
    }
}

const envSha = process.env.GIT_SHA || ''
const gitSha = envSha || tryCommand('git rev-parse --short=12 HEAD') || 'unknown'
const buildTime = process.env.BUILD_TIME || new Date().toISOString()

const info = {
    name: pkg.name ?? 'mock-for-e2e',
    version: pkg.version ?? 'unknown',
    gitSha,
    buildTime
}

const outPath = path.join(root, 'build-info.json')
writeFileSync(outPath, JSON.stringify(info, null, 2))
