import { assert } from '../../service/assert'
import { TestCase } from '../../types/testCase'

const testCase: TestCase = {
  name: 'ingress request proxy secret',
  test: async (api) => {
    const { requestFromProxy } = await api.sendRequestToIngress({})
    assert(requestFromProxy.get('fpjs-proxy-secret'), 'secret', 'fpjs-proxy-secret')
  },
}

export default testCase
