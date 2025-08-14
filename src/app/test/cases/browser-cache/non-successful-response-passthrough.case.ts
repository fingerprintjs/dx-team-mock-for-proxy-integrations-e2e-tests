import { assert } from '../../service/assert'
import { TestCase } from '../../types/testCase'

const testCase: TestCase = {
  name: 'non-successful response passthrough on Browser Cache responses',
  response: () => ({
    status: 502,
    headers: {
      'x-error': 'upstream-fail',
    },
    body: 'Bad gateway',
  }),
  test: async (api) => {
    const { responseFromProxy } = await api.sendRequestToCacheEndpoint({})

    assert(responseFromProxy.status, 502)
    assert(responseFromProxy.body, 'Bad gateway')
    assert(responseFromProxy.headers['x-error'], 'upstream-fail')
  },
}

export default testCase
