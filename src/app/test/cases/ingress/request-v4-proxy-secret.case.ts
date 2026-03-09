import { assert } from '../../service/assert'
import { TestCase } from '../../types/testCase'

const testCase: TestCase = {
  name: 'v4 ingress request proxy secret',
  test: async (api) => {
    const { requestFromProxy } = await api.sendRequestToV4Ingress()
    assert(requestFromProxy.get('fpjs-proxy-secret'), 'secret', 'fpjs-proxy-secret', true)
  },
}

export default testCase
