import * as express from 'express'
import { RunTestsRequestSchema } from './request.types'
import { createTestSession, cleanupTestSession } from './service/session'
import { runTests } from './service/testRunner'
import { validateRequest } from 'zod-express-middleware'

const RunTestsSchema = validateRequest({
  body: RunTestsRequestSchema,
})

export function testRouter() {
  const router = express.Router()

  router.post('/run-tests', RunTestsSchema, async (req, res, next) => {
    try {
      const testSession = createTestSession(req.body)

      const result = await runTests(testSession)

      return res.json(result.toTestResponse())
    } catch (e) {
      // Avoid dangling test sessions
      cleanupTestSession(req.body.host)

      next(e)
    }
  })

  return router
}
