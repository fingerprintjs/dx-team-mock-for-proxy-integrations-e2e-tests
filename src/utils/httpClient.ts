import axios, { AxiosInstance, AxiosRequestConfig, CreateAxiosDefaults } from 'axios'

export const createNewHttpClient = (config: CreateAxiosDefaults = { withCredentials: true }) => {
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
