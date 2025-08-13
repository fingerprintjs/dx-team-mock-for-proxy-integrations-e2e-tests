import { TestCase } from '../../types/testCase'
import { assert } from '../../service/assert'

const testCase: TestCase = {
  name: 'successful response passthrough on Identification responses',
  response: {
    status: 200,
    headers: {
      'x-foo': 'bar',
    },
    body: 'ok',
  },
  test: async (api) => {
    const { responseFromProxy } = await api.sendRequestToIngress({})

    assert(responseFromProxy.status, 200)
    assert(responseFromProxy.body, 'ok')
    assert(responseFromProxy.headers['x-foo'], 'bar')
  },
}

export default testCase
