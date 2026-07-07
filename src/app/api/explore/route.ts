// GET /api/explore — filtered, sorted, paginated claim listing.
// Query params: topic, category, studyType (rct|meta|observational|animal),
//               sort (evidence|newest|updated|rct), q, page, pageSize.

import { NextResponse } from "next/server";
import { exploreClaimsDb, type ExploreStudyType, type ExploreSort } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const studyType = searchParams.get("studyType") as ExploreStudyType | null;
  const sort = searchParams.get("sort") as ExploreSort | null;
  const page = searchParams.get("page");
  const pageSize = searchParams.get("pageSize");

  const result = await exploreClaimsDb({
    topic: searchParams.get("topic") || undefined,
    category: searchParams.get("category") || undefined,
    studyType: studyType || undefined,
    sort: sort || undefined,
    q: searchParams.get("q") || undefined,
    page: page ? parseInt(page, 10) : undefined,
    pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
  });

  const query: Record<string, string> = {};
  if (searchParams.get("topic")) query.topic = searchParams.get("topic")!;
  if (searchParams.get("category")) query.category = searchParams.get("category")!;
  if (studyType) query.studyType = studyType;
  if (sort) query.sort = sort;
  if (searchParams.get("q")) query.q = searchParams.get("q")!;

  const qs = (p: number) => {
    const q = { ...query, page: String(p) };
    return `/api/explore?${new URLSearchParams(q).toString()}`;
  };

  const totalPages = Math.ceil(result.total / result.pageSize);

  return NextResponse.json({
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    items: result.items.map((c) => ({
      slug: c.slug,
      text: c.text,
      summary: c.summary,
      category: c.category,
      evidenceScore: c.evidenceScore,
      confidence: c.confidence,
      rctCount: c.rctCount,
      metaCount: c.metaCount,
      topic: c.topicSlug,
      url: `https://sleep.p1web.site/claim/${c.slug}`,
      lastUpdated: c.lastUpdated,
    })),
    _links: {
      self: qs(result.page),
      next: result.page < totalPages ? qs(result.page + 1) : null,
      prev: result.page > 1 ? qs(result.page - 1) : null,
    },
  });
}
