import { assert } from '../../service/assert'
import { TestCase } from '../../types/testCase'

const testCase: TestCase = {
  name: 'agent request without loader',
  test: async (api) => {
    const query = new URLSearchParams()

    query.set('apiKey', Math.random().toString(36).substring(7))
    query.set('version', '3')

    const { requestFromProxy } = await api.sendRequestToCdn(query)

    const splitPath = requestFromProxy.path.split('/').slice(1)

    assert(splitPath.length, 2)

    const [version, apiKey] = splitPath

    assert(apiKey, query.get('apiKey'))
    assert(version, 'v3')
  },
}

export default testCase
