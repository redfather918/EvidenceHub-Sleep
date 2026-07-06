// On-Demand Revalidation API
// POST /api/revalidate?path=/claim/magnesium-sleep
// Triggers ISR revalidation for a specific path.
// Used by pipeline jobs after updating claims.

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path");
  const secret = req.headers.get("x-revalidate-token") || searchParams.get("secret");

  // Verify auth
  const expectedSecret = process.env.CRON_SECRET || process.env.REVALIDATE_SECRET;
  if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!path) {
    return NextResponse.json({ error: "Missing 'path' parameter" }, { status: 400 });
  }

  try {
    revalidatePath(path);
    console.log(`[Revalidate] Successfully revalidated: ${path}`);
    return NextResponse.json({ ok: true, revalidated: path });
  } catch (err) {
    console.error(`[Revalidate] Failed for ${path}:`, err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
