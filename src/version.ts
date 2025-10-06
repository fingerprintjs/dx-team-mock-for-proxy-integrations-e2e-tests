import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export type BuildInfo = {
  name: string
  version: string
  gitSha: string
  buildTime: string
}

function readJsonIfExists<T = unknown>(path: string): T | null {
    if (!existsSync(path)){
        return null
    }

    try {
        return JSON.parse(readFileSync(path, 'utf8')) as T
    } catch {
        return null
    }
}

const root = join(__dirname, '..')
const build = readJsonIfExists<Partial<BuildInfo>>(join(root, 'build-info.json'))
const pkg = readJsonIfExists<any>(join(root, 'package.json'))

export const buildInfo: BuildInfo = {
    name: build?.name ?? pkg?.name ?? process.env.APP_NAME ?? 'mock-for-e2e',
    version: build?.version ?? pkg?.version ?? process.env.APP_VERSION ?? 'unknown',
    gitSha: build?.gitSha ?? process.env.GIT_SHA ?? 'unknown',
    buildTime: build?.buildTime ?? process.env.BUILD_TIME ?? new Date().toISOString(),
}
