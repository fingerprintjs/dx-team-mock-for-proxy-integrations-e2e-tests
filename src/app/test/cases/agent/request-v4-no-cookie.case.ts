import { assertToBeFalsy } from '../../service/assert'
import { TestCase } from '../../types/testCase'
import { getApiKey } from '../../utils/getApiKey'

const testCase: TestCase = {
  name: 'v4 agent request no cookie',
  test: async (api) => {
    const { requestFromProxy } = await api.sendRequestToCdn({
      pathOverride: `/web/v4/${getApiKey()}`,
      request: {
        headers: { cookie: 'test=123; _iidt=test' },
      },
    })
    assertToBeFalsy('cookie', requestFromProxy.get('cookie'))
  },
}

export default testCase
