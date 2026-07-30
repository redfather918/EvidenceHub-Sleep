// EvidenceHub Sleep — "Natural Alternatives" data (OpenAlternative model)
//
// Prescription-drug / popular-product  ->  natural supplement-stack mappings.
// This is the article's distinctive, previously-missing growth surface:
// programmatic SEO pages for "[drug] + natural alternative" long-tail queries.
//
// Natural ingredients link to existing topic pages (/topics/[slug]) where a
// topic exists; otherwise they are shown as text with a "coming soon" note.
// Content is English to match the rest of the site. All mechanism/dose claims
// are conservative and educational, not medical advice.

export interface AltStackItem {
  name: string;
  topicSlug?: string; // existing topic slug, if any
  note?: string;
}

export interface AltComparisonRow {
  metric: string;
  drug: string;
  natural: string;
}

export interface Alternative {
  slug: string;
  drug: string;
  use: string;
  mechanism: string;
  onset: string;
  halfLife: string;
  risk: string;
  stack: AltStackItem[];
  stackRationale: string;
  comparison: AltComparisonRow[];
  faq: { q: string; a: string }[];
}

export interface DecisionTopic {
  slug: string;
  name: string;
}

export interface DecisionSymptom {
  slug: string;
  title: string;
  desc: string;
  topics: DecisionTopic[];
  tip: string;
}

export const alternatives: Alternative[] = [
  {
    slug: "ambien",
    drug: "Ambien (Zolpidem)",
    use: "Short-term insomnia, difficulty falling asleep",
    mechanism: 'GABA-A receptor agonist (non-benzodiazepine "Z-drug")',
    onset: "15–30 minutes",
    halfLife: "~2.5 hours",
    risk: "Dependence, next-day grogginess, complex sleep behaviors (sleepwalking/eating), rebound insomnia",
    stack: [
      { name: "Apigenin", topicSlug: "apigenin" },
      { name: "Magnesium Glycinate", topicSlug: "magnesium" },
      { name: "L-Theanine", topicSlug: "theanine" },
    ],
    stackRationale:
      "Apigenin acts on the same GABA-A benzodiazepine site to promote sleep onset — but without dependence or rebound. Magnesium and L-theanine add relaxation and support sleep maintenance, avoiding the complex sleep-behavior risks of Z-drugs.",
    comparison: [
      { metric: "Dependence", drug: "High", natural: "Low / none" },
      { metric: "Next-day residual", drug: "Common (grogginess, memory impairment)", natural: "None" },
      { metric: "Complex sleep behaviors", drug: "Reported (sleepwalking/eating)", natural: "None" },
      { metric: "Rebound insomnia", drug: "Notable", natural: "None" },
      { metric: "Half-life", drug: "~2.5 h", natural: "Short / gentle" },
      { metric: "Long-term safety", drug: "Not recommended long-term", natural: "Usable long-term (consult doctor)" },
    ],
    faq: [
      {
        q: "Can I stop Ambien and switch to natural alternatives?",
        a: "Never stop a prescription sleep aid abruptly. Talk to your doctor about tapering and whether natural options like apigenin or magnesium are appropriate for you.",
      },
      {
        q: "Are natural alternatives as fast as Ambien?",
        a: "Apigenin and magnesium typically work within 30–60 minutes — slightly slower than Ambien's 15–30 min, but without the dependence curve.",
      },
    ],
  },
  {
    slug: "xanax",
    drug: "Xanax (Alprazolam)",
    use: "Anxiety, panic attacks, anxiety-driven insomnia",
    mechanism: "Benzodiazepine, potent GABA-A agonist",
    onset: "15–30 minutes",
    halfLife: "~11–15 hours",
    risk: "High addiction potential, cognitive impairment, dangerous withdrawal (seizures), fatal if combined with opioids",
    stack: [
      { name: "L-Theanine", topicSlug: "theanine" },
      { name: "Ashwagandha", topicSlug: "ashwagandha" },
      { name: "Passionflower", note: "topic page coming soon" },
    ],
    stackRationale:
      "L-Theanine and passionflower promote calm via GABA without sedation; ashwagandha lowers baseline cortisol through the HPA axis. Together they cover both immediate relaxation and long-term stress regulation — without an addiction curve.",
    comparison: [
      { metric: "Addiction potential", drug: "High", natural: "None" },
      { metric: "Cognitive impairment", drug: "Significant", natural: "None" },
      { metric: "Withdrawal risk", drug: "Seizure risk", natural: "None" },
      { metric: "Onset", drug: "Fast (15–30 min)", natural: "Moderate (30–60 min / cumulative)" },
      { metric: "Best for", drug: "Acute panic", natural: "Daily anxiety / sleep" },
    ],
    faq: [
      {
        q: "Is L-Theanine a natural Xanax?",
        a: "No — it is not a benzodiazepine and carries no addiction or withdrawal risk. It promotes alpha-wave relaxation without sedation.",
      },
    ],
  },
  {
    slug: "melatonin-dependency",
    drug: "Melatonin (long-term / daily use)",
    use: "Circadian rhythm regulation, jet lag",
    mechanism: 'Exogenous melatonin signals "time to sleep"',
    onset: "30–60 minutes",
    halfLife: "Short (~1–4 h by formulation)",
    risk: "Long-term high dose may suppress natural production, morning grogginess, ineffective for some",
    stack: [
      { name: "Glycine", topicSlug: "glycine" },
      { name: "Magnesium Glycinate", topicSlug: "magnesium" },
      { name: "Apigenin", topicSlug: "apigenin" },
      { name: "L-Theanine", topicSlug: "theanine" },
    ],
    stackRationale:
      "Melatonin is best at timing, not sleeping. Long-term users can build a stable onset routine with glycine (thermoregulation) + magnesium + apigenin, reducing reliance on exogenous hormone and avoiding suppression of natural production.",
    comparison: [
      { metric: "Effect on natural production", drug: "Long-term high dose may suppress", natural: "No effect" },
      { metric: "Core function", drug: "Phase-shifting", natural: "Relaxation + sleep onset" },
      { metric: "Next-day grogginess", drug: "Some users", natural: "None" },
      { metric: "Tolerance", drug: "Ineffective for some", natural: "No tolerance" },
    ],
    faq: [
      {
        q: "Should I replace melatonin with these?",
        a: "Not necessarily — melatonin is useful for shift work and jet lag. For nightly sleep, glycine/magnesium/apigenin can reduce hormone reliance. Discuss with your doctor.",
      },
    ],
  },
  {
    slug: "benzodiazepines",
    drug: "Benzodiazepines (Valium / Klonopin)",
    use: "Anxiety, insomnia, muscle spasm",
    mechanism: "Benzodiazepine-site GABA-A potent agonist",
    onset: "30–60 minutes",
    halfLife: "Long (10–40+ h by compound)",
    risk: "Dependence, falls in elderly, cognitive decline, respiratory depression if combined",
    stack: [
      { name: "Ashwagandha", topicSlug: "ashwagandha" },
      { name: "L-Theanine", topicSlug: "theanine" },
      { name: "Magnesium Glycinate", topicSlug: "magnesium" },
    ],
    stackRationale:
      "Build a non-dependence relaxation baseline with ashwagandha (cortisol down-regulation) + L-theanine (acute calm) + magnesium (neuromuscular relaxation) — suited to mild-moderate anxiety insomnia discussion.",
    comparison: [
      { metric: "Dependence risk", drug: "High", natural: "None" },
      { metric: "Falls in elderly", drug: "Significant", natural: "None" },
      { metric: "Cognitive impact", drug: "Long-term decline", natural: "None" },
      { metric: "Half-life", drug: "Long (accumulates)", natural: "Short / gentle" },
    ],
    faq: [
      {
        q: "Can natural options replace benzodiazepines?",
        a: "Benzodiazepine withdrawal can be medically dangerous. Never self-taper. Use natural stacks only as part of a clinician-supervised plan.",
      },
    ],
  },
  {
    slug: "lunesta",
    drug: "Lunesta (Eszopiclone)",
    use: "Sleep onset + maintenance difficulty",
    mechanism: 'Non-benzodiazepine Z-drug, GABA-A agonist',
    onset: "15–30 minutes",
    halfLife: "~6 hours",
    risk: "Metallic taste, dependence, complex sleep behaviors, next-day drowsiness",
    stack: [
      { name: "Apigenin", topicSlug: "apigenin" },
      { name: "Magnesium Glycinate", topicSlug: "magnesium" },
      { name: "Glycine", topicSlug: "glycine" },
    ],
    stackRationale:
      "Apigenin + magnesium cover onset; glycine + magnesium cover maintenance — avoiding Z-drug's metallic taste and complex sleep behaviors for those wanting to reduce prescription reliance.",
    comparison: [
      { metric: "Complex sleep behaviors", drug: "Reported", natural: "None" },
      { metric: "Taste residual", drug: "Metallic", natural: "None" },
      { metric: "Sleep maintenance", drug: "Strong", natural: "Moderate (add glycine)" },
      { metric: "Dependence", drug: "Yes", natural: "None" },
    ],
    faq: [
      {
        q: "What covers both onset and maintenance naturally?",
        a: "Pair a fast GABA-A onset agent (apigenin) with maintenance supporters (magnesium + glycine) for a broader effect than any single ingredient.",
      },
    ],
  },
  {
    slug: "huberman-cocktail",
    drug: '"Huberman Sleep Cocktail"',
    use: "Sleep optimization for healthy adults",
    mechanism: "Multi-pathway stack: magnesium (GABA) + theanine (alpha waves) + apigenin (GABA-A) + glycine (thermoregulation)",
    onset: "30–60 minutes",
    halfLife: "Gentle / combined",
    risk: "No prescription risk; excess magnesium may cause loose stools",
    stack: [
      { name: "Magnesium L-Threonate", topicSlug: "magnesium", note: "brain-penetrant magnesium" },
      { name: "L-Theanine", topicSlug: "theanine" },
      { name: "Apigenin", topicSlug: "apigenin" },
      { name: "Glycine", topicSlug: "glycine" },
    ],
    stackRationale:
      "Breakdown of the popular stack: magnesium (brain GABA), theanine (alpha relaxation), apigenin (GABA-A onset), glycine (core-temperature drop). A natural, non-dependence 'sleep cocktail.'",
    comparison: [
      { metric: "Prescription?", drug: "No (influencer formula)", natural: "Same — structured breakdown" },
      { metric: "Dependence", drug: "None", natural: "None" },
      { metric: "Evidence", drug: "Each ingredient has RCTs", natural: "Each ingredient has RCTs" },
      { metric: "Our value-add", drug: "—", natural: "Dose / mechanism / stacking at a glance" },
    ],
    faq: [
      {
        q: "What is in the Huberman sleep cocktail?",
        a: "Commonly: magnesium (often L-threonate), L-theanine, apigenin, and glycine — each targeting a different sleep pathway.",
      },
    ],
  },
];

export const decisionSymptoms: DecisionSymptom[] = [
  {
    slug: "onset",
    title: "Difficulty falling asleep (Sleep Onset)",
    desc: "Awake 30+ minutes after lights-out, mind won't stop",
    topics: [
      { slug: "apigenin", name: "Apigenin" },
      { slug: "theanine", name: "L-Theanine" },
      { slug: "magnesium", name: "Magnesium" },
    ],
    tip: "Prioritize fast GABA-A pathways (apigenin) + relaxation (L-theanine), 30–60 min before bed.",
  },
  {
    slug: "maintenance",
    title: "Night waking / early rising (Sleep Maintenance)",
    desc: "Fall asleep but wake repeatedly, or wake too early",
    topics: [
      { slug: "magnesium", name: "Magnesium" },
      { slug: "glycine", name: "Glycine" },
      { slug: "ashwagandha", name: "Ashwagandha" },
    ],
    tip: "Magnesium + glycine support sleep architecture; ashwagandha needs consistent use over weeks to lower cortisol.",
  },
  {
    slug: "anxiety",
    title: "Stress-induced insomnia (Anxiety)",
    desc: "Anxiety and racing thoughts block relaxation",
    topics: [
      { slug: "ashwagandha", name: "Ashwagandha" },
      { slug: "theanine", name: "L-Theanine" },
      { slug: "magnesium", name: "Magnesium" },
    ],
    tip: "Ashwagandha as a base (lowers cortisol) + L-theanine for acute calm + magnesium for neuromuscular relaxation.",
  },
];
