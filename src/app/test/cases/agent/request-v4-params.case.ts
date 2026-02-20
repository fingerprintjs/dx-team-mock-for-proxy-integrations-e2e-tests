import { assert } from '../../service/assert'
import { TestCase } from '../../types/testCase'
import { getApiKey } from '../../utils/getApiKey'

const testCase: TestCase = {
  name: 'v4 agent request params',
  test: async (api) => {
    const apiKey = getApiKey()

    const path = `/web/v4/${apiKey}`

    const { requestFromProxy } = await api.sendRequestToCdn({ pathOverride: path })

    const pathParts = requestFromProxy.path.split('/').filter(Boolean)
    const firstPart = pathParts[0]
    assert(firstPart, 'web', 'first part of path')
    const splitPath = pathParts.slice(1)

    assert(splitPath.length, 2, 'splitPathLength')

    const [version, receivedApiKey] = splitPath

    assert(receivedApiKey, apiKey, 'apiKey')
    assert(version, 'v4', 'version')
  },
}

export default testCase
