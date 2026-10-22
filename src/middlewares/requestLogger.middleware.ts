import { RequestHandler } from 'express'
import { Logger } from '../logger'

// Headers, query strings and bodies are left out on purpose, as they carry secrets. Details are nested under
// `http` because a flat `status` or `host` would clash with the reserved attributes of Datadog
export const requestLogger =
  (logger: Logger): RequestHandler =>
  (req, res, next) => {
    const startedAt = process.hrtime.bigint()
    let logged = false

    const log = (aborted: boolean) => {
      if (logged) {
        return
      }
      logged = true

      const fields = {
        event: 'http.request',
        http: {
          method: req.method,
          status_code: res.statusCode,
          content_type: String(res.getHeader('content-type') ?? ''),
          url_details: { path: req.path, host: req.get('host') ?? '' },
        },
        duration_ms: Math.round(Number(process.hrtime.bigint() - startedAt) / 1e5) / 10,
      }

      if (aborted) {
        logger.warn('HTTP request aborted', fields)
      } else {
        logger.info('HTTP request completed', fields)
      }
    }

    res.on('finish', () => log(false))
    // `close` follows `finish` on success, and fires alone when the client disconnects early.
    res.on('close', () => log(!res.writableFinished))

    next()
  }
