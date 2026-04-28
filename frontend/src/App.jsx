import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import useAuthStore from './store/authStore'
import useThemeStore from './store/themeStore'
import { useSessionRestore } from './hooks/useSessionRestore'
import './styles/theme.css'

import Login from './features/auth/Login'
import Register from './features/auth/Register'
import Quiz from './features/quiz/Quiz'
import Results from './features/results/Results'

function ProtectedRoute({ children }) {
  const accessToken = useAuthStore(s => s.accessToken)
  if (!accessToken) return <Navigate to="/login" replace />
  return children
}

const queryClient = new QueryClient()

export default function App() {
  const isRestoring = useSessionRestore()
  const init = useThemeStore(s => s.init)

  useEffect(() => { init() }, [init])

  if (isRestoring) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#111118',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#4B5563',
      }}>
        // restoring session...
      </div>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<ProtectedRoute><Quiz /></ProtectedRoute>} />
          <Route path="/results" element={<ProtectedRoute><Results /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}