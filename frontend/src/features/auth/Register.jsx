import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../../api/axios'
import ThemeToggle from '../../components/ThemeToggle'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/register', { email, password })
      navigate('/login', { state: { message: 'Registration successful. Please log in.' } })
    } catch (err) {
      const errorData = err.response?.data?.error
      setError(errorData?.details?.[0]?.issue || errorData?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%',
    background: 'var(--surface-2)',
    border: '0.5px solid var(--border)',
    borderRadius: '6px',
    padding: '9px 12px',
    fontSize: '13px',
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-1)',
    transition: 'border-color .15s',
  }

  const labelStyle = {
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    color: 'var(--text-3)',
    marginBottom: '6px',
    letterSpacing: '.04em',
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
            // create your account
          </div>
        </div>

        <div style={{
          background: 'var(--surface)',
          border: '0.5px solid var(--border)',
          borderRadius: '12px',
          padding: '28px',
        }}>
          <form onSubmit={handleSubmit}>
            {[
              { label: '$ email', type: 'email', value: email, set: setEmail, placeholder: 'you@example.com' },
              { label: '$ password', type: 'password', value: password, set: setPassword, placeholder: '••••••••' },
              { label: '$ confirm password', type: 'password', value: confirmPassword, set: setConfirmPassword, placeholder: '••••••••' },
            ].map(({ label, type, value, set, placeholder }) => (
              <div key={label} style={{ marginBottom: '14px' }}>
                <div style={labelStyle}>{label}</div>
                <input
                  type={type}
                  value={value}
                  onChange={e => set(e.target.value)}
                  required
                  placeholder={placeholder}
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = 'var(--border-focus)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>
            ))}

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
                marginTop: '6px',
              }}
            >
              {loading ? '// creating account...' : '→ register'}
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
          already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent)' }}>login →</Link>
        </div>
      </div>
    </div>
  )
}