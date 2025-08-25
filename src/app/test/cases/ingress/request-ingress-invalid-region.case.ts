import { assertToBeTruthy } from '../../service/assert'
import { TestCase } from '../../types/testCase'

const testCase: TestCase = {
  name: 'ingress invalid region',
  test: async (api) => {
    const region = 'invalid'

    const query = new URLSearchParams()
    query.set('region', region)

    const { requestFromProxy } = await api.sendRequestToIngress({}, query)

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
