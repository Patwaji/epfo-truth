/**
 * The passbook, as the object people actually stare at.
 *
 * A PF passbook is a ledger: wage month, the three contribution columns, a
 * running balance. When a claim is paid there is a withdrawal row and then the
 * money appears in a bank account. Here the withdrawal row exists and the bank
 * line never comes, which is the entire product argument shown in the artifact
 * the member already recognises rather than explained in a paragraph.
 *
 * Static markup, no JavaScript. Every figure is synthetic.
 */

type Row = {
  month: string
  employee: string
  employer: string
  pension: string
  balance: string
  kind?: 'debit'
}

const ROWS: Row[] = [
  { month: 'Mar 2026', employee: '5,400', employer: '1,650', pension: '3,750', balance: '5,84,300' },
  { month: 'Apr 2026', employee: '5,400', employer: '1,650', pension: '3,750', balance: '5,95,100' },
  { month: 'May 2026', employee: '5,400', employer: '1,650', pension: '3,750', balance: '6,05,900' },
  { month: 'Jun 2026', employee: '5,400', employer: '1,650', pension: '3,750', balance: '6,16,700' },
  { month: 'Jul 2026', employee: '—', employer: '—', pension: '—', balance: '4,96,700', kind: 'debit' },
]

export function PassbookArtifact() {
  return (
    <figure style={{ margin: 0 }} aria-labelledby="pb-cap">
      <div className="pop" style={{ overflow: 'hidden' }}>
        {/* Header, the way the real passbook labels itself */}
        <div style={head}>
          <div>
            <span style={headLabel}>EPF PASSBOOK</span>
            <span style={headId}>MH/BAN/0012345/000/0001234</span>
          </div>
          <span style={headLabel}>FY 2026&ndash;27</span>
        </div>

        <div className="scroll-x">
          <table style={table}>
            <caption className="sr-only">
              Provident fund passbook showing a withdrawal in July 2026 with no
              matching bank credit
            </caption>
            <thead>
              <tr>
                <th scope="col" style={{ ...th, textAlign: 'left' }}>Wage month</th>
                <th scope="col" style={th}>Employee</th>
                <th scope="col" style={th}>Employer</th>
                <th scope="col" style={th}>Pension</th>
                <th scope="col" style={th}>Balance</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.month} style={r.kind === 'debit' ? rowDebit : undefined}>
                  <th
                    scope="row"
                    style={{ ...td, textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap' }}
                  >
                    {r.month}
                    {r.kind === 'debit' && <span style={debitTag}>WITHDRAWAL</span>}
                  </th>
                  <td className="num" style={td}>{r.employee}</td>
                  <td className="num" style={td}>{r.employer}</td>
                  <td className="num" style={td}>{r.pension}</td>
                  <td className="num" style={{ ...td, fontWeight: 700 }}>{r.balance}</td>
                </tr>
              ))}

              {/* The row that should follow and never does */}
              <tr>
                <th scope="row" style={{ ...td, textAlign: 'left', color: 'var(--signal)', fontWeight: 700 }}>
                  Jul 2026
                </th>
                <td colSpan={4} style={{ ...td, color: 'var(--signal)' }}>
                  <span style={missing}>
                    &#8377;1,20,000 credited to bank &mdash; no such entry
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={foot}>
          <span>Balance fell by &#8377;1,20,000 on 19 Jul 2026.</span>
          <span className="num" style={{ color: 'var(--signal)', fontWeight: 700 }}>
            54 days, no credit
          </span>
        </div>
      </div>

      <figcaption id="pb-cap" style={cap}>
        A real passbook shows the money leaving. Nothing anywhere shows whether
        it arrived. Figures here are synthetic.
      </figcaption>
    </figure>
  )
}

const head: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: '1rem',
  padding: '0.9rem 1.1rem',
  borderBottom: '2px solid var(--ink)',
  background: 'var(--paper)',
}

const headLabel: React.CSSProperties = {
  display: 'block',
  fontSize: '0.68rem',
  letterSpacing: '0.16em',
  fontWeight: 700,
  color: 'var(--ink-2)',
}

const headId: React.CSSProperties = {
  display: 'block',
  fontSize: '0.72rem',
  color: 'var(--ink-3)',
  fontVariantNumeric: 'tabular-nums',
  marginTop: '0.2rem',
}

const table: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  minWidth: 520,
  background: 'var(--paper-raised)',
}

const th: React.CSSProperties = {
  textAlign: 'right',
  padding: '0.55rem 0.9rem',
  fontSize: '0.66rem',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--ink-3)',
  fontWeight: 700,
  borderBottom: '1px solid var(--line)',
}

const td: React.CSSProperties = {
  textAlign: 'right',
  padding: '0.6rem 0.9rem',
  fontSize: '0.9rem',
  borderBottom: '1px solid var(--line-soft)',
  color: 'var(--ink)',
}

const rowDebit: React.CSSProperties = { background: 'var(--amber-soft)' }

const debitTag: React.CSSProperties = {
  marginLeft: '0.5rem',
  fontSize: '0.6rem',
  letterSpacing: '0.12em',
  fontWeight: 700,
  color: 'var(--signal)',
}

const missing: React.CSSProperties = {
  display: 'inline-block',
  border: '1px dashed var(--signal)',
  padding: '0.25rem 0.6rem',
  fontSize: '0.8rem',
  fontWeight: 600,
}

const foot: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '0.5rem',
  padding: '0.85rem 1.1rem',
  borderTop: '2px solid var(--ink)',
  background: 'var(--paper)',
  fontSize: '0.85rem',
  color: 'var(--ink-2)',
}

const cap: React.CSSProperties = {
  marginTop: '0.9rem',
  fontSize: '0.85rem',
  color: 'var(--hero-dim)',
  maxWidth: '46ch',
}
