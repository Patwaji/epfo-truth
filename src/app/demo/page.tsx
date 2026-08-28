'use client'

import { useCallback, useEffect, useState } from 'react'

const CLAIMS = ['CLM-2026-070301', 'CLM-2026-061502', 'CLM-2026-060103']

const WHO: Record<string, { name: string; story: string }> = {
  'CLM-2026-070301': { name: 'Rajesh Kumar', story: 'Passbook debited, bank empty, status went backwards.' },
  'CLM-2026-061502': { name: 'Sunita Devi', story: 'Auto-rejected on a one-letter name mismatch.' },
  'CLM-2026-060103': { name: 'Imran Shaikh', story: 'Transfer blocked by a wrong pension flag.' },
}

// The ladder, in the order it unlocks. Shown so the point of moving the clock
// is visible: each breach opens the next channel.
const LADDER = ['EPFIGMS', 'CPGRAMS', 'REGIONAL_EMAIL', 'CPGRAMS_APPEAL', 'DPG', 'RTI'] as const

const RUNG_LABEL: Record<string, string> = {
  WAIT: 'Waiting',
  EPFIGMS: 'EPFiGMS',
  CPGRAMS: 'CPGRAMS',
  REGIONAL_EMAIL: 'Regional office email',
  CPGRAMS_APPEAL: 'CPGRAMS appeal',
  DPG: 'DPG',
  RTI: 'RTI',
}

interface LogEntry {
  id: string
  text: string
  time: string
  type: 'advance' | 'credit'
}

interface LiveState {
  today: string
  daysElapsed: number
  overdueByDays: number
  breached: boolean
  action: string
  rung: string
  truth: string
  filed: string[]
}

export default function Demo() {
  const [log, setLog] = useState<LogEntry[]>([])
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [live, setLive] = useState<Record<string, LiveState>>({})

  const refresh = useCallback(async () => {
    const rows = await Promise.all(
      CLAIMS.map(async (id) => {
        try {
          const res = await fetch(`/api/claims/${id}`, { cache: 'no-store' })
          if (!res.ok) return [id, null] as const
          const d = await res.json()
          return [id, {
            today: d.today,
            daysElapsed: d.sla.daysElapsed,
            overdueByDays: d.sla.overdueByDays,
            breached: d.sla.breached,
            action: d.action.headline,
            rung: d.rung,
            truth: d.truth.code,
            filed: (d.claim.grievances ?? []).map((g: { channel: string }) => g.channel),
          }] as const
        } catch {
          return [id, null] as const
        }
      }),
    )
    const next: Record<string, LiveState> = {}
    for (const [id, v] of rows) if (v) next[id] = v
    setLive(next)
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  // Rewinding to the filing date is how you get a clean slate between judges
  // without reseeding the database.
  async function reset(id: string) {
    setLoadingId(`${id}-reset`)
    try {
      const res = await fetch(`/api/claims/${id}/simulate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reset: true }),
      })
      const json = await res.json()
      setLog((prev) => [{
        id: Math.random().toString(36).slice(2, 11),
        text: `${id}: reset to the filing date, now ${json.today}`,
        time: new Date().toLocaleTimeString('en-US', { hour12: false }),
        type: 'advance',
      }, ...prev])
      await refresh()
    } finally {
      setLoadingId(null)
    }
  }

  async function advance(id: string, days: number, creditNow = false) {
    const actionKey = `${id}-${days}-${creditNow}`
    setLoadingId(actionKey)

    try {
      const res = await fetch(`/api/claims/${id}/simulate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ advanceDays: days, creditNow }),
      })
      const json = await res.json()

      if (!res.ok) {
        setLog(prev => [{
          id: Math.random().toString(36).slice(2, 11),
          text: json.error ?? 'That did not work.',
          time: new Date().toLocaleTimeString('en-US', { hour12: false }),
          type: 'advance',
        }, ...prev])
        return
      }

      const timeString = new Date().toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      })

      const newEntry: LogEntry = {
        id: Math.random().toString(36).substr(2, 9),
        text: `${id}: simulated date is now ${json.today || 'updated'}${creditNow ? ', money credited' : ''}`,
        time: timeString,
        type: creditNow ? 'credit' : 'advance'
      }

      setLog(prev => [newEntry, ...prev])
      await refresh()
    } catch (err) {
      console.error('Simulation failed:', err)
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <main style={styles.container}>
      {/* Header Banner */}
      <div style={styles.badgeContainer}>
        <span style={styles.badgeDot} />
        <span style={styles.badgeText}>Internal Simulator & Timeline Debugger</span>
      </div>

      <h1 style={styles.title}>Demo Simulation Controls</h1>
      <p style={styles.description}>
        Not part of the public citizen interface. This panel allows evaluators to simulate 
        time acceleration, trigger SLA clock breaches, and inspect real-time escalation logic 
        without waiting 50 days.
      </p>

      <p style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '2rem' }}>
        These controls write shared state, so they need a session.{' '}
        <a href="/" style={{ color: '#1e40af' }}>Sign in as one of the three people</a>{' '}
        first, then come back.
      </p>

      {/* Control Cards */}
      <div style={styles.grid}>
        {CLAIMS.map((id) => (
          <section key={id} style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={styles.claimBadge}>
                <div>
                  <strong style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                    {WHO[id]?.name ?? id}
                  </strong>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{WHO[id]?.story}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace' }}>{id}</div>
                </div>
              </div>
              <span style={styles.liveIndicator}>Active Session</span>
            </div>

            {live[id] && (
              <p style={{ margin: '0 0 0.9rem', fontSize: '0.9rem', color: '#475569' }}>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                  simulated date {live[id].today} ·{' '}
                  <span style={{ color: live[id].breached ? '#a55f14' : '#475569', fontWeight: 600 }}>
                    {live[id].daysElapsed} days
                    {live[id].breached ? `, ${live[id].overdueByDays} overdue` : ''}
                  </span>
                </span>
                <br />
                <strong style={{ color: '#0f172a' }}>{live[id].action}</strong>
              </p>
            )}

            {live[id] && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
                {LADDER.map((step) => {
                  const done = live[id].filed.includes(step)
                  const active = live[id].rung === step
                  return (
                    <span
                      key={step}
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        border: '1px solid',
                        borderColor: active ? '#a55f14' : done ? '#cbd5e1' : '#e2e8f0',
                        background: active ? '#fdf3e7' : done ? '#f1f5f9' : 'transparent',
                        color: active ? '#a55f14' : done ? '#475569' : '#94a3b8',
                      }}
                    >
                      {done ? 'done: ' : ''}{RUNG_LABEL[step]}{active ? ' (next)' : ''}
                    </span>
                  )
                })}
              </div>
            )}

            <div style={styles.buttonGroup}>
              <button
                disabled={loadingId !== null}
                onClick={() => advance(id, 7)}
                style={styles.btnSecondary}
              >
                +7 Days
              </button>
              <button
                disabled={loadingId !== null}
                onClick={() => advance(id, 30)}
                style={styles.btnSecondary}
              >
                +30 Days
              </button>
              <button
                disabled={loadingId !== null}
                onClick={() => advance(id, 0, true)}
                style={styles.btnSuccess}
              >
                Credit money
              </button>
              <button
                disabled={loadingId !== null}
                onClick={() => reset(id)}
                style={styles.btnSecondary}
              >
                Reset
              </button>
              <a href={`/claim/${id}`} style={{ alignSelf: 'center', color: '#1e40af', fontSize: '0.875rem' }}>
                Open this claim
              </a>
            </div>
          </section>
        ))}
      </div>

      {/* Terminal Log Output */}
      <section style={styles.terminalSection}>
        <div style={styles.terminalHeader}>
          <div style={styles.terminalDots}>
            <span style={{ ...styles.dot, backgroundColor: '#ff5f56' }} />
            <span style={{ ...styles.dot, backgroundColor: '#ffbd2e' }} />
            <span style={{ ...styles.dot, backgroundColor: '#27c93f' }} />
          </div>
          <span style={styles.terminalTitle}>Simulation Output Stream</span>
        </div>

        <div style={styles.terminalBody}>
          {log.length === 0 ? (
            <div style={styles.emptyLog}>
              No events triggered yet. Click an action button above to fast-forward time.
            </div>
          ) : (
            <ul style={styles.logList}>
              {log.map((entry) => (
                <li key={entry.id} style={styles.logItem}>
                  <span style={styles.logTime}>[{entry.time}]</span>
                  <span style={entry.type === 'credit' ? styles.logTextCredit : styles.logText}>
                    {entry.text}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '840px',
    margin: '0 auto',
    padding: '3rem 1.5rem 6rem 1.5rem',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: '#0f172a',
  },
  badgeContainer: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    padding: '0.35rem 0.85rem',
    borderRadius: '9999px',
    marginBottom: '1rem',
  },
  badgeDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#2563eb',
  },
  badgeText: {
    fontSize: '0.8rem',
    fontWeight: 700,
    color: '#1e40af',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 800,
    color: '#0f172a',
    margin: '0 0 0.5rem 0',
    letterSpacing: '-0.02em',
  },
  description: {
    fontSize: '1rem',
    lineHeight: 1.6,
    color: '#475569',
    maxWidth: '62ch',
    marginBottom: '2.5rem',
  },
  grid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
    marginBottom: '3rem',
  },
  card: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '14px',
    padding: '1.25rem 1.5rem',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  claimBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
  },
  claimTag: {
    fontSize: '0.7rem',
    fontWeight: 700,
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    padding: '0.2rem 0.45rem',
    borderRadius: '4px',
  },
  claimIdText: {
    fontSize: '1.05rem',
    fontWeight: 700,
    color: '#0f172a',
    fontFamily: 'monospace',
  },
  liveIndicator: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#16a34a',
  },
  buttonGroup: {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap',
  },
  btnSecondary: {
    backgroundColor: '#f8fafc',
    border: '1px solid #cbd5e1',
    color: '#334155',
    padding: '0.55rem 1.1rem',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  btnSuccess: {
    backgroundColor: '#15803d',
    border: '1px solid #166534',
    color: '#ffffff',
    padding: '0.55rem 1.1rem',
    borderRadius: '8px',
    fontSize: '0.875rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    marginLeft: 'auto',
  },
  terminalSection: {
    backgroundColor: '#0f172a',
    borderRadius: '14px',
    overflow: 'hidden',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.25)',
  },
  terminalHeader: {
    backgroundColor: '#1e293b',
    padding: '0.75rem 1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    borderBottom: '1px solid #334155',
  },
  terminalDots: {
    display: 'flex',
    gap: '6px',
  },
  dot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
  },
  terminalTitle: {
    fontSize: '0.8rem',
    color: '#94a3b8',
    fontFamily: 'monospace',
    fontWeight: 600,
  },
  terminalBody: {
    padding: '1.25rem',
    minHeight: '140px',
    maxHeight: '260px',
    overflowY: 'auto',
    fontFamily: 'monospace',
    fontSize: '0.875rem',
  },
  emptyLog: {
    color: '#64748b',
    fontStyle: 'italic',
  },
  logList: {
    margin: 0,
    padding: 0,
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  logItem: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'baseline',
  },
  logTime: {
    color: '#64748b',
    fontSize: '0.8rem',
  },
  logText: {
    color: '#38bdf8',
  },
  logTextCredit: {
    color: '#4ade80',
    fontWeight: 700,
  },
}