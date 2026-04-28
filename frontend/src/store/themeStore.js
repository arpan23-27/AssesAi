import { create } from 'zustand'

const useThemeStore = create((set) => ({
  theme: 'dark',
  toggle: () => set((s) => {
    const next = s.theme === 'dark' ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', next)
    return { theme: next }
  }),
  init: () => {
    document.documentElement.setAttribute('data-theme', 'dark')
  }
}))

export default useThemeStore