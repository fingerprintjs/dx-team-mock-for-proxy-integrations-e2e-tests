import { TestCase } from '../../types/testCase'
import { getApiKey } from '../../utils/getApiKey'
import { assert } from '../../service/assert'

const testCase: TestCase = {
  name: 'agent response non-successful response passthrough',
  test: async (api) => {
    const query = new URLSearchParams()
    query.set('apiKey', getApiKey())
    const { responseFromProxy } = await api.sendRequestToCdn(query, undefined, {
      status: 500,
      headers: {
        'x-error': 'upstream-fail',
      },
      body: 'Internal Server Error',
    })

    assert(responseFromProxy.status, 500)
    assert(responseFromProxy.body, 'Internal Server Error')
    assert(responseFromProxy.headers['x-error'], 'upstream-fail')
  },
}

export default testCase
