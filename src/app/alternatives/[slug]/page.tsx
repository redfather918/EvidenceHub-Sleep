// EvidenceHub Sleep — /alternatives/[slug]  (Natural Alternative detail)
// Statically generated, programmatic-SEO comparison page.

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAllAlternatives, getAlternativeBySlug } from "@/lib/alternatives";
import { generateBreadcrumbJsonLd } from "@/lib/seo";

const SITE_URL = "https://sleep.p1web.site";

export function generateStaticParams() {
  return getAllAlternatives().map((a) => ({ slug: a.slug }));
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const alt = getAlternativeBySlug(params.slug);
  if (!alt) return { title: "Natural Alternative" };
  const title = `${alt.drug} Natural Alternatives | EvidenceHub Sleep`;
  const description = alt.stackRationale.slice(0, 160);
  return {
    title,
    description,
    alternates: { canonical: `/alternatives/${alt.slug}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/alternatives/${alt.slug}`,
      type: "article",
      siteName: "EvidenceHub Sleep",
    },
  };
}

export default function AlternativeDetail({
  params,
}: {
  params: { slug: string };
}) {
  const alt = getAlternativeBySlug(params.slug);
  if (!alt) notFound();

  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: "Natural Alternatives", url: "/alternatives" },
    { name: alt.drug, url: `/alternatives/${alt.slug}` },
  ]);

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: alt.faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* Breadcrumb */}
      <nav className="text-xs text-gray-400">
        <Link href="/alternatives" className="hover:text-brand-700">
          Natural Alternatives
        </Link>
        <span className="mx-1">/</span>
        <span className="text-gray-600">{alt.drug}</span>
      </nav>

      {/* Hero */}
      <section>
        <span className="inline-block mb-2 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-sm font-medium border border-brand-100">
          Natural Alternative
        </span>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900">{alt.drug}</h1>
        <p className="text-gray-500 mt-1">{alt.use}</p>
      </section>

      {/* Drug facts */}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Mechanism", value: alt.mechanism },
          { label: "Onset", value: alt.onset },
          { label: "Half-life", value: alt.halfLife },
          { label: "Key risks", value: alt.risk },
        ].map((f) => (
          <div key={f.label} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-xs uppercase tracking-wide text-gray-400">{f.label}</div>
            <p className="mt-1 text-sm text-gray-800">{f.value}</p>
          </div>
        ))}
      </section>

      {/* Comparison table */}
      <section className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {alt.drug} vs. Natural Stack — side by side
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-200">
                <th className="py-2 pr-4">Dimension</th>
                <th className="py-2 pr-4">{alt.drug}</th>
                <th className="py-2">🌿 Natural stack</th>
              </tr>
            </thead>
            <tbody>
              {alt.comparison.map((row) => (
                <tr key={row.metric} className="border-b border-gray-100">
                  <td className="py-2.5 pr-4 font-medium text-gray-700">{row.metric}</td>
                  <td className="py-2.5 pr-4 text-rose-600">{row.drug}</td>
                  <td className="py-2.5 text-emerald-600">{row.natural}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Natural stack */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4">🌿 The natural stack</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {alt.stack.map((item) =>
            item.topicSlug ? (
              <Link
                key={item.name}
                href={`/topics/${item.topicSlug}`}
                className="block bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md hover:border-brand-300 transition-all"
              >
                <h3 className="font-semibold text-gray-800">{item.name}</h3>
                {item.note && <p className="text-xs text-gray-400 mt-1">{item.note}</p>}
                <p className="text-xs text-brand-600 mt-2">View evidence &rarr;</p>
              </Link>
            ) : (
              <div
                key={item.name}
                className="bg-white border border-gray-200 rounded-lg p-5 opacity-80"
              >
                <h3 className="font-semibold text-gray-800">{item.name}</h3>
                <p className="text-xs text-gray-400 mt-1">
                  {item.note || "Topic page coming soon"}
                </p>
              </div>
            )
          )}
        </div>
      </section>

      {/* Rationale */}
      <section className="bg-brand-50 border border-brand-100 rounded-xl p-6">
        <h2 className="font-bold text-gray-900 mb-2">Why this stack</h2>
        <p className="text-sm text-gray-700 leading-relaxed">{alt.stackRationale}</p>
      </section>

      <p className="text-xs text-gray-400">
        Not medical advice. Natural stacks are not approved replacements for prescribed sleep
        medication. Consult a healthcare professional before changing your regimen.
      </p>
    </div>
  );
}
