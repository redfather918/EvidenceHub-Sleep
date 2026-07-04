// Evidence Score Badge component

import { StarRating } from "./StarRating";
import type { Claim } from "@/lib/types";

export function EvidenceScoreBadge({ claim }: { claim: Claim }) {
  const scoreClass =
    claim.evidenceScore >= 85
      ? "score-high"
      : claim.evidenceScore >= 70
        ? "score-moderate"
        : "score-low";

  return (
    <div className={`rounded-lg border-2 p-4 ${scoreClass}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium">Evidence Score</span>
        <span className="text-2xl font-bold">{claim.evidenceScore}<span className="text-sm font-normal">/100</span></span>
      </div>
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Human RCT</span>
          <StarRating score={claim.humanRctScore} />
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Meta-analysis</span>
          <StarRating score={claim.metaScore} />
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Mechanism</span>
          <StarRating score={claim.mechanismScore} />
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Safety</span>
          <StarRating score={claim.safetyScore} />
        </div>
        <div className="flex justify-between items-center pt-1.5 border-t border-gray-200 mt-1.5">
          <span className="font-medium">Confidence</span>
          <span className="font-semibold capitalize">{claim.confidence}</span>
        </div>
      </div>
    </div>
  );
}
