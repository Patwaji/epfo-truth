// src/app/claim/[id]/page.tsx

import { notFound } from 'next/navigation'
import { getClaimView } from '@/lib/claimView'
import { TruthCard } from '@/components/TruthCard'
import { SourceDiff } from '@/components/SourceDiff'
import { BlockerPanel } from '@/components/BlockerPanel'
import { EscalationLadder } from '@/components/EscalationLadder'
import { ClaimTimeline } from '@/components/ClaimTimeline'
import { ReadAloud } from '@/components/ReadAloud'


export default async function ClaimPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const d = await getClaimView(id)

  if (!d || !d.claim) {
    notFound()
  }

  return (
    <main
      style={{
        maxWidth: 'none',
        margin: 0,
        padding: '0 0 5rem',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Top Banner & Metadata */}
      {/* The claim opens on the same ink band as the home page, so the two
          screens read as one product rather than two. */}
      <header className="on-ink" style={hero}>
        <div style={heroInner}>
          <p style={heroEyebrow}>
            EPFO TRUTH ENGINE
            <span style={{ color: 'var(--hero-dim)' }}> &middot; REF {d.claim.id}</span>
          </p>

          <h1 style={heroTitle}>
            {d.action.headline}
          </h1>

          <p style={heroSub}>{d.action.detail}</p>

          <div style={heroMeta}>
            <span className="num" style={heroFig}>
              &#8377;{(d.claim.amountPaise / 100).toLocaleString('en-IN')}
            </span>
            <span className="num" style={heroDays}>
              {d.sla.daysElapsed} days since filed
              {d.sla.breached ? `, ${d.sla.overdueByDays} past EPFO's own ${d.sla.slaDays}-day limit` : ''}
            </span>
          </div>
        </div>
      </header>

      {/* Main Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', minWidth: 0, maxWidth: 920, margin: '0 auto', padding: '0 var(--pad-page)' }}>
        <TruthCard
          truth={d.truth}
          sla={d.sla}
          action={d.action}
          amountPaise={d.claim.amountPaise}
        />

        <div style={{ marginTop: '-0.5rem' }}>
          <ReadAloud
            text={`${d.action.headline}. ${d.action.detail} ${d.blocker.title}. ${d.blocker.because}`}
          />
        </div>

        <SourceDiff claim={d.claim} truth={d.truth} today={d.today} />

        {d.blocker && <BlockerPanel blocker={d.blocker} />}

        <EscalationLadder
          claimId={d.claim.id}
          rung={d.rung}
          draft={d.draft}
          history={d.claim.grievances}
        />

        <ClaimTimeline claim={d.claim} />
      </div>
    </main>
  )
}

const hero: React.CSSProperties = {
  background: 'var(--hero-bg)',
  color: 'var(--hero-fg)',
  padding: 'clamp(2.25rem, 6vw, 4rem) var(--pad-page) clamp(2rem, 5vw, 3rem)',
  marginBottom: 'clamp(2rem, 5vw, 3rem)',
  display: 'block',
}

const heroInner: React.CSSProperties = { maxWidth: 920, margin: '0 auto' }

const heroEyebrow: React.CSSProperties = {
  fontSize: '0.72rem',
  letterSpacing: '0.18em',
  fontWeight: 700,
  color: 'var(--signal)',
  margin: '0 0 1.25rem',
}

const heroTitle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 'clamp(1.9rem, 4.2vw, 3.1rem)',
  lineHeight: 1.02,
  letterSpacing: '-0.035em',
  fontWeight: 700,
  color: 'var(--hero-fg)',
  margin: 0,
  maxWidth: '20ch',
}

const heroSub: React.CSSProperties = {
  color: 'var(--hero-dim)',
  margin: '1rem 0 0',
  maxWidth: '54ch',
  fontSize: '1.02rem',
}

const heroMeta: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'baseline',
  gap: '0.4rem 1.5rem',
  marginTop: 'clamp(1.5rem, 4vw, 2.25rem)',
  paddingTop: '1.25rem',
  borderTop: '1px solid var(--hero-rail)',
}

const heroFig: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 'clamp(1.8rem, 3.4vw, 2.6rem)',
  fontWeight: 700,
  letterSpacing: '-0.03em',
  color: 'var(--hero-fg)',
}

const heroDays: React.CSSProperties = { color: 'var(--signal)', fontWeight: 600 }
