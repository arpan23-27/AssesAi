import React from 'react'
import useThemeStore from '../store/themeStore'

export default function ThemeToggle() {
  const { theme, toggle } = useThemeStore()
  return (
    <button onClick={toggle} style={{
      background: 'transparent',
      border: '0.5px solid var(--border)',
      borderRadius: '6px',
      padding: '5px 10px',
      cursor: 'pointer',
      fontSize: '12px',
      fontFamily: 'var(--font-mono)',
      color: 'var(--text-2)',
      transition: 'border-color .15s, color .15s',
    }}>
      {theme === 'dark' ? '◑ light' : '◐ dark'}
    </button>
  )
}