import axios from 'axios'

export type AxiosDNSLookupFunction = typeof axios.defaults.lookup

export const httpClient = axios.create({})

export const sendAxiosRequestWithRequestInit = async (url: string | URL, requestInit: RequestInit) => {
  const { method, headers, ...rest } = requestInit

  if (url instanceof URL) {
    url = url.toString()
  }

  return axios.request({
    url,
    method,
    headers: createAxiosHeadersFromHeadersInit(headers),
    ...rest,
  })
}

export const createAxiosHeadersFromHeadersInit = (headersInit: HeadersInit): Record<string, string> => {
  if (headersInit instanceof Headers) {
    return Object.fromEntries(headersInit.entries())
  }

  if (Array.isArray(headersInit)) {
    return Object.fromEntries(headersInit)
  }

  if (typeof headersInit === 'object' && headersInit !== null) {
    return { ...headersInit }
  }

  return {}
}
