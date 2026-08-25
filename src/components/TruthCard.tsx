import type { NextAction, SlaResult, TruthState } from '@/lib/domain/types'

const HEADLINE: Record<TruthState['code'], string> = {
  NOT_PICKED_UP: 'No one at EPFO has opened your claim yet',
  IN_REVIEW: 'An officer is reviewing your claim',
  APPROVED_AWAITING_MONEY: 'Approved, but the money has not moved yet',
  DEBITED_NOT_CREDITED: 'EPFO has taken the money out and not sent it to you',
  CREDITED: 'Your money has reached your bank',
  REJECTED: 'Your claim was rejected',
  REGRESSED: 'Your claim went backwards in EPFO’s system',
}

export function TruthCard({ truth, sla, action, amountPaise }: {
  truth: TruthState; sla: SlaResult; action: NextAction; amountPaise: number
}) {
  return (
    <section style={{ background: 'var(--paper-raised)', border: '1px solid var(--line)', padding: '2rem' }}>
      <p style={{ color: 'var(--ink-soft)', fontSize: 14 }}>The honest status</p>
      <h1 style={{ fontSize: 'clamp(28px, 5vw, 44px)', lineHeight: 1.1, margin: '0.5rem 0 1rem' }}>
        {HEADLINE[truth.code]}
      </h1>

      <p style={{ fontSize: 20 }}>
        ₹{(amountPaise / 100).toLocaleString('en-IN')} ·{' '}
        <span style={{ color: sla.breached ? 'var(--overdue)' : 'var(--ink-soft)' }}>
          {sla.daysElapsed} days since you filed
          {sla.breached ? ` · ${sla.overdueByDays} days past EPFO’s own ${sla.slaDays}-day limit` : ''}
        </span>
      </p>

      {truth.contradictions.map(c => (
        <p key={c.kind} style={{ marginTop: '1rem', color: 'var(--ink-soft)' }}>{c.detail}</p>
      ))}

      <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--line)' }}>
        <p style={{ fontSize: 22, fontWeight: 600 }}>{action.headline}</p>
        <p style={{ marginTop: '0.5rem' }}>{action.detail}</p>
        {action.cta && (
          <a href={action.cta.href} style={{ display: 'inline-block', marginTop: '1rem', textDecoration: 'underline' }}>
            {action.cta.label}
          </a>
        )}
      </div>
    </section>
  )
}