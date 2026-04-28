import { useEffect, useState } from 'react'
import api from '../api/axios'
import useAuthStore from '../store/authStore'
import { decodeToken } from '../utils/decodeToken'

export function useSessionRestore() {
  const [isRestoring, setIsRestoring] = useState(true)

  useEffect(() => {
    const { setAuth, clearAuth } = useAuthStore.getState()

    api.post('/auth/refresh')
      .then(res => {
        const  { accessToken } = res.data.data
        const user = decodeToken(accessToken)
        setAuth(user, accessToken)
      })
      .catch(() => clearAuth())
      .finally(() => setIsRestoring(false))
  }, [])

  return isRestoring
}