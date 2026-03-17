import * as express from 'express'
import { RunTestsRequestSchema } from './request.types'
import { createTestSession, finalizeTestSession, TestSession } from './service/session'
import { runTests } from './service/testRunner'
import { validateRequest } from 'zod-express-middleware'
import { HttpError } from './errors'

const RunTestsSchema = validateRequest({
  body: RunTestsRequestSchema,
})

export function testRouter() {
  const router = express.Router()

  router.post('/run-tests', RunTestsSchema, async (req, res, next) => {
    let testSession: TestSession
    try {
      testSession = createTestSession(req.body)
      const rawInclude = req.body.include && req.body.include.length > 0 ? req.body.include : req.body.testsFilter
      const include = rawInclude ?? []
      const exclude = [...(req.body.exclude ?? [])]
      const includeHasV4 = () => include.some((it) => it.includes('v4'))
      // Unless v4 is explicitly enabled by flag or filters, exclude it
      if (!req.body.enableV4Tests && !includeHasV4()) {
        exclude.push('v4')
      }

      if (req.body.testsFilter) {
        console.warn('[DEPRECATION] `testsFilter` is deprecated. Use `include`/`exclude`.')
      }

      const result = await runTests(testSession, { include, exclude })

      return res.json(result.toTestResponse())
    } catch (e) {
      if (testSession) {
        finalizeTestSession(testSession)
      }

      if (e instanceof HttpError) {
        return res.status(e.status).json({
          error: {
            code: e.code,
            message: e.message,
          },
        })
      }
      return next(e)
    }
  })

  return router
}
