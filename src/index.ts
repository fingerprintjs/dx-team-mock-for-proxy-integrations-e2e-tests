import { createApp } from './app'
import { installConsoleBridge, logger } from './logger'

installConsoleBridge(logger)

const port = Number(process.env.PORT) || 3000

createApp({ logger }).listen(port, () => logger.info('Application started', { port }))
