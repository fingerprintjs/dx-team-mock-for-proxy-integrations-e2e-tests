import { assert } from '../../service/assert'
import { TestCase } from '../../types/testCase'
import { getRandomString } from '../../utils/getRandomString'

const testCase: TestCase = {
  name: 'browser cache request preserve path',
  test: async (api) => {
    const path = `/${getRandomString()}/${getRandomString()}/${getRandomString()}`
    const { requestFromProxy } = await api.sendRequestToCacheEndpoint({ pathname: path })

    const requestUrl = new URL(`https://${requestFromProxy.get('host')}${requestFromProxy.url}`)

    assert(requestUrl.pathname, path, 'pathname')
  },
}

export default testCase
