import { TestCase } from '../../types/testCase'
import { testAgentCacheHit, createAgentCacheTargets } from '../../utils/agentCacheHeaders'

const testCase: TestCase = {
  name: 'agent response cache headers on cache hit',
  test: async (api) => {
    await testAgentCacheHit(api, createAgentCacheTargets().v3)
  },
}

export default testCase
