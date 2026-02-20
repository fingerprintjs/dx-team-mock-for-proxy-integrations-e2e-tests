import { assert } from '../../service/assert'
import { TestCase } from '../../types/testCase'
import { getApiKey } from '../../utils/getApiKey'

const testCase: TestCase = {
  name: 'agent request without loader',
  test: async (api) => {
    const query = new URLSearchParams()

    query.set('apiKey', getApiKey())
    query.set('version', '3')

    const { requestFromProxy } = await api.sendRequestToCdn(query)

    const pathParts = requestFromProxy.path.split('/').filter(Boolean)
    const firstPart = pathParts[0]
    assert(firstPart, 'web', 'first part of path')
    const splitPath = pathParts.slice(1)

    assert(splitPath.length, 2, 'splitPathLength')

    const [version, apiKey] = splitPath

    assert(apiKey, query.get('apiKey'), 'apiKey')
    assert(version, 'v3', 'apiVersion')
  },
}

export default testCase
