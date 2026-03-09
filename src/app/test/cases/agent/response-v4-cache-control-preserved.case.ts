import { TestCase } from '../../types/testCase'
import { assertToBeTruthy } from '../../service/assert'

const testCase: TestCase = {
  name: 'v4 agent response cache-control preserved or in-limit',
  test: async (api) => {
    const { responseFromProxy } = await api.sendRequestToV4Cdn({
      mockResponse: {
        headers: {
          'cache-control': 'max-age=3600',
        },
      },
    })

    const value = `${responseFromProxy.headers['cache-control'] || ''}`.toLowerCase()
    assertToBeTruthy(
      'cache-control',
      value.includes('max-age=3600') || value.includes('s-maxage=60'),
      `Expected Cache-Control header to be preserved or set to s-maxage=60, got: ${value}`
    )
  },
}

export default testCase
