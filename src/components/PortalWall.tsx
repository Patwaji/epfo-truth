import Image from 'next/image'

/**
 * The five portals a citizen is expected to know, shown as they actually look.
 *
 * These are real screenshots of the live sites, captured without signing in, so
 * nothing here is a mockup or an illustration of the problem: it is the problem.
 * Five separate products, five logins, none of them linking to the next.
 */

const PORTALS = [
  { src: '/portals/member.jpg', name: 'Member portal', host: 'unifiedportal-mem.epfindia.gov.in', role: 'file the claim, read a status that may not be true' },
  { src: '/portals/passbook.jpg', name: 'Passbook', host: 'passbook.epfindia.gov.in', role: 'a second login, a captcha, a different answer' },
  { src: '/portals/epfigms.jpg', name: 'EPFiGMS', host: 'epfigms.gov.in', role: 'grievances, routed back to the desk ignoring you' },
  { src: '/portals/cpgrams.jpg', name: 'CPGRAMS', host: 'pgportal.gov.in', role: 'the one that works, because offices are rated on it' },
  { src: '/portals/rti.jpg', name: 'RTI Online', host: 'rtionline.gov.in', role: 'the last resort that settles claims in days' },
]

export function PortalWall() {
  return (
    <section style={{ padding: 'clamp(3rem, 7vw, 5.5rem) var(--pad-page)', maxWidth: 1140, margin: '0 auto' }}>
      <p className="kicker" style={{ marginBottom: '0.9rem' }}>FIVE PORTALS. FIVE LOGINS.</p>

      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(1.7rem, 3.6vw, 2.6rem)',
          letterSpacing: '-0.03em',
          margin: '0 0 0.9rem',
          maxWidth: '30ch',
        }}
      >
        this is what you are actually expected to navigate
      </h2>

      <p style={{ color: 'var(--ink-2)', maxWidth: '56ch', marginBottom: 'clamp(1.75rem, 4vw, 2.5rem)' }}>
        Real screenshots of the live sites, captured without signing in. None of
        them links to the next one, and nothing tells you which to use or in
        what order.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 185px), 1fr))',
          gap: 'clamp(1rem, 2.5vw, 1.5rem)',
        }}
      >
        {PORTALS.map((p, i) => (
          <figure key={p.host} className="pop pop-tight" style={{ margin: 0, overflow: 'hidden' }}>
            <div style={{ position: 'relative', aspectRatio: '900 / 620', borderBottom: '2px solid var(--ink)' }}>
              <Image
                src={p.src}
                alt={`Screenshot of the ${p.name} sign-in page`}
                fill
                sizes="(max-width: 700px) 100vw, 280px"
                style={{ objectFit: 'cover', objectPosition: 'top left' }}
                priority={i < 2}
              />
            </div>

            <figcaption style={{ padding: '0.9rem 1rem 1.1rem' }}>
              <strong style={{ display: 'block', fontSize: '1rem' }}>{p.name}</strong>
              <span
                className="num"
                style={{ display: 'block', fontSize: '0.72rem', color: 'var(--ink-3)', margin: '0.15rem 0 0.5rem' }}
              >
                {p.host}
              </span>
              <span style={{ fontSize: '0.85rem', color: 'var(--ink-2)', lineHeight: 1.35 }}>{p.role}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}
