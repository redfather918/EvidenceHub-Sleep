// Sitemap — /sitemap.xml

import { MetadataRoute } from "next";
import { getAllClaimsDb, getAllTopicsDb } from "@/lib/db";

const SITE_URL = "https://sleep.p1web.site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/topics`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/claims`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/search`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/api-docs`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  const [claims, topics] = await Promise.all([
    getAllClaimsDb(),
    getAllTopicsDb(),
  ]);

  const claimPages: MetadataRoute.Sitemap = claims.map((claim) => ({
    url: `${SITE_URL}/claim/${claim.slug}`,
    lastModified: claim.lastUpdated ? new Date(claim.lastUpdated) : new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));

  const topicPages: MetadataRoute.Sitemap = topics.map((topic) => ({
    url: `${SITE_URL}/topics/${topic.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...claimPages, ...topicPages];
}
