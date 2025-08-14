import { TestCase } from '../../types/testCase'
import { getApiKey } from '../../utils/getApiKey'
import { assert } from '../../service/assert'

const body = `export const fp = "fingerprínt";
console.log("fra\u0301ud");`

const testCase: TestCase = {
  name: 'body integrity protected with 500 status code on ProCDN responses',
  response: {
    status: 500,
    headers: {
      'content-type': 'text/javascript; charset=utf-8',
    },
    body,
  },
  test: async (api) => {
    const query = new URLSearchParams()
    query.set('apiKey', getApiKey())
    const { responseFromProxy } = await api.sendRequestToCdn(query)

    assert(responseFromProxy.status, 500)
    assert(responseFromProxy.body, body)
    assert(responseFromProxy.headers['content-type'], 'text/javascript; charset=utf-8')
  },
}

export default testCase
