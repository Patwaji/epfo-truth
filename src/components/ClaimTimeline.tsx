// src/components/ClaimTimeline.tsx
import type { ClaimRecord } from '@/lib/domain/types'

type EventType = 'PORTAL' | 'PASSBOOK' | 'GRIEVANCE' | 'BANK'

interface TimelineEvent {
  at: string
  what: string
  type: EventType
  detail?: string
}

const EVENT_CONFIG: Record<
  EventType,
  { label: string; bg: string; color: string; icon: string }
> = {
  PORTAL: { label: 'Portal', bg: '#eff6ff', color: '#1d4ed8', icon: '🌐' },
  PASSBOOK: { label: 'Passbook', bg: '#fef3c7', color: '#b45309', icon: '📖' },
  GRIEVANCE: { label: 'Grievance', bg: '#f3e8ff', color: '#7e22ce', icon: '⚖️' },
  BANK: { label: 'Bank Settlement', bg: '#d1fae5', color: '#047857', icon: '🏦' },
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date)
  } catch {
    return dateStr
  }
}

export function ClaimTimeline({ claim }: { claim: ClaimRecord }) {
  if (!claim) return null

  // Aggregating chronological data points safely
  const events: TimelineEvent[] = [
    ...(claim.portalHistory?.map((p) => ({
      at: p.observedAt,
      what: `Status: ${p.status.replace(/_/g, ' ')}`,
      type: 'PORTAL' as EventType,
    })) || []),
    ...(claim.passbook
      ? [
          {
            at: claim.passbook.observedAt,
            what:
              claim.passbook.debitedPaise !== null && claim.passbook.debitedPaise !== undefined
                ? `Debited ₹${(claim.passbook.debitedPaise / 100).toLocaleString('en-IN')}`
                : 'Settled entry registered',
            type: 'PASSBOOK' as EventType,
          },
        ]
      : []),
    ...(claim.grievances?.map((g) => ({
      at: g.filedAt,
      what: `Filed via ${g.channel.replace(/_/g, ' ')}`,
      type: 'GRIEVANCE' as EventType,
      detail: g.docket ? `Docket No: ${g.docket}` : undefined,
    })) || []),
    ...(claim.bank?.creditedPaise
      ? [
          {
            at: claim.bank.observedAt,
            what: `Credited ₹${(claim.bank.creditedPaise / 100).toLocaleString('en-IN')}`,
            type: 'BANK' as EventType,
            detail: 'Direct Bank Credit via NEFT/RTGS',
          },
        ]
      : []),
  ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())

  return (
    <section
      id="timeline"
      style={{
        marginTop: '3rem',
        padding: '2rem',
        borderRadius: '16px',
        backgroundColor: '#ffffff',
        border: '1px solid var(--line, #e2e8f0)',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--ink, #0f172a)', margin: 0 }}>
            Audit Trail & Event History
          </h2>
          <p style={{ color: 'var(--ink-soft, #64748b)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Complete ledger of portal updates, ledger debits, and grievance submissions.
          </p>
        </div>
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            padding: '0.25rem 0.65rem',
            backgroundColor: '#f1f5f9',
            borderRadius: '9999px',
            color: '#475569',
          }}
        >
          {events.length} Events Recorded
        </span>
      </div>

      {events.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b' }}>No events recorded for this claim yet.</p>
        </div>
      ) : (
        <div style={{ position: 'relative', paddingLeft: '0.5rem' }}>
          {events.map((e, i) => {
            const cfg = EVENT_CONFIG[e.type]
            const isLast = i === events.length - 1

            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  gap: '1.25rem',
                  position: 'relative',
                  paddingBottom: isLast ? '0' : '1.5rem',
                }}
              >
                {/* Vertical Line Connector */}
                {!isLast && (
                  <div
                    style={{
                      position: 'absolute',
                      left: '19px',
                      top: '32px',
                      bottom: 0,
                      width: '2px',
                      backgroundColor: '#e2e8f0',
                    }}
                  />
                )}

                {/* Event Type Icon Bubble */}
                <div
                  style={{
                    minWidth: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: cfg.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1rem',
                    zIndex: 1,
                    border: '2px solid #ffffff',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  }}
                >
                  {cfg.icon}
                </div>

                {/* Event Details Card */}
                <div
                  style={{
                    flex: 1,
                    padding: '0.85rem 1.15rem',
                    borderRadius: '12px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #f1f5f9',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '6px',
                          backgroundColor: cfg.bg,
                          color: cfg.color,
                        }}
                      >
                        {cfg.label}
                      </span>
                      <strong style={{ fontSize: '0.925rem', color: '#0f172a' }}>{e.what}</strong>
                    </div>

                    <time style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: '#64748b', fontWeight: 600 }}>
                      {formatDate(e.at)}
                    </time>
                  </div>

                  {e.detail && (
                    <p style={{ fontSize: '0.825rem', color: '#475569', marginTop: '0.35rem', margin: 0 }}>
                      {e.detail}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}