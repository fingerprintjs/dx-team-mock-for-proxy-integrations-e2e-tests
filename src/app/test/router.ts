import * as express from 'express';
import { createTestSession, getTestSession } from './service/session';
import { RunTestsRequestSchema } from './request.types';
import { runTests } from './service/testRunner';
import { validateRequest } from 'zod-express-middleware';

const RunTestsSchema = validateRequest({
  body: RunTestsRequestSchema,
});

export function testRouter() {
  const router = express.Router();

  router.post('/run-tests', RunTestsSchema, async (req, res) => {
    const testSession = createTestSession(req.body);

    const result = await runTests(testSession);

    return res.json(result.toJSON());
  });

  router.post('/ingress', (req, res) => {
    const testSession = getTestSession(req.hostname);

    // TODO: Notify ongoing test about this ingress request and perform necessary actions
  });

  router.get('/cdn', (req, res) => {
    const testSession = getTestSession(req.hostname);

    // TODO: Notify ongoing test about this CDN request and perform necessary actions
  });

  return router;
}
