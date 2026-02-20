import { TestCase } from '../../types/testCase'
import { getApiKey } from '../../utils/getApiKey'
import { assert } from '../../service/assert'

const testCase: TestCase = {
  name: 'agent response successful response passthrough',
  test: async (api) => {
    const query = new URLSearchParams()
    query.set('apiKey', getApiKey())
    const { responseFromProxy } = await api.sendRequestToCdn({
      query: query,

      mockResponse: {
        status: 200,
        headers: {
          'x-test': 'x-value',
          'x-test-two': 'x-value-two',
        },
        body: 'Hello!',
      },
    })

    assert(responseFromProxy.status, 200)
    assert(responseFromProxy.body, 'Hello!')
    assert(responseFromProxy.headers['x-test'], 'x-value')
    assert(responseFromProxy.headers['x-test-two'], 'x-value-two')
  },
}

export default testCase
