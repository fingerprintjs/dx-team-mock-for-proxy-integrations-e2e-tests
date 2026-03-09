import { assert } from '../../service/assert'
import { TestCase } from '../../types/testCase'
import { getRandomString } from '../../utils/getRandomString'

const testCase: TestCase = {
  name: 'v4 browser cache request preserve path',
  test: async (api) => {
    const path = `/${getRandomString()}/${getRandomString()}/${getRandomString()}`
    const { requestFromProxy } = await api.sendRequestToV4CacheEndpoint({
      pathname: path,
    })

    const requestUrl = new URL(`https://${requestFromProxy.get('host')}${requestFromProxy.url}`)

    assert(path, requestUrl.pathname, 'pathname')
  },
}

export default testCase
