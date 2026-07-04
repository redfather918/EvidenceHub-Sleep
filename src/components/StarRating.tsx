// Star rating component for evidence scores

export function StarRating({ score, max = 5 }: { score: number; max?: number }) {
  return (
    <span className="star-rating text-yellow-500" aria-label={`${score} out of ${max} stars`}>
      {"\u2605".repeat(score)}
      {"\u2606".repeat(max - score)}
    </span>
  );
}
