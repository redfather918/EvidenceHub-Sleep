// EvidenceHub Sleep — Claim Page (Core Page)
// URL: /claim/[slug]

import { notFound } from "next/navigation";
import Link from "next/link";
import { getAllClaimsDb, getClaimWithRelationsDb } from "@/lib/db";
import {
  generateClaimJsonLd,
  generateFaqJsonLd,
  generateBreadcrumbJsonLd,
  generateClaimMetadata,
} from "@/lib/seo";
import { EvidenceScoreBadge } from "@/components/EvidenceScoreBadge";
import { ClaimCard } from "@/components/ClaimCard";

// ISR: revalidate every hour (also triggered on-demand by /api/cron/revalidate)
export const revalidate = 3600;

export async function generateStaticParams() {
  const claims = await getAllClaimsDb();
  return claims.map((claim) => ({ slug: claim.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const claim = await getClaimWithRelationsDb(params.slug);
  if (!claim) return {};
  return generateClaimMetadata(claim);
}

export default async function ClaimPage({ params }: { params: { slug: string } }) {
  const claim = await getClaimWithRelationsDb(params.slug);
  if (!claim) notFound();

  const claimJsonLd = generateClaimJsonLd(claim);
  const faqJsonLd = generateFaqJsonLd(claim);
  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: "Home", url: "/" },
    { name: "Claims", url: "/claims" },
    { name: claim.text, url: `/claim/${claim.slug}` },
  ]);

  return (
    <article className="max-w-4xl mx-auto">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(claimJsonLd) }}
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
      <nav className="text-sm text-gray-400 mb-4">
        <Link href="/" className="hover:text-brand-600">Home</Link>
        {" / "}
        <Link href="/claims" className="hover:text-brand-600">Claims</Link>
        {" / "}
        <span className="text-gray-600">{claim.category}</span>
      </nav>

      {/* 1. Claim Summary */}
      <header className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-medium px-2 py-0.5 bg-brand-100 text-brand-700 rounded">
            {claim.category}
          </span>
          {claim.topic && (
            <Link
              href={`/topics/${claim.topicSlug}`}
              className="text-xs font-medium px-2 py-0.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
            >
              {claim.topic.name}
            </Link>
          )}
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">{claim.text}</h1>
        <p className="text-lg text-gray-600 leading-relaxed">{claim.summary}</p>
        <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-gray-400">
          <span>Last updated: {new Date(claim.lastUpdated).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</span>
          <span>{"\u2022"}</span>
          <span>{claim.rctCount} RCTs</span>
          {claim.metaCount > 0 && (
            <>
              <span>{"\u2022"}</span>
              <span>{claim.metaCount} Meta-analyses</span>
            </>
          )}
          <span>{"\u2022"}</span>
          <Link href={`/article/${claim.slug}`} className="text-brand-600 hover:underline font-medium">
            📖 Read as article &rarr;
          </Link>
        </div>
      </header>

      {/* 2. Evidence Score */}
      <section className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-3">Evidence Score</h2>
        <div className="max-w-sm">
          <EvidenceScoreBadge claim={claim} />
        </div>
      </section>

      {/* 3. Study Evidence */}
      {claim.studies.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Study Evidence</h2>
          <div className="space-y-4">
            {claim.studies.map((study, index) => (
              <div key={study.id} className="bg-white border border-gray-200 rounded-lg p-5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-semibold text-gray-800">
                    Study {index + 1}. {study.title}
                  </h3>
                  <span className="text-xs font-medium px-2 py-0.5 bg-gray-100 text-gray-600 rounded uppercase whitespace-nowrap">
                    {study.studyType}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-3">
                  {study.authors} &middot; {study.journal} {study.year && `(${study.year})`}
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="text-gray-400">Participants:</span>{" "}
                    <span className="font-medium">{study.sampleSize || "N/A"}</span>
                  </div>
                  {study.duration && (
                    <div>
                      <span className="text-gray-400">Duration:</span>{" "}
                      <span className="font-medium">{study.duration}</span>
                    </div>
                  )}
                  {study.intervention && (
                    <div>
                      <span className="text-gray-400">Intervention:</span>{" "}
                      <span className="font-medium">{study.intervention}</span>
                    </div>
                  )}
                  {study.outcome && (
                    <div>
                      <span className="text-gray-400">Outcome:</span>{" "}
                      <span className="font-medium">{study.outcome}</span>
                    </div>
                  )}
                  {study.effectSize && (
                    <div>
                      <span className="text-gray-400">Effect Size:</span>{" "}
                      <span className="font-medium">{study.effectSize}</span>
                    </div>
                  )}
                  {study.population && (
                    <div>
                      <span className="text-gray-400">Population:</span>{" "}
                      <span className="font-medium">{study.population}</span>
                    </div>
                  )}
                </div>
                <p className="text-sm text-gray-700 mt-3 pt-3 border-t border-gray-100">
                  <span className="font-medium">Result:</span> {study.result}
                </p>
                {/* References */}
                <div className="flex gap-3 mt-3 text-xs">
                  {study.pmid && (
                    <a
                      href={`https://pubmed.ncbi.nlm.nih.gov/${study.pmid}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-600 hover:underline"
                    >
                      PubMed: {study.pmid}
                    </a>
                  )}
                  {study.doi && (
                    <a
                      href={`https://doi.org/${study.doi}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-600 hover:underline"
                    >
                      DOI: {study.doi}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. Dose Response */}
      {claim.doseMappings.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Dose Response</h2>
          <div className="space-y-2">
            {claim.doseMappings.map((dose, i) => (
              <div
                key={i}
                className={`flex items-center gap-4 p-3 rounded-lg border ${
                  dose.optimal
                    ? "bg-green-50 border-green-300"
                    : "bg-white border-gray-200"
                }`}
              >
                <div className="font-mono text-sm font-semibold w-32 flex-shrink-0">
                  {dose.doseRange}
                </div>
                <div className="flex-1 text-sm text-gray-700">{dose.effect}</div>
                {dose.optimal && (
                  <span className="text-xs font-bold text-green-700 bg-green-200 px-2 py-0.5 rounded">
                    OPTIMAL
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. Mechanism Graph */}
      {claim.mechanism.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Mechanism Graph</h2>
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex flex-col items-center">
              {claim.mechanism.map((step, i) => (
                <div key={i} className="text-center">
                  <div
                    className={`inline-block px-4 py-2 rounded-lg font-medium ${
                      i === 0
                        ? "bg-brand-600 text-white"
                        : i === claim.mechanism.length - 1
                          ? "bg-green-600 text-white"
                          : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {step}
                  </div>
                  {i < claim.mechanism.length - 1 && (
                    <div className="text-gray-400 my-1 text-xl">{"\u2193"}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 6. Population Fit */}
      {claim.populationFits.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Population Fit</h2>
          <div className="grid md:grid-cols-2 gap-2">
            {claim.populationFits.map((fit, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg">
                <span className="text-lg">
                  {fit.fit === "yes" ? "\u2705" : fit.fit === "check" ? "\u26A0\uFE0F" : "\u274C"}
                </span>
                <div className="flex-1">
                  <div className="font-medium text-sm text-gray-800">{fit.group}</div>
                  {fit.note && <div className="text-xs text-gray-500">{fit.note}</div>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 7. Limitations */}
      {claim.limitations.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Limitations</h2>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <ul className="space-y-2">
              {claim.limitations.map((lim, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-amber-600 mt-0.5">{"\u26A0"}</span>
                  <span>{lim}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* 8. FAQ (AI Optimized) */}
      {claim.faq.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {claim.faq.map((item, i) => (
              <details key={i} className="bg-white border border-gray-200 rounded-lg p-4 group" open={i === 0}>
                <summary className="font-medium text-gray-800 cursor-pointer flex items-center justify-between">
                  {item.q}
                  <span className="text-gray-400 group-open:rotate-180 transition-transform">{"\u25BC"}</span>
                </summary>
                <p className="text-sm text-gray-600 mt-2 pt-2 border-t border-gray-100">{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* 9. Related Claims */}
      {claim.relatedClaims.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Related Claims</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {claim.relatedClaims.map((rc) => (
              <ClaimCard key={rc.id} claim={rc} />
            ))}
          </div>
        </section>
      )}

      {/* 10. Products (Affiliate Layer placeholder) */}
      <section className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Products</h2>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-500">
          <p>
            Affiliate links coming soon. We only recommend products that match the doses and forms
            used in the cited research.
          </p>
        </div>
      </section>

      {/* 11. References */}
      {claim.studies.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">References</h2>
          <ol className="space-y-2 text-sm">
            {claim.studies.map((study, i) => (
              <li key={study.id} className="flex gap-3 text-gray-600">
                <span className="font-mono text-gray-400">{i + 1}.</span>
                <span>
                  {study.authors}. "{study.title}." <em>{study.journal}</em>
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

      {/* Disclaimer */}
      <div className="bg-gray-50 rounded-lg p-4 text-xs text-gray-500 mt-8">
        <strong>Disclaimer:</strong> This content is for educational purposes only and is not medical
        advice. Evidence scores reflect the quality and quantity of available research, not clinical
        recommendations. Always consult a healthcare professional before starting any supplement or
        intervention.
      </div>
    </article>
  );
}
