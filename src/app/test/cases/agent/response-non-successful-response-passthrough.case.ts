import { TestCase } from '../../types/testCase'
import { getApiKey } from '../../utils/getApiKey'
import { assert } from '../../service/assert'

const testCase: TestCase = {
  name: 'agent response non-successful response passthrough',
  test: async (api) => {
    const query = new URLSearchParams()
    query.set('apiKey', getApiKey())
    const { responseFromProxy } = await api.sendRequestToCdn(query, undefined, {
      status: 502,
      headers: {
        'x-error': 'upstream-fail',
      },
      body: 'Bad gateway',
    })

    assert(responseFromProxy.status, 502)
    assert(responseFromProxy.body, 'Bad gateway')
    assert(responseFromProxy.headers['x-error'], 'upstream-fail')
  },
}

export default testCase
