import express from 'express'
import { Express, NextFunction, Request, Response } from 'express'
import beforeResponseMiddleware from './middlewares/beforeResponse.middleware'
import { proxyReceiverRouter } from './app/proxy-receiver/router'
import { testRouting } from './app/test/router'
import { loadTestCases } from './app/test/service/testRunner'
import { buildInfo } from './version'
import { installLogger } from './utils/groupedLogger'
import { attachRouting, EndpointsFactory, ResultHandler, createConfig } from 'express-zod-api'
import { z } from 'zod'

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
  handler: ({ error, response, output }) => {
    if (!error) {
      response.status(200).json(output)
      return
    }
    const statusCode = error.name === 'NotFoundError' ? 404 : 500
    response.status(error instanceof Error && 'status' in error ? (error as any).status : statusCode).json({
      error: {
        code: error instanceof Error && 'code' in error ? (error as any).code : 'INTERNAL_SERVER_ERROR',
        message: error.message,
      },
    })
  },
})

const factory = new EndpointsFactory(resultHandler)

const app: Express = express()
const port = Number(process.env.PORT) || 3000

installLogger({
  mode: process.env.LOG_LIVE === 'true' ? 'live' : 'grouped',
})

app.set('view engine', 'ejs')

app.use(express.json())
// Needed for test cases that send and expect binary bodies
app.use(express.raw({ type: 'application/octet-stream' }))
app.use(beforeResponseMiddleware(console.info))

app.use(proxyReceiverRouter())
attachRouting(
  createConfig({
    app,
    logger: console,
    cors: true,
  }),
  {
    'api/test': testRouting(factory),
  }
)

app.all('/health', (_, res) => {
  res.send('It works!')
})

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
function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  console.error(err)
  res.status(500).send({ reason: err.message })
}

app.use(errorHandler)

app.listen(port, () => console.log(`Application started on port ${port}`))
