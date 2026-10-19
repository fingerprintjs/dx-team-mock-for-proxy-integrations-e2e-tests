import { TestCase } from '../../types/testCase'
import { testAgentCacheMiss, createAgentCacheTargets } from '../../utils/agentCacheHeaders'

const testCase: TestCase = {
  name: 'agent response cache headers on cache miss',
  test: async (api) => {
    await testAgentCacheMiss(api, createAgentCacheTargets(api).v3)
  },
}

export default testCase
