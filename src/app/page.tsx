// EvidenceHub — Homepage = Evidence Explorer (V3)

import Link from "next/link";
import {
  getTrendingClaimsDb,
  getLatestClaimsDb,
  getAllTopicsDb,
  getAllStudiesDb,
  getAllClaimsDb,
  getHomeStats,
  exploreClaimsDb,
  type ExploreStudyType,
  type ExploreSort,
} from "@/lib/db";
import { ClaimCard } from "@/components/ClaimCard";
import { FilterBar, type FilterState } from "@/components/explorer/FilterBar";

export const metadata = {
  title: "EvidenceHub — Search Evidence-Based Sleep & Health Claims",
  description:
    "An AI-native evidence search engine. Explore 200+ scored scientific claims on sleep, nutrition, heart health and longevity — filtered by RCT, meta-analysis, and evidence score.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "EvidenceHub — Evidence Search Engine",
    description:
      "Search evidence-based sleep and health claims. Scored on human RCTs, meta-analyses, mechanism, and safety.",
    url: "/",
    type: "website",
  },
};

const TOPIC_COLORS: Record<string, string> = {
  sleep: "bg-blue-100 text-blue-700 border-blue-300",
  nutrition: "bg-green-100 text-green-700 border-green-300",
  heart: "bg-red-100 text-red-700 border-red-300",
  longevity: "bg-yellow-100 text-yellow-700 border-yellow-300",
  sports: "bg-orange-100 text-orange-700 border-orange-300",
  mental: "bg-purple-100 text-purple-700 border-purple-300",
  metabolic: "bg-teal-100 text-teal-700 border-teal-300",
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: {
    topic?: string;
    category?: string;
    studyType?: string;
    sort?: string;
    q?: string;
    page?: string;
  };
}) {
  const filter: FilterState = {
    topic: searchParams.topic,
    category: searchParams.category,
    studyType: searchParams.studyType,
    sort: searchParams.sort,
    q: searchParams.q,
  };

  const [trendingRaw, latestClaims, topics, stats, studies, allClaims, explore] = await Promise.all([
    getTrendingClaimsDb(12),
    getLatestClaimsDb(4),
    getAllTopicsDb(),
    getHomeStats(),
    getAllStudiesDb(),
    getAllClaimsDb(),
    exploreClaimsDb({
      topic: searchParams.topic,
      category: searchParams.category,
      studyType: (searchParams.studyType as ExploreStudyType) || undefined,
      sort: (searchParams.sort as ExploreSort) || "evidence",
      q: searchParams.q,
      page: searchParams.page ? parseInt(searchParams.page, 10) : 1,
      pageSize: 12,
    }),
  ]);

  const categories = [...new Set(allClaims.map((c) => c.category))].sort();

  // Trending: prefer high-confidence, fall back to top by score
  const highConf = trendingRaw.filter((c) => c.confidence === "high");
  const trendingClaims = [...highConf, ...trendingRaw.filter((c) => c.confidence !== "high")].slice(0, 6);

  const newestStudies = [...studies]
    .sort((a, b) => (b.year || 0) - (a.year || 0))
    .slice(0, 4);

  // Build pagination / filter href helper
  const buildHref = (override: Record<string, string | undefined>): string => {
    const merged: Record<string, string> = {};
    if (filter.topic) merged.topic = filter.topic;
    if (filter.category) merged.category = filter.category;
    if (filter.studyType) merged.studyType = filter.studyType;
    if (filter.sort) merged.sort = filter.sort;
    if (filter.q) merged.q = filter.q;
    Object.entries(override).forEach(([k, v]) => {
      if (!v) delete merged[k];
      else merged[k] = v;
    });
    const qs = new URLSearchParams(merged).toString();
    return qs ? `/?${qs}` : "/";
  };

  const totalPages = Math.ceil(explore.total / explore.pageSize);

  // ItemList JSON-LD for the explorer results (SEO)
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "EvidenceHub Explorer Results",
    numberOfItems: explore.items.length,
    itemListElement: explore.items.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `https://sleep.p1web.site/claim/${c.slug}`,
      name: c.text,
    })),
  };

  return (
    <div className="space-y-12">
      {/* Hero / Search */}
      <section className="text-center py-10">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">
          Search evidence, <span className="text-brand-600">not opinions</span>
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
          An AI-native evidence search engine. Every claim is scored on human RCTs, meta-analyses,
          mechanism, and safety — then made machine-readable for AI.
        </p>
        <form action="/search" className="max-w-2xl mx-auto">
          <div className="flex gap-2">
            <input
              type="text"
              name="q"
              defaultValue={filter.q || ""}
              placeholder="Search evidence: glycine, magnesium, melatonin…"
              className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-gray-800"
            />
            <button
              type="submit"
              className="bg-brand-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-brand-700"
            >
              Search
            </button>
          </div>
        </form>
        <div className="flex flex-wrap gap-2 justify-center mt-4 text-sm">
          <span className="text-gray-400">Try:</span>
          {["glycine sleep", "magnesium dose", "melatonin safety", "ashwagandha"].map((t) => (
            <Link
              key={t}
              href={`/search?q=${encodeURIComponent(t)}`}
              className="text-brand-600 hover:underline"
            >
              {t}
            </Link>
          ))}
        </div>
      </section>

      {/* Stats bar */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Claims", value: stats.claims, href: "/claims" },
          { label: "Studies", value: stats.studies, href: "/studies" },
          { label: "Topics", value: stats.topics, href: "/topics" },
          { label: "Human RCTs", value: stats.humanRcts, href: "/studies?studyType=rct" },
        ].map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="block bg-white rounded-lg border border-gray-200 p-4 text-center hover:shadow-md hover:border-brand-300 transition-all"
          >
            <div className="text-2xl font-bold text-brand-700">{stat.value}</div>
            <div className="text-sm text-gray-500">{stat.label}</div>
          </Link>
        ))}
      </section>

      {/* Browse by Topic */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Browse Topics</h2>
          <Link href="/topics" className="text-sm text-brand-600 hover:underline">
            All topics &rarr;
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {topics.map((topic) => {
            const color = TOPIC_COLORS[topic.slug] || "bg-gray-100 text-gray-700 border-gray-300";
            return (
              <Link
                key={topic.id}
                href={`/topics/${topic.slug}`}
                className={`rounded-lg border p-4 hover:shadow-md transition-all text-center ${color}`}
              >
                <div className="text-2xl mb-1">{topic.icon || "🔬"}</div>
                <div className="font-semibold">{topic.name}</div>
                <div className="text-xs opacity-70 mt-1">{topic.claimCount} claims</div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Trending Evidence */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Trending Evidence</h2>
          <Link href="/claims?sort=evidence" className="text-sm text-brand-600 hover:underline">
            View all &rarr;
          </Link>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {trendingClaims.map((claim) => (
            <ClaimCard key={claim.id} claim={claim} />
          ))}
        </div>
      </section>

      {/* Evidence Explorer (filterable) */}
      <section className="bg-gray-50 rounded-xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Evidence Explorer</h2>
          <span className="text-sm text-gray-500">{explore.total} claims</span>
        </div>

        <FilterBar current={filter} categories={categories} />

        <div className="mt-6 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {explore.items.map((claim) => (
            <ClaimCard key={claim.id} claim={claim} />
          ))}
        </div>

        {explore.items.length === 0 && (
          <p className="text-center text-gray-500 py-12">
            No claims match these filters.{" "}
            <Link href="/" className="text-brand-600 hover:underline">
              Reset filters
            </Link>
          </p>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-6">
            {explore.page > 1 && (
              <Link
                href={buildHref({ page: String(explore.page - 1) })}
                className="px-4 py-2 rounded-lg border border-gray-300 bg-white hover:border-brand-400 text-gray-700"
              >
                &larr; Previous
              </Link>
            )}
            <span className="text-sm text-gray-500">
              Page {explore.page} of {totalPages}
            </span>
            {explore.page < totalPages && (
              <Link
                href={buildHref({ page: String(explore.page + 1) })}
                className="px-4 py-2 rounded-lg border border-gray-300 bg-white hover:border-brand-400 text-gray-700"
              >
                Next &rarr;
              </Link>
            )}
          </div>
        )}
      </section>

      {/* Newest Studies + Recently Updated */}
      <section className="grid md:grid-cols-2 gap-8">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Newest Studies</h2>
            <Link href="/studies" className="text-sm text-brand-600 hover:underline">
              All &rarr;
            </Link>
          </div>
          <div className="space-y-3">
            {newestStudies.map((study) => (
              <a
                key={study.id}
                href={study.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${study.pmid}/` : study.url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
              >
                <p className="font-semibold text-gray-800 line-clamp-2">{study.title}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {study.journal}
                  {study.year ? `, ${study.year}` : ""} ·{" "}
                  <span className="uppercase text-brand-600">{study.studyType}</span>
                </p>
              </a>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Recently Updated</h2>
            <Link href="/claims?sort=updated" className="text-sm text-brand-600 hover:underline">
              All &rarr;
            </Link>
          </div>
          <div className="grid gap-3">
            {latestClaims.map((claim) => (
              <ClaimCard key={claim.id} claim={claim} />
            ))}
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="bg-brand-50 rounded-xl p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          Not a content website. An evidence engine.
        </h2>
        <div className="grid md:grid-cols-3 gap-6 mt-4">
          <div>
            <div className="text-3xl mb-2">{"\u{1F50E}"}</div>
            <h3 className="font-semibold mb-1">Evidence Scored</h3>
            <p className="text-sm text-gray-600">
              Every claim is scored on human RCTs, meta-analyses, mechanism, and safety. No more
              guessing what "studies show" means.
            </p>
          </div>
          <div>
            <div className="text-3xl mb-2">{"\u{1F9EE}"}</div>
            <h3 className="font-semibold mb-1">Claim Graph</h3>
            <p className="text-sm text-gray-600">
              Claims link to studies, doses, populations, and mechanisms. When new research
              appears, everything updates.
            </p>
          </div>
          <div>
            <div className="text-3xl mb-2">{"\u{1F916}"}</div>
            <h3 className="font-semibold mb-1">AI-Ready API</h3>
            <p className="text-sm text-gray-600">
              Structured JSON API designed for ChatGPT, Claude, and AI agents. Not just
              human-readable — machine-computable.
            </p>
          </div>
        </div>
      </section>

      {/* Quick links */}
      <section className="grid md:grid-cols-3 gap-4">
        <Link
          href="/api-docs"
          className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-all"
        >
          <h3 className="font-semibold text-gray-800 mb-1">API Documentation</h3>
          <p className="text-sm text-gray-500">
            REST endpoints for claims, evidence, and search. Built for AI consumption.
          </p>
        </Link>
        <Link
          href="/claims"
          className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-all"
        >
          <h3 className="font-semibold text-gray-800 mb-1">Browse All Claims</h3>
          <p className="text-sm text-gray-500">
            Explore all evidence-backed claims with full study details.
          </p>
        </Link>
        <Link
          href="/topics"
          className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-all"
        >
          <h3 className="font-semibold text-gray-800 mb-1">Browse by Topic</h3>
          <p className="text-sm text-gray-500">
            Glycine, magnesium, melatonin, and more. Find claims by compound.
          </p>
        </Link>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
    </div>
  );
}
