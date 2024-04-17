import { assert, assertToBeTruthy } from '../../service/assert'
import { TestCase } from '../../types/testCase'

const testCase: TestCase = {
  name: 'ingress request with single ii query parameter',
  test: async (api) => {
    const query = new URLSearchParams()
    query.set('customQuery', '123')
    const { requestFromProxy } = await api.sendRequestToIngress({}, query)
    const { ii, customQuery } = requestFromProxy.query

    assertToBeTruthy('ii', ii)
    assertToBeTruthy('customQuery', customQuery)

    const [integration, version, type] = ii.toString().split('/')
    assert(integration, api.testSession.trafficName, 'trafficName')
    assert(version, api.testSession.integrationVersion, 'integrationVersion')
    assert(type, 'ingress', 'integrationType')
    assert(customQuery, '123', 'customQuery')
  },
}

export default testCase
