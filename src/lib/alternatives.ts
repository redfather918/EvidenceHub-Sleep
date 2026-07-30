// EvidenceHub Sleep — Natural Alternatives data access layer
// Static content (no DB dependency) so it can be statically generated.

import {
  alternatives,
  decisionSymptoms,
  type Alternative,
  type DecisionSymptom,
} from "@/data/alternatives";

export function getAllAlternatives(): Alternative[] {
  return alternatives;
}

export function getAlternativeBySlug(slug: string): Alternative | undefined {
  return alternatives.find((a) => a.slug === slug);
}

export function getAllDecisionSymptoms(): DecisionSymptom[] {
  return decisionSymptoms;
}
