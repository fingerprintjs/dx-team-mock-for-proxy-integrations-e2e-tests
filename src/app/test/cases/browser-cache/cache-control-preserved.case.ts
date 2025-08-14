import { assert } from '../../service/assert'
import { TestCase } from '../../types/testCase'

const testCase: TestCase = {
  name: 'cache-control preserved on Browser Cache responses',
  response: () => ({
    headers: {
      'cache-control': 'public, max-age=600',
    },
  }),
  test: async (api) => {
    const { responseFromProxy } = await api.sendRequestToCacheEndpoint({})

    const value = responseFromProxy.headers['cache-control']
    assert(value, 'public, max-age=600', `Expected 'cache-control: public, max-age=600' header, got: ${value}`)
  },
}

export default testCase
