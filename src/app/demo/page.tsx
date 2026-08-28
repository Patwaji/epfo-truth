'use client'

import { useState } from 'react'

const CLAIMS = ['CLM-2026-070301', 'CLM-2026-061502', 'CLM-2026-060103']

interface LogEntry {
  id: string
  text: string
  time: string
  type: 'advance' | 'credit'
}

export default function Demo() {
  const [log, setLog] = useState<LogEntry[]>([])
  const [loadingId, setLoadingId] = useState<string | null>(null)

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
      
      const timeString = new Date().toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      })

      const newEntry: LogEntry = {
        id: Math.random().toString(36).substr(2, 9),
        text: `${id}: simulated date is now ${json.today || 'updated'}${creditNow ? ' — Money Credited ✓' : ''}`,
        time: timeString,
        type: creditNow ? 'credit' : 'advance'
      }

      setLog(prev => [newEntry, ...prev])
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

      {/* Control Cards */}
      <div style={styles.grid}>
        {CLAIMS.map((id) => (
          <section key={id} style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={styles.claimBadge}>
                <span style={styles.claimTag}>CLAIM ID</span>
                <strong style={styles.claimIdText}>{id}</strong>
              </div>
              <span style={styles.liveIndicator}>Active Session</span>
            </div>

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
                💳 Credit Money
              </button>
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