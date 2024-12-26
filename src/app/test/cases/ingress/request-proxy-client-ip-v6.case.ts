import axios from 'axios'
import * as dns from 'node:dns'
import { assertEqualIp } from '../../service/assert'
import { TestCase } from '../../types/testCase'
import { getIPv4 } from '../../utils/getIPv4'

const testCase: TestCase = {
  name: 'ingress request get proxy client ipv6 and validity',
  before: () => {
    axios.defaults.lookup = (hostname, _, cb) => {
      dns.lookup(hostname, 6, (_, addresses) => {
        cb(null, { address: addresses, family: 6 })
      })
    }
  },
  test: async (api) => {
    const { requestFromProxy } = await api.sendRequestToIngress({
      headers: {
        host: api.testSession.host,
      },
    })
    const ipOfClient = await getIPv4()

    assertEqualIp(requestFromProxy.get('fpjs-proxy-client-ip'), ipOfClient, 'fpjs-proxy-client-ip')
  },
  after: () => {
    axios.defaults.lookup = undefined
  },
}

export default testCase
