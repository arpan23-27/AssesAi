import axios from 'axios'
import { getAccessToken, setAccessToken, clearAuth } from '../store/authStore'

// Refresh lock state
let isRefreshing = false
let refreshPromise = null

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  withCredentials: true, // send cookies automatically
})

// Request interceptor: attach Authorization header
api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`
  }
  return config
})

// Response interceptor: handle 401 with refresh lock
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh') // ← skip refresh calls
    ) {
      originalRequest._retry = true

      try {
        if (!isRefreshing) {
          isRefreshing = true
          refreshPromise = api.post('/auth/refresh')
            .then((res) => {
              const newToken = res.data.data.accessToken
              setAccessToken(newToken)
              return newToken
            })
            .catch((err) => {
              clearAuth()
              window.location.href = '/login'
              throw err
            })
            .finally(() => {
              isRefreshing = false
            })
        }

        const newToken = await refreshPromise
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`
        return api(originalRequest)
      } catch (err) {
        return Promise.reject(err)
      }
    }

    return Promise.reject(error)
  }
)

export default api
