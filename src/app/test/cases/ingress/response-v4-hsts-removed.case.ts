import { TestCase } from '../../types/testCase'
import { assert, assertToBeFalsy } from '../../service/assert'

const testCase: TestCase = {
  name: 'v4 ingress response hsts removed',
  test: async (api) => {
    const { responseFromProxy } = await api.sendRequestToIngress({
      pathOverride: '/',
      mockResponse: {
        headers: {
          'strict-transport-security': 'max-age=31536000; includeSubDomains; preload',
          'x-foo': 'bar',
        },
      },
    })
    assertToBeFalsy('strict-transport-security', responseFromProxy.headers['strict-transport-security'])
    assert(responseFromProxy.headers['x-foo'], 'bar')
  },
}

export default testCase
