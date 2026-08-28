import Link from 'next/link'
import { TriangleAlertIcon } from '@/components/icons'
import { SignOut } from '@/components/SignOut'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db/client'
import { findStranded, strandedTotalPaise } from '@/lib/domain/stranded'
import { toMemberProfile } from '@/lib/db/map'

interface ClaimItem {
  id: string
  type: string
  amountPaise: number
  filedAt: string
  memberId: string
}

export default async function Dashboard() {
  const cookieStore = await cookies()
  const uan = cookieStore.get('uan')?.value

  if (!uan) {
    redirect('/login')
  }

  const m = await prisma.member.findUnique({
    where: { uan },
    include: { claims: true, accounts: true },
  })

  if (!m) {
    redirect('/login')
  }

  const current = m.claims[0]?.memberId ?? ''

  const stranded = findStranded(toMemberProfile(m), current)

  const strandedTotalFormatted = (strandedTotalPaise(stranded) / 100).toLocaleString('en-IN')

  return (
    <main style={styles.container}>
      <header style={styles.profileHeader}>
        <div style={styles.headerLeft}>
          <div style={styles.avatarCircle}>{m.nameOnEpfo.charAt(0)}</div>
          <div>
            <span style={styles.uanBadge}>UAN: {m.uan}</span>
            <h1 style={styles.memberName}>{m.nameOnEpfo}</h1>
          </div>
        </div>
        <div style={styles.headerRight}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={styles.statusChip}>KYC Verified</span>
            <Link
              href="/file"
              style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#145a4e',
                textDecoration: 'underline',
                textUnderlineOffset: '3px',
              }}
            >
              Check a claim before filing
            </Link>
            <SignOut />
          </div>
        </div>
      </header>

      {stranded.length > 0 && (
        <section style={styles.strandedCard}>
          <div style={styles.strandedTop}>
            <span style={styles.strandedBadge}><TriangleAlertIcon size={14} /> Action Required</span>
            <span style={styles.strandedAmount}>₹{strandedTotalFormatted}</span>
          </div>
          
          <h2 style={styles.strandedTitle}>
            You have ₹{strandedTotalFormatted} sitting in an old account
          </h2>
          
          <p style={styles.strandedDescription}>
            PF does not follow you when you change jobs. Your new employer opens a new account under the
            same UAN, and the old balance stays where it is until you file a transfer yourself. EPFO
            never tells you this.
          </p>

          <div style={styles.strandedAccountsList}>
            {stranded.map((a) => {
              const accountTotal = ((a.epfBalancePaise + a.epsBalancePaise) / 100).toLocaleString('en-IN')
              return (
                <div key={a.memberId} style={styles.strandedAccountRow}>
                  <div style={styles.strandedAccountInfo}>
                    <strong style={styles.employerName}>{a.employer}</strong>
                    <span style={styles.memberIdText}>Member ID: {a.memberId}</span>
                  </div>
                  <div style={styles.strandedAccountAmount}>
                    ₹{accountTotal}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <section style={styles.claimsSection}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Your Filed Claims</h2>
          <span style={styles.claimsCount}>{m.claims.length} total</span>
        </div>

        <div style={styles.claimsGrid}>
          {m.claims.map((c: ClaimItem) => {
            const formattedAmount = (c.amountPaise / 100).toLocaleString('en-IN')
            return (
              <Link key={c.id} href={`/claim/${c.id}`} style={styles.claimCardLink}>
                <article style={styles.claimCard}>
                  <div style={styles.claimCardTop}>
                    <span style={styles.claimType}>{c.type}</span>
                    <span style={styles.claimId}>ID: {c.id}</span>
                  </div>
                  
                  <div style={styles.claimCardBody}>
                    <span style={styles.claimAmountLabel}>Claimed Amount</span>
                    <span style={styles.claimAmount}>₹{formattedAmount}</span>
                  </div>

                  <div style={styles.claimCardFooter}>
                    <span style={styles.filedDate}>Filed on {c.filedAt}</span>
                    <span style={styles.viewLinkText}>Audit Timeline →</span>
                  </div>
                </article>
              </Link>
            )
          })}
        </div>
      </section>
    </main>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '920px',
    margin: '0 auto',
    padding: '3rem 1.5rem 5rem 1.5rem',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: '#0f172a',
  },
  profileHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.5rem 1.75rem',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #e2e8f0',
    marginBottom: '2rem',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.25rem',
  },
  avatarCircle: {
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    backgroundColor: '#0f172a',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.4rem',
    fontWeight: 700,
  },
  uanBadge: {
    fontSize: '0.825rem',
    fontWeight: 600,
    color: '#64748b',
    fontFamily: 'monospace',
    textTransform: 'uppercase',
  },
  memberName: {
    fontSize: '1.6rem',
    fontWeight: 800,
    color: '#0f172a',
    margin: '0.1rem 0 0 0',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
  },
  statusChip: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#15803d',
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    padding: '0.35rem 0.75rem',
    borderRadius: '9999px',
  },
  strandedCard: {
    backgroundColor: '#fff1f2',
    border: '1.5px solid #fecdd3',
    borderRadius: '16px',
    padding: '2rem',
    marginBottom: '2.5rem',
  },
  strandedTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  strandedBadge: {
    fontSize: '0.8rem',
    fontWeight: 700,
    color: '#9f1239',
    backgroundColor: '#ffe4e6',
    padding: '0.3rem 0.75rem',
    borderRadius: '6px',
    textTransform: 'uppercase',
  },
  strandedAmount: {
    fontSize: '1.75rem',
    fontWeight: 800,
    color: '#be123c',
  },
  strandedTitle: {
    fontSize: '1.45rem',
    fontWeight: 800,
    color: '#881337',
    margin: '0 0 0.75rem 0',
  },
  strandedDescription: {
    fontSize: '1rem',
    lineHeight: 1.6,
    color: '#9f1239',
    maxWidth: '65ch',
    marginBottom: '1.5rem',
  },
  strandedAccountsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    borderTop: '1px solid #fda4af',
    paddingTop: '1.25rem',
  },
  strandedAccountRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: '0.85rem 1.15rem',
    borderRadius: '10px',
    border: '1px solid #fecdd3',
  },
  strandedAccountInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  employerName: {
    fontSize: '1rem',
    color: '#0f172a',
    fontWeight: 700,
  },
  memberIdText: {
    fontSize: '0.825rem',
    color: '#64748b',
    fontFamily: 'monospace',
    marginTop: '0.15rem',
  },
  strandedAccountAmount: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: '#be123c',
  },
  claimsSection: {
    marginTop: '1rem',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1.25rem',
  },
  sectionTitle: {
    fontSize: '1.35rem',
    fontWeight: 800,
    color: '#0f172a',
    margin: 0,
  },
  claimsCount: {
    fontSize: '0.875rem',
    color: '#64748b',
    fontWeight: 600,
  },
  claimsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '1.25rem',
  },
  claimCardLink: {
    textDecoration: 'none',
    color: 'inherit',
    display: 'block',
  },
  claimCard: {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '14px',
    padding: '1.25rem',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    height: '100%',
    boxSizing: 'border-box',
  },
  claimCardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  claimType: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#2563eb',
    backgroundColor: '#eff6ff',
    padding: '0.25rem 0.6rem',
    borderRadius: '6px',
    textTransform: 'uppercase',
  },
  claimId: {
    fontSize: '0.8rem',
    color: '#94a3b8',
    fontFamily: 'monospace',
  },
  claimCardBody: {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: '1.25rem',
  },
  claimAmountLabel: {
    fontSize: '0.8rem',
    color: '#64748b',
    fontWeight: 500,
  },
  claimAmount: {
    fontSize: '1.6rem',
    fontWeight: 800,
    color: '#0f172a',
    marginTop: '0.2rem',
  },
  claimCardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid #f1f5f9',
    paddingTop: '0.85rem',
  },
  filedDate: {
    fontSize: '0.825rem',
    color: '#64748b',
  },
  viewLinkText: {
    fontSize: '0.85rem',
    fontWeight: 700,
    color: '#2563eb',
  },
}