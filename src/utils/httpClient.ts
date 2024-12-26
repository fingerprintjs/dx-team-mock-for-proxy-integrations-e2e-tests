import axios, { AxiosRequestConfig } from 'axios'

export const httpClient = axios.create({
  withCredentials: true,
})

export const sendAxiosRequestWithRequestConfig = async (url: URL, axiosRequestConfig: AxiosRequestConfig) => {
  return axios.request({
    url: url.toString(),
    ...axiosRequestConfig,
  })
}
