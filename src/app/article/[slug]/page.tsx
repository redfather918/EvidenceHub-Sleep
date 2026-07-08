// EvidenceHub Sleep — Article View (Module 5: Claim → Article)
// URL: /article/[slug]
// Renders a long-form, editorial article composed from a claim's
// AI-extracted structured data (summary, mechanism, FAQ, studies, ...).

import { notFound } from "next/navigation";
import Link from "next/link";
import { getAllClaimsDb, getClaimWithRelationsDb } from "@/lib/db";
import { composeArticle } from "@/lib/article";
import {
  generateArticleJsonLd,
  generateFaqJsonLd,
  generateBreadcrumbJsonLd,
  generateArticleMetadata,
} from "@/lib/seo";
import { EvidenceScoreBadge } from "@/components/EvidenceScoreBadge";
import { ClaimCard } from "@/components/ClaimCard";

// ISR: revalidate every hour
export const revalidate = 3600;

export async function generateStaticParams() {
  const claims = await getAllClaimsDb();
  return claims.map((claim) => ({ slug: claim.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const claim = await getClaimWithRelationsDb(params.slug);
  if (!claim) return {};
  return generateArticleMetadata(claim);
}

export default async function ArticlePage({ params }: { params: { slug: string } }) {
  const claim = await getClaimWithRelationsDb(params.slug);
  if (!claim) notFound();

  const article = composeArticle(claim);

  const articleJsonLd = generateArticleJsonLd(claim);
  const faqJsonLd = generateFaqJsonLd(claim);
  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "Claims", url: "/claims" },
    { name: claim.text, url: `/article/${claim.slug}` },
  ]);

  return (
    <article className="max-w-3xl mx-auto">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* Breadcrumb */}
      <nav className="text-sm text-gray-400 mb-6">
        <Link href="/" className="hover:text-brand-600">Home</Link>
        {" / "}
        <Link href="/claims" className="hover:text-brand-600">Claims</Link>
        {" / "}
        <span className="text-gray-600">Article</span>
      </nav>

      {/* Hero */}
      <header className="mb-8">
        <div className="text-xs font-semibold uppercase tracking-wider text-brand-600 mb-3">
          {article.kicker}
        </div>
        <h1 className="text-4xl font-bold text-gray-900 leading-tight mb-4">
          {article.title}
        </h1>
        <p className="text-xl text-gray-600 leading-relaxed mb-5">{article.subtitle}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-400">
          <span>{article.readingMinutes} min read</span>
          <span>{"\u2022"}</span>
          <span>
            Updated {new Date(article.updatedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
          </span>
          <span>{"\u2022"}</span>
          <span>{claim.rctCount} RCTs</span>
          {claim.metaCount > 0 && (
            <>
              <span>{"\u2022"}</span>
              <span>{claim.metaCount} Meta-analyses</span>
            </>
          )}
          <span>{"\u2022"}</span>
          <Link href={`/claim/${claim.slug}`} className="text-brand-600 hover:underline">
            View structured evidence &rarr;
          </Link>
        </div>
      </header>

      {/* Evidence score strip */}
      <div className="mb-8 rounded-lg bg-gray-50 border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <div className="shrink-0 w-40">
            <EvidenceScoreBadge claim={claim} />
          </div>
          <p className="text-sm text-gray-500">
            This article is automatically generated from the structured evidence profile
            behind the claim above. Scores reflect the quality and quantity of available
            research, not clinical advice.
          </p>
        </div>
      </div>

      {/* Lede */}
      <p className="text-lg text-gray-800 leading-relaxed mb-10 font-medium">
        {article.lede}
      </p>

      {/* Sections */}
      <div className="space-y-10">
        {article.sections.map((section) => (
          <section key={section.id} id={section.id}>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{section.heading}</h2>
            {section.paragraphs.map((p, i) => (
              <p key={i} className="text-gray-700 leading-relaxed mb-3">
                {p}
              </p>
            ))}
            {section.bullets && section.bullets.length > 0 && (
              <ul className="space-y-2 mt-2">
                {section.bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-2 text-gray-700">
                    <span className="text-brand-500 mt-1.5 text-xs">{"\u25B8"}</span>
                    <span className="leading-relaxed">{b}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}

        {/* FAQ (special rendering) */}
        {article.faq.length > 0 && (
          <section id="faq">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
            <div className="space-y-3">
              {article.faq.map((item, i) => (
                <details
                  key={i}
                  className="bg-white border border-gray-200 rounded-lg p-4 group"
                  open={i === 0}
                >
                  <summary className="font-medium text-gray-800 cursor-pointer flex items-center justify-between">
                    {item.q}
                    <span className="text-gray-400 group-open:rotate-180 transition-transform">
                      {"\u25BC"}
                    </span>
                  </summary>
                  <p className="text-sm text-gray-600 mt-2 pt-2 border-t border-gray-100">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* References */}
      {article.studies.length > 0 && (
        <section className="mt-12 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">References</h2>
          <ol className="space-y-2 text-sm">
            {article.studies.map((study, i) => (
              <li key={study.id} className="flex gap-3 text-gray-600">
                <span className="font-mono text-gray-400">{i + 1}.</span>
                <span>
                  {study.authors}. &ldquo;{study.title}.&rdquo; <em>{study.journal}</em>
                  {study.year && `, ${study.year}`}.
                  {study.pmid && (
                    <>
                      {" "}
                      <a
                        href={`https://pubmed.ncbi.nlm.nih.gov/${study.pmid}/`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-600 hover:underline"
                      >
                        PMID: {study.pmid}
                      </a>
                    </>
                  )}
                  {study.doi && (
                    <>
                      {" "}
                      <a
                        href={`https://doi.org/${study.doi}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-600 hover:underline"
                      >
                        DOI: {study.doi}
                      </a>
                    </>
                  )}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Related Claims */}
      {article.relatedClaims.length > 0 && (
        <section className="mt-12 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Related Claims</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {article.relatedClaims.map((rc) => (
              <ClaimCard key={rc.id} claim={rc} />
            ))}
          </div>
        </section>
      )}

      {/* Disclaimer */}
      <div className="bg-gray-50 rounded-lg p-4 text-xs text-gray-500 mt-10">
        <strong>Disclaimer:</strong> This article is auto-generated from structured research
        data for educational purposes only and is not medical advice. Evidence scores reflect
        the quality and quantity of available research, not clinical recommendations. Always
        consult a healthcare professional before starting any supplement or intervention.
      </div>
    </article>
  );
}
