// EvidenceHub Sleep — Pipeline Configuration
// Central config for the auto-update pipeline

import type { PipelineConfig } from "./types";

export const pipelineConfig: PipelineConfig = {
  pubmed: {
    apiKey: process.env.PUBMED_API_KEY || "",
    maxResults: 20,
    searchTerms: [
      "sleep glycine",
      "sleep magnesium",
      "sleep melatonin",
      "sleep ashwagandha",
      "sleep L-theanine",
      "sleep apigenin",
      "sleep tart cherry",
      "sleep exercise",
      "sleep supplement RCT",
      "sleep latency intervention",
      "sleep quality randomized",
      "insomnia natural supplement",
    ],
    dateRangeDays: 90, // Fetch papers from last 90 days
  },

  ai: {
    provider: (process.env.AI_PROVIDER as "deepseek" | "openai" | "mock") || "mock",
    apiKey: process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY || "",
    model: process.env.AI_MODEL || "deepseek-chat",
    temperature: 0.3,
  },

  scoring: {
    rctWeight: 10,
    metaWeight: 15,
    humanWeight: 8,
    consistencyWeight: 20,
    effectSizeWeight: 20,
    contradictionPenalty: 15,
  },

  dedup: {
    similarityThreshold: 0.85,
  },

  output: {
    seedDataPath: "src/data/seed-data.ts",
    logPath: "pipeline-logs",
  },

  dryRun: process.env.PIPELINE_DRY_RUN !== "false", // Default to dry-run unless explicitly set to false
};

// Sleep-related compound mapping for topic auto-assignment
export const compoundTopicMap: Record<string, { slug: string; name: string }> = {
  glycine: { slug: "glycine", name: "Glycine" },
  magnesium: { slug: "magnesium", name: "Magnesium" },
  melatonin: { slug: "melatonin", name: "Melatonin" },
  "tart cherry": { slug: "tart-cherry", name: "Tart Cherry" },
  "tart-cherry": { slug: "tart-cherry", name: "Tart Cherry" },
  theanine: { slug: "theanine", name: "L-Theanine" },
  "l-theanine": { slug: "theanine", name: "L-Theanine" },
  ashwagandha: { slug: "ashwagandha", name: "Ashwagandha" },
  apigenin: { slug: "apigenin", name: "Apigenin" },
  exercise: { slug: "exercise", name: "Exercise" },
  "physical activity": { slug: "exercise", name: "Exercise" },
};

// Category mapping
export const categoryMap: Record<string, string> = {
  glycine: "Amino Acids",
  magnesium: "Minerals",
  melatonin: "Hormones",
  "tart cherry": "Foods",
  theanine: "Amino Acids",
  ashwagandha: "Herbs",
  apigenin: "Flavonoids",
  exercise: "Lifestyle",
};
