import { RunTestsRequestSchema } from './request.types'
import { createTestSession, finalizeTestSession, TestSession } from './service/session'
import { runTests } from './service/testRunner'
import { Routing, EndpointsFactory } from 'express-zod-api'
import { TestResponseSchema } from './response.types'

export const testRouting = (factory: EndpointsFactory): Routing => ({
  'run-tests': factory.build({
    method: 'post',
    input: RunTestsRequestSchema,
    output: TestResponseSchema,
    handler: async ({ input, logger }) => {
      let testSession: TestSession | undefined
      try {
        testSession = createTestSession(input)
        const rawInclude = input.include && input.include.length > 0 ? input.include : input.testsFilter
        const include = (rawInclude ?? []) as string[]
        const exclude = [...(input.exclude ?? [])] as string[]
        const includeHasV4 = () => include.some((it: string) => it.includes('v4'))
        // Unless v4 is explicitly enabled by flag or filters, exclude it
        if (!input.enableV4Tests && !includeHasV4()) {
          exclude.push('v4')
        }

        if (input.testsFilter) {
          logger.warn('[DEPRECATION] `testsFilter` is deprecated. Use `include`/`exclude`.')
        }

        const result = await runTests(testSession, { include, exclude })

        return result.toTestResponse()
      } catch (e) {
        if (testSession) {
          finalizeTestSession(testSession)
        }

        throw e
      }
    },
  }),
})
