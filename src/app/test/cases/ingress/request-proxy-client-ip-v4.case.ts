import * as https from 'node:https'
import * as http from 'node:http'
import { assertEqualIp } from '../../service/assert'
import { TestCase } from '../../types/testCase'
import { getPublicIPv4 } from '../../utils/getIP'

const testCase: TestCase = {
  name: 'ingress request get proxy client ipv4 and validity',
  before: (testCaseApi) => {
    testCaseApi.httpClientInstance.defaults.family = 4
    testCaseApi.httpClientInstance.defaults.httpsAgent = new https.Agent({ family: 4, rejectUnauthorized: false })
    testCaseApi.httpClientInstance.defaults.httpAgent = new http.Agent({ family: 4 })
  },
  test: async (api) => {
    const { requestFromProxy } = await api.sendRequestToIngress({
      headers: {
        host: api.testSession.host,
      },
    })
    const ipOfClient = await getPublicIPv4()

    assertEqualIp(requestFromProxy.get('fpjs-proxy-client-ip'), ipOfClient, 'fpjs-proxy-client-ip')
  },
}

export default testCase
