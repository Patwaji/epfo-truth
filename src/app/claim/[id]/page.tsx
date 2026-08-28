// src/app/claim/[id]/page.tsx

import { notFound } from 'next/navigation'
import { TruthCard } from '@/components/TruthCard'
import { SourceDiff } from '@/components/SourceDiff'
import { BlockerPanel } from '@/components/BlockerPanel'
import { EscalationLadder } from '@/components/EscalationLadder'
import { ClaimTimeline } from '@/components/ClaimTimeline'

async function getClaim(id: string) {
  try {
    const base =
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000'

    const res = await fetch(`${base}/api/claims/${id}`, { cache: 'no-store' })
    if (!res.ok) return null
    return await res.json()
  } catch (error) {
    console.error(`Failed to fetch claim record for ID: ${id}`, error)
    return null
  }
}

export default async function ClaimPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const d = await getClaim(id)

  if (!d || !d.claim) {
    notFound()
  }

  return (
    <main
      style={{
        maxWidth: '920px',
        margin: '0 auto',
        padding: '2.5rem 1.25rem 5rem 1.25rem',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Top Banner & Metadata */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingBottom: '1.25rem',
          marginBottom: '2rem',
          borderBottom: '1px solid var(--line, #e2e8f0)',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '4px', backgroundColor: '#0f172a', color: '#ffffff', fontWeight: 700 }}>
              EPFO TRUTH LAYER
            </span>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>• Ref: {d.claim.claimId || id}</span>
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', marginTop: '0.4rem', margin: 0 }}>
            Claim Audit & Escalation Portal
          </h1>
        </div>

        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>System Timestamp</span>
          <strong style={{ fontSize: '0.85rem', fontFamily: 'monospace', color: '#334155' }}>
            {d.today ? new Date(d.today).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Live'}
          </strong>
        </div>
      </header>

      {/* Main Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <TruthCard
          truth={d.truth}
          sla={d.sla}
          action={d.action}
          amountPaise={d.claim.amountPaise}
        />

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