import { TestCase } from '../../types/testCase'
import { assert } from '../../service/assert'
import { diverseUnicode } from '../../utils/diverseUnicode'

const testCase: TestCase = {
  name: 'ingress response body integrity protected with 400 status code',
  test: async (api) => {
    const body = diverseUnicode

    const { responseFromProxy } = await api.sendRequestToIngress({}, undefined, {
      status: 400,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
      },
      body,
    })

    assert(responseFromProxy.status, 400)
    assert(responseFromProxy.body, body)
    assert(responseFromProxy.headers['content-type'], 'text/plain; charset=utf-8')
  },
}

export default testCase
