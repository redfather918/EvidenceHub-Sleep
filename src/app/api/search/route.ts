// Search API — GET /api/search?q=query
// Returns matching claims

import { NextRequest, NextResponse } from "next/server";
import { searchClaims } from "@/lib/data";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") || "";
  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "20");

  if (!query) {
    return NextResponse.json({
      error: "Query parameter 'q' is required",
      example: "/api/search?q=glycine",
    }, { status: 400 });
  }

  const results = searchClaims(query).slice(0, limit);

  return NextResponse.json({
    query,
    count: results.length,
    results: results.map((c) => ({
      slug: c.slug,
      text: c.text,
      evidenceScore: c.evidenceScore,
      confidence: c.confidence,
      dose: c.dose,
      rcts: c.rctCount,
      category: c.category,
      url: `/claim/${c.slug}`,
    })),
  });
}
