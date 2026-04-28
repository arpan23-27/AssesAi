import React, { useState } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import api from '../../api/axios'
import useAuthStore from '../../store/authStore'
import { decodeToken } from '../../utils/decodeToken'
import ThemeToggle from '../../components/ThemeToggle'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const setAuth = useAuthStore(s => s.setAuth)
  const navigate = useNavigate()
  const location = useLocation()
  const successMessage = location.state?.message

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await api.post('/auth/login', { email, password })
      const { accessToken } = res.data.data
      const user = decodeToken(accessToken)
      setAuth(user, accessToken)
      navigate('/')
    } catch (err) {
      const errorData = err.response?.data?.error
      setError(errorData?.details?.[0]?.issue || errorData?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
    }}>
      <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem' }}>
        <ThemeToggle />
      </div>

      <div style={{ width: '100%', maxWidth: '380px' }}>
        {/* Brand */}
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '28px',
            fontWeight: 500,
            color: 'var(--text-1)',
            letterSpacing: '-0.5px',
            marginBottom: '6px',
          }}>
            <span style={{ color: 'var(--accent)' }}>Asses</span>AI
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'var(--text-3)',
            letterSpacing: '.04em',
          }}>
            // adaptive assessment platform
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--surface)',
          border: '0.5px solid var(--border)',
          borderRadius: '12px',
          padding: '28px',
        }}>
          {successMessage && (
            <div style={{
              background: 'var(--correct-bg)',
              border: '0.5px solid var(--correct)',
              borderRadius: '6px',
              padding: '10px 12px',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--correct)',
              marginBottom: '16px',
            }}>
              ✓ {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '14px' }}>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--text-3)',
                marginBottom: '6px',
                letterSpacing: '.04em',
              }}>$ email</div>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                style={{
                  width: '100%',
                  background: 'var(--surface-2)',
                  border: '0.5px solid var(--border)',
                  borderRadius: '6px',
                  padding: '9px 12px',
                  fontSize: '13px',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-1)',
                  transition: 'border-color .15s',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--border-focus)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--text-3)',
                marginBottom: '6px',
                letterSpacing: '.04em',
              }}>$ password</div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{
                  width: '100%',
                  background: 'var(--surface-2)',
                  border: '0.5px solid var(--border)',
                  borderRadius: '6px',
                  padding: '9px 12px',
                  fontSize: '13px',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-1)',
                  transition: 'border-color .15s',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--border-focus)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>

            {error && (
              <div style={{
                background: 'var(--wrong-bg)',
                border: '0.5px solid var(--wrong)',
                borderRadius: '6px',
                padding: '10px 12px',
                fontSize: '12px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--wrong)',
                marginBottom: '14px',
              }}>
                ✗ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                background: loading ? 'var(--surface-2)' : 'var(--primary)',
                border: '0.5px solid transparent',
                borderRadius: '6px',
                padding: '10px',
                fontSize: '13px',
                fontFamily: 'var(--font-mono)',
                color: loading ? 'var(--text-3)' : '#fff',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background .15s',
                letterSpacing: '.02em',
              }}
            >
              {loading ? '// authenticating...' : '→ authenticate'}
            </button>
          </form>
        </div>

        <div style={{
          textAlign: 'center',
          marginTop: '16px',
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--text-3)',
        }}>
          no account?{' '}
          <Link to="/register" style={{ color: 'var(--accent)' }}>register →</Link>
        </div>
      </div>
    </div>
  )
}