import { assertToBeFalsy } from '../../service/assert'
import { TestCase } from '../../types/testCase'

const testCase: TestCase = {
  name: 'v4 ingress request delete all cookies if _iidt not present',
  test: async (api) => {
    const { requestFromProxy } = await api.sendRequestToV4Ingress({
      request: {
        headers: {
          cookie: 'random=123;test=123',
        },
      },
    })
    assertToBeFalsy('cookie', requestFromProxy.get('cookie'))
  },
}

export default testCase
