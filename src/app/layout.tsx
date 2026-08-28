import type { Metadata } from "next";
import { Public_Sans, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { ThemeToggle } from "@/components/ThemeToggle";

// A civic UI face for the interface, a document serif for headings and money.
// Both are loaded with a real fallback stack in globals.css, so a failed font
// request degrades instead of leaving the page unstyled.
const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Where is my PF money?",
  description:
    "An independent prototype that reconciles EPFO's own systems into one honest status, names what is actually blocking your claim, and escalates when EPFO misses its own deadline.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${publicSans.variable} ${sourceSerif.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('theme');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t)}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        {/* The header carries the same surface as the hero band, so the two
            meet with no seam, and it holds the wordmark on every page. */}
        <header
          style={{
            background: "var(--hero-bg)",
            color: "var(--hero-fg)",
            borderBottom: "1px solid var(--hero-rail)",
          }}
        >
          <div
            style={{
              maxWidth: 1140,
              margin: "0 auto",
              padding: "0.85rem var(--pad-page)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
            }}
          >
            <a
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "baseline",
                gap: "0.55rem",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1.15rem",
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                }}
              >
                EPFO Truth
              </span>
              <span
                style={{
                  fontSize: "0.68rem",
                  letterSpacing: "0.16em",
                  fontWeight: 700,
                  color: "var(--signal)",
                }}
              >
                PROTOTYPE
              </span>
            </a>

            <ThemeToggle />
          </div>
        </header>

        <div className="flex-1">{children}</div>

        {/* Required on every page: this must never be mistaken for EPFO. */}
        <footer
          style={{
            borderTop: "1px solid var(--line)",
            marginTop: "clamp(3rem, 8vw, 6rem)",
            padding: "2rem var(--pad-page)",
            color: "var(--ink-3)",
            fontSize: 14,
          }}
        >
          <p style={{ maxWidth: "68ch", margin: 0 }}>
            <strong style={{ color: "var(--ink-2)", fontWeight: 600 }}>
              Independent hackathon prototype.
            </strong>{" "}
            Not affiliated with EPFO, the Ministry of Labour and Employment, or
            the Government of India. Every member, claim and amount shown is
            synthetic. No real government system is contacted.
          </p>
        </footer>
      </body>
    </html>
  );
}
