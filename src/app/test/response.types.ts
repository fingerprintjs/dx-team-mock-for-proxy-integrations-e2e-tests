import { z } from 'zod'
import { TestSessionStatus } from './service/session'

export const TestResponseSchema = z.object({
  host: z.hostname(),
  status: z.enum(TestSessionStatus),
  results: z.array(
    z.object({
      testName: z.string(),
      // Without these the client cannot tell a pass from a failure, nor say why it failed.
      passed: z.boolean(),
      reason: z.string().optional(),
      meta: z.unknown().optional(),
      requestDurationMs: z.number(),
      logs: z.array(z.string()).optional(),
      attempts: z
        .array(z.object({ attempt: z.number(), name: z.string(), reason: z.string(), at: z.string() }))
        .optional(),
    })
  ),
})

export type TestResponseSchema = z.infer<typeof TestResponseSchema>
