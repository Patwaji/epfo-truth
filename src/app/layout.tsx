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
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "1.5rem",
              flexWrap: "wrap",
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

            <ThemeToggle />
          </div>
        </footer>
      </body>
    </html>
  );
}
