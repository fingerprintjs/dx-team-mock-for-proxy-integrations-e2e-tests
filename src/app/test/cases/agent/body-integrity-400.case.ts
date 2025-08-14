import { TestCase } from '../../types/testCase'
import { getApiKey } from '../../utils/getApiKey'
import { assert } from '../../service/assert'

const testCase: TestCase = {
  name: 'body integrity protected with 400 status code on ProCDN responses',
  test: async (api) => {
    const query = new URLSearchParams()
    query.set('apiKey', getApiKey())

    const body = `export const fp = "fingerprínt";
console.log("fra\u0301ud");`

    const { responseFromProxy } = await api.sendRequestToCdn(query, undefined, {
      status: 400,
      headers: {
        'content-type': 'text/javascript; charset=utf-8',
      },
      body,
    })

    assert(responseFromProxy.status, 400)
    assert(responseFromProxy.body, body)
    assert(responseFromProxy.headers['content-type'], 'text/javascript; charset=utf-8')
  },
}

export default testCase
