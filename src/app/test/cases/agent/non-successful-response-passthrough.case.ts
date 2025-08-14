import { TestCase } from '../../types/testCase'
import { getApiKey } from '../../utils/getApiKey'
import { assert } from '../../service/assert'

const testCase: TestCase = {
  name: 'non-successful response passthrough on ProCDN responses',
  response: () => ({
    status: 502,
    headers: {
      'x-error': 'upstream-fail',
    },
    body: 'Bad gateway',
  }),
  test: async (api) => {
    const query = new URLSearchParams()
    query.set('apiKey', getApiKey())
    const { responseFromProxy } = await api.sendRequestToCdn(query)

    assert(responseFromProxy.status, 502)
    assert(responseFromProxy.body, 'Bad gateway')
    assert(responseFromProxy.headers['x-error'], 'upstream-fail')
  },
}

export default testCase
