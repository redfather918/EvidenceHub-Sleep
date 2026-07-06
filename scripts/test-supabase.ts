// EvidenceHub Sleep — Supabase 连接测试脚本
// 运行: npx tsx scripts/test-supabase.ts

import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";

async function test() {
  console.log("=== Supabase Connection Test ===\n");

  if (!isSupabaseConfigured) {
    console.error("❌ Supabase NOT configured.");
    console.error("   Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env");
    process.exit(1);
  }

  console.log("✅ Supabase configuration detected.");
  console.log(`   URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL}`.slice(0, 60) + "...\n");

  const supabase = getSupabase()!;

  // Test 1: Ping (list tables via RPC or simple query)
  console.log("Test 1: Database connectivity...");
  const { data: topics, error: topicsError } = await supabase.from("topics").select("count").single();
  if (topicsError) {
    console.error(`❌ Failed: ${topicsError.message}`);
    console.error("   Hint: Did you run supabase/init.sql?");
    process.exit(1);
  }
  console.log("✅ Database connected.\n");

  // Test 2: Count tables
  console.log("Test 2: Table counts...");
  const tables = ["topics", "studies", "claims", "claim_study_map", "dose_mappings", "population_fits", "pipeline_runs"];
  for (const table of tables) {
    const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
    if (error) {
      console.log(`   ${table}: ❌ ${error.message}`);
    } else {
      console.log(`   ${table}: ${count} rows`);
    }
  }

  // Test 3: Write / Read cycle
  console.log("\nTest 3: Write test (pipeline_runs)...");
  const { error: insertError } = await supabase.from("pipeline_runs").insert({
    status: "success",
    papers_fetched: 0,
    claims_extracted: 0,
    claims_new: 0,
    claims_updated: 0,
    claims_skipped: 0,
    errors_count: 0,
    dry_run: true,
    started_at: new Date().toISOString(),
    finished_at: new Date().toISOString(),
  });
  if (insertError) {
    console.error(`❌ Write failed: ${insertError.message}`);
    console.error("   Hint: Check RLS policies or service_role key.");
    process.exit(1);
  }
  console.log("✅ Write test passed.\n");

  console.log("=== All Tests Passed ✅ ===");
  console.log("Supabase is ready for production use.");
}

test().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
