'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * Judge controls. Not part of the citizen experience.
 *
 * The whole product turns on a clock that takes fifty days to run out, which is
 * not a thing anyone can watch in a demo. This page moves each claim's simulated
 * date so the SLA breach and the escalation ladder can be seen happening, live,
 * rather than described. Every button here changes real stored state and the
 * claim pages re-read it.
 */

type ClaimSummary = {
  id: string
  who: string
  story: string
}

const CLAIMS: ClaimSummary[] = [
  {
    id: 'CLM-2026-070301',
    who: 'Rajesh Kumar',
    story: 'Passbook debited, bank empty, status went backwards.',
  },
  {
    id: 'CLM-2026-061502',
    who: 'Sunita Devi',
    story: 'Auto-rejected on a one-letter name mismatch.',
  },
  {
    id: 'CLM-2026-060103',
    who: 'Imran Shaikh',
    story: 'Transfer blocked by a wrong pension flag.',
  },
]

type Live = {
  today: string
  truth: string
  daysElapsed: number
  overdueByDays: number
  breached: boolean
  action: string
}

export default function DemoControls() {
  const [live, setLive] = useState<Record<string, Live>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [log, setLog] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const entries = await Promise.all(
      CLAIMS.map(async (c) => {
        const res = await fetch(`/api/claims/${c.id}`, { cache: 'no-store' })
        if (!res.ok) return [c.id, null] as const
        const d = await res.json()
        return [
          c.id,
          {
            today: d.today,
            truth: d.truth.code,
            daysElapsed: d.sla.daysElapsed,
            overdueByDays: d.sla.overdueByDays,
            breached: d.sla.breached,
            action: d.action.headline,
          },
        ] as const
      }),
    )

    const next: Record<string, Live> = {}
    for (const [id, value] of entries) if (value) next[id] = value
    setLive(next)
  }, [])

  useEffect(() => {
    refresh().catch(() => setError('Could not read claim state. Is the database reachable?'))
  }, [refresh])

  async function send(id: string, body: Record<string, unknown>, label: string) {
    setBusy(id)
    setError(null)
    try {
      const res = await fetch(`/api/claims/${id}/simulate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'That did not work.')
        return
      }
      setLog((l) => [`${id} — ${label} — now ${data.today}`, ...l].slice(0, 8))
      await refresh()
    } catch {
      setError('Could not reach the server.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <main className="page">
      <p className="kicker">Demo controls</p>
      <h1 style={{ marginTop: '0.6rem' }}>Move the clock forward</h1>

      <p style={{ color: 'var(--ink-2)', marginTop: '1rem' }}>
        This page is not part of what a citizen sees. It exists so you can watch
        EPFO&rsquo;s own deadline run out and the escalation ladder open up,
        without waiting fifty days for it. Everything here writes real state, and
        the claim pages read it back.
      </p>

      {error && (
        <p
          role="alert"
          style={{
            borderLeft: '2px solid var(--crit)',
            paddingLeft: '1rem',
            color: 'var(--crit)',
          }}
        >
          {error}
        </p>
      )}

      <div style={{ marginTop: '2.5rem', display: 'grid', gap: '1.5rem' }}>
        {CLAIMS.map((c) => {
          const state = live[c.id]
          const isBusy = busy === c.id

          return (
            <section
              key={c.id}
              style={{
                border: '1px solid var(--line)',
                background: 'var(--paper-raised)',
                padding: 'clamp(1.1rem, 3vw, 1.6rem)',
              }}
            >
              <h2 style={{ fontSize: '1.2rem' }}>{c.who}</h2>
              <p style={{ color: 'var(--ink-2)', margin: '0.35rem 0 0' }}>{c.story}</p>

              <p className="num" style={{ margin: '0.9rem 0 0', color: 'var(--ink-3)' }}>
                {c.id}
                {state && (
                  <>
                    {' · '}simulated date {state.today}
                    {' · '}
                    <span style={{ color: state.breached ? 'var(--amber)' : 'var(--ink-3)' }}>
                      {state.daysElapsed} days
                      {state.breached ? `, ${state.overdueByDays} overdue` : ''}
                    </span>
                  </>
                )}
              </p>

              {state && (
                <p style={{ margin: '0.5rem 0 0', fontWeight: 600 }}>
                  {state.action}
                </p>
              )}

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  marginTop: '1.25rem',
                }}
              >
                <button
                  onClick={() => send(c.id, { advanceDays: 7 }, 'advanced 7 days')}
                  disabled={isBusy}
                  style={btn}
                >
                  +7 days
                </button>
                <button
                  onClick={() => send(c.id, { advanceDays: 30 }, 'advanced 30 days')}
                  disabled={isBusy}
                  style={btn}
                >
                  +30 days
                </button>
                <button
                  onClick={() => send(c.id, { creditNow: true }, 'money credited')}
                  disabled={isBusy}
                  style={btn}
                >
                  Credit the money
                </button>
                <button
                  onClick={() => send(c.id, { reset: true }, 'reset')}
                  disabled={isBusy}
                  style={{ ...btn, borderColor: 'var(--line)', color: 'var(--ink-2)' }}
                >
                  Reset
                </button>
                <a
                  href={`/claim/${c.id}`}
                  style={{ alignSelf: 'center', color: 'var(--green)' }}
                >
                  Open this claim
                </a>
              </div>
            </section>
          )
        })}
      </div>

      {log.length > 0 && (
        <section style={{ marginTop: '2.5rem' }}>
          <h2 style={{ fontSize: '1.1rem' }}>What you just changed</h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0.75rem 0 0' }}>
            {log.map((line, i) => (
              <li
                key={`${line}-${i}`}
                className="num"
                style={{
                  borderTop: '1px solid var(--line-soft)',
                  padding: '0.6rem 0',
                  color: 'var(--ink-2)',
                  fontSize: '0.92rem',
                }}
              >
                {line}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}

const btn: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--green)',
  color: 'var(--green)',
  padding: '0.55rem 0.95rem',
  fontSize: '0.95rem',
}
