import { TestCase } from '../../types/testCase'
import { assert } from '../../service/assert'

const testCase: TestCase = {
  name: 'v4 agent response successful response passthrough',
  test: async (api) => {
    const { responseFromProxy } = await api.sendRequestToV4Cdn({
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
