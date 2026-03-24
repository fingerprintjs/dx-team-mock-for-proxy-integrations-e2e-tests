import { assert } from '../../service/assert'
import { TestCase } from '../../types/testCase'

const testCase: TestCase = {
  name: 'v4 browser cache response cache-control preserved',
  test: async (api) => {
    const { responseFromProxy } = await api.sendRequestToV4CacheEndpoint({
      mockResponse: {
        headers: {
          'cache-control': 'public, max-age=600',
        },
      },
    })

    const value = responseFromProxy.headers['cache-control']
    assert(value, 'public, max-age=600', `Expected 'cache-control: public, max-age=600' header, got: ${value}`)
  },
}

export default testCase
