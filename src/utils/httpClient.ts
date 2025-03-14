import axios, { AxiosInstance, AxiosRequestConfig, CreateAxiosDefaults } from 'axios'
import * as http from 'http'
import * as https from 'https'

// https.globalAgent.options.rejectUnauthorized = false

const httpAgent = new http.Agent({})
const httpsAgent = new https.Agent({ rejectUnauthorized: false })

export const createNewHttpClient = (config: CreateAxiosDefaults = { withCredentials: true, httpsAgent, httpAgent }) => {
  return axios.create(config)
}

export const httpClient = createNewHttpClient()

export const sendAxiosRequestWithRequestConfig = async (
  url: URL,
  axiosRequestConfig: AxiosRequestConfig,
  instance: AxiosInstance
) => {
  return instance.request({
    url: url.toString(),
    ...axiosRequestConfig,
  })
}
