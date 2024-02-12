import * as express from 'express'
import { Express } from 'express'
import beforeResponseMiddleware from './middlewares/beforeResponse.middleware'
import { proxyReceiverRouter } from './app/proxy-receiver/router'
import router from './router'
import { testRouter } from './app/test/router'

const app: Express = express()
const port = Number(process.env.PORT) || 3000

app.use(express.json())
app.use(beforeResponseMiddleware(console.info))
app.use(router)
app.use(proxyReceiverRouter())
app.use('/api/test', testRouter())
app.listen(port, () => console.log(`Application started on port ${port}`))
