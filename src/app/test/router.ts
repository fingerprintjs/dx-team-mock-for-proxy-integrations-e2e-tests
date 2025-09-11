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
      const include = req.body.include && req.body.include.length > 0 ? req.body.include : req.body.testsFilter
      const exclude = req.body.exclude

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
