import { assert } from '../../service/assert'
import { TestCase } from '../../types/testCase'

const testCase: TestCase = {
  name: 'ingress request with multiple ii query parameter',
  test: async (api) => {
    const query = new URLSearchParams()
    const reactTrafficMonitoring = 'fingerprintjs-pro-react/2.6.2/next/14.1.0'
    query.set('ii', reactTrafficMonitoring)
    query.set('customQuery', '123')
    const { requestFromProxy } = await api.sendRequestToIngress({}, query)
    const { ii, customQuery } = requestFromProxy.query
    const proxyIntegrationInfo = `${api.testSession.trafficName}/${api.testSession.integrationVersion}/ingress`
    assert((ii as string[]).includes(proxyIntegrationInfo), true)
    assert((ii as string[]).includes(reactTrafficMonitoring), true)
    assert(customQuery, '123')
  },
}

export default testCase
