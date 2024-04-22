import { assert } from '../../service/assert'
import { TestCase } from '../../types/testCase'

const testCase: TestCase = {
  name: 'ingress request forwarded host and validity',
  test: async (api) => {
    const { requestFromProxy } = await api.sendRequestToIngress({})

    assert(`${requestFromProxy.get('fpjs-proxy-forwarded-host')}`, api.testSession.host, 'fpjs-proxy-forwarded-host')
  },
}

export default testCase
