import { assert } from '../../service/assert'
import { TestCase } from '../../types/testCase'
import { getRandomString } from '../../utils/getRandomString'

const testCase: TestCase = {
  name: 'browser cache preserve path',
  test: async (api) => {
    const path = `/${getRandomString()}/${getRandomString()}/${getRandomString()}`
    const { requestFromProxy } = await api.sendRequestToCacheEndpoint({}, undefined, path)

    const requestUrl = new URL(`https://${requestFromProxy.get('host')}${requestFromProxy.url}`)

    assert(path, requestUrl.pathname, 'pathname')
  },
}

export default testCase
