// Claims listing page

import { getAllClaimsDb } from "@/lib/db";
import { ClaimCard } from "@/components/ClaimCard";
import Link from "next/link";

export const metadata = {
  title: "All Claims — Sleep Evidence Database",
  description: "Browse all evidence-backed sleep claims with full study details, evidence scores, and PubMed references. Based on human RCTs and meta-analyses.",
  alternates: {
    canonical: "/claims",
  },
  openGraph: {
    title: "All Claims — Sleep Evidence Database",
    description: "Browse all evidence-backed sleep claims with full study details and evidence scores.",
    url: "/claims",
    type: "website",
  },
};

export default async function ClaimsPage() {
  const claims = await getAllClaimsDb();
  const categories = [...new Set(claims.map((c) => c.category))];

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://sleep.p1web.site/" },
      { "@type": "ListItem", position: 2, name: "Claims", item: "https://sleep.p1web.site/claims" },
    ],
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Sleep Evidence Claims",
    numberOfItems: claims.length,
    itemListElement: claims.slice(0, 50).map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `https://sleep.p1web.site/claim/${c.slug}`,
      name: c.text,
    })),
  };

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />

      <nav className="text-sm text-gray-400 mb-4">
        <Link href="/" className="hover:text-brand-600">Home</Link>
        {" / "}
        <span className="text-gray-600">Claims</span>
      </nav>

      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">All Claims</h1>
        <p className="text-gray-600">
          {claims.length} evidence-backed claims across {categories.length} categories
        </p>
      </header>

      {categories.map((category) => (
        <section key={category} className="mb-8">
          <h2 className="text-lg font-bold text-gray-700 mb-3 border-b border-gray-200 pb-1">
            {category}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {claims
              .filter((c) => c.category === category)
              .map((claim) => (
                <ClaimCard key={claim.id} claim={claim} />
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
