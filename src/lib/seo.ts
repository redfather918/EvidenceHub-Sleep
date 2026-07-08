// EvidenceHub Sleep — SEO / GEO Helpers
// Generates JSON-LD structured data for AI search engines (GEO)

import type { ClaimWithRelations, Claim, Topic } from "./types";

const SITE_URL = "https://sleep.p1web.site";

// ============================================================
// JSON-LD: Claim Page
// ============================================================

export function generateClaimJsonLd(claim: ClaimWithRelations) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${SITE_URL}/claim/${claim.slug}`,
    headline: claim.text,
    description: claim.summary,
    datePublished: claim.createdAt,
    dateModified: claim.lastUpdated,
    author: {
      "@type": "Organization",
      name: "EvidenceHub Sleep",
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: "EvidenceHub Sleep",
      url: SITE_URL,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${SITE_URL}/claim/${claim.slug}`,
    },
    about: {
      "@type": "MedicalEntity",
      name: claim.category,
    },
    citation: claim.studies.map((s) => ({
      "@type": "MedicalScholarlyArticle",
      headline: s.title,
      author: s.authors,
      datePublished: s.year?.toString(),
      isPartOf: {
        "@type": "Periodical",
        name: s.journal,
      },
      identifier: [
        s.doi ? { "@type": "PropertyValue", name: "doi", value: s.doi } : null,
        s.pmid ? { "@type": "PropertyValue", name: "pmid", value: s.pmid } : null,
      ].filter(Boolean),
    })),
  };
}

// ============================================================
// JSON-LD: FAQ Schema (critical for GEO)
// ============================================================

export function generateFaqJsonLd(claim: Claim) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: claim.faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };
}

// ============================================================
// JSON-LD: Breadcrumb
// ============================================================

export function generateBreadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.url}`,
    })),
  };
}

// ============================================================
// JSON-LD: Organization / Website
// ============================================================

export function generateWebsiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "EvidenceHub Sleep",
    url: SITE_URL,
    description:
      "AI-driven evidence-based sleep knowledge system. Computable evidence graph for sleep science.",
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

// ============================================================
// Metadata helpers
// ============================================================

export function generateClaimMetadata(claim: Claim) {
  const title = `${claim.text} | Evidence Score: ${claim.evidenceScore}/100`;
  const description = claim.summary.slice(0, 160);
  const keywords = claim.keywords.join(", ");

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: `/claim/${claim.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/claim/${claim.slug}`,
      type: "article",
      siteName: "EvidenceHub Sleep",
      publishedTime: claim.createdAt,
      modifiedTime: claim.lastUpdated,
      images: [
        {
          url: "/og-default.png",
          width: 1200,
          height: 630,
          alt: claim.text,
        },
      ],
    },
    twitter: {
      card: "summary_large_image" as const,
      title,
      description,
      images: ["/og-default.png"],
    },
  };
}

// ============================================================
// JSON-LD: Article View (Module 5 — Claim → Article)
// ============================================================

export function generateArticleJsonLd(claim: ClaimWithRelations) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${SITE_URL}/article/${claim.slug}`,
    headline: claim.text,
    alternativeHeadline: claim.summary,
    description: claim.summary,
    datePublished: claim.createdAt,
    dateModified: claim.lastUpdated,
    author: {
      "@type": "Organization",
      name: "EvidenceHub Sleep",
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: "EvidenceHub Sleep",
      url: SITE_URL,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${SITE_URL}/article/${claim.slug}`,
    },
    about: {
      "@type": "MedicalEntity",
      name: claim.category,
    },
    citation: claim.studies.map((s) => ({
      "@type": "MedicalScholarlyArticle",
      headline: s.title,
      author: s.authors,
      datePublished: s.year?.toString(),
      isPartOf: { "@type": "Periodical", name: s.journal },
      identifier: [
        s.doi ? { "@type": "PropertyValue", name: "doi", value: s.doi } : null,
        s.pmid ? { "@type": "PropertyValue", name: "pmid", value: s.pmid } : null,
      ].filter(Boolean),
    })),
  };
}

// ============================================================
// Metadata helpers — Article View
// ============================================================

export function generateArticleMetadata(claim: Claim) {
  const title = `${claim.text} — Evidence-Backed Article | EvidenceHub Sleep`;
  const description = claim.summary.slice(0, 160);
  const keywords = claim.keywords.join(", ");

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: `/article/${claim.slug}`,
    },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/article/${claim.slug}`,
      type: "article" as const,
      siteName: "EvidenceHub Sleep",
      publishedTime: claim.createdAt,
      modifiedTime: claim.lastUpdated,
      images: [{ url: "/og-default.png", width: 1200, height: 630, alt: claim.text }],
    },
    twitter: {
      card: "summary_large_image" as const,
      title,
      description,
      images: ["/og-default.png"],
    },
  };
}

export function generateTopicMetadata(topic: Topic) {
  return {
    title: `${topic.name} — Sleep Evidence | EvidenceHub`,
    description: topic.description,
    keywords: `${topic.name}, sleep, evidence, research, ${topic.name} sleep`,
    alternates: {
      canonical: `/topics/${topic.slug}`,
    },
    openGraph: {
      title: `${topic.name} — Sleep Evidence`,
      description: topic.description,
      url: `${SITE_URL}/topics/${topic.slug}`,
      type: "website",
      siteName: "EvidenceHub Sleep",
    },
    twitter: {
      card: "summary_large_image" as const,
      title: `${topic.name} — Sleep Evidence`,
      description: topic.description,
    },
  };
}

// ============================================================
// Sitemap generation
// ============================================================

export function generateSitemapUrls() {
  const staticUrls = [
    { url: "/", priority: 1.0, changefreq: "daily" },
    { url: "/topics", priority: 0.8, changefreq: "weekly" },
    { url: "/api-docs", priority: 0.6, changefreq: "monthly" },
  ];

  return staticUrls;
}
