import { assert } from '../../service/assert'
import { TestCase } from '../../types/testCase'
import { getRandomString } from '../../utils/getRandomString'

const testCase: TestCase = {
  name: 'browser cache response no header changes',
  test: async (api) => {
    const { responseFromProxy } = await api.sendRequestToCacheEndpoint({
      pathname: `/browser-cache/${getRandomString()}`,
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
