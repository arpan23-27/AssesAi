import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../../api/axios'
import useAuthStore from '../../store/authStore'
import ThemeToggle from '../../components/ThemeToggle'

export default function Results() {
  const user = useAuthStore(s => s.user)

  const { data, error, isLoading } = useQuery({
    queryKey: ['mastery'],
    queryFn: async () => {
      const res = await api.get('/results/mastery')
      return Array.isArray(res.data) ? res.data : [res.data]
    },
  })

  const handleLogout = async () => {
    try { await api.post('/auth/logout') } catch (_) {}
    useAuthStore.getState().clearAuth()
    window.location.href = '/login'
  }

  const topBar = (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '14px 28px',
      borderBottom: '0.5px solid var(--border)',
      background: 'var(--surface)',
    }}>
      <Link to="/" style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '22px',
        fontWeight: 600,
        color: 'var(--text-1)',
        textDecoration: 'none',
        letterSpacing: '-0.5px',
      }}>
        <span style={{ color: 'var(--accent)' }}>Asses</span>AI
      </Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              background: 'var(--primary-glow)',
              border: '0.5px solid var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-mono)', fontSize: '11px',
              fontWeight: 500, color: 'var(--accent)',
            }}>
              {user.email?.[0]?.toUpperCase()}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-3)' }}>
              {user.email?.split('@')[0]}
            </div>
          </div>
        )}
        <ThemeToggle />
        <button
          onClick={handleLogout}
          style={{
            background: 'transparent',
            border: '0.5px solid var(--border)',
            borderRadius: '6px',
            padding: '5px 12px',
            cursor: 'pointer',
            fontSize: '12px',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-3)',
            transition: 'border-color .15s, color .15s',
          }}
          onMouseEnter={e => { e.target.style.borderColor = 'var(--wrong)'; e.target.style.color = 'var(--wrong)' }}
          onMouseLeave={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.color = 'var(--text-3)' }}
        >
          logout
        </button>
      </div>
    </div>
  )

  if (isLoading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {topBar}
      <div style={{ padding: '4rem', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-3)' }}>
        // loading mastery data...
      </div>
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {topBar}
      <div style={{ padding: '4rem', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--wrong)' }}>
        ✗ failed to load results
      </div>
    </div>
  )

  const best = data?.length
    ? Math.max(...data.map(m => parseFloat(m.ability_score) * 100))
    : 0

  const weakest = data?.length
    ? data.reduce((a, b) => parseFloat(a.ability_score) < parseFloat(b.ability_score) ? a : b)
    : null

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {topBar}
      <div style={{
        maxWidth: '1080px',
        margin: '0 auto',
        padding: '3rem 2rem',
        display: 'grid',
        gridTemplateColumns: '1fr 300px',
        gap: '32px',
        alignItems: 'start',
      }}>

        {/* LEFT */}
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-3)', letterSpacing: '.08em', marginBottom: '10px' }}>
            // MASTERY_REPORT
          </div>
          <h2 style={{ fontSize: '36px', fontWeight: 500, color: 'var(--text-1)', marginBottom: '4px', letterSpacing: '-0.5px' }}>
            Knowledge map
          </h2>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-3)', marginBottom: '32px' }}>
            // {data?.length} concept{data?.length !== 1 ? 's' : ''} tracked
          </p>

          <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 60px 160px 60px', gap: '16px', padding: '10px 20px', borderBottom: '0.5px solid var(--border)' }}>
              {['concept', 'mastery', 'score', 'questions', 'trend'].map(h => (
                <div key={h} style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)', letterSpacing: '.06em' }}>{h}</div>
              ))}
            </div>

            {data?.map((m, idx) => {
              const pct = Math.round(parseFloat(m.ability_score) * 100)
              const color = pct >= 70 ? 'var(--correct)' : pct >= 40 ? '#F59E0B' : 'var(--wrong)'
              const trend = pct >= 70 ? '↑' : pct >= 40 ? '→' : '↓'
              return (
                <div
                  key={idx}
                  style={{ display: 'grid', gridTemplateColumns: '100px 1fr 60px 160px 60px', gap: '16px', padding: '16px 20px', alignItems: 'center', borderBottom: idx < data.length - 1 ? '0.5px solid var(--border)' : 'none', transition: 'background .15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-glow)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-1)', fontWeight: 500 }}>{m.concept}</div>
                  <div style={{ height: '5px', background: 'var(--surface-2)', borderRadius: '3px' }}>
                    <div style={{ height: '5px', background: color, borderRadius: '3px', width: `${pct}%`, transition: 'width .8s ease' }} />
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color, fontWeight: 500 }}>{pct}%</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                    {m.questions_seen}q · {m.questions_correct}✓
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '16px', color, fontWeight: 500 }}>{trend}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: '14px', padding: '22px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-3)', letterSpacing: '.06em', marginBottom: '12px' }}>
              // BEST MASTERY
            </div>
            <div style={{ fontSize: '52px', fontWeight: 500, fontFamily: 'var(--font-mono)', color: best >= 70 ? 'var(--correct)' : best >= 40 ? '#F59E0B' : 'var(--wrong)', lineHeight: 1, marginBottom: '6px' }}>
              {Math.round(best)}%
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-3)' }}>
              // across all concepts
            </div>
          </div>

          {weakest && (
            <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: '14px', padding: '22px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-3)', letterSpacing: '.06em', marginBottom: '12px' }}>
                // RECOMMENDATION
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--text-1)', marginBottom: '8px', fontWeight: 500 }}>
                Focus on {weakest.concept}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-3)', lineHeight: 1.7 }}>
                // lowest score at {Math.round(parseFloat(weakest.ability_score) * 100)}%
                <br />// start a new session targeting this concept
              </div>
            </div>
          )}

          <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: '14px', padding: '22px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-3)', letterSpacing: '.06em', marginBottom: '14px' }}>
              // STATS
            </div>
            {[
              { label: 'concepts tracked', value: data?.length || 0 },
              { label: 'total questions seen', value: data?.reduce((sum, m) => sum + m.questions_seen, 0) || 0 },
              { label: 'total correct', value: data?.reduce((sum, m) => sum + m.questions_correct, 0) || 0 },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-3)' }}>{label}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '16px', fontWeight: 500, color: 'var(--accent)' }}>{value}</div>
              </div>
            ))}
          </div>

          <Link
            to="/"
            style={{ display: 'block', background: 'var(--primary)', borderRadius: '10px', padding: '14px 20px', textDecoration: 'none', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '13px', color: '#fff', transition: 'background .15s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--primary)'}
          >
            → start new session
          </Link>
        </div>
      </div>
    </div>
  )
}