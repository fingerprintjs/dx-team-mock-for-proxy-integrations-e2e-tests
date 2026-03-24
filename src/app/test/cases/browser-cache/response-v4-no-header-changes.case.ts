import { assert } from '../../service/assert'
import { TestCase } from '../../types/testCase'

const testCase: TestCase = {
  name: 'v4 browser cache response no header changes',
  test: async (api) => {
    const { responseFromProxy } = await api.sendRequestToV4CacheEndpoint({
      mockResponse: {
        headers: {
          'x-foo': 'bar',
          'x-bar': 'baz',
        },
      },
    })

    assert(responseFromProxy.headers['x-foo'], 'bar', `Expected header 'x-foo: bar'`)
    assert(responseFromProxy.headers['x-bar'], 'baz', `Expected header 'x-bar: baz'`)
  },
}

export default testCase
