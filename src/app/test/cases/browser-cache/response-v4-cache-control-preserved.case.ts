import { assert } from '../../service/assert'
import { TestCase } from '../../types/testCase'
import { getRandomString } from '../../utils/getRandomString'

const testCase: TestCase = {
  name: 'v4 browser cache response cache-control preserved',
  test: async (api) => {
    const { responseFromProxy } = await api.sendRequestToCacheEndpoint({
      pathOverride: `/cache-control-test/${getRandomString()}`,
      mockResponse: {
        headers: {
          'cache-control': 'public, max-age=600',
        },
      },
    })

    const value = responseFromProxy.headers['cache-control']
    assert(value, 'public, max-age=600', `Expected 'cache-control: public, max-age=600' header, got: ${value}`)
  },
}

export default testCase
