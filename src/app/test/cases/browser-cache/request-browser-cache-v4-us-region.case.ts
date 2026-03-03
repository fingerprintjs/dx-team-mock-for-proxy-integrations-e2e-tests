import { assertToBeTruthy } from '../../service/assert'
import { TestCase } from '../../types/testCase'
import { getRandomString } from '../../utils/getRandomString'

const testCase: TestCase = {
  name: 'v4 browser cache request us region',
  test: async (api) => {
    const region = 'us'

    const query = new URLSearchParams()
    query.set('region', region)

    const { requestFromProxy } = await api.sendRequestToCacheEndpoint({
      pathOverride: `/browser-cache/${getRandomString()}`,
      query,
    })

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
