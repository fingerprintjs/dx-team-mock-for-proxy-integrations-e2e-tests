import { assert, assertToBeTruthy } from '../../service/assert'
import { TestCase } from '../../types/testCase'

const testCase: TestCase = {
  name: 'v4 ingress request traffic monitoring',
  test: async (api) => {
    const { requestFromProxy } = await api.sendRequestToIngress({
      pathOverride: '/',
    })
    const { ii } = requestFromProxy.query

    assertToBeTruthy('ii', ii)

    const [integration, version, type] = ii.toString().split('/')

    assert(integration, api.testSession.trafficName, 'trafficName')
    assert(version, api.testSession.integrationVersion, 'integrationVersion')
    assert(type, 'ingress', 'integrationType')
  },
}

export default testCase
