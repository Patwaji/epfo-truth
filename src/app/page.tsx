import Link from 'next/link'
import { ReconciliationStrip } from '@/components/ReconciliationStrip'

interface DemoUser {
  uan: string
  label: string
  who: string
  tag: string
}

const DEMOS: DemoUser[] = [
  {
    uan: '100000000001',
    label: 'Money left my PF but never reached my bank',
    who: 'Rajesh, 32, Bengaluru',
    tag: 'Settlement Mismatch',
  },
  {
    uan: '100000000002',
    label: 'My claim keeps getting rejected and I do not know why',
    who: 'Sunita, 37, Delhi',
    tag: 'Opaque Rejection',
  },
  {
    uan: '100000000003',
    label: 'I changed jobs and my old PF never followed me',
    who: 'Imran, 33, Pune',
    tag: 'Transfer Stuck',
  },
]

export default function Home() {
  return (
    <main style={styles.container}>
      <header style={styles.headerBadge}>
        <span style={styles.liveIndicator} />
        <span style={styles.badgeText}>EPFO Truth Engine · Public Service Prototype</span>
      </header>

      <section style={styles.heroSection}>
        <h1 style={styles.mainHeading}>
          Your passbook says settled.<br />
          Your bank says nothing arrived.<br />
          <span style={styles.highlightText}>Both are EPFO.</span>
        </h1>

        <ReconciliationStrip />

        <p style={styles.description}>
          Every salaried person in India has a PF account, and almost nobody can tell what is happening
          to their own money. This is a prototype of what the member portal should do: reconcile every
          system, name the real blocker in plain language, run a visible clock, and escalate for you
          when EPFO misses its own deadline.
        </p>
      </section>

      <section style={styles.demoSection}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Sign in as one of three people</h2>
          <p style={styles.otpNotice}>
            Every case below is a real, documented failure. OTP for all of them is{' '}
            <code style={styles.codeBlock}>123456</code>.
          </p>
        </div>

        <div style={styles.cardGrid}>
          {DEMOS.map((d) => (
            <Link
              key={d.uan}
              href={`/login?uan=${d.uan}`}
              style={styles.cardLink}
            >
              <article style={styles.card}>
                <div style={styles.cardHeader}>
                  <span style={styles.cardTag}>{d.tag}</span>
                  <span style={styles.uanText}>UAN: {d.uan}</span>
                </div>
                
                <h3 style={styles.cardLabel}>"{d.label}"</h3>

                <div style={styles.cardFooter}>
                  <span style={styles.whoText}>{d.who}</span>
                  <span style={styles.arrowIcon}>→</span>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1040px',
    margin: '0 auto',
    padding: 'clamp(2rem, 6vw, 4.5rem) 1.5rem 5rem 1.5rem',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: 'var(--ink)',
  },
  headerBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.4rem 0.85rem',
    backgroundColor: 'var(--paper)',
    borderRadius: '9999px',
    border: '1px solid var(--line)',
    marginBottom: '2rem',
  },
  liveIndicator: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: 'var(--crit)',
  },
  badgeText: {
    fontSize: '0.825rem',
    fontWeight: 600,
    color: 'var(--ink-2)',
    letterSpacing: '0.02em',
  },
  heroSection: {
    marginBottom: '3.5rem',
  },
  mainHeading: {
    fontSize: 'clamp(2.1rem, 5.6vw, 3.7rem)',
    lineHeight: 1.06,
    fontWeight: 800,
    letterSpacing: '-0.03em',
    color: 'var(--ink)',
    margin: 0,
  },
  highlightText: {
    color: 'var(--overdue, var(--crit))',
    display: 'block',
    marginTop: '0.25rem',
  },
  description: {
    marginTop: '1.75rem',
    maxWidth: '54ch',
    fontSize: '1.05rem',
    lineHeight: 1.6,
    color: 'var(--ink-2)',
    fontWeight: 400,
  },
  demoSection: {
    borderTop: '2px solid var(--line)',
    paddingTop: '2.5rem',
  },
  sectionHeader: {
    marginBottom: '1.75rem',
  },
  sectionTitle: {
    fontSize: '1.6rem',
    fontWeight: 700,
    color: 'var(--ink)',
    margin: 0,
  },
  otpNotice: {
    color: 'var(--ink-3)',
    marginTop: '0.4rem',
    fontSize: '0.95rem',
  },
  codeBlock: {
    backgroundColor: 'var(--paper)',
    padding: '0.15rem 0.4rem',
    borderRadius: '4px',
    color: 'var(--ink)',
    fontWeight: 700,
    fontFamily: 'monospace',
    border: '1px solid var(--line)',
  },
  cardGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  cardLink: {
    textDecoration: 'none',
    color: 'inherit',
    display: 'block',
  },
  card: {
    backgroundColor: 'var(--paper-raised)',
    border: '1px solid var(--line)',
    borderRadius: '12px',
    padding: '1.6rem 1.75rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.75rem',
  },
  cardTag: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: 'var(--green)',
    backgroundColor: 'var(--green-soft)',
    padding: '0.2rem 0.6rem',
    borderRadius: '6px',
    textTransform: 'uppercase',
  },
  uanText: {
    fontSize: '0.825rem',
    color: 'var(--ink-3)',
    fontFamily: 'monospace',
  },
  cardLabel: {
    fontSize: '1.32rem',
    fontWeight: 600,
    color: 'var(--ink)',
    margin: '0 0 0.75rem 0',
    lineHeight: 1.28,
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid var(--paper)',
    paddingTop: '0.75rem',
  },
  whoText: {
    fontSize: '0.875rem',
    color: 'var(--ink-2)',
    fontWeight: 500,
  },
  arrowIcon: {
    fontSize: '1.1rem',
    color: 'var(--green)',
    fontWeight: 700,
  },
}