import { assertEqualIp } from '../../service/assert'
import { TestCase } from '../../types/testCase'
import { getIP } from '../../utils/getIP'

const testCase: TestCase = {
  name: 'ingress request get proxy client ip and validity',
  test: async (api) => {
    const { requestFromProxy } = await api.sendRequestToIngress({})
    const ipOfClient = await getIP()

    assertEqualIp(requestFromProxy.get('fpjs-proxy-client-ip'), ipOfClient, 'fpjs-proxy-client-ip')
  },
}

export default testCase
