import { assert } from '../../service/assert'
import { TestCase } from '../../types/testCase'

const testCase: TestCase = {
  name: 'agent request preserve header and query',
  test: async (api) => {
    const query = new URLSearchParams()
    query.set('customQuery', '123')

    const { requestFromProxy } = await api.sendRequestToCdn(query, { headers: { 'X-Custom': '123' } })
    assert(requestFromProxy.get('X-Custom'), '123')
    assert(requestFromProxy.query.customQuery, '123')
  },
}

export default testCase
