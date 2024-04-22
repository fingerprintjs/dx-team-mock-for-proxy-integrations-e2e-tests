import { assertToBeTruthy } from '../../service/assert'
import { TestCase } from '../../types/testCase'

const testCase: TestCase = {
  name: 'browser cache regions',
  test: async (api) => {
    const regions = ['eu', 'ap']

    for (const region of regions) {
      const query = new URLSearchParams()
      query.set('region', region)

      const { requestFromProxy } = await api.sendRequestToCacheEndpoint({}, query)

      const requestUrl = new URL(`https://${requestFromProxy.get('host')}${requestFromProxy.url}`)

      const startsWith = `${region}.`

      assertToBeTruthy(
        'host',
        requestUrl.host.startsWith(startsWith),
        `Expected host to start with ${startsWith}, but got ${requestUrl.host}`
      )
    }
  },
}

export default testCase
