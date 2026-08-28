import type { ClaimRecord, TruthState } from '@/lib/domain/types'

/**
 * The signature artifact: EPFO's three systems of record, side by side.
 *
 * The member portal, the passbook and the member's bank routinely disagree
 * about the same claim, and EPFO never shows them together, so nobody can tell
 * which one to believe. Putting them on one grid is the entire argument of this
 * product, so this component states each source in its own words and marks the
 * row where the trail stops.
 */

function rupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN')}`
}

function humanStatus(status: string): string {
  return status.replace(/_/g, ' ').toLowerCase()
}

type Row = {
  source: string
  says: string
  when: string
  /** True for the row where the money should be and is not. */
  isGap: boolean
}

function buildRows(claim: ClaimRecord, today: string): Row[] {
  const latest = claim.portalHistory.at(-1)
  const debited = claim.passbook?.debitedPaise ?? null
  const credited = claim.bank?.creditedPaise ?? null

  return [
    {
      source: 'EPFO member portal',
      says: latest ? humanStatus(latest.status) : 'no record of this claim',
      when: latest?.observedAt ?? '—',
      isGap: false,
    },
    {
      source: 'EPFO passbook',
      says:
        debited !== null
          ? `${rupees(debited)} debited`
          : claim.passbook?.settledShown
            ? 'settled, nothing debited'
            : 'no entry for this claim',
      when: claim.passbook?.observedAt ?? '—',
      isGap: false,
    },
    {
      source: 'Your bank account',
      says: credited !== null ? `${rupees(credited)} credited` : 'nothing received',
      when: claim.bank?.observedAt ?? today,
      // The money left the passbook and never arrived. That gap is the story.
      isGap: debited !== null && credited === null,
    },
  ]
}

export function SourceDiff({
  claim,
  truth,
  today,
}: {
  claim: ClaimRecord
  truth: TruthState
  today: string
}) {
  const rows = buildRows(claim, today)
  const disagree = truth.contradictions.length > 0

  return (
    <section style={{ marginTop: 'clamp(2rem, 5vw, 3rem)' }}>
      <h2>
        {disagree
          ? 'Three systems. Three different answers.'
          : 'All three systems agree.'}
      </h2>

      <p style={{ color: 'var(--ink-2)', marginTop: '0.5rem' }}>
        {disagree
          ? 'EPFO never shows you these together, which is why nobody can tell what is actually happening to their own money.'
          : 'Nothing is in dispute on this claim.'}
      </p>

      <div
        className="scroll-x"
        style={{
          marginTop: '1.5rem',
          border: '1px solid var(--line)',
          background: 'var(--paper-raised)',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 460 }}>
          <caption className="sr-only">
            What each EPFO system reports about this claim
          </caption>
          <thead>
            <tr>
              <th scope="col" style={th}>
                System
              </th>
              <th scope="col" style={th}>
                What it says
              </th>
              <th scope="col" style={{ ...th, textAlign: 'right' }}>
                As of
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.source}
                style={{
                  borderTop: '1px solid var(--line-soft)',
                  background: r.isGap ? 'var(--crit-soft)' : 'transparent',
                }}
              >
                <th scope="row" style={{ ...td, color: 'var(--ink-2)', fontWeight: 400 }}>
                  {r.source}
                </th>
                <td style={{ ...td, fontWeight: 600, color: r.isGap ? 'var(--crit)' : 'inherit' }}>
                  {r.says}
                </td>
                <td
                  className="num"
                  style={{ ...td, textAlign: 'right', color: 'var(--ink-3)', whiteSpace: 'nowrap' }}
                >
                  {r.when}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {truth.contradictions.length > 0 && (
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: '1.25rem 0 0',
            display: 'grid',
            gap: '0.75rem',
          }}
        >
          {truth.contradictions.map((c) => (
            <li
              key={c.kind}
              style={{
                borderLeft: '2px solid var(--amber)',
                paddingLeft: '1rem',
                color: 'var(--ink-2)',
                maxWidth: 'var(--measure)',
              }}
            >
              {c.detail}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '0.7rem 1.1rem',
  fontSize: '0.74rem',
  letterSpacing: '0.11em',
  textTransform: 'uppercase',
  fontWeight: 700,
  color: 'var(--ink-3)',
  background: 'var(--green-soft)',
}

const td: React.CSSProperties = {
  textAlign: 'left',
  padding: '1rem 1.1rem',
  verticalAlign: 'baseline',
}
