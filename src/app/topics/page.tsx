// Topics listing page

import Link from "next/link";
import { getAllTopicsDb, getClaimsByTopicDb } from "@/lib/db";

export const metadata = {
  title: "Topics — Sleep Evidence by Compound",
  description: "Browse sleep evidence by compound: glycine, magnesium, melatonin, and more.",
};

export default async function TopicsPage() {
  const topics = await getAllTopicsDb();

  // Pre-fetch claims per topic so we can render synchronously below.
  const topicStats = await Promise.all(
    topics.map(async (topic) => {
      const topicClaims = await getClaimsByTopicDb(topic.slug);
      const avgScore =
        topicClaims.length > 0
          ? Math.round(topicClaims.reduce((sum, c) => sum + c.evidenceScore, 0) / topicClaims.length)
          : 0;
      return { topic, claimCount: topicClaims.length, avgScore };
    })
  );

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Topics</h1>
        <p className="text-gray-600">Browse evidence by compound or intervention</p>
      </header>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {topicStats.map(({ topic, claimCount, avgScore }) => (
          <Link
            key={topic.id}
            href={`/topics/${topic.slug}`}
            className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md hover:border-brand-300 transition-all"
          >
            <h2 className="text-lg font-bold text-gray-900 mb-1">{topic.name}</h2>
            <p className="text-sm text-gray-500 mb-3 line-clamp-2">{topic.description}</p>
            <div className="flex gap-4 text-xs text-gray-400">
              <span>{claimCount} claims</span>
              <span>Avg score: {avgScore}/100</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
