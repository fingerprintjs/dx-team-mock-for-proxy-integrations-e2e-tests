import pkg from '../package.json'

interface PackageJson {
    name?: string
    version?: string
}

const packageJson = pkg as PackageJson;

export const versionInfo = {
    name: packageJson.name ?? 'test-runner',
    version: packageJson.version ?? 'unknown'
}
