import { assert } from '../../service/assert'
import { TestCase } from '../../types/testCase'

const testCase: TestCase = {
  name: 'v4 browser cache response successful response passthrough',
  test: async (api) => {
    const { responseFromProxy } = await api.sendRequestToV4CacheEndpoint({
      mockResponse: {
        status: 200,
        headers: {
          'x-foo': 'bar',
        },
        body: 'ok',
      },
    })

    assert(responseFromProxy.status, 200)
    assert(responseFromProxy.body, 'ok')
    assert(responseFromProxy.headers['x-foo'], 'bar')
  },
}

export default testCase
