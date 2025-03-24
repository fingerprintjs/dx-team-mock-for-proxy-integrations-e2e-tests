import { assertEqualIp } from '../../service/assert'
import { TestCase } from '../../types/testCase'
import { getPublicIPv6 } from '../../utils/getIP'

const testCase: TestCase = {
  name: 'ingress request get proxy client ipv6 and validity',
  before: (testCaseApi) => {
    testCaseApi.httpClientInstance.defaults.family = 6
  },
  test: async (api) => {
    const { requestFromProxy } = await api.sendRequestToIngress({
      headers: {
        host: api.testSession.host,
      },
    })
    const ipOfClient = await getPublicIPv6()

    assertEqualIp(requestFromProxy.get('fpjs-proxy-client-ip'), ipOfClient, 'fpjs-proxy-client-ip')
  },
}

export default testCase
