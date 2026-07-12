import { readFileSync } from "fs";
import { join } from "path";

// Load .env manually (standalone tsx script — Next.js auto-load doesn't apply)
const envRaw = readFileSync(join(process.cwd(), ".env"), "utf8");
const env: Record<string, string> = {};
for (const line of envRaw.split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) {
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    env[m[1]] = v;
  }
}

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.log("NO_SUPABASE_ENV");
  process.exit(0);
}

async function main() {
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(url!, key!, { auth: { persistSession: false } });

  const { count, error: cErr } = await sb
    .from("claims")
    .select("id", { count: "exact", head: true });
  console.log("TOTAL_CLAIMS:", count ?? "ERR", cErr ? `(err: ${cErr.message})` : "");

  const { data, error } = await sb
    .from("claims")
    .select("slug, text, evidence_score, rct_count")
    .order("evidence_score", { ascending: false })
    .limit(10);
  if (error) {
    console.log("QUERY_ERROR:", error.message);
    process.exit(0);
  }
  console.log("TOP_CLAIMS_BY_SCORE:");
  for (const c of data || []) {
    console.log(`  score=${c.evidence_score} rcts=${c.rct_count} slug=${c.slug} :: ${c.text}`);
  }
}
main().catch((e) => {
  console.log("SCRIPT_ERROR:", e.message);
  process.exit(0);
});
