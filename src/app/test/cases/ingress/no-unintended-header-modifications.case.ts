import { TestCase } from '../../types/testCase'
import { assert } from '../../service/assert'

const testCase: TestCase = {
  name: 'no unintended header modifications on Identification responses',
  response: {
    headers: {
      'x-foo': 'bar',
      'x-bar': 'baz',
    },
  },
  test: async (api) => {
    const { responseFromProxy } = await api.sendRequestToIngress({})

    assert(responseFromProxy.headers['x-foo'], 'bar', `Expected header 'x-foo: bar'`)
    assert(responseFromProxy.headers['x-bar'], 'baz', `Expected header 'x-bar: baz'`)
  },
}

export default testCase
