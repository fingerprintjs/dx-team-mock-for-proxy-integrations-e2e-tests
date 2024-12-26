import axios, { AxiosRequestConfig } from 'axios'

export const httpClient = axios.create({
  withCredentials: true,
})

export const sendAxiosRequestWithRequestInit = async (url: URL, requestInit: AxiosRequestConfig) => {
  return axios.request({
    url: url.toString(),
    ...requestInit,
  })
}
