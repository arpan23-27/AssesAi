import { create } from 'zustand'

const useAuthStore = create((set) => ({
  user: null,
  accessToken: null,
  setAuth: (user, accessToken) => set({ user, accessToken }),
  clearAuth: () => set({ user: null, accessToken: null }),
}))

// Helpers for use outside React components
export const getAccessToken = () => useAuthStore.getState().accessToken
export const setAccessToken = (token) => useAuthStore.setState({ accessToken: token })
export const clearAuth = () => useAuthStore.getState().clearAuth()

export default useAuthStore
