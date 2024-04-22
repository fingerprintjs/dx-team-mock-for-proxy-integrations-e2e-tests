import { assertToBeTruthy } from '../../service/assert'
import { TestCase } from '../../types/testCase'

const testCase: TestCase = {
  name: 'browser cache us region',
  test: async (api) => {
    const region = 'us'

    const query = new URLSearchParams()
    query.set('region', region)

    const { requestFromProxy } = await api.sendRequestToCacheEndpoint({}, query)

    const requestUrl = new URL(`https://${requestFromProxy.get('host')}${requestFromProxy.url}`)

    const startsWith = `${region}.`

    assertToBeTruthy(
      'host',
      !requestUrl.host.startsWith(startsWith),
      `Expected host to not start with ${startsWith}, but got ${requestUrl.host}`
    )
  },
}

export default testCase
