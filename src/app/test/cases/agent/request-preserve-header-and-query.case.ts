import { assert, assertToBeFalsy, assertToBeTruthy } from '../../service/assert'
import { TestCase } from '../../types/testCase'
import { getApiKey } from '../../utils/getApiKey'

const testCase: TestCase = {
  name: 'agent request preserve header and query',
  test: async (api) => {
    const query = new URLSearchParams()
    query.set('customQuery', '123')
    query.set('apiKey', getApiKey())

    const { requestFromProxy } = await api.sendRequestToCdn({
      query,
      request: { headers: { 'X-Custom': '123' } },
    })
    const { ii, customQuery } = requestFromProxy.query

    assertToBeFalsy('ii', ii)
    assertToBeTruthy('customQuery', customQuery)

    assert(requestFromProxy.get('X-Custom'), '123', 'X-Custom')
    assert(customQuery, '123', 'customQuery')
  },
}

export default testCase
