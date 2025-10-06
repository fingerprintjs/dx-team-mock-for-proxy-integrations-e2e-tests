import pkg from '../package.json'

export const versionInfo = {
    name: (pkg as any).name ?? 'test-runner',
    version: (pkg as any).version ?? 'unknown'
}
