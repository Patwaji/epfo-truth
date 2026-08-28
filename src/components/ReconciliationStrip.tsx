/**
 * The argument of the product, drawn instead of described.
 *
 * Three ledger lines, one per system EPFO tracks a claim in. The money leaves
 * the passbook, travels, and stops short: the bank line ends in an empty slot
 * it never reached. That gap is the whole story, and it reads in about a
 * second, which is more than the paragraph underneath it will get.
 *
 * Pure SVG and CSS, no JavaScript: it renders identically with scripts off, and
 * the motion only moves something already on screen rather than revealing it.
 */
export function ReconciliationStrip({ onInk = false }: { onInk?: boolean }) {
  return (
    <figure style={{ margin: 0, maxWidth: '100%' }} aria-labelledby="strip-caption">
      <svg
        viewBox="0 0 640 300"
        width="100%"
        height="auto"
        role="img"
        aria-label="One claim across three EPFO systems. The member portal says submitted at portal. The passbook says one lakh twenty thousand rupees was debited. The bank account has received nothing."
        style={
          {
            display: 'block',
            // One artifact, two grounds. The palette flips with the surface it
            // is drawn on rather than the page theme.
            '--rs-fg': onInk ? 'var(--hero-fg)' : 'var(--ink)',
            '--rs-dim': onInk ? 'var(--hero-dim)' : 'var(--ink-3)',
            '--rs-rail': onInk ? 'var(--hero-rail)' : 'var(--line)',
            '--rs-signal': onInk ? 'var(--signal)' : 'var(--amber)',
          } as React.CSSProperties
        }
      >
        <defs>
          <style>{`
            .rs-src   { font: 600 13.5px var(--font-body); fill: var(--rs-dim); letter-spacing: .1em; text-transform: uppercase; }
            .rs-val   { font: 700 21px var(--font-body);   fill: var(--rs-fg); }
            .rs-miss  { font: 700 21px var(--font-body);   fill: var(--rs-signal); }
            .rs-note  { font: 600 11.5px var(--font-body); fill: var(--rs-signal); letter-spacing: .08em; text-transform: uppercase; }
            .rs-rail  { stroke: var(--rs-rail); stroke-width: 1.5; }
            .rs-path  { stroke: var(--rs-signal); stroke-width: 2.5; stroke-linecap: round; }
            .rs-coin  { fill: var(--rs-signal); }

            @media (prefers-reduced-motion: no-preference) {
              .rs-coin { animation: rs-move 4.6s ease-in-out infinite; }
              .rs-path { animation: rs-draw 4.6s ease-in-out infinite; }
            }
            /* Leaves the passbook, crosses, and stops before it ever lands. */
            @keyframes rs-move {
              0%, 10%   { transform: translateX(0);     opacity: 0; }
              16%       { opacity: 1; }
              62%, 100% { transform: translateX(250px); opacity: 1; }
            }
            @keyframes rs-draw {
              0%, 10%   { stroke-dashoffset: 250; }
              62%, 100% { stroke-dashoffset: 0; }
            }
          `}</style>
        </defs>

        {/* Row 1: the portal */}
        <text className="rs-src" x="0" y="16">EPFO MEMBER PORTAL</text>
        <text className="rs-val" x="0" y="44">Submitted at portal</text>
        <line className="rs-rail" x1="0" y1="62" x2="640" y2="62" />

        {/* Row 2: the passbook, where the money leaves */}
        <text className="rs-src" x="0" y="106">EPFO PASSBOOK</text>
        <text className="rs-val" x="0" y="134">&#8377;1,20,000 debited</text>
        <line className="rs-rail" x1="0" y1="152" x2="640" y2="152" />

        {/* The journey it is supposed to make, and where it stops */}
        <line
          className="rs-path"
          x1="330" y1="152" x2="580" y2="152"
          strokeDasharray="250" strokeDashoffset="0"
        />
        <circle className="rs-coin" cx="330" cy="152" r="5.5" />

        {/* Row 3: the bank, where it never arrives */}
        <text className="rs-src" x="0" y="196">YOUR BANK ACCOUNT</text>
        <text className="rs-miss" x="0" y="224">Nothing received</text>
        <line className="rs-rail" x1="0" y1="242" x2="640" y2="242" />

        {/* The empty slot */}
        <rect
          x="500" y="196" width="140" height="46" rx="2"
          fill="none" stroke="var(--rs-signal)" strokeWidth="1.5" strokeDasharray="6 5"
        />
        <text className="rs-note" x="570" y="224" textAnchor="middle">never arrived</text>
      </svg>

      <figcaption
        id="strip-caption"
        style={{
          marginTop: '1.5rem',
          color: onInk ? 'var(--hero-dim)' : 'var(--ink-2)',
          fontSize: '1rem',
          maxWidth: '48ch',
        }}
      >
        One claim. Three systems that never agree, and never appear on the same
        screen. This is why nobody can tell where their own money is.
      </figcaption>
    </figure>
  )
}
