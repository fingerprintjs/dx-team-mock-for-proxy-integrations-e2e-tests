import { ApplicationLogger, RequestPayload, ResponsePayload } from '../types'
import { NextFunction, Request, Response } from 'express'

const beforeResponseMiddleware = (logger: ApplicationLogger) => (req: Request, res: Response, next: NextFunction) => {
  let requestResolve: (payload: RequestPayload) => void
  let responseResolve: (payload: ResponsePayload) => void
  let requestReject: Function, responseReject: Function
  const requestPromise = new Promise<RequestPayload>((reqResolve, reqReject) => {
    requestResolve = reqResolve
    requestReject = reqReject
  })
  const responsePromise = new Promise<ResponsePayload>((resResolve, resReject) => {
    responseResolve = resResolve
    responseReject = resReject
  })

  req.on('end', () => {
    requestResolve({
      path: req.path,
      headers: req.headers as unknown as { [key: string]: string },
      method: req.method,
      queryParams: req.query as unknown as { [key: string]: string },
      urlHost: req.get('host') || '',
    })
  })
  req.on('error', (err) => {
    requestReject(err)
  })

  res.on('finish', () => {
    responseResolve({
      contentType: String(res.getHeader('content-type') || ''),
      statusCode: res.statusCode,
    })
  })
  res.on('error', (err) => {
    responseReject(err)
  })
  next()

  Promise.all([requestPromise, responsePromise]).then(([request, response]) => {
    logger({
      requestPayload: request,
      responsePayload: response,
    })
  })
}

export default beforeResponseMiddleware
