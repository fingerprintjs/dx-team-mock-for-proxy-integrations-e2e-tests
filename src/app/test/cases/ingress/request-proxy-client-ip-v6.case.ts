import * as dns from 'node:dns'
import { assertEqualIp } from '../../service/assert'
import { TestCase } from '../../types/testCase'
import { getIPv6 } from '../../utils/getIP'

const testCase: TestCase = {
  name: 'ingress request get proxy client ipv6 and validity',
  before: (testCaseApi) => {
    testCaseApi.httpClientInstance.defaults.lookup = (hostname, _, cb) => {
      console.log('[IP Validity v6] Lookup for: ', hostname)
      dns.lookup(hostname, 6, (_, address) => {
        console.log('[IP Validity v6] Found IP: ', address)
        cb(null, { address: address, family: 6 })
      })
    }
  },
  test: async (api) => {
    const { requestFromProxy } = await api.sendRequestToIngress({
      headers: {
        host: api.testSession.host,
      },
    })
    const ipOfClient = await getIPv6()

    assertEqualIp(requestFromProxy.get('fpjs-proxy-client-ip'), ipOfClient, 'fpjs-proxy-client-ip')
  },
}

export default testCase
