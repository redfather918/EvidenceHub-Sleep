// EvidenceHub Sleep — /alternatives  (Natural Alternatives index)
// Programmatic SEO landing for "[drug] + natural alternative" long-tail queries.

import Link from "next/link";
import type { Metadata } from "next";
import { getAllAlternatives } from "@/lib/alternatives";
import { AlternativeCard } from "@/components/AlternativeCard";

export const metadata: Metadata = {
  title: "Natural Alternatives to Sleep Medications | EvidenceHub Sleep",
  description:
    "Side-by-side comparisons of common sleep drugs (Ambien, Xanax, Lunesta, benzodiazepines, melatonin) and the natural stacks people use instead — apigenin, magnesium, theanine, glycine. Mechanism, onset, dependence, evidence.",
  alternates: { canonical: "/alternatives" },
  openGraph: {
    title: "Natural Alternatives to Sleep Medications | EvidenceHub Sleep",
    description:
      "Ambien, Xanax, Lunesta and the natural stacks people use instead — compared on mechanism, dependence, and evidence.",
    url: "https://sleep.p1web.site/alternatives",
    type: "website",
    siteName: "EvidenceHub Sleep",
  },
};

export default function AlternativesPage() {
  const alts = getAllAlternatives();

  return (
    <div className="space-y-8">
      <section className="text-center py-8">
        <span className="inline-block mb-3 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-sm font-medium border border-brand-100">
          Prescription → Natural
        </span>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
          Natural Alternatives to Sleep Medications
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto mt-3">
          Side-by-side comparisons of common sleep drugs and the natural stacks people use
          instead — mechanism, onset, dependence, and evidence.
        </p>
        <div className="mt-5">
          <Link
            href="/decision"
            className="bg-brand-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-brand-700"
          >
            🧭 Not sure which? Use the decision flow
          </Link>
        </div>
      </section>

      <section className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {alts.map((a) => (
          <AlternativeCard key={a.slug} alt={a} />
        ))}
      </section>

      <p className="text-xs text-gray-400 text-center max-w-xl mx-auto">
        Not medical advice. Never stop or taper a prescription sleep aid without consulting your
        doctor. Natural options are not approved replacements for prescribed medication.
      </p>
    </div>
  );
}
