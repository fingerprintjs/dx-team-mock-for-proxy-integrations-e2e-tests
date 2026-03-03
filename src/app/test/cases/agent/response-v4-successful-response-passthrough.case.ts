import { TestCase } from '../../types/testCase'
import { getApiKey } from '../../utils/getApiKey'
import { assert } from '../../service/assert'

const testCase: TestCase = {
  name: 'v4 agent response successful response passthrough',
  test: async (api) => {
    const apiKey = getApiKey()
    const { responseFromProxy } = await api.sendRequestToCdn({
      pathOverride: `/web/v4/${apiKey}`,

      mockResponse: {
        status: 200,
        headers: {
          'x-test': 'x-value',
          'x-test-two': 'x-value-two',
        },
        body: 'Hello!',
      },
    })

    assert(responseFromProxy.status, 200)
    assert(responseFromProxy.body, 'Hello!')
    assert(responseFromProxy.headers['x-test'], 'x-value')
    assert(responseFromProxy.headers['x-test-two'], 'x-value-two')
  },
}

export default testCase
