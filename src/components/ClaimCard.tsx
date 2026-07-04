// Claim Card component for lists

import Link from "next/link";
import type { Claim } from "@/lib/types";

export function ClaimCard({ claim }: { claim: Claim }) {
  const scoreColor =
    claim.evidenceScore >= 85
      ? "bg-green-100 text-green-700 border-green-300"
      : claim.evidenceScore >= 70
        ? "bg-amber-100 text-amber-700 border-amber-300"
        : "bg-red-100 text-red-700 border-red-300";

  return (
    <Link
      href={`/claim/${claim.slug}`}
      className="block bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md hover:border-brand-300 transition-all"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${scoreColor}`}>
          {claim.evidenceScore}/100
        </span>
        <span className="text-xs text-gray-400">{claim.category}</span>
      </div>
      <h3 className="font-semibold text-gray-800 mb-1 line-clamp-2">{claim.text}</h3>
      <p className="text-sm text-gray-500 line-clamp-2">{claim.summary}</p>
      <div className="flex gap-3 mt-3 text-xs text-gray-400">
        <span>{claim.rctCount} RCTs</span>
        {claim.metaCount > 0 && <span>{claim.metaCount} Meta-analyses</span>}
        <span>Dose: {claim.dose}</span>
      </div>
    </Link>
  );
}
