import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../../api/axios'
import { getAccessToken } from '../../store/authStore'
import useAuthStore from '../../store/authStore'
import ThemeToggle from '../../components/ThemeToggle'

// Same env-driven base the axios client uses. The explanation endpoint is a raw
// fetch (for SSE streaming) rather than an axios call, so it needs the URL too.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export default function Quiz() {
  const [quizState, setQuizState] = useState('idle')
  const [session, setSession] = useState(null)
  const [question, setQuestion] = useState(null)
  const [selectedAnswer, setSelectedAnswer] = useState(null)
  const [result, setResult] = useState(null)
  const [explanation, setExplanation] = useState('')
  const [loading, setLoading] = useState(false)
  const [showNext, setShowNext] = useState(false)
  const [nextQuestion, setNextQuestion] = useState(null)
  const [correctCount, setCorrectCount] = useState(0)
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [finalResult, setFinalResult] = useState(null)
  const [difficulty, setDifficulty] = useState('basic')
  const user = useAuthStore(s => s.user)
  const clearAuth = useAuthStore(s => s.clearAuth)
  const navigate = useNavigate()

  const { data: masteryData } = useQuery({
    queryKey: ['mastery'],
    queryFn: async () => {
      const res = await api.get('/results/mastery')
      return Array.isArray(res.data) ? res.data : [res.data]
    },
    retry: false,
  })

  const handleLogout = async () => {
    try { await api.post('/auth/logout') } catch { /* ignore */ }
    clearAuth()
    navigate('/login')
  }

  const startQuiz = async (technologyId, diff) => {
    setLoading(true)
    try {
      const res = await api.post('/quiz/sessions', { technologyId, difficulty: diff })
      setSession(res.data.session)
      setQuestion(res.data.firstQuestion)
      setQuizState('active')
      setCorrectCount(0)
      setTotalQuestions(0)
      setFinalResult(null)
      setResult(null)
      setExplanation('')
      setShowNext(false)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  // Completing a session sends no score — the server recomputes it from the
  // recorded answers and returns the authoritative numbers.
  const completeSession = async () => {
    try {
      const res = await api.post(`/quiz/sessions/${session.id}/complete`)
      setFinalResult(res.data)
    } catch (err) { console.error(err) }
  }

  const submitAnswer = async () => {
    if (!question || selectedAnswer === null) return
    setLoading(true)
    try {
      const res = await api.post(`/quiz/sessions/${session.id}/answer`, {
        questionId: question.id,
        answerIndex: selectedAnswer,
      })
      // Local counters are display-only; the authoritative score comes from
      // the server when the session is completed.
      setTotalQuestions((t) => t + 1)
      setCorrectCount((c) => c + (res.data.isCorrect ? 1 : 0))
      setResult({ isCorrect: res.data.isCorrect, updatedAbilityScore: res.data.updatedAbilityScore })

      if (res.data.isCorrect) {
        setExplanation('')
        if (res.data.nextQuestion) {
          setTimeout(() => {
            setQuestion(res.data.nextQuestion)
            setSelectedAnswer(null)
            setResult(null)
          }, 800)
        } else {
          await completeSession()
          setTimeout(() => setQuizState('complete'), 800)
        }
      } else {
        // The server derives the question text and correct answer itself;
        // we only tell it which question and which wrong option was chosen.
        streamExplanation({
          questionId: question.id,
          wrongAnswerIndex: selectedAnswer,
        })
        setNextQuestion(res.data.nextQuestion || null)
        setShowNext(true)
      }
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const streamExplanation = async (payload) => {
    setExplanation('')
    try {
      const response = await fetch(`${API_URL}/ai/explain`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAccessToken()}`,
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const parsed = JSON.parse(line.slice(6))
              if (parsed.text) setExplanation(prev => prev + parsed.text)
            } catch { /* ignore */ }
          }
        }
      }
    } catch { 
      setExplanation('// AI explanation unavailable — check API quota')
    }
  }

  const topBar = (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '14px 28px', borderBottom: '0.5px solid var(--border)',
      background: 'var(--surface)',
    }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '22px', fontWeight: 600, color: 'var(--text-1)', letterSpacing: '-0.5px' }}>
        <span style={{ color: 'var(--accent)' }}>Asses</span>AI
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              background: 'var(--primary-glow)', border: '0.5px solid var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 500, color: 'var(--accent)',
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
            background: 'transparent', border: '0.5px solid var(--border)',
            borderRadius: '6px', padding: '5px 12px', cursor: 'pointer',
            fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-3)',
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

  // ─── IDLE ────────────────────────────────────────────────────────────────
  if (quizState === 'idle') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        {topBar}
        <div style={{
          maxWidth: '1080px', margin: '0 auto', padding: '3rem 2rem',
          display: 'grid', gridTemplateColumns: '160px 1fr 200px',
          minHeight: 'calc(100vh - 53px)',
        }}>

          {/* LEFT SIDEBAR */}
          <div style={{ borderRight: '0.5px solid var(--border)', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '0' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '20px', textAlign: 'center' }}>
              <div style={{
                width: '52px', height: '52px', borderRadius: '50%',
                background: 'var(--primary-glow)', border: '0.5px solid var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-mono)', fontSize: '20px', fontWeight: 500,
                color: 'var(--accent)', marginBottom: '10px',
              }}>
                {user?.email?.[0]?.toUpperCase() || '?'}
              </div>
              <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-1)', marginBottom: '2px' }}>
                {user?.email?.split('@')[0] || 'user'}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-3)', marginBottom: '10px', wordBreak: 'break-all' }}>
                {user?.email}
              </div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', padding: '3px 8px', borderRadius: '4px', background: 'var(--primary-glow)', border: '0.5px solid var(--accent)', color: 'var(--accent)' }}>
                  {user?.role || 'user'}
                </div>
              </div>
            </div>

            <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: '16px', marginBottom: '16px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', padding: '6px 10px', borderRadius: '5px', background: 'var(--primary-glow)', color: 'var(--accent)', marginBottom: '4px', cursor: 'pointer' }}>
                ◆ dashboard
              </div>
              <Link to="/results" style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '11px', padding: '6px 10px', color: 'var(--text-3)', textDecoration: 'none', marginBottom: '4px' }}>
                → results
              </Link>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', padding: '6px 10px', color: 'var(--text-3)', opacity: 0.4 }}>
                → history
              </div>
            </div>

            <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: '16px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)', marginBottom: '10px', letterSpacing: '.06em' }}>// STATS</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '22px', fontWeight: 500, color: 'var(--accent)' }}>
                {masteryData?.length || 0}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-3)', marginBottom: '12px' }}>concepts tracked</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '22px', fontWeight: 500, color: masteryData?.length ? 'var(--correct)' : 'var(--text-3)' }}>
                {masteryData?.length
                  ? `${Math.round(Math.max(...masteryData.map(m => parseFloat(m.ability_score) * 100)))}%`
                  : '—'}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-3)' }}>best mastery</div>
            </div>
          </div>

          {/* MAIN */}
          <div style={{ padding: '24px 32px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-3)', letterSpacing: '.08em', marginBottom: '10px' }}>
              // SELECT TECHNOLOGY
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap' }}>
              {['basic', 'intermediate'].map(d => (
                <button key={d} onClick={() => setDifficulty(d)} style={{
                  fontFamily: 'var(--font-mono)', fontSize: '13px', padding: '8px 20px', borderRadius: '8px',
                  border: `0.5px solid ${difficulty === d ? 'var(--accent)' : 'var(--border)'}`,
                  background: difficulty === d ? 'var(--primary-glow)' : 'transparent',
                  color: difficulty === d ? 'var(--accent)' : 'var(--text-2)',
                  cursor: 'pointer', transition: 'all .15s',
                }}>{d}</button>
              ))}
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)' }}>
                // basic = foundational · intermediate = applied
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '28px' }}>
              {[
                { id: 1, name: 'JavaScript', tag: 'closures · promises · event-loop', questions: 72 },
                { id: 2, name: 'React', tag: 'hooks · state · lifecycle', questions: 72 },
                { id: 3, name: 'Node.js', tag: 'streams · events · modules', questions: 72 },
                { id: 4, name: 'Python', tag: 'decorators · generators · async', questions: 72 },
              ].map(tech => (
                <div
                  key={tech.id}
                  onClick={() => !loading && startQuiz(tech.id, difficulty)}
                  style={{
                    background: 'var(--surface)', border: '0.5px solid var(--border)',
                    borderRadius: '14px', padding: '22px', cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'border-color .15s, transform .12s', position: 'relative',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-3px)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)' }}
                >
                  <div style={{ position: 'absolute', top: '14px', right: '14px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent)', background: 'var(--primary-glow)', border: '0.5px solid var(--accent)', borderRadius: '4px', padding: '2px 8px' }}>
                    {tech.questions}Q
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 500, fontFamily: 'var(--font-mono)', color: 'var(--text-1)', marginBottom: '6px' }}>{tech.name}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)', marginBottom: '14px', lineHeight: 1.5 }}>{tech.tag}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--accent)' }}>→ start session</div>
                </div>
              ))}
            </div>

            {loading && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-3)' }}>
                // initialising session...
              </div>
            )}

            {/* Mastery bars */}
            {masteryData?.length > 0 && (
              <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: '14px', padding: '20px' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-3)', letterSpacing: '.06em', marginBottom: '14px' }}>// YOUR MASTERY</div>
                {masteryData.map((m, idx) => {
                  const pct = Math.round(parseFloat(m.ability_score) * 100)
                  const color = pct >= 70 ? 'var(--correct)' : pct >= 40 ? '#F59E0B' : 'var(--wrong)'
                  return (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-2)', width: '80px', flexShrink: 0 }}>{m.concept}</div>
                      <div style={{ flex: 1, height: '5px', background: 'var(--surface-2)', borderRadius: '3px' }}>
                        <div style={{ height: '5px', background: color, borderRadius: '3px', width: `${pct}%`, transition: 'width .8s ease' }} />
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color, width: '36px', textAlign: 'right' }}>{pct}%</div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* RIGHT PANEL */}
          <div style={{ borderLeft: '0.5px solid var(--border)', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)', letterSpacing: '.06em', marginBottom: '12px' }}>// LEADERBOARD</div>
              {[
                { rank: '01', initials: 'AK', name: 'arpan_k', score: '84%', color: 'var(--accent)' },
                { rank: '02', initials: 'SR', name: 'srujan_r', score: '71%', color: '#F59E0B' },
                { rank: '03', initials: 'MP', name: 'meera_p', score: '61%', color: 'var(--correct)' },
              ].map(({ rank, initials, name, score, color }) => (
                <div key={rank} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-3)', width: '16px' }}>{rank}</div>
                    <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'var(--primary-glow)', border: `0.5px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: '9px', color, flexShrink: 0 }}>{initials}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-1)' }}>{name}</div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 500, color }}>{score}</div>
                </div>
              ))}
            </div>

            <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: '16px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)', letterSpacing: '.06em', marginBottom: '12px' }}>// HOW IT WORKS</div>
              {[
                { step: '01', text: 'Engine targets your weakest concept and matches question difficulty to your ability' },
                { step: '02', text: 'Answer — difficulty tier adapts to your recent streak' },
                { step: '03', text: 'Wrong answers trigger AI explanation' },
                { step: '04', text: 'Mastery persists across sessions' },
              ].map(({ step, text }) => (
                <div key={step} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'flex-start' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--accent)', flexShrink: 0, marginTop: '2px' }}>{step}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-2)', lineHeight: 1.6 }}>{text}</div>
                </div>
              ))}
            </div>

            <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: '16px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-3)', letterSpacing: '.06em', marginBottom: '10px' }}>// RECENT ACTIVITY</div>
              {[
                { tech: 'javascript', diff: 'basic', score: '--' },
                { tech: 'javascript', diff: 'intermediate', score: '--' },
                { tech: 'javascript', diff: 'basic', score: '--' },
              ].map((s, i) => (
                <div key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-3)', marginBottom: '6px' }}>
                  {s.tech} · {s.diff} · {s.score}
                </div>
              ))}
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-3)', marginTop: '6px', opacity: 0.5 }}>// live history coming soon</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── ACTIVE ──────────────────────────────────────────────────────────────
  if (quizState === 'active') {
    const abilityScore = result?.updatedAbilityScore ?? 0.5
    const currentConcept = question?.concept

    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
        {topBar}

        <div style={{ display: 'flex', gap: '8px', padding: '10px 28px', borderBottom: '0.5px solid var(--border)', background: 'var(--surface)' }}>
          {currentConcept && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', padding: '4px 14px', borderRadius: '5px', border: '0.5px solid var(--accent)', background: 'var(--primary-glow)', color: 'var(--accent)' }}>
              {currentConcept} ●
            </div>
          )}
        </div>

        <div style={{ flex: 1, maxWidth: '720px', margin: '0 auto', width: '100%', padding: '3rem 2rem' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-3)', marginBottom: '14px', letterSpacing: '.04em' }}>
            <span style={{ color: 'var(--accent)' }}>▶</span> {question?.technology} / {currentConcept} / {difficulty}
          </div>

          <div style={{ fontSize: '20px', fontFamily: 'var(--font-mono)', color: 'var(--text-1)', lineHeight: 1.65, marginBottom: '28px', fontWeight: 500 }}>
            {question?.text}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px' }}>
            {question?.options?.map((opt, idx) => {
              const isSelected = selectedAnswer === idx
              const isAnswered = result !== null
              const letters = ['A', 'B', 'C', 'D']
              let borderColor = 'var(--border)'
              let bgColor = 'transparent'
              let textColor = 'var(--text-2)'
              if (isSelected && !isAnswered) { borderColor = 'var(--accent)'; bgColor = 'var(--primary-glow)'; textColor = 'var(--text-1)' }
              if (isAnswered && isSelected && result.isCorrect) { borderColor = 'var(--correct)'; bgColor = 'var(--correct-bg)'; textColor = 'var(--text-1)' }
              if (isAnswered && isSelected && !result.isCorrect) { borderColor = 'var(--wrong)'; bgColor = 'var(--wrong-bg)'; textColor = 'var(--text-1)' }
              return (
                <div
                  key={idx}
                  onClick={() => !isAnswered && setSelectedAnswer(idx)}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '14px 18px', border: `0.5px solid ${borderColor}`, borderRadius: '10px', background: bgColor, cursor: isAnswered ? 'default' : 'pointer', transition: 'all .15s' }}
                  onMouseEnter={e => { if (!isAnswered && !isSelected) e.currentTarget.style.borderColor = 'var(--border-focus)' }}
                  onMouseLeave={e => { if (!isAnswered && !isSelected) e.currentTarget.style.borderColor = 'var(--border)' }}
                >
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: isSelected ? (result?.isCorrect ? 'var(--correct)' : result ? 'var(--wrong)' : 'var(--accent)') : 'var(--text-3)', width: '18px', flexShrink: 0, paddingTop: '1px' }}>
                    {letters[idx]}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '15px', color: textColor, lineHeight: 1.55 }}>
                    {opt}
                  </div>
                </div>
              )
            })}
          </div>

          {result && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', padding: '12px 16px', borderRadius: '8px', border: `0.5px solid ${result.isCorrect ? 'var(--correct)' : 'var(--wrong)'}`, background: result.isCorrect ? 'var(--correct-bg)' : 'var(--wrong-bg)', color: result.isCorrect ? 'var(--correct)' : 'var(--wrong)', marginBottom: '16px' }}>
              {result.isCorrect ? '✓ correct' : '✗ incorrect'} — ability updated to {result.updatedAbilityScore.toFixed(4)}
            </div>
          )}

          {explanation && (
            <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '20px', marginBottom: '18px' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent)', letterSpacing: '.06em', marginBottom: '12px' }}>// AI_EXPLANATION</div>
              <div style={{ fontSize: '14px', color: 'var(--text-2)', lineHeight: 1.75, fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap' }}>
                {explanation}<span style={{ opacity: .5 }}>█</span>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            {!result && (
              <button
                onClick={submitAnswer}
                disabled={loading || selectedAnswer === null}
                style={{ background: (loading || selectedAnswer === null) ? 'var(--surface-2)' : 'var(--primary)', border: '0.5px solid transparent', borderRadius: '8px', padding: '12px 24px', fontSize: '14px', fontFamily: 'var(--font-mono)', color: (loading || selectedAnswer === null) ? 'var(--text-3)' : '#fff', cursor: (loading || selectedAnswer === null) ? 'not-allowed' : 'pointer', transition: 'background .15s' }}
              >
                {loading ? '// processing...' : '→ submit'}
              </button>
            )}

            {showNext && (
              <button
                onClick={async () => {
                  if (nextQuestion) {
                    setQuestion(nextQuestion)
                    setNextQuestion(null)
                    setSelectedAnswer(null)
                    setResult(null)
                    setExplanation('')
                    setShowNext(false)
                  } else {
                    await completeSession()
                    setQuizState('complete')
                  }
                }}
                style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: '8px', padding: '12px 24px', fontSize: '14px', fontFamily: 'var(--font-mono)', color: 'var(--text-1)', cursor: 'pointer', transition: 'border-color .15s' }}
                onMouseEnter={e => e.target.style.borderColor = 'var(--border-focus)'}
                onMouseLeave={e => e.target.style.borderColor = 'var(--border)'}
              >
                {nextQuestion ? '→ next question' : '→ complete session'}
              </button>
            )}
          </div>
        </div>

        <div style={{ borderTop: '0.5px solid var(--border)', padding: '12px 28px', background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>ability score</div>
          <div style={{ flex: 1, height: '4px', background: 'var(--border)', borderRadius: '2px' }}>
            <div style={{ height: '4px', background: 'var(--accent)', borderRadius: '2px', width: `${abilityScore * 100}%`, transition: 'width .6s ease' }} />
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--accent)', whiteSpace: 'nowrap' }}>ability = {abilityScore.toFixed(4)}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{correctCount}/{totalQuestions} correct</div>
        </div>
      </div>
    )
  }

  // ─── COMPLETE ────────────────────────────────────────────────────────────
  if (quizState === 'complete') {
    const finalCorrect = finalResult?.correct_count ?? correctCount
    const finalTotal = finalResult?.total_questions ?? totalQuestions
    const pct = finalResult?.score_percent != null
      ? Math.round(finalResult.score_percent)
      : (finalTotal > 0 ? Math.round((finalCorrect / finalTotal) * 100) : 0)
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        {topBar}
        <div style={{ maxWidth: '560px', margin: '0 auto', padding: '5rem 2rem', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--accent)', letterSpacing: '.08em', marginBottom: '14px' }}>// SESSION COMPLETE</div>
          <h2 style={{ fontSize: '36px', fontWeight: 500, color: 'var(--text-1)', marginBottom: '28px', letterSpacing: '-0.5px' }}>Session finished</h2>

          <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: '16px', padding: '32px', marginBottom: '28px' }}>
            <div style={{ fontSize: '64px', fontWeight: 500, fontFamily: 'var(--font-mono)', color: pct >= 70 ? 'var(--correct)' : pct >= 40 ? '#F59E0B' : 'var(--wrong)', lineHeight: 1, marginBottom: '8px' }}>
              {pct}%
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '15px', color: 'var(--text-2)', marginBottom: '6px' }}>
              {finalCorrect} of {finalTotal} correct
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-3)' }}>
              // mastery data written to database
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Link to="/results" style={{ background: 'var(--primary)', borderRadius: '8px', padding: '12px 24px', fontSize: '14px', fontFamily: 'var(--font-mono)', color: '#fff', textDecoration: 'none' }}>
              → view results
            </Link>
            <button
              onClick={() => {
                setQuizState('idle')
                setSession(null)
                setQuestion(null)
                setResult(null)
                setExplanation('')
                setShowNext(false)
                setCorrectCount(0)
                setTotalQuestions(0)
              }}
              style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: '8px', padding: '12px 24px', fontSize: '14px', fontFamily: 'var(--font-mono)', color: 'var(--text-1)', cursor: 'pointer' }}
              onMouseEnter={e => e.target.style.borderColor = 'var(--border-focus)'}
              onMouseLeave={e => e.target.style.borderColor = 'var(--border)'}
            >
              ↺ new session
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}