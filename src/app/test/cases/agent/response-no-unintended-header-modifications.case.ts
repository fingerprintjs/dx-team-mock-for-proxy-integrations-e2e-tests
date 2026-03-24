import { TestCase } from '../../types/testCase'
import { getApiKey } from '../../utils/getApiKey'
import { assert } from '../../service/assert'

const testCase: TestCase = {
  name: 'agent response no unintended header modifications',
  test: async (api) => {
    const query = new URLSearchParams()
    query.set('apiKey', getApiKey())
    const { responseFromProxy } = await api.sendRequestToCdn({
      query,

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
