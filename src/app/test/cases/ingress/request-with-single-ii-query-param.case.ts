import { assert, assertToBeTruthy } from '../../service/assert'
import { TestCase } from '../../types/testCase'

const testCase: TestCase = {
  name: 'ingress request with single ii query parameter',
  test: async (api) => {
    const query = new URLSearchParams()
    query.set('customQuery', '123')
    const { requestFromProxy } = await api.sendRequestToIngress({}, query)
    const { ii, customQuery } = requestFromProxy.query

    assertToBeTruthy(ii)
    assertToBeTruthy(customQuery)

    const [integration, version, type] = ii.toString().split('/')
    assert(integration, api.testSession.trafficName)
    assert(version, api.testSession.integrationVersion)
    assert(type, 'ingress')
    assert(customQuery, '123')
  },
}

export default testCase
