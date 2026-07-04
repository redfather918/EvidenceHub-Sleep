#!/usr/bin/env tsx
// EvidenceHub Sleep — Pipeline CLI Entry Point
// Usage:
//   npm run pipeline          # Run pipeline (dry-run by default)
//   npm run pipeline:live     # Run pipeline in live mode
//   npm run pipeline:daily    # Daily cron job (live mode)

import { runPipeline } from "../src/pipeline/pipeline";

async function main() {
  const args = process.argv.slice(2);
  const isLive = args.includes("--live") || process.env.PIPELINE_DRY_RUN === "false";

  if (isLive) {
    process.env.PIPELINE_DRY_RUN = "false";
  } else {
    process.env.PIPELINE_DRY_RUN = "true";
  }

  try {
    const result = await runPipeline();

    // Exit with error code if there were errors
    if (result.errors.length > 0 && result.claimsExtracted === 0) {
      console.error("\n[FATAL] Pipeline failed with errors. See above for details.");
      process.exit(1);
    }

    console.log("\n[CLI] Pipeline completed successfully.");
    process.exit(0);
  } catch (err) {
    console.error("\n[FATAL] Pipeline crashed:", err);
    process.exit(1);
  }
}

main();
