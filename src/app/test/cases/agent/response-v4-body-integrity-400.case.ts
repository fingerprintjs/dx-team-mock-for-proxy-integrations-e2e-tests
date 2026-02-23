import { TestCase } from '../../types/testCase'
import { getApiKey } from '../../utils/getApiKey'
import { assert } from '../../service/assert'
import { diverseUnicodeJavascript } from '../../utils/diverseUnicode'

const testCase: TestCase = {
  name: 'v4 agent response body integrity protected with 400 status code',
  test: async (api) => {
    const apiKey = getApiKey()

    const body = diverseUnicodeJavascript

    const { responseFromProxy } = await api.sendRequestToCdn({
      pathOverride: `/web/v4/${apiKey}`,

      mockResponse: {
        status: 400,
        headers: {
          'content-type': 'text/javascript; charset=utf-8',
        },
        body,
      },
    })

    assert(responseFromProxy.status, 400)
    assert(responseFromProxy.body, body)
    assert(responseFromProxy.headers['content-type'], 'text/javascript; charset=utf-8')
  },
}

export default testCase
