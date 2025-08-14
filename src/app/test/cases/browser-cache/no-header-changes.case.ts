import { assert } from '../../service/assert'
import { TestCase } from '../../types/testCase'

const testCase: TestCase = {
  name: 'no header changes on Browser Cache responses',
  response: () => ({
    headers: {
      'x-foo': 'bar',
      'x-bar': 'baz',
    },
  }),
  test: async (api) => {
    const { responseFromProxy } = await api.sendRequestToCacheEndpoint({})

    assert(responseFromProxy.headers['x-foo'], 'bar', `Expected header 'x-foo: bar'`)
    assert(responseFromProxy.headers['x-bar'], 'baz', `Expected header 'x-bar: baz'`)
  },
}

export default testCase
