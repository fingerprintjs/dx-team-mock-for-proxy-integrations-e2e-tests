import pinoHttp from 'pino-http'
import { Logger } from '../logger'

// Headers, query strings and bodies are left out on purpose, as they carry secrets. Details are nested under
// `http` because a flat `status` or `host` would clash with the reserved attributes of Datadog
export const requestLogger = (logger: Logger) =>
  pinoHttp({
    logger,
    // The default serializers log the headers, and an error that pino-http makes up for a 500 response, whose real
    // error is logged where it happens
    serializers: { req: () => undefined, res: () => undefined, err: () => undefined },
    customAttributeKeys: { responseTime: 'duration_ms' },
    customSuccessMessage: () => 'HTTP request completed',
    customErrorMessage: () => 'HTTP request failed',
    customSuccessObject: (req, res, value) => ({ ...value, ...requestDetails(req, res) }),
    customErrorObject: (req, res, _error, value) => ({ ...value, ...requestDetails(req, res) }),
  })

function requestDetails(
  req: { method?: string; url?: string; headers: { host?: string } },
  res: { statusCode: number; getHeader(name: string): unknown }
) {
  return {
    event: 'http.request',
    http: {
      method: req.method,
      status_code: res.statusCode,
      content_type: String(res.getHeader('content-type') ?? ''),
      url_details: { path: req.url?.split('?')[0], host: req.headers.host },
    },
  }
}
