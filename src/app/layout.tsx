import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "EvidenceHub Sleep — AI-Driven Sleep Evidence Knowledge System",
    template: "%s | EvidenceHub Sleep",
  },
  description:
    "A computable knowledge graph for sleep science. Get evidence-based answers on glycine, magnesium, melatonin, and more — structured for humans and AI.",
  keywords: [
    "sleep evidence",
    "sleep research",
    "glycine sleep",
    "magnesium sleep",
    "melatonin",
    "evidence-based sleep",
    "sleep RCT",
  ],
  metadataBase: new URL("https://evidencehubsleep.com"),
  openGraph: {
    title: "EvidenceHub Sleep",
    description: "A computable knowledge graph for sleep science.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "EvidenceHub Sleep",
              url: "https://evidencehubsleep.com",
              description:
                "AI-driven evidence-based sleep knowledge system. Computable evidence graph for sleep science.",
            }),
          }}
        />
      </head>
      <body>
        <nav className="border-b border-gray-200 bg-white sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link href="/" className="font-bold text-lg text-brand-700">
              EvidenceHub <span className="text-gray-400 font-normal">Sleep</span>
            </Link>
            <div className="flex items-center gap-6 text-sm">
              <Link href="/topics" className="text-gray-600 hover:text-brand-700">
                Topics
              </Link>
              <Link href="/claims" className="text-gray-600 hover:text-brand-700">
                Claims
              </Link>
              <a href="/api-docs" className="text-gray-600 hover:text-brand-700">
                API
              </a>
              <Link
                href="/search"
                className="bg-brand-600 text-white px-3 py-1.5 rounded-md hover:bg-brand-700"
              >
                Search
              </Link>
            </div>
          </div>
        </nav>
        <main className="max-w-6xl mx-auto px-4 py-8 min-h-[calc(100vh-3.5rem)]">
          {children}
        </main>
        <footer className="border-t border-gray-200 bg-white">
          <div className="max-w-6xl mx-auto px-4 py-8 text-sm text-gray-500">
            <div className="flex flex-wrap gap-8">
              <div className="flex-1 min-w-[200px]">
                <h3 className="font-semibold text-gray-700 mb-2">EvidenceHub Sleep</h3>
                <p>A computable knowledge graph for sleep science.</p>
                <p className="mt-2 text-xs">
                  Not medical advice. Evidence is for educational purposes. Always consult a healthcare
                  professional.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Explore</h4>
                <ul className="space-y-1">
                  <li><Link href="/topics" className="hover:text-brand-700">Topics</Link></li>
                  <li><Link href="/claims" className="hover:text-brand-700">All Claims</Link></li>
                  <li><Link href="/search" className="hover:text-brand-700">Search</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Developers</h4>
                <ul className="space-y-1">
                  <li><a href="/api-docs" className="hover:text-brand-700">API Docs</a></li>
                  <li><a href="/api/claim/melatonin-sleep-latency" className="hover:text-brand-700">Claim API</a></li>
                  <li><a href="/api/evidence/magnesium" className="hover:text-brand-700">Evidence API</a></li>
                </ul>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-100 text-xs">
              (c) 2026 EvidenceHub Sleep. Built with evidence, not marketing.
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
