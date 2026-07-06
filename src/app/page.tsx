// EvidenceHub Sleep — Homepage

import Link from "next/link";
import { getTrendingClaims, getLatestClaims, getAllTopics } from "@/lib/data";
import { getHomeStats } from "@/lib/db";
import { ClaimCard } from "@/components/ClaimCard";

export default async function HomePage() {
  const trendingClaims = getTrendingClaims(6);
  const latestClaims = getLatestClaims(4);
  const topics = getAllTopics();
  const stats = await getHomeStats();

  return (
    <div className="space-y-12">
      {/* Hero / Search */}
      <section className="text-center py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">
          Sleep Science, <span className="text-brand-600">Computable</span>
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
          Evidence-based answers from human research. Not marketing — structured, scored, and
          AI-ready.
        </p>
        <form action="/search" className="max-w-xl mx-auto">
          <div className="flex gap-2">
            <input
              type="text"
              name="q"
              placeholder="Ask: Does glycine improve sleep? Best magnesium dose?"
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
          <span className="text-gray-400">Trending:</span>
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
          { label: "Claims", value: stats.claims },
          { label: "Studies", value: stats.studies },
          { label: "Topics", value: stats.topics },
          { label: "Human RCTs", value: stats.humanRcts },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-lg border border-gray-200 p-4 text-center">
            <div className="text-2xl font-bold text-brand-700">{stat.value}</div>
            <div className="text-sm text-gray-500">{stat.label}</div>
          </div>
        ))}
      </section>

      {/* Trending Claims */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Trending Claims</h2>
          <Link href="/claims" className="text-sm text-brand-600 hover:underline">
            View all &rarr;
          </Link>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {trendingClaims.map((claim) => (
            <ClaimCard key={claim.id} claim={claim} />
          ))}
        </div>
      </section>

      {/* Topics */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Topics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {topics.map((topic) => (
            <Link
              key={topic.id}
              href={`/topics/${topic.slug}`}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md hover:border-brand-300 transition-all text-center"
            >
              <div className="font-semibold text-gray-800">{topic.name}</div>
              <div className="text-xs text-gray-400 mt-1">{topic.claimCount} claims</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Latest Evidence */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Latest Evidence Updates</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {latestClaims.map((claim) => (
            <ClaimCard key={claim.id} claim={claim} />
          ))}
        </div>
      </section>

      {/* Mission / What is this */}
      <section className="bg-brand-50 rounded-xl p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Not a content website. A knowledge graph.</h2>
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
              Structured JSON API designed for ChatGPT, Claude, and AI agents. Not just human-readable —
              machine-computable.
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
            Explore all evidence-backed sleep claims with full study details.
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
    </div>
  );
}
