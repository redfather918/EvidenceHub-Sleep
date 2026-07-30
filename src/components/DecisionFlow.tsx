// EvidenceHub Sleep — Decision Flow (client component)
// Symptom -> recommended evidence-backed ingredients.

"use client";

import { useState } from "react";
import Link from "next/link";
import type { DecisionSymptom } from "@/data/alternatives";

export function DecisionFlow({ symptoms }: { symptoms: DecisionSymptom[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const active = symptoms.find((s) => s.slug === selected) || null;

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        {symptoms.map((s) => (
          <button
            key={s.slug}
            type="button"
            onClick={() => setSelected(s.slug)}
            className={`text-left p-5 rounded-lg border transition-all ${
              selected === s.slug
                ? "border-brand-500 bg-brand-50 ring-1 ring-brand-200"
                : "border-gray-200 bg-white hover:border-brand-300"
            }`}
          >
            <h3 className="font-bold text-gray-900">{s.title}</h3>
            <p className="text-xs text-gray-500 mt-1">{s.desc}</p>
          </button>
        ))}
      </div>

      {active ? (
        <div className="space-y-4">
          <div className="rounded-lg bg-brand-50 border border-brand-100 p-4">
            <h2 className="font-bold text-gray-900">{active.title}</h2>
            <p className="text-sm text-gray-600 mt-1">{active.tip}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {active.topics.map((t) => (
              <Link
                key={t.slug}
                href={`/topics/${t.slug}`}
                className="block bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md hover:border-brand-300 transition-all"
              >
                <h3 className="font-semibold text-gray-800">{t.name}</h3>
                <p className="text-xs text-brand-600 mt-2">View evidence &rarr;</p>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-center text-gray-400 py-6">
          Select a symptom above to see the evidence-backed ingredients most relevant to it.
        </p>
      )}
    </div>
  );
}
