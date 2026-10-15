import { TestCase } from '../../types/testCase'
import { assertRegionRouting } from '../../utils/region'

const testCase: TestCase = {
  name: 'ingress request region',
  test: async (api) => {
    await assertRegionRouting(api, (query) => api.sendRequestToIngress({ query }))
  },
}

export default testCase
