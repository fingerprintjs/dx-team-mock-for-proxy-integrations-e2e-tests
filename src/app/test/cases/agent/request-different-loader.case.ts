import { assert } from '../../service/assert'
import { TestCase } from '../../types/testCase'
import { getApiKey } from '../../utils/getApiKey'

const testCase: TestCase = {
  name: 'agent request with different loaderVersion',
  test: async (api) => {
    const query = new URLSearchParams()

    query.set('apiKey', getApiKey())
    query.set('version', '3')

    const loaderVersion = '3.9.8_e1_noworker'
    query.set('loaderVersion', loaderVersion)

    const { requestFromProxy } = await api.sendRequestToCdn({ query })

    const pathParts = requestFromProxy.path.split('/').filter(Boolean)
    const firstPart = pathParts[0]
    assert(firstPart, 'web', 'first part of path')
    const splitPath = pathParts.slice(1)

    assert(splitPath.length, 3, 'splitPathLength')

    const [version, apiKey, loader] = splitPath

    assert(apiKey, query.get('apiKey'), 'apiKey')
    assert(version, 'v3', 'apiVersion')
    assert(loader, `loader_v${loaderVersion}.js`, 'loaderVersion')
  },
}

export default testCase
