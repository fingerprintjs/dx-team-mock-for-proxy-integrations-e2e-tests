import { assertToBeFalsy } from '../../service/assert'
import { TestCase } from '../../types/testCase'

const testCase: TestCase = {
  name: 'v4 agent request no cookie',
  test: async (api) => {
    const { requestFromProxy } = await api.sendRequestToV4Cdn({
      request: {
        headers: { cookie: 'test=123; _iidt=test' },
      },
    })
    assertToBeFalsy('cookie', requestFromProxy.get('cookie'))
  },
}

export default testCase
