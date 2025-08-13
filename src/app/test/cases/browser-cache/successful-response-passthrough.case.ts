import { assert } from '../../service/assert'
import { TestCase } from '../../types/testCase'

const testCase: TestCase = {
  name: 'successful response passthrough on Browser Cache responses',
  response: {
    status: 200,
    headers: {
      'x-foo': 'bar',
    },
    body: 'ok',
  },
  test: async (api) => {
    const { responseFromProxy } = await api.sendRequestToCacheEndpoint({})

    assert(responseFromProxy.status, 200)
    assert(responseFromProxy.body, 'ok')
    assert(responseFromProxy.headers['x-foo'], 'bar')
  },
}

export default testCase
