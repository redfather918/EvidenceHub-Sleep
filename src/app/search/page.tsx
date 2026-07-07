// Search page

import Link from "next/link";
import { searchClaimsDb, getAllClaimsDb } from "@/lib/db";
import { ClaimCard } from "@/components/ClaimCard";

export const metadata = {
  title: "Search — Sleep Evidence",
  description: "Search evidence-based sleep claims and research. Find answers on glycine, magnesium, melatonin and more.",
  alternates: {
    canonical: "/search",
  },
  openGraph: {
    title: "Search — Sleep Evidence Database",
    description: "Search evidence-based sleep claims and research.",
    url: "/search",
    type: "website",
  },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const query = searchParams.q || "";
  const results = query ? await searchClaimsDb(query) : await getAllClaimsDb();

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://sleep.p1web.site/" },
      { "@type": "ListItem", position: 2, name: "Search", item: "https://sleep.p1web.site/search" },
    ],
  };

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Search Evidence</h1>
        <form action="/search" className="flex gap-2 max-w-2xl">
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="Search claims, compounds, keywords..."
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500 text-gray-800"
          />
          <button
            type="submit"
            className="bg-brand-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-brand-700"
          >
            Search
          </button>
        </form>
      </header>

      <div className="mb-4 text-sm text-gray-500">
        {query ? (
          <span>
            {results.length} result{results.length !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
          </span>
        ) : (
          <span>All {results.length} claims</span>
        )}
      </div>

      {results.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {results.map((claim) => (
            <ClaimCard key={claim.id} claim={claim} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-400">
          <p className="mb-2">No claims found for &ldquo;{query}&rdquo;</p>
          <Link href="/search" className="text-brand-600 hover:underline">
            Browse all claims
          </Link>
        </div>
      )}
    </div>
  );
}
