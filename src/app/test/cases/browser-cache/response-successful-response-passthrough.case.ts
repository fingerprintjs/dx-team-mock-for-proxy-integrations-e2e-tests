import { assert } from '../../service/assert'
import { TestCase } from '../../types/testCase'
import { getRandomString } from '../../utils/getRandomString'

const testCase: TestCase = {
  name: 'browser cache response successful response passthrough',
  test: async (api) => {
    const { responseFromProxy } = await api.sendRequestToCacheEndpoint({
      pathname: `/browser-cache/${getRandomString()}`,
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
