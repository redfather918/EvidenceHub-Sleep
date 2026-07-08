#!/usr/bin/env tsx
// EvidenceHub Sleep — Job Runner CLI
// Run individual pipeline jobs from the command line.
// Usage:
//   npm run job:fetch-papers     # Job 1: Fetch papers from PubMed
//   npm run job:ai-parse         # Job 2: AI parse papers → claims
//   npm run job:update-claims    # Job 3: Dedup and update claims
//   npm run job:affiliate        # Job 6: Update affiliate prices
//   npm run job:newsletter       # Job 7: Send weekly newsletter
//   npm run job:emf              # EMF: generate + persist weekly media plan

import "dotenv/config";

const jobName = process.argv[2];

async function main() {
  if (!jobName) {
    console.error("Usage: npm run job:<name> [fetch-papers|ai-parse|update-claims|affiliate|newsletter|emf]");
    process.exit(1);
  }

  console.log(`\n[CLI] Running job: ${jobName}\n`);

  try {
    let result;

    switch (jobName) {
      case "fetch-papers": {
        const { jobFetchPapers } = await import("../src/pipeline/jobs/fetch-papers");
        result = await jobFetchPapers();
        break;
      }
      case "ai-parse": {
        const { jobAiParse } = await import("../src/pipeline/jobs/ai-parse");
        result = await jobAiParse();
        break;
      }
      case "update-claims": {
        const { jobUpdateClaims } = await import("../src/pipeline/jobs/update-claims");
        result = await jobUpdateClaims();
        break;
      }
      case "affiliate": {
        const { jobUpdateAffiliate } = await import("../src/lib/affiliate");
        result = await jobUpdateAffiliate();
        break;
      }
      case "newsletter": {
        const { jobSendNewsletter } = await import("../src/lib/newsletter");
        result = await jobSendNewsletter();
        break;
      }
      case "emf": {
        const { jobEmf } = await import("../src/lib/emf/job");
        result = await jobEmf();
        break;
      }
      default:
        console.error(`Unknown job: ${jobName}`);
        console.error("Available jobs: fetch-papers, ai-parse, update-claims, affiliate, newsletter, emf");
        process.exit(1);
    }

    console.log("\n[CLI] Job completed:", JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (err) {
    console.error("\n[FATAL] Job failed:", err);
    process.exit(1);
  }
}

main();
