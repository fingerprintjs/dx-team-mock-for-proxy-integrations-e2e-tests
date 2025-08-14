import { TestCase } from '../../types/testCase'
import { assert } from '../../service/assert'
import { diverseUnicode } from '../../utils/diverseUnicode'

const body = diverseUnicode

const testCase: TestCase = {
  name: 'body integrity protected with 200 status code on Identification responses',
  response: {
    status: 200,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
    },
    body,
  },
  test: async (api) => {
    const { responseFromProxy } = await api.sendRequestToIngress({})

    assert(responseFromProxy.status, 200)
    assert(responseFromProxy.body, body)
    assert(responseFromProxy.headers['content-type'], 'text/plain; charset=utf-8')
  },
}

export default testCase
