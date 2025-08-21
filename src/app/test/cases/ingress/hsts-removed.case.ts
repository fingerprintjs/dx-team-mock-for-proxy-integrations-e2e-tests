import { TestCase } from '../../types/testCase'
import { assert, assertToBeFalsy } from '../../service/assert'
import { generateRequestId } from '../../../../utils/generateRequestId'

const testCase: TestCase = {
  name: 'hsts removed on Identification responses',
  test: async (api) => {
    const { responseFromProxy } = await api.sendRequestToIngress({}, undefined, {
      headers: {
        'strict-transport-security': 'max-age=31536000; includeSubDomains; preload',
        'x-foo': 'bar',
      },
    })
    assertToBeFalsy('strict-transport-security', responseFromProxy.headers['strict-transport-security'])
    assert(responseFromProxy.headers['x-foo'], 'bar')
  },
}

export default testCase
