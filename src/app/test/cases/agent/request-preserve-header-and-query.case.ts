import { assert, assertToBeTruthy } from '../../service/assert'
import { TestCase } from '../../types/testCase'

const testCase: TestCase = {
  name: 'agent request preserve header and query',
  test: async (api) => {
    const query = new URLSearchParams()
    query.set('customQuery', '123')

    const { requestFromProxy } = await api.sendRequestToCdn(query, { headers: { 'X-Custom': '123' } })
    const { ii, customQuery } = requestFromProxy.query

    assertToBeTruthy(ii.toString())
    assertToBeTruthy(customQuery.toString())

    const [integration, version, type] = ii.toString().split('/')

    assert(requestFromProxy.get('X-Custom'), '123')
    assert(customQuery, '123')
    assert(integration, api.testSession.trafficName)
    assert(version, api.testSession.integrationVersion)
    assert(type, 'procdn')
  },
}

export default testCase
