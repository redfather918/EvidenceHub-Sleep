// Claims listing page

import { getAllClaims } from "@/lib/data";
import { ClaimCard } from "@/components/ClaimCard";

export const metadata = {
  title: "All Claims — Sleep Evidence Database",
  description: "Browse all evidence-backed sleep claims with full study details and evidence scores.",
};

export default function ClaimsPage() {
  const claims = getAllClaims();
  const categories = [...new Set(claims.map((c) => c.category))];

  return (
    <div>
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
