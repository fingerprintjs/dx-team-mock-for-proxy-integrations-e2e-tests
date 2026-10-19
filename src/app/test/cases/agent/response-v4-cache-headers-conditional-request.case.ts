import { TestCase } from '../../types/testCase'
import { testAgentConditionalRequest, createAgentCacheTargets } from '../../utils/agentCacheHeaders'

const testCase: TestCase = {
  name: 'v4 agent response cache headers on conditional request',
  test: async (api) => {
    await testAgentConditionalRequest(api, createAgentCacheTargets(api).v4)
  },
}

export default testCase
