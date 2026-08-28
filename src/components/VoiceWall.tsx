/**
 * What people actually posted, moving past in two rows.
 *
 * Every line is a real complaint from r/EPFO and r/epfoindia during the July
 * 2026 migration, paraphrased only to strip identifying detail. The point of
 * putting them in motion is volume: one of these reads as a bad day, forty
 * reads as a system.
 *
 * CSS marquee, no library and no JavaScript. Duplicated once so the loop is
 * seamless, hidden from screen readers on the second copy, and it stops dead
 * for anyone who asked for reduced motion.
 */

const VOICES = [
  'Filed on 13th. Approved 15th. Passbook debited 19th. No credit yet.',
  'My claim went BACK from under process to submitted to portal.',
  'Finally credited, without approval and without status change.',
  '40 days. Still nothing. No reason given anywhere.',
  'Celebrating one month anniversary of claim not settled.',
  'It is my money, but I have to beg for it.',
  'Grievance closed same day with a copy paste reply.',
  'Holy moly, RTI works. Claim settled a day after filing.',
  'Five years and never once able to access my passbook.',
  'Employer never marked date of exit. Nobody told me.',
  'Rejected. No idea why. Filed again. Rejected again.',
  'Money left my PF account and never reached my bank.',
]

export function VoiceWall() {
  const rowA = VOICES.slice(0, 6)
  const rowB = VOICES.slice(6)

  return (
    <section
      aria-label="What people posted during the July 2026 EPFO migration"
      style={{
        background: 'var(--hero-bg)',
        color: 'var(--hero-fg)',
        padding: 'clamp(2.5rem, 6vw, 4rem) 0',
        overflow: 'hidden',
      }}
    >
      <p
        className="kicker"
        style={{ color: 'var(--signal)', padding: '0 var(--pad-page)', margin: '0 0 1.5rem', maxWidth: 1140, marginInline: 'auto' }}
      >
        REAL POSTS, JULY 2026
      </p>

      <style>{`
        .vw-row { display: flex; gap: 1rem; width: max-content; }
        .vw-a { animation: vw-slide 46s linear infinite; }
        .vw-b { animation: vw-slide 58s linear infinite reverse; margin-top: 1rem; }
        @keyframes vw-slide { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @media (prefers-reduced-motion: reduce) {
          .vw-a, .vw-b { animation: none; }
        }
        .vw-card {
          border: 2px solid var(--hero-fg);
          padding: 0.9rem 1.15rem;
          font-size: 0.95rem;
          line-height: 1.35;
          white-space: normal;
          width: 21rem;
          flex: 0 0 auto;
          background: transparent;
        }
        .vw-card.hot { border-color: var(--signal); color: var(--signal); }
      `}</style>

      {[rowA, rowB].map((row, ri) => (
        <div key={ri} className={`vw-row ${ri === 0 ? 'vw-a' : 'vw-b'}`}>
          {[...row, ...row].map((v, i) => (
            <p
              key={`${ri}-${i}`}
              className={`vw-card${i % 5 === 2 ? ' hot' : ''}`}
              aria-hidden={i >= row.length ? 'true' : undefined}
            >
              &ldquo;{v}&rdquo;
            </p>
          ))}
        </div>
      ))}
    </section>
  )
}
