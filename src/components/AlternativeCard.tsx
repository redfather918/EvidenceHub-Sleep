// Card for listing a prescription-drug natural alternative on /alternatives

import Link from "next/link";
import type { Alternative } from "@/data/alternatives";

export function AlternativeCard({ alt }: { alt: Alternative }) {
  return (
    <Link
      href={`/alternatives/${alt.slug}`}
      className="flex flex-col bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md hover:border-brand-300 transition-all"
    >
      <h3 className="font-semibold text-gray-800 mb-1">{alt.drug}</h3>
      <p className="text-xs text-gray-400 mb-2">{alt.use}</p>
      <p className="text-sm text-gray-500 line-clamp-2 flex-1">{alt.stackRationale}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {alt.stack.map((s) => (
          <span
            key={s.name}
            className="text-[11px] px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-100"
          >
            {s.name}
          </span>
        ))}
      </div>
    </Link>
  );
}
