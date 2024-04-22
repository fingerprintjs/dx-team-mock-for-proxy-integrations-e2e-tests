import { assert, assertToBeTruthy } from '../../service/assert'
import { TestCase } from '../../types/testCase'
import { getApiKey } from '../../utils/getApiKey'

const testCase: TestCase = {
  name: 'agent request preserve header and query',
  test: async (api) => {
    const query = new URLSearchParams()
    query.set('customQuery', '123')
    query.set('apiKey', getApiKey())

    const { requestFromProxy } = await api.sendRequestToCdn(query, { headers: { 'X-Custom': '123' } })
    const { ii, customQuery } = requestFromProxy.query

    assertToBeTruthy('ii', ii)
    assertToBeTruthy('customQuery', customQuery)

    const [integration, version, type] = ii.toString().split('/')

    assert(requestFromProxy.get('X-Custom'), '123', 'X-Custom')
    assert(customQuery, '123', 'customQuery')
    assert(integration, api.testSession.trafficName, 'trafficName')
    assert(version, api.testSession.integrationVersion, 'integrationVersion')
    assert(type, 'procdn', 'integrationType')
  },
}

export default testCase
