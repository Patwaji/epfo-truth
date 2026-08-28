import Link from 'next/link'
import { ReconciliationStrip } from '@/components/ReconciliationStrip'
import { PortalWall } from '@/components/PortalWall'
import { VoiceWall } from '@/components/VoiceWall'

interface DemoUser {
  uan: string
  label: string
  who: string
  tag: string
  amount: string
  stat: string
}

const DEMOS: DemoUser[] = [
  {
    uan: '100000000001',
    label: 'money left my PF but never reached my bank',
    who: 'Rajesh, 32, Bengaluru',
    tag: 'Settlement mismatch',
    amount: '₹1,20,000',
    stat: '54 days waiting',
  },
  {
    uan: '100000000002',
    label: 'my claim keeps getting rejected and nobody says why',
    who: 'Sunita, 37, Delhi',
    tag: 'Opaque rejection',
    amount: '₹2,15,000',
    stat: 'rejected, no reason given',
  },
  {
    uan: '100000000003',
    label: 'I changed jobs and my old PF never followed me',
    who: 'Imran, 33, Pune',
    tag: 'Transfer stuck',
    amount: '₹2,80,000',
    stat: '₹80,000 stranded',
  },
]

export default function Home() {
  return (
    <main>
      {/* ---- Hero: full bleed ink, the headline and the artifact, nothing else ---- */}
      <section className="on-ink" style={s.hero}>
        <div style={s.heroInner}>
          <p style={s.eyebrow}>EPFO TRUTH ENGINE &middot; INDEPENDENT PROTOTYPE</p>

          <h1 style={s.h1}>
            your passbook says settled.
            <br />
            your bank says nothing arrived.
            <br />
            <span style={{ color: 'var(--signal)' }}>both are EPFO.</span>
          </h1>

          <div style={s.stripWrap}>
            <ReconciliationStrip onInk />
          </div>
        </div>
      </section>

      {/* ---- The numbers, stated flat ---- */}
      <section style={s.stats}>
        <div style={s.statsInner}>
          {[
            ['3', 'systems tracking one claim'],
            ['20', 'day limit EPFO sets itself'],
            ['0', 'screens that show all three'],
          ].map(([n, label]) => (
            <div key={label} style={s.stat}>
              <span className="num" style={s.statNum}>{n}</span>
              <span style={s.statLabel}>{label}</span>
            </div>
          ))}
        </div>
      </section>

      <VoiceWall />

      {/* ---- What it does ---- */}
      <section style={s.body}>
        <p style={s.lede}>
          Every salaried person in India has a PF account, and almost nobody can
          tell what is happening to their own money. This is what the member
          portal should do: reconcile every system, name the real blocker in
          plain language, run a visible clock, and escalate for you when EPFO
          misses its own deadline.
        </p>
      </section>

      <PortalWall />

      {/* ---- Pick a person ---- */}
      <section className="on-ink" style={s.picker}>
        <div style={s.pickerInner}>
        <div style={s.pickerHead}>
          <h2 style={s.h2}>pick someone and see it</h2>
          <p style={s.otp}>
            Three real, documented failures. OTP for all of them is{' '}
            <strong style={s.otpCode}>123456</strong>
          </p>
        </div>

        <div style={s.grid}>
          {DEMOS.map((d) => (
            <Link key={d.uan} href={`/login?uan=${d.uan}`} style={s.cardLink}>
              <article className="pop pop-tight" style={s.card}>
                <span style={s.tag}>{d.tag}</span>

                <p style={s.quote}>&ldquo;{d.label}&rdquo;</p>

                <span className="num" style={s.amount}>{d.amount}</span>
                <span style={s.stat2}>{d.stat}</span>

                <span style={s.cardFoot}>
                  <span style={s.who}>{d.who}</span>
                  <span style={s.arrow} aria-hidden="true">&#8594;</span>
                </span>
              </article>
            </Link>
          ))}
        </div>
        </div>
      </section>
    </main>
  )
}

const s: Record<string, React.CSSProperties> = {
  hero: {
    background: 'var(--hero-bg)',
    color: 'var(--hero-fg)',
    padding: 'clamp(3rem, 9vw, 7rem) var(--pad-page) clamp(3rem, 8vw, 6rem)',
  },
  heroInner: { maxWidth: 1140, margin: '0 auto' },

  eyebrow: {
    fontSize: '0.72rem',
    letterSpacing: '0.18em',
    fontWeight: 700,
    color: 'var(--signal)',
    margin: '0 0 clamp(1.5rem, 4vw, 2.5rem)',
  },

  h1: {
    fontFamily: 'var(--font-display)',
    fontSize: 'clamp(1.95rem, 4.3vw, 3.6rem)',
    lineHeight: 0.98,
    letterSpacing: '-0.04em',
    fontWeight: 700,
    color: 'var(--hero-fg)',
    margin: 0,
    maxWidth: '33ch',
  },

  stripWrap: { marginTop: 'clamp(2.5rem, 6vw, 4.5rem)', maxWidth: 980 },

  stats: {
    background: '#ff8a3d',
    color: '#1a1613',
    padding: 'clamp(1.5rem, 4vw, 2.25rem) var(--pad-page)',
  },
  statsInner: {
    maxWidth: 1140,
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
    gap: '1.5rem',
  },
  stat: { display: 'flex', flexDirection: 'column', gap: '0.15rem' },
  statNum: {
    fontFamily: 'var(--font-display)',
    fontSize: 'clamp(2.2rem, 5vw, 3.2rem)',
    fontWeight: 700,
    lineHeight: 1,
    letterSpacing: '-0.03em',
  },
  statLabel: { fontSize: '0.95rem', fontWeight: 600, maxWidth: '20ch', lineHeight: 1.3 },

  body: { padding: 'clamp(3rem, 7vw, 5rem) var(--pad-page) 0', maxWidth: 1140, margin: '0 auto' },
  lede: {
    maxWidth: '58ch',
    margin: 0,
    fontSize: 'clamp(1.05rem, 1.6vw, 1.25rem)',
    lineHeight: 1.6,
    color: 'var(--ink-2)',
  },

  picker: {
    background: 'var(--hero-bg)',
    color: 'var(--hero-fg)',
    padding: 'clamp(3rem, 7vw, 5rem) var(--pad-page) clamp(3.5rem, 8vw, 6rem)',
  },
  pickerInner: { maxWidth: 1140, margin: '0 auto' },
  pickerHead: { marginBottom: 'clamp(1.5rem, 4vw, 2.5rem)' },
  h2: {
    fontFamily: 'var(--font-display)',
    fontSize: 'clamp(1.7rem, 3.6vw, 2.6rem)',
    letterSpacing: '-0.03em',
    margin: 0,
  },
  otp: { marginTop: '0.6rem', color: 'var(--ink-2)' },
  otpCode: {
    fontVariantNumeric: 'tabular-nums',
    background: 'var(--hero-bg)',
    color: 'var(--hero-fg)',
    padding: '0.1rem 0.45rem',
  },

  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
    gap: 'clamp(1.25rem, 3vw, 1.75rem)',
  },
  cardLink: { textDecoration: 'none', color: 'inherit', display: 'block' },
  card: {
    color: 'var(--ink)',
    padding: 'clamp(1.4rem, 3vw, 1.9rem)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.55rem',
    height: '100%',
  },
  tag: {
    fontSize: '0.68rem',
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    fontWeight: 700,
    color: 'var(--ink-3)',
  },
  quote: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.3rem',
    lineHeight: 1.24,
    letterSpacing: '-0.015em',
    margin: '0.2rem 0 0.6rem',
    minHeight: '3.7em',
  },
  amount: {
    fontFamily: 'var(--font-display)',
    fontSize: '2rem',
    fontWeight: 700,
    lineHeight: 1,
    letterSpacing: '-0.03em',
  },
  stat2: { fontSize: '0.9rem', color: 'var(--signal-ink, var(--amber))', fontWeight: 600 },
  cardFoot: {
    marginTop: 'auto',
    paddingTop: '1.1rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid var(--line)',
  },
  who: { fontSize: '0.88rem', color: 'var(--ink-3)' },
  arrow: { fontSize: '1.15rem', color: 'var(--amber)' },
}
