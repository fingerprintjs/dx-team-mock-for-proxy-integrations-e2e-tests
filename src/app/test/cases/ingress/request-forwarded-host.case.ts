import { assert } from '../../service/assert'
import { TestCase } from '../../types/testCase'

const testCase: TestCase = {
  name: 'ingress request forwarded host and validity',
  test: async (api) => {
    const { requestFromProxy } = await api.sendRequestToIngress({})

    const testSessionHostURL = new URL(api.testSession.host)
    const testSessionHost = `${testSessionHostURL.protocol}//${testSessionHostURL.host}`

    assert(`https://${requestFromProxy.get('fpjs-proxy-forwarded-host')}`, testSessionHost, 'fpjs-proxy-forwarded-host')
  },
}

export default testCase
