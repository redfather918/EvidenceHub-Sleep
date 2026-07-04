// API Documentation page

import Link from "next/link";

export const metadata = {
  title: "API Documentation — EvidenceHub Sleep",
  description: "REST API for sleep evidence claims. Built for AI consumption.",
};

export default function ApiDocsPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">API Documentation</h1>
        <p className="text-gray-600">
          Structured JSON API for sleep evidence. Designed for AI agents, health apps, and developers.
        </p>
      </header>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8 text-sm text-amber-800">
        <strong>Note:</strong> The API is in beta. All endpoints return JSON. No authentication
        required during MVP.
      </div>

      {/* Endpoints */}
      <section className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Endpoints</h2>

        {/* Claim API */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded">GET</span>
            <code className="text-sm font-mono text-gray-800">/api/claim/{`{slug}`}</code>
          </div>
          <p className="text-sm text-gray-600 mb-3">
            Returns structured claim data including confidence score, RCT count, dose, and population.
          </p>
          <div className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs font-mono overflow-x-auto">
{`GET /api/claim/glycine-sleep-latency

Response:
{
  "slug": "glycine-sleep-latency",
  "text": "Glycine reduces sleep latency in human RCTs",
  "confidence": 91,
  "confidenceLevel": "high",
  "rcts": 3,
  "meta": 0,
  "dose": "3g",
  "population": ["Healthy adults", "Adults with mild sleep complaints"],
  "evidenceScore": 91,
  "lastUpdated": "2026-06-15T00:00:00Z"
}`}
          </div>
          <Link
            href="/api/claim/glycine-sleep-latency"
            className="text-sm text-brand-600 hover:underline mt-2 inline-block"
          >
            Try it &rarr;
          </Link>
        </div>

        {/* Evidence API */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded">GET</span>
            <code className="text-sm font-mono text-gray-800">/api/evidence/{`{topic}`}</code>
          </div>
          <p className="text-sm text-gray-600 mb-3">
            Returns aggregated evidence for a topic/compound, including all related claims and study counts.
          </p>
          <div className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs font-mono overflow-x-auto">
{`GET /api/evidence/magnesium

Response:
{
  "topic": "Magnesium",
  "summary": "An essential mineral involved in GABA regulation...",
  "strength": "moderate",
  "studies": 3,
  "claims": [
    {
      "slug": "magnesium-sleep-quality",
      "text": "Magnesium supplementation improves sleep quality...",
      "score": 84
    }
  ]
}`}
          </div>
          <Link
            href="/api/evidence/magnesium"
            className="text-sm text-brand-600 hover:underline mt-2 inline-block"
          >
            Try it &rarr;
          </Link>
        </div>

        {/* Search API */}
        <div className="bg-white border border-gray-200 rounded-lg p-5 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded">GET</span>
            <code className="text-sm font-mono text-gray-800">/api/search?q={`{query}`}</code>
          </div>
          <p className="text-sm text-gray-600 mb-3">
            Search across all claims by keyword, compound, or text.
          </p>
          <div className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs font-mono overflow-x-auto">
{`GET /api/search?q=glycine&limit=5

Response:
{
  "query": "glycine",
  "count": 2,
  "results": [
    {
      "slug": "glycine-sleep-latency",
      "text": "Glycine reduces sleep latency...",
      "evidenceScore": 91,
      "dose": "3g",
      "rcts": 3,
      "url": "/claim/glycine-sleep-latency"
    }
  ]
}`}
          </div>
          <Link
            href="/api/search?q=glycine"
            className="text-sm text-brand-600 hover:underline mt-2 inline-block"
          >
            Try it &rarr;
          </Link>
        </div>
      </section>

      {/* MCP Server (roadmap) */}
      <section className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">MCP Server (Roadmap)</h2>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">
            An MCP (Model Context Protocol) server is planned to allow AI agents (ChatGPT, Claude,
            Gemini) to directly query the Evidence Graph. This will enable:
          </p>
          <ul className="text-sm text-gray-600 mt-2 space-y-1 ml-4 list-disc">
            <li><code>get_claim(slug)</code> — Retrieve a full claim with evidence</li>
            <li><code>search_evidence(query)</code> — Natural language search</li>
            <li><code>get_dose(compound)</code> — Get optimal dose ranges</li>
            <li><code>compare(compound_a, compound_b)</code> — Compare evidence strength</li>
          </ul>
          <p className="text-xs text-gray-400 mt-3">Target: Q3 2026</p>
        </div>
      </section>

      {/* Rate limits */}
      <section className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Rate Limits</h2>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-sm text-gray-600">
          <p>MVP: No rate limits. Production will include tiered access:</p>
          <ul className="mt-2 space-y-1 ml-4 list-disc">
            <li>Free: 100 requests/day</li>
            <li>Pro: 10,000 requests/day</li>
            <li>Enterprise: Unlimited + MCP access</li>
          </ul>
        </div>
      </section>

      <div className="bg-brand-50 rounded-lg p-6 text-center">
        <h3 className="font-bold text-gray-900 mb-2">Ready to build?</h3>
        <p className="text-sm text-gray-600 mb-4">
          All endpoints are live and return JSON. No API key needed during MVP.
        </p>
        <Link
          href="/api/claim/melatonin-sleep-latency"
          className="inline-block bg-brand-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-brand-700"
        >
          View Sample Response
        </Link>
      </div>
    </div>
  );
}
