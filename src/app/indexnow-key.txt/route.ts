// IndexNow key verification endpoint
// GET /indexnow-key.txt
// Returns the configured INDEXNOW_KEY so Bing/Yandex can verify site ownership.
// This is required by the IndexNow protocol — Bing fetches this URL and expects
// the response body to exactly match the submitted key.

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const key = process.env.INDEXNOW_KEY;
  if (!key) {
    return new NextResponse("IndexNow key not configured", { status: 404 });
  }
  return new NextResponse(key, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
