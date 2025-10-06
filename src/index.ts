import * as express from 'express'
import { Express, NextFunction, Request, Response } from 'express'
import beforeResponseMiddleware from './middlewares/beforeResponse.middleware'
import { proxyReceiverRouter } from './app/proxy-receiver/router'
import { testRouter } from './app/test/router'
import { loadTestCases } from './app/test/service/testRunner'
import { buildInfo } from "./version";

const app: Express = express()
const port = Number(process.env.PORT) || 3000

app.set('view engine', 'ejs')

app.use(express.json())
app.use(beforeResponseMiddleware(console.info))

app.use(proxyReceiverRouter())
app.use('/api/test', testRouter())

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
