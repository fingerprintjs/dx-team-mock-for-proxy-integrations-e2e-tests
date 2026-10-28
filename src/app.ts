import express, { Express, NextFunction, Request, Response } from 'express'
import { attachRouting, createConfig, EndpointsFactory, ResultHandler } from 'express-zod-api'
import { z } from 'zod'
import { proxyReceiverRouter } from './app/proxy-receiver/router'
import { testRouting } from './app/test/router'
import { loadTestCases } from './app/test/service/testRunner'
import { Logger, toAbstractLogger } from './logger'
import { requestLogger } from './middlewares/requestLogger.middleware'
import { buildInfo } from './version'

const resultHandler = new ResultHandler({
  positive: (output: z.ZodTypeAny) => ({
    schema: output,
    mimeType: 'application/json',
  }),
  negative: () => ({
    schema: z.object({
      error: z.object({
        code: z.string(),
        message: z.string(),
      }),
    }),
    mimeType: 'application/json',
  }),
  handler: ({ error, response, output, logger }) => {
    if (!error) {
      response.status(200).json(output)
      return
    }
    const statusCode = error.name === 'NotFoundError' ? 404 : 500
    const status = error instanceof Error && 'status' in error ? (error as any).status : statusCode
    const code = error instanceof Error && 'code' in error ? (error as any).code : 'INTERNAL_SERVER_ERROR'

    logger[status >= 500 ? 'error' : 'warn']('Request failed', { http: { status_code: status }, code, error })

    response.status(status).json({
      error: {
        code,
        message: error.message,
      },
    })
  },
})

const factory = new EndpointsFactory(resultHandler)

export function createApp({ logger }: { logger: Logger }): Express {
  const app: Express = express()

  app.set('view engine', 'ejs')

  // Before the request logger, so that health probes are not logged
  app.all('/health', (_, res) => {
    res.send('It works!')
  })

  // Before the body parsers, so that requests they reject are logged too
  app.use(requestLogger(logger))

  app.use(express.json())
  // Needed for test cases that send and expect binary bodies
  app.use(express.raw({ type: 'application/octet-stream' }))

  app.use(proxyReceiverRouter())
  attachRouting(
    createConfig({
      app,
      logger: toAbstractLogger(logger),
      // The startup banner is not JSON
      startupLogo: false,
      cors: true,
    }),
    {
      'api/test': testRouting(factory),
    }
  )

  app.get('/version', (_, res) => {
    res.json(buildInfo)
  })

  app.get('/', (_, res) => {
    res.render('index', { version: buildInfo.version })
  })

  app.get('/test-cases', async (req, res) => {
    const testCases = await loadTestCases()

    res.json({
      data: testCases.map((t) => t.name),
    })
  })

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error({ error: err }, 'Unhandled request error')
    res.status(500).send({ reason: err.message })
  })

  return app
}
