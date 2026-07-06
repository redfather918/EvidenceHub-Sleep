// Studies listing page

import Link from "next/link";
import { getAllStudiesDb } from "@/lib/db";

export const metadata = {
  title: "All Studies — Sleep Evidence Database",
  description: "Browse all human studies on sleep interventions from PubMed and clinical trials.",
};

export default async function StudiesPage({
  searchParams,
}: {
  searchParams: Promise<{ studyType?: string }> | { studyType?: string };
}) {
  const params = await searchParams;
  const filterType = params?.studyType?.toLowerCase();
  const allStudies = await getAllStudiesDb();
  const studies = filterType
    ? allStudies.filter((s) => s.studyType.toLowerCase() === filterType)
    : allStudies;

  const title = filterType === "rct" ? "Human RCTs" : "All Studies";

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-600">
          {studies.length} {filterType ? `human ${filterType.toUpperCase()} studies` : "studies"} in the database
        </p>
      </header>

      <div className="space-y-4">
        {studies.map((study) => (
          <article
            key={study.id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-1">
                  {study.title}
                </h2>
                <p className="text-sm text-gray-600 mb-2">
                  {study.authors} — {study.journal}
                  {study.year ? `, ${study.year}` : ""}
                </p>
                {study.abstract && (
                  <p className="text-sm text-gray-700 line-clamp-2">{study.abstract}</p>
                )}
              </div>
              <span className="shrink-0 inline-flex items-center rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700 uppercase">
                {study.studyType}
              </span>
            </div>
            {study.pmid && (
              <div className="mt-3 text-xs text-gray-400">
                PMID: {" "}
                <a
                  href={`https://pubmed.ncbi.nlm.nih.gov/${study.pmid}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-600 hover:underline"
                >
                  {study.pmid}
                </a>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
