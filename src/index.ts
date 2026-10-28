import { createApp } from './app'
import { logger } from './logger'

const port = Number(process.env.PORT) || 3000

createApp({ logger }).listen(port, () => logger.info({ port }, 'Application started'))
