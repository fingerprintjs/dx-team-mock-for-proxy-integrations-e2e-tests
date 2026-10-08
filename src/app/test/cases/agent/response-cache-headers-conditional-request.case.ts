import { TestCase } from '../../types/testCase'
import { testAgentConditionalRequest, createAgentCacheTargets } from '../../utils/agentCacheHeaders'

const testCase: TestCase = {
  name: 'agent response cache headers on conditional request',
  test: async (api) => {
    await testAgentConditionalRequest(api, createAgentCacheTargets().v3)
  },
}

export default testCase
