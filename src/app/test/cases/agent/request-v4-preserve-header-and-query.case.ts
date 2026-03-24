import { assert, assertToBeFalsy, assertToBeTruthy } from '../../service/assert'
import { TestCase } from '../../types/testCase'

const testCase: TestCase = {
  name: 'v4 agent request preserve header and query',
  test: async (api) => {
    const query = new URLSearchParams()
    query.set('customQuery', '123')

    const { requestFromProxy } = await api.sendRequestToV4Cdn({
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
