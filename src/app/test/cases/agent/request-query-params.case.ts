import { assert } from '../../service/assert'
import { TestCase } from '../../types/testCase'
import { getLoaderVersion } from '../../utils/getLoaderVersion'
import { getApiKey } from '../../utils/getApiKey'

const testCase: TestCase = {
  name: 'agent request query params',
  test: async (api) => {
    const query = new URLSearchParams()

    query.set('apiKey', getApiKey())
    query.set('version', '3')
    query.set('loaderVersion', getLoaderVersion())

    const { requestFromProxy } = await api.sendRequestToCdn(query)

    const splitPath = requestFromProxy.path.split('/').slice(1)

    assert(splitPath.length, 3, 'splitPathLength')

    const [version, apiKey, loader] = splitPath

    assert(apiKey, query.get('apiKey'), 'apiKey')
    assert(version, 'v3', 'version')
    assert(loader, `loader_v${query.get('loaderVersion')}.js`, 'loader')
  },
}

export default testCase
