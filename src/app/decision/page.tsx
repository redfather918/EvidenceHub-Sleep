// EvidenceHub Sleep — /decision  (Symptom-based decision flow)

import type { Metadata } from "next";
import { getAllDecisionSymptoms } from "@/lib/alternatives";
import { DecisionFlow } from "@/components/DecisionFlow";

export const metadata: Metadata = {
  title: "Decision Flow: Pick a Sleep Aid by Symptom | EvidenceHub Sleep",
  description:
    "Difficulty falling asleep, night waking, or stress-induced insomnia? Pick your symptom to get evidence-backed ingredient recommendations.",
  alternates: { canonical: "/decision" },
  openGraph: {
    title: "Decision Flow: Pick a Sleep Aid by Symptom | EvidenceHub Sleep",
    description:
      "Pick your sleep symptom — we surface the evidence-backed ingredients most relevant to it.",
    url: "https://sleep.p1web.site/decision",
    type: "website",
    siteName: "EvidenceHub Sleep",
  },
};

export default function DecisionPage() {
  const symptoms = getAllDecisionSymptoms();

  return (
    <div className="space-y-8">
      <section className="text-center py-8">
        <span className="inline-block mb-3 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-sm font-medium border border-brand-100">
          Decision Flow
        </span>
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
          Pick a sleep aid by symptom
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto mt-3">
          Select the symptom that fits you best. We&apos;ll surface the evidence-backed
          ingredients most relevant to it.
        </p>
      </section>

      <DecisionFlow symptoms={symptoms} />
    </div>
  );
}
