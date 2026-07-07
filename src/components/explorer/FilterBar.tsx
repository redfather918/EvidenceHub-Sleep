// Explorer FilterBar — server component, URL-driven (no client JS).
// Each option is a Link that updates the homepage query params and re-renders server-side.

import Link from "next/link";

export interface FilterState {
  topic?: string;
  category?: string;
  studyType?: string;
  sort?: string;
  q?: string;
}

const STUDY_TYPES = [
  { value: "rct", label: "Human RCT" },
  { value: "meta", label: "Meta-analysis" },
  { value: "observational", label: "Observational" },
  { value: "animal", label: "Animal" },
];
const SORTS = [
  { value: "evidence", label: "Highest Evidence" },
  { value: "rct", label: "Most Human Studies" },
  { value: "newest", label: "Newest" },
  { value: "updated", label: "Most Updated" },
];

export function FilterBar({
  current,
  categories,
}: {
  current: FilterState;
  categories: string[];
}) {
  // Build an href that merges current filters with an override, resetting pagination.
  const href = (override: Partial<FilterState>): string => {
    const merged: Record<string, string> = {};
    if (current.topic) merged.topic = current.topic;
    if (current.category) merged.category = current.category;
    if (current.studyType) merged.studyType = current.studyType;
    if (current.sort) merged.sort = current.sort;
    if (current.q) merged.q = current.q;
    Object.entries(override).forEach(([k, v]) => {
      if (v === undefined || v === "") delete merged[k];
      else merged[k] = v;
    });
    const qs = new URLSearchParams(merged).toString();
    return qs ? `/?${qs}` : "/";
  };

  const chip = (label: string, active: boolean) =>
    `px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
      active
        ? "bg-brand-600 text-white border-brand-600"
        : "bg-white text-gray-600 border-gray-300 hover:border-brand-400 hover:text-brand-600"
    }`;

  return (
    <div className="space-y-3">
      {/* Category */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 w-20 shrink-0">
          Category
        </span>
        <Link href={href({ category: undefined })} className={chip("All", !current.category)}>
          All
        </Link>
        {categories.map((cat) => (
          <Link
            key={cat}
            href={href({ category: cat })}
            className={chip(cat, current.category === cat)}
          >
            {cat}
          </Link>
        ))}
      </div>

      {/* Study Type */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 w-20 shrink-0">
          Evidence
        </span>
        <Link href={href({ studyType: undefined })} className={chip("All", !current.studyType)}>
          All
        </Link>
        {STUDY_TYPES.map((st) => (
          <Link
            key={st.value}
            href={href({ studyType: st.value })}
            className={chip(st.label, current.studyType === st.value)}
          >
            {st.label}
          </Link>
        ))}
      </div>

      {/* Sort */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 w-20 shrink-0">
          Sort
        </span>
        {SORTS.map((s) => (
          <Link
            key={s.value}
            href={href({ sort: s.value })}
            className={chip(s.label, (current.sort || "evidence") === s.value)}
          >
            {s.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
