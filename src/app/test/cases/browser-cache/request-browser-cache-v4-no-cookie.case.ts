import { assertToBeFalsy } from '../../service/assert'
import { TestCase } from '../../types/testCase'
import { getApiKey } from '../../utils/getApiKey'

const testCase: TestCase = {
  name: 'v4 browser cache request no cookie',
  test: async (api) => {
    const query = new URLSearchParams()
    query.set('apiKey', getApiKey())
    const { requestFromProxy } = await api.sendRequestToV4CacheEndpoint({
      query,
      request: {
        headers: { cookie: 'test=123; _iidt=test' },
      },
    })
    assertToBeFalsy('cookie', requestFromProxy.get('cookie'))
  },
}

export default testCase
