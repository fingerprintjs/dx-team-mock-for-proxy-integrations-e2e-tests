import { assert } from '../../service/assert'
import { TestCase } from '../../types/testCase'
import { getLoaderVersion } from '../../utils/getLoaderVersion'

const testCase: TestCase = {
  name: 'agent request query params',
  test: async (api) => {
    const query = new URLSearchParams()

    query.set('apiKey', Math.random().toString(36).substring(7))
    query.set('version', '3')
    query.set('loaderVersion', getLoaderVersion())

    const { requestFromProxy } = await api.sendRequestToCdn(query)

    const splitPath = requestFromProxy.path.split('/').slice(1)

    assert(splitPath.length, 3)

    const [version, apiKey, loader] = splitPath

    assert(apiKey, query.get('apiKey'))
    assert(version, 'v3')
    assert(loader, `loader_v${query.get('loaderVersion')}.js`)
  },
}

export default testCase
