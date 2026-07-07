// Topic detail page

import { notFound } from "next/navigation";
import Link from "next/link";
import { getTopicBySlugDb, getClaimsByTopicDb, getAllTopicsDb } from "@/lib/db";
import { generateTopicMetadata, generateBreadcrumbJsonLd } from "@/lib/seo";
import { ClaimCard } from "@/components/ClaimCard";

// ISR: revalidate every hour
export const revalidate = 3600;

export async function generateStaticParams() {
  const topics = await getAllTopicsDb();
  return topics.map((topic) => ({ slug: topic.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const topic = await getTopicBySlugDb(params.slug);
  if (!topic) return {};
  return generateTopicMetadata(topic);
}

export default async function TopicPage({ params }: { params: { slug: string } }) {
  const topic = await getTopicBySlugDb(params.slug);
  if (!topic) notFound();

  const claims = await getClaimsByTopicDb(params.slug);
  const avgScore =
    claims.length > 0
      ? Math.round(claims.reduce((sum, c) => sum + c.evidenceScore, 0) / claims.length)
      : 0;
  const totalStudies = claims.reduce((sum, c) => sum + c.studyCount, 0);
  const totalRcts = claims.reduce((sum, c) => sum + c.rctCount, 0);

  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "Topics", url: "/topics" },
    { name: topic.name, url: `/topics/${topic.slug}` },
  ]);

  const collectionPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${topic.name} — Sleep Evidence`,
    description: topic.description,
    url: `https://sleep.p1web.site/topics/${topic.slug}`,
    hasPart: claims.map((c) => ({
      "@type": "Article",
      headline: c.text,
      url: `https://sleep.p1web.site/claim/${c.slug}`,
    })),
  };

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPageJsonLd) }} />

      <nav className="text-sm text-gray-400 mb-4">
        <Link href="/" className="hover:text-brand-600">Home</Link>
        {" / "}
        <Link href="/topics" className="hover:text-brand-600">Topics</Link>
        {" / "}
        <span className="text-gray-600">{topic.name}</span>
      </nav>

      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{topic.name}</h1>
        <p className="text-lg text-gray-600">{topic.description}</p>

        <div className="flex gap-6 mt-4">
          <div className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-center">
            <div className="text-xl font-bold text-brand-700">{claims.length}</div>
            <div className="text-xs text-gray-500">Claims</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-center">
            <div className="text-xl font-bold text-brand-700">{totalRcts}</div>
            <div className="text-xs text-gray-500">Human RCTs</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-center">
            <div className="text-xl font-bold text-brand-700">{avgScore}</div>
            <div className="text-xs text-gray-500">Avg Score</div>
          </div>
        </div>
      </header>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {claims.map((claim) => (
          <ClaimCard key={claim.id} claim={claim} />
        ))}
      </div>
    </div>
  );
}
