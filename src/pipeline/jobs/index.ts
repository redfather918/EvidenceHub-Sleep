// EvidenceHub Sleep — Pipeline Jobs Index
// Each job is independently schedulable via Vercel Cron or GitHub Actions.
//
// Job scheduling:
//   Job 1 (fetch-papers)  — daily at 2:00 AM   → 0 2 * * *
//   Job 2 (ai-parse)      — hourly at :00       → 0 * * * *
//   Job 3 (update-claims) — hourly at :15       → 15 * * * *
//   Job 4 (revalidate)    — hourly at :30       → 30 * * * *
//   Job 5 (seo-update)    — daily at 4:00 AM    → 0 4 * * *

export { jobFetchPapers, type FetchPapersResult } from "./fetch-papers";
export { jobAiParse, type AiParseResult } from "./ai-parse";
export { jobUpdateClaims, type UpdateClaimsResult } from "./update-claims";
